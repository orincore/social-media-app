import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

// GET - Server-Sent Events for real-time messages
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`)
      );

      // Function to send new messages and activity updates
      const sendUpdates = async () => {
        try {
          // Check if controller is still open
          if (request.signal.aborted) {
            return;
          }

          // Get user's chats
          const { data: chats } = await adminClient
            .from('chats')
            .select('id, participants')
            .contains('participants', [session.user!.id]);

          if (!chats || chats.length === 0) return;

          const chatIds = chats.map(c => c.id);

          // Get recent messages from the last 5 seconds
          const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
          
          const { data: newMessages } = await adminClient
            .from('messages')
            .select(`
              *,
              sender:sender_id (
                id,
                username,
                display_name,
                avatar_url,
                is_verified
              )
            `)
            .in('chat_id', chatIds)
            .neq('sender_id', session.user!.id) // Don't send own messages
            .gte('created_at', fiveSecondsAgo)
            .order('created_at', { ascending: false });

          if (newMessages && newMessages.length > 0) {
            // Check again before enqueueing
            if (!request.signal.aborted) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ 
                  type: 'new_messages', 
                  messages: newMessages,
                  timestamp: Date.now()
                })}\n\n`)
              );
            }
          }

          // Send unread message count
          const { count: unreadCount } = await adminClient
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .in('chat_id', chatIds)
            .neq('sender_id', session.user!.id)
            .eq('is_read', false);

          // Check again before enqueueing
          if (!request.signal.aborted) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ 
                type: 'unread_count', 
                count: unreadCount || 0,
                timestamp: Date.now()
              })}\n\n`)
            );
          }

          // Note: Typing indicators and activity status are now handled 
          // by separate SSE connections to avoid infinite loops.
          // The frontend will establish separate EventSource connections
          // for typing and activity updates if needed.

        } catch (error) {
          console.error('Error fetching updates for SSE:', error);
        }
      };

      // Send initial data
      sendUpdates();

      // Set up polling every 1 second for real-time updates (faster for typing indicators)
      const interval = setInterval(sendUpdates, 1000);

      // Cleanup function
      const cleanup = () => {
        clearInterval(interval);
      };

      // Handle client disconnect
      request.signal.addEventListener('abort', cleanup);
      
      // Store cleanup function for later use
      (controller as any).cleanup = cleanup;
    },
    
    cancel() {
      // Cleanup when stream is cancelled
      if ((this as any).cleanup) {
        (this as any).cleanup();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}

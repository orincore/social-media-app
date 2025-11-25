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
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ 
                type: 'new_messages', 
                messages: newMessages,
                timestamp: Date.now()
              })}\n\n`)
            );
          }

          // Send unread message count
          const { count: unreadCount } = await adminClient
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .in('chat_id', chatIds)
            .neq('sender_id', session.user!.id)
            .eq('is_read', false);

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              type: 'unread_count', 
              count: unreadCount || 0,
              timestamp: Date.now()
            })}\n\n`)
          );

          // Send typing indicators for each chat
          for (const chat of chats) {
            try {
              const typingResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/messages/${chat.id}/typing`, {
                headers: {
                  'Cookie': request.headers.get('Cookie') || ''
                }
              });
              
              if (typingResponse.ok) {
                const typingData = await typingResponse.json();
                if (typingData.typingUsers && typingData.typingUsers.length > 0) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ 
                      type: 'typing_indicators', 
                      chatId: chat.id,
                      typingUsers: typingData.typingUsers,
                      timestamp: Date.now()
                    })}\n\n`)
                  );
                }
              }
            } catch (typingError) {
              // Ignore typing indicator errors
            }
          }

          // Send activity status for chat participants
          const allParticipants = new Set<string>();
          chats.forEach(chat => {
            chat.participants.forEach((id: string) => {
              if (id !== session.user!.id) {
                allParticipants.add(id);
              }
            });
          });

          if (allParticipants.size > 0) {
            try {
              const activityResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/users/activity?userIds=${Array.from(allParticipants).join(',')}`, {
                headers: {
                  'Cookie': request.headers.get('Cookie') || ''
                }
              });
              
              if (activityResponse.ok) {
                const activityData = await activityResponse.json();
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ 
                    type: 'user_activity', 
                    activities: activityData.activities,
                    timestamp: Date.now()
                  })}\n\n`)
                );
              }
            } catch (activityError) {
              // Ignore activity errors
            }
          }

        } catch (error) {
          console.error('Error fetching updates for SSE:', error);
        }
      };

      // Send initial data
      sendUpdates();

      // Set up polling every 2 seconds for real-time updates
      const interval = setInterval(sendUpdates, 2000);

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

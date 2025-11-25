import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

// GET - Server-Sent Events for real-time notifications
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

      // Function to send unread count
      const sendUnreadCount = async () => {
        try {
          const { count } = await adminClient
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', session.user!.id)
            .eq('is_read', false);

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              type: 'unread_count', 
              count: count || 0,
              timestamp: Date.now()
            })}\n\n`)
          );
        } catch (error) {
          console.error('Error fetching unread count for SSE:', error);
        }
      };

      // Send initial count
      sendUnreadCount();

      // Set up polling every 3 seconds for real-time updates
      const interval = setInterval(sendUnreadCount, 3000);

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

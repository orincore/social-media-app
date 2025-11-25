import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

// Shared typing indicators map (in production, use Redis)
type TypingIndicator = {
  userId: string;
  chatId: string;
  timestamp: number;
  username: string;
  displayName: string;
};

// Use the same global variable as the typing route
declare global {
  var typingIndicators: Map<string, TypingIndicator> | undefined;
}

// Initialize the map if it doesn't exist
if (!globalThis.typingIndicators) {
  globalThis.typingIndicators = new Map();
}
const typingIndicators = globalThis.typingIndicators;

// Clean up old typing indicators (older than 1 second for immediate cleanup)
const cleanupTypingIndicators = () => {
  const now = Date.now();
  const oneSecondAgo = now - 1000; // Reduced to 1 second for immediate cleanup
  
  for (const [key, indicator] of typingIndicators.entries()) {
    if (indicator.timestamp < oneSecondAgo) {
      typingIndicators.delete(key);
    }
  }
};

// GET - Server-Sent Events for typing indicators only
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

      // Function to send typing updates
      const sendTypingUpdates = async () => {
        try {
          // Get user's chats
          const { data: chats } = await adminClient
            .from('chats')
            .select('id')
            .contains('participants', [session.user!.id]);

          if (!chats || chats.length === 0) return;

          // Clean up old indicators
          cleanupTypingIndicators();

          // Send typing indicators for each chat
          for (const chat of chats) {
            const typingUsers = Array.from(typingIndicators.values())
              .filter(indicator => 
                indicator.chatId === chat.id && 
                indicator.userId !== session.user!.id
              );

            if (typingUsers.length > 0) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ 
                  type: 'typing_indicators', 
                  chatId: chat.id,
                  typingUsers,
                  timestamp: Date.now()
                })}\n\n`)
              );
            }
          }

        } catch (error) {
          console.error('Error fetching typing updates for SSE:', error);
        }
      };

      // Send initial data
      sendTypingUpdates();

      // Set up polling every 200ms for ultra-fast typing updates
      const interval = setInterval(sendTypingUpdates, 200);

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


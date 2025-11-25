import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

// Shared user activity map (in production, use Redis)
type UserActivity = {
  userId: string;
  lastSeen: number;
  isOnline: boolean;
};

// Use the same global variable as the activity route
declare global {
  var userActivity: Map<string, UserActivity> | undefined;
}

// Initialize the map if it doesn't exist
if (!globalThis.userActivity) {
  globalThis.userActivity = new Map();
}
const userActivity = globalThis.userActivity;

// Consider user offline after 2 minutes of inactivity
const OFFLINE_THRESHOLD = 2 * 60 * 1000; // 2 minutes

// Clean up old activity records
const cleanupActivity = () => {
  const now = Date.now();
  const offlineThreshold = now - OFFLINE_THRESHOLD;
  
  for (const [userId, activity] of userActivity.entries()) {
    if (activity.lastSeen < offlineThreshold) {
      activity.isOnline = false;
    }
  }
};

// GET - Server-Sent Events for user activity only
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

      // Function to send activity updates
      const sendActivityUpdates = async () => {
        try {
          // Get user's chats to find participants
          const { data: chats } = await adminClient
            .from('chats')
            .select('participants')
            .contains('participants', [session.user!.id]);

          if (!chats || chats.length === 0) return;

          // Clean up old activity
          cleanupActivity();

          // Get all unique participants (excluding current user)
          const allParticipants = new Set<string>();
          chats.forEach(chat => {
            chat.participants.forEach((id: string) => {
              if (id !== session.user!.id) {
                allParticipants.add(id);
              }
            });
          });

          if (allParticipants.size > 0) {
            // Get activity for all participants
            const activities: Record<string, { isOnline: boolean; lastSeen: number }> = {};
            
            for (const userId of allParticipants) {
              const activity = userActivity.get(userId);
              if (activity) {
                activities[userId] = {
                  isOnline: activity.isOnline,
                  lastSeen: activity.lastSeen
                };
              } else {
                // User not in activity map, consider offline
                activities[userId] = {
                  isOnline: false,
                  lastSeen: 0
                };
              }
            }

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ 
                type: 'user_activity', 
                activities,
                timestamp: Date.now()
              })}\n\n`)
            );
          }

        } catch (error) {
          console.error('Error fetching activity updates for SSE:', error);
        }
      };

      // Send initial data
      sendActivityUpdates();

      // Set up polling every 10 seconds for activity updates (less frequent than typing)
      const interval = setInterval(sendActivityUpdates, 10000);

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


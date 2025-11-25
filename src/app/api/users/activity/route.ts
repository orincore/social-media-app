import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

// Shared user activity map (in production, use Redis)
type UserActivity = {
  userId: string;
  lastSeen: number;
  isOnline: boolean;
};

// Use a global variable to share state between API calls
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

// POST - Update user activity status
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body; // 'heartbeat', 'online', 'offline'

    const now = Date.now();
    const userId = session.user.id;

    switch (action) {
      case 'heartbeat':
      case 'online':
        userActivity.set(userId, {
          userId,
          lastSeen: now,
          isOnline: true
        });
        break;
      
      case 'offline':
        userActivity.set(userId, {
          userId,
          lastSeen: now,
          isOnline: false
        });
        break;
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Clean up old activity
    cleanupActivity();

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in POST /api/users/activity:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Get activity status for multiple users
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userIds = searchParams.get('userIds')?.split(',') || [];

    if (userIds.length === 0) {
      return NextResponse.json({ activities: {} });
    }

    // Clean up old activity
    cleanupActivity();

    // Get activity for requested users
    const activities: Record<string, { isOnline: boolean; lastSeen: number }> = {};
    
    for (const userId of userIds) {
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

    return NextResponse.json({ activities });

  } catch (error) {
    console.error('Error in GET /api/users/activity:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

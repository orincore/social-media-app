import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

// GET - Debug endpoint to check recent notifications
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get recent notifications for the user
    const { data: notifications, error } = await adminClient
      .from('notifications')
      .select(`
        *,
        actor:actor_id (
          id,
          username,
          display_name,
          avatar_url,
          is_verified
        )
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching debug notifications:', error);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    // Get unread count
    const { count: unreadCount } = await adminClient
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .eq('is_read', false);

    return NextResponse.json({
      success: true,
      user_id: session.user.id,
      unreadCount: unreadCount || 0,
      recentNotifications: notifications || [],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in GET /api/notifications/debug:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

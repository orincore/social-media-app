import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

// PUT - Mark notifications as read
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationIds, markAll = false } = body;

    if (markAll) {
      // Mark all notifications as read for the user
      const { error } = await adminClient
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', session.user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'All notifications marked as read' 
      });
    }

    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json({ error: 'Invalid notification IDs' }, { status: 400 });
    }

    // Mark specific notifications as read
    const { error } = await adminClient
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', session.user.id)
      .in('id', notificationIds);

    if (error) {
      console.error('Error marking notifications as read:', error);
      return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Notifications marked as read' 
    });

  } catch (error) {
    console.error('Error in PUT /api/notifications/read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

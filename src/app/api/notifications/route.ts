import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

// GET - Fetch user notifications
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const unreadOnly = searchParams.get('unread') === 'true';
    const offset = (page - 1) * limit;

    // Build query
    let query = adminClient
      .from('notifications')
      .select(`
        *,
        actor:actor_id (
          id,
          username,
          display_name,
          avatar_url,
          is_verified
        ),
        post:post_id (
          id,
          content,
          media_urls
        )
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    // Get unread count
    const { count: unreadCount } = await adminClient
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .eq('is_read', false);

    return NextResponse.json({
      notifications: notifications || [],
      unreadCount: unreadCount || 0,
      pagination: {
        page,
        limit,
        hasMore: (notifications?.length || 0) === limit
      }
    });

  } catch (error) {
    console.error('Error in GET /api/notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a notification
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      user_id, 
      type, 
      content, 
      post_id, 
      comment_id,
      actor_id = session.user.id 
    } = body;

    // Don't create notification for self-actions
    if (user_id === actor_id) {
      return NextResponse.json({ message: 'No self-notification created' });
    }

    // Validate required fields
    if (!user_id || !type || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check for duplicate notifications (prevent spam)
    const { data: existingNotification } = await adminClient
      .from('notifications')
      .select('id')
      .eq('user_id', user_id)
      .eq('actor_id', actor_id)
      .eq('type', type)
      .eq('post_id', post_id || null)
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
      .single();

    if (existingNotification) {
      return NextResponse.json({ message: 'Duplicate notification prevented' });
    }

    // Create notification
    const { data: notification, error } = await adminClient
      .from('notifications')
      .insert({
        user_id,
        actor_id,
        type,
        content,
        post_id: post_id || null,
        comment_id: comment_id || null,
        is_read: false,
        created_at: new Date().toISOString()
      })
      .select(`
        *,
        actor:actor_id (
          id,
          username,
          display_name,
          avatar_url,
          is_verified
        ),
        post:post_id (
          id,
          content,
          media_urls
        )
      `)
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      notification,
      message: 'Notification created successfully' 
    });

  } catch (error) {
    console.error('Error in POST /api/notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

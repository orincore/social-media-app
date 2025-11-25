import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

interface MentionNotificationRequest {
  postId: string;
  mentionedUserIds: string[];
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId, mentionedUserIds, content }: MentionNotificationRequest = await request.json();

    if (!postId || !mentionedUserIds || mentionedUserIds.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get the post details
    const { data: post, error: postError } = await adminClient
      .from('posts')
      .select('id, content, user_id, users!inner(username, display_name)')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Create notifications for each mentioned user
    const notifications = mentionedUserIds.map(userId => ({
      user_id: userId,
      type: 'mention' as const,
      actor_id: session.user!.id,
      post_id: postId,
      content: `${(post.users as any).display_name} mentioned you in a post: "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`,
      is_read: false,
      created_at: new Date().toISOString()
    }));

    // Insert notifications
    const { error: notificationError } = await adminClient
      .from('notifications')
      .insert(notifications);

    if (notificationError) {
      console.error('Error creating mention notifications:', notificationError);
      return NextResponse.json({ error: 'Failed to create notifications' }, { status: 500 });
    }

    // Note: We're only creating notifications, not separate mention records
    // The mention information is stored in the notification data

    return NextResponse.json({ 
      success: true, 
      notificationsCreated: notifications.length 
    });

  } catch (error) {
    console.error('Error in mention notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

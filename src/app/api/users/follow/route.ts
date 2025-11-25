import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (userId === session.user.id) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    // Check if already following
    const { data: existingFollow } = await adminClient
      .from('follows')
      .select('id')
      .eq('follower_id', session.user.id)
      .eq('following_id', userId)
      .single();

    if (existingFollow) {
      return NextResponse.json({ error: 'Already following this user' }, { status: 400 });
    }

    // Create follow relationship
    const { error: followError } = await adminClient
      .from('follows')
      .insert({
        follower_id: session.user.id,
        following_id: userId,
        created_at: new Date().toISOString()
      });

    if (followError) {
      console.error('Error creating follow:', followError);
      return NextResponse.json({ error: 'Failed to follow user' }, { status: 500 });
    }

    // Update follower count for the followed user
    // First get current count, then increment
    const { data: userData } = await adminClient
      .from('users')
      .select('followers_count')
      .eq('id', userId)
      .single();

    const currentCount = userData?.followers_count || 0;
    const { error: updateError } = await adminClient
      .from('users')
      .update({ 
        followers_count: currentCount + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating follower count:', updateError);
      // Don't fail the request if count update fails
    }

    // Create notification for the followed user
    try {
      await adminClient
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'follow',
          actor_id: session.user.id,
          content: 'started following you',
          is_read: false,
          created_at: new Date().toISOString()
        });
    } catch (notificationError) {
      console.error('Error creating follow notification:', notificationError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in follow user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Remove follow relationship
    const { error: unfollowError } = await adminClient
      .from('follows')
      .delete()
      .eq('follower_id', session.user.id)
      .eq('following_id', userId);

    if (unfollowError) {
      console.error('Error unfollowing user:', unfollowError);
      return NextResponse.json({ error: 'Failed to unfollow user' }, { status: 500 });
    }

    // Update follower count for the unfollowed user
    // First get current count, then decrement
    const { data: userData } = await adminClient
      .from('users')
      .select('followers_count')
      .eq('id', userId)
      .single();

    const currentCount = userData?.followers_count || 0;
    const { error: updateError } = await adminClient
      .from('users')
      .update({ 
        followers_count: Math.max(0, currentCount - 1),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating follower count:', updateError);
      // Don't fail the request if count update fails
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in unfollow user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

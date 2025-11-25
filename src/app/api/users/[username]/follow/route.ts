import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

// POST - Follow a user by username
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { username } = await params;
    const followerId = session.user.id;

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // Get user by username
    const { data: targetUser, error: userError } = await adminClient
      .from('users')
      .select('id, username')
      .eq('username', username)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = targetUser.id;

    if (followerId === userId) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    // Check if already following
    const { data: existingFollow } = await adminClient
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', userId)
      .single();

    if (existingFollow) {
      return NextResponse.json({ error: 'Already following this user' }, { status: 400 });
    }

    // Create follow relationship
    const { error: followError } = await adminClient
      .from('follows')
      .insert({
        follower_id: followerId,
        following_id: userId,
        created_at: new Date().toISOString()
      });

    if (followError) {
      console.error('Error creating follow relationship:', followError);
      return NextResponse.json({ error: 'Failed to follow user' }, { status: 500 });
    }

    // Update follower count for target user
    const { data: targetUserData } = await adminClient
      .from('users')
      .select('followers_count')
      .eq('id', userId)
      .single();

    if (targetUserData) {
      await adminClient
        .from('users')
        .update({
          followers_count: (targetUserData.followers_count || 0) + 1
        })
        .eq('id', userId);
    }

    // Update following count for current user
    const { data: currentUserData } = await adminClient
      .from('users')
      .select('following_count')
      .eq('id', followerId)
      .single();

    if (currentUserData) {
      await adminClient
        .from('users')
        .update({
          following_count: (currentUserData.following_count || 0) + 1
        })
        .eq('id', followerId);
    }

    // Create follow notification
    const { data: followerData } = await adminClient
      .from('users')
      .select('display_name, username')
      .eq('id', followerId)
      .single();

    if (followerData) {
      await adminClient
        .from('notifications')
        .insert({
          user_id: userId,
          actor_id: followerId,
          type: 'follow',
          content: `${followerData.display_name} (@${followerData.username}) started following you`,
          is_read: false,
          created_at: new Date().toISOString()
        });
    }

    return NextResponse.json({ success: true, message: 'Successfully followed user' });

  } catch (error) {
    console.error('Error in POST /api/users/[username]/follow:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Unfollow a user by username
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { username } = await params;
    const followerId = session.user.id;

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // Get user by username
    const { data: targetUser, error: userError } = await adminClient
      .from('users')
      .select('id, username')
      .eq('username', username)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = targetUser.id;

    if (followerId === userId) {
      return NextResponse.json({ error: 'Cannot unfollow yourself' }, { status: 400 });
    }

    // Check if following relationship exists
    const { data: existingFollow, error: checkError } = await adminClient
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', userId)
      .single();

    if (checkError || !existingFollow) {
      return NextResponse.json({ error: 'Not following this user' }, { status: 400 });
    }

    // Delete follow relationship
    const { error: unfollowError } = await adminClient
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', userId);

    if (unfollowError) {
      console.error('Error deleting follow relationship:', unfollowError);
      return NextResponse.json({ error: 'Failed to unfollow user' }, { status: 500 });
    }

    // Update follower count for target user
    const { data: targetUserData } = await adminClient
      .from('users')
      .select('followers_count')
      .eq('id', userId)
      .single();

    if (targetUserData) {
      await adminClient
        .from('users')
        .update({
          followers_count: Math.max((targetUserData.followers_count || 0) - 1, 0)
        })
        .eq('id', userId);
    }

    // Update following count for current user
    const { data: currentUserData } = await adminClient
      .from('users')
      .select('following_count')
      .eq('id', followerId)
      .single();

    if (currentUserData) {
      await adminClient
        .from('users')
        .update({
          following_count: Math.max((currentUserData.following_count || 0) - 1, 0)
        })
        .eq('id', followerId);
    }

    return NextResponse.json({ success: true, message: 'Successfully unfollowed user' });

  } catch (error) {
    console.error('Error in DELETE /api/users/[username]/follow:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

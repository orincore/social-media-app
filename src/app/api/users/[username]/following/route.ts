import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

// GET - Get users that a user is following with pagination
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { username } = await params;

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // Get user by username
    const { data: user, error: userError } = await adminClient
      .from('users')
      .select('id, is_private')
      .eq('username', username)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if profile is private and user is not following
    if (user.is_private && session?.user?.id !== user.id) {
      const { data: followRecord } = await adminClient
        .from('follows')
        .select('id')
        .eq('follower_id', session?.user?.id || '')
        .eq('following_id', user.id)
        .single();

      if (!followRecord) {
        return NextResponse.json(
          { error: 'This account is private' },
          { status: 403 }
        );
      }
    }

    // Parse pagination params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const cursor = searchParams.get('cursor'); // For cursor-based pagination
    const offset = (page - 1) * limit;

    // Build query for following - get follow records first
    let followsQuery = adminClient
      .from('follows')
      .select('id, following_id, created_at', { count: 'exact' })
      .eq('follower_id', user.id)
      .order('created_at', { ascending: false });

    // Apply cursor-based pagination if cursor is provided
    if (cursor) {
      followsQuery = followsQuery.lt('created_at', cursor);
    }

    followsQuery = followsQuery.range(offset, offset + limit - 1);

    const { data: followRecords, error: followsError, count } = await followsQuery;

    if (followsError) {
      console.error('Error fetching following:', followsError);
      return NextResponse.json(
        { error: 'Failed to fetch following' },
        { status: 500 }
      );
    }

    // Get following user details
    const followingIds = followRecords?.map(f => f.following_id) || [];
    
    if (followingIds.length === 0) {
      return NextResponse.json({
        following: [],
        pagination: {
          page,
          limit,
          total: 0,
          hasMore: false,
          nextCursor: null,
        },
      });
    }

    const { data: followingUsers, error: usersError } = await adminClient
      .from('users')
      .select('id, username, display_name, avatar_url, bio, is_verified, followers_count')
      .in('id', followingIds);

    if (usersError) {
      console.error('Error fetching following users:', usersError);
      return NextResponse.json(
        { error: 'Failed to fetch following details' },
        { status: 500 }
      );
    }

    // Create a map for quick lookup
    const userMap = new Map(followingUsers?.map(u => [u.id, u]) || []);

    // Check if current user is following each user in the list
    let currentUserFollowingMap: Record<string, boolean> = {};
    if (session?.user?.id && followingIds.length > 0) {
      const { data: followingRecords } = await adminClient
        .from('follows')
        .select('following_id')
        .eq('follower_id', session.user.id)
        .in('following_id', followingIds);

      currentUserFollowingMap = (followingRecords || []).reduce((acc, record) => {
        acc[record.following_id] = true;
        return acc;
      }, {} as Record<string, boolean>);
    }

    // Format response maintaining order from follows query
    const formattedFollowing = followRecords?.map(f => {
      const followingUser = userMap.get(f.following_id);
      if (!followingUser) return null;
      
      return {
        id: followingUser.id,
        username: followingUser.username,
        display_name: followingUser.display_name,
        avatar_url: followingUser.avatar_url,
        bio: followingUser.bio,
        is_verified: followingUser.is_verified,
        followers_count: followingUser.followers_count,
        followed_at: f.created_at,
        is_following: currentUserFollowingMap[followingUser.id] || false,
        is_current_user: followingUser.id === session?.user?.id,
      };
    }).filter(Boolean) || [];

    // Get next cursor for cursor-based pagination
    const nextCursor = followRecords && followRecords.length === limit
      ? followRecords[followRecords.length - 1].created_at
      : null;

    return NextResponse.json({
      following: formattedFollowing,
      pagination: {
        page,
        limit,
        total: count || 0,
        hasMore: (count || 0) > offset + limit,
        nextCursor,
      },
    });

  } catch (error) {
    console.error('Error in GET /api/users/[username]/following:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

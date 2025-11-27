import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

// GET - Get followers of a user with pagination
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

    // Build query for followers - get follow records first
    let followsQuery = adminClient
      .from('follows')
      .select('id, follower_id, created_at', { count: 'exact' })
      .eq('following_id', user.id)
      .order('created_at', { ascending: false });

    // Apply cursor-based pagination if cursor is provided
    if (cursor) {
      followsQuery = followsQuery.lt('created_at', cursor);
    }

    followsQuery = followsQuery.range(offset, offset + limit - 1);

    const { data: followRecords, error: followsError, count } = await followsQuery;

    if (followsError) {
      console.error('Error fetching followers:', followsError);
      return NextResponse.json(
        { error: 'Failed to fetch followers' },
        { status: 500 }
      );
    }

    // Get follower user details
    const followerIds = followRecords?.map(f => f.follower_id) || [];
    
    if (followerIds.length === 0) {
      return NextResponse.json({
        followers: [],
        pagination: {
          page,
          limit,
          total: 0,
          hasMore: false,
          nextCursor: null,
        },
      });
    }

    const { data: followerUsers, error: usersError } = await adminClient
      .from('users')
      .select('id, username, display_name, avatar_url, bio, is_verified, followers_count')
      .in('id', followerIds);

    if (usersError) {
      console.error('Error fetching follower users:', usersError);
      return NextResponse.json(
        { error: 'Failed to fetch follower details' },
        { status: 500 }
      );
    }

    // Create a map for quick lookup
    const userMap = new Map(followerUsers?.map(u => [u.id, u]) || []);

    // Check if current user is following each follower
    let followingMap: Record<string, boolean> = {};
    if (session?.user?.id && followerIds.length > 0) {
      const { data: followingRecords } = await adminClient
        .from('follows')
        .select('following_id')
        .eq('follower_id', session.user.id)
        .in('following_id', followerIds);

      followingMap = (followingRecords || []).reduce((acc, record) => {
        acc[record.following_id] = true;
        return acc;
      }, {} as Record<string, boolean>);
    }

    // Format response maintaining order from follows query
    const formattedFollowers = followRecords?.map(f => {
      const follower = userMap.get(f.follower_id);
      if (!follower) return null;
      
      return {
        id: follower.id,
        username: follower.username,
        display_name: follower.display_name,
        avatar_url: follower.avatar_url,
        bio: follower.bio,
        is_verified: follower.is_verified,
        followers_count: follower.followers_count,
        followed_at: f.created_at,
        is_following: followingMap[follower.id] || false,
        is_current_user: follower.id === session?.user?.id,
      };
    }).filter(Boolean) || [];

    // Get next cursor for cursor-based pagination
    const nextCursor = followRecords && followRecords.length === limit
      ? followRecords[followRecords.length - 1].created_at
      : null;

    return NextResponse.json({
      followers: formattedFollowers,
      pagination: {
        page,
        limit,
        total: count || 0,
        hasMore: (count || 0) > offset + limit,
        nextCursor,
      },
    });

  } catch (error) {
    console.error('Error in GET /api/users/[username]/followers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

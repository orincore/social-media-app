import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5');

    // Get users that the current user is not following
    // First get users the current user is already following
    const { data: following, error: followingError } = await adminClient
      .from('follows')
      .select('following_id')
      .eq('follower_id', session.user.id);

    if (followingError) {
      console.error('Error fetching following list:', followingError);
      return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
    }

    const followingIds = following?.map(f => f.following_id) || [];
    // Add current user ID to exclude them from suggestions
    followingIds.push(session.user.id);

    // Get suggested users (users not being followed, ordered by followers count or posts count)
    // Exclude deleted, banned, and suspended users
    let query = adminClient
      .from('users')
      .select('id, username, display_name, avatar_url, is_verified, bio, followers_count, posts_count, status')
      .not('id', 'in', `(${followingIds.join(',')})`)
      .or('status.is.null,status.eq.active') // Only show active users or users with no status set
      .order('followers_count', { ascending: false })
      .limit(limit);

    const { data: users, error } = await query as { data: Array<{ id: string; username: string; display_name: string; avatar_url: string | null; is_verified: boolean; bio: string | null; followers_count: number; posts_count: number; status?: string }> | null; error: any };

    if (error) {
      console.error('Error fetching user suggestions:', error);
      return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
    }

    // Format users for display
    const formattedUsers = users?.map(user => ({
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      is_verified: user.is_verified,
      bio: user.bio,
      followers_count: user.followers_count || 0,
      posts_count: user.posts_count || 0,
      reason: 'Popular in your network' // Could be enhanced with better recommendation logic
    })) || [];

    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    console.error('Error in user suggestions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

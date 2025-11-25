import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

// GET - Fetch user profile information
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { userId } = await params;

    // Fetch user profile
    const { data: user, error: userError } = await adminClient
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get post counts
    const [
      { count: postsCount },
      { count: repostsCount },
      { count: mediaCount },
      { count: likesCount }
    ] = await Promise.all([
      // Original posts count
      adminClient
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('repost_of_id', null),
      
      // Reposts count
      adminClient
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .not('repost_of_id', 'is', null),
      
      // Media posts count
      adminClient
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .not('media_urls', 'is', null),
      
      // Liked posts count
      adminClient
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
    ]);

    // Check if current user is following this profile (if authenticated)
    let isFollowing = false;
    if (session?.user?.id && session.user.id !== userId) {
      // TODO: Implement following system
      // const { data: follow } = await adminClient
      //   .from('follows')
      //   .select('id')
      //   .eq('follower_id', session.user.id)
      //   .eq('following_id', userId)
      //   .single();
      // isFollowing = !!follow;
    }

    return NextResponse.json({
      user: {
        ...user,
        isOwnProfile: session?.user?.id === userId,
        isFollowing,
        stats: {
          posts: postsCount || 0,
          reposts: repostsCount || 0,
          media: mediaCount || 0,
          likes: likesCount || 0,
          // TODO: Add followers/following counts when implemented
          followers: user.followers_count || 0,
          following: user.following_count || 0,
        }
      }
    });

  } catch (error) {
    console.error('Error in GET /api/profile/[userId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

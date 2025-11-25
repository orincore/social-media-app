import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

// GET - Fetch user's posts with different types
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const type = searchParams.get('type') || 'posts'; // posts, reposts, media, likes
    const offset = (page - 1) * limit;

    let query;
    let likedPostIds: string[] = [];

    switch (type) {
      case 'posts':
        // Get user's original posts (not reposts)
        query = adminClient
          .from('posts')
          .select(`
            *,
            user:users (
              id,
              username,
              display_name,
              avatar_url,
              is_verified
            )
          `)
          .eq('user_id', userId)
          .is('repost_of_id', null)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
        break;

      case 'reposts':
        // Get user's reposts
        query = adminClient
          .from('posts')
          .select(`
            *,
            user:users (
              id,
              username,
              display_name,
              avatar_url,
              is_verified
            )
          `)
          .eq('user_id', userId)
          .not('repost_of_id', 'is', null)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
        break;

      case 'replies':
        // Get user's replies (posts that have a parent_id)
        query = adminClient
          .from('posts')
          .select(`
            *,
            user:users (
              id,
              username,
              display_name,
              avatar_url,
              is_verified
            )
          `)
          .eq('user_id', userId)
          .not('parent_id', 'is', null)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
        break;

      case 'media':
        // Get posts with media (both original posts and reposts)
        query = adminClient
          .from('posts')
          .select(`
            *,
            user:users (
              id,
              username,
              display_name,
              avatar_url,
              is_verified
            )
          `)
          .eq('user_id', userId)
          .not('media_urls', 'is', null)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
        break;

      case 'likes':
        // Get posts that user has liked
        const { data: likes } = await adminClient
          .from('likes')
          .select('post_id')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (!likes || likes.length === 0) {
          return NextResponse.json({
            posts: [],
            likedPostIds: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
              hasMore: false,
            },
          });
        }

        const postIds = likes.map(like => like.post_id).filter((id): id is string => Boolean(id));
        
        query = adminClient
          .from('posts')
          .select(`
            *,
            user:users (
              id,
              username,
              display_name,
              avatar_url,
              is_verified
            )
          `)
          .in('id', postIds)
          .order('created_at', { ascending: false });
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid type parameter' },
          { status: 400 }
        );
    }

    const { data: posts, error } = await query;

    if (error) {
      console.error('Error fetching posts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch posts' },
        { status: 500 }
      );
    }

    // Get liked post IDs for current user if authenticated
    if (session?.user?.id && posts && posts.length > 0) {
      const postIds = posts.map(post => post.id);
      const { data: likes } = await adminClient
        .from('likes')
        .select('post_id')
        .eq('user_id', session.user.id)
        .in('post_id', postIds);

      if (likes) {
        likedPostIds = likes.map(like => like.post_id).filter((id): id is string => Boolean(id));
      }
    }

    // Get total count for pagination
    let countQuery;
    switch (type) {
      case 'posts':
        countQuery = adminClient
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .is('repost_of_id', null);
        break;
      case 'reposts':
        countQuery = adminClient
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .not('repost_of_id', 'is', null);
        break;
      case 'replies':
        countQuery = adminClient
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .not('parent_id', 'is', null);
        break;
      case 'media':
        countQuery = adminClient
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .not('media_urls', 'is', null);
        break;
      case 'likes':
        countQuery = adminClient
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);
        break;
    }

    const { count: totalCount } = await countQuery || { count: 0 };

    return NextResponse.json({
      posts: posts || [],
      likedPostIds,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
        hasMore: offset + limit < (totalCount || 0),
      },
    });

  } catch (error) {
    console.error('Error in GET /api/profile/[userId]/posts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

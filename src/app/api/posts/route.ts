import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';

// GET - Fetch posts with pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const hashtag = searchParams.get('hashtag');
    const userId = searchParams.get('userId');
    
    const offset = (page - 1) * limit;

    // Fetch posts first
    let postsQuery = adminClient
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by hashtag if provided
    if (hashtag) {
      postsQuery = postsQuery.contains('hashtags', [hashtag.toLowerCase()]);
    }

    // Filter by user if provided
    if (userId) {
      postsQuery = postsQuery.eq('user_id', userId);
    }

    const { data: rawPosts, error: postsError } = await postsQuery;

    if (postsError) {
      console.error('Error fetching posts:', postsError);
      return NextResponse.json(
        { error: 'Failed to fetch posts' },
        { status: 500 }
      );
    }

    // Fetch all users for these posts separately (guaranteed to work)
    const userIds = [...new Set(rawPosts?.map(p => p.user_id).filter(Boolean) || [])];

    // Also collect original post IDs for reposts so we can resolve original user
    const originalPostIds = [...new Set(
      rawPosts
        ?.map(p => p.repost_of_id as string | null)
        .filter((id): id is string => !!id) || []
    )];

    // Map of user id -> user record
    let userMap = new Map<string, any>();
    if (userIds.length > 0) {
      const { data: users, error: usersError } = await adminClient
        .from('users')
        .select('id, username, display_name, avatar_url, is_verified')
        .in('id', userIds);
      
      if (!usersError && users) {
        userMap = new Map(users.map(u => [u.id, u]));
      }
      console.log('Fetched users:', users?.length, 'Sample user:', users?.[0]);
    }

    // Map of original post id -> original post (only id and user_id are needed)
    let originalPostMap = new Map<string, { id: string; user_id: string }>();
    if (originalPostIds.length > 0) {
      const { data: originalPosts, error: originalError } = await adminClient
        .from('posts')
        .select('id, user_id')
        .in('id', originalPostIds);

      if (!originalError && originalPosts) {
        originalPostMap = new Map(
          originalPosts
            .filter(p => p.id && p.user_id)
            .map(p => [p.id as string, { id: p.id as string, user_id: p.user_id as string }])
        );
      }
    }

    // Combine posts with user data and original user for reposts
    const posts = rawPosts?.map(p => {
      const user = userMap.get(p.user_id) || null;

      let repostedFromUser: any | null = null;
      if (p.repost_of_id) {
        const original = originalPostMap.get(p.repost_of_id as string);
        if (original) {
          repostedFromUser = userMap.get(original.user_id) || null;
        }
      }

      return {
        ...p,
        user,
        reposted_from_user: repostedFromUser,
      };
    }) || [];
    
    console.log('Posts with users:', posts.length, 'First post user:', posts[0]?.user);

    // Get user's liked and reposted posts if logged in
    let likedPostIds: string[] = [];
    let repostedPostIds: string[] = [];

    if (session?.user?.id && posts && posts.length > 0) {
      const postIds = posts.map(p => p.id);

      // Get likes using admin client
      const { data: likes } = await adminClient
        .from('likes')
        .select('post_id')
        .eq('user_id', session.user.id)
        .in('post_id', postIds);

      if (likes) {
        likedPostIds = likes.map(l => l.post_id).filter((id): id is string => id !== null);
      }

      // Get reposts using admin client
      const { data: reposts } = await adminClient
        .from('posts')
        .select('repost_of_id')
        .eq('user_id', session.user.id)
        .in('repost_of_id', postIds);

      if (reposts) {
        repostedPostIds = reposts.map(r => r.repost_of_id).filter((id): id is string => id !== null);
      }
    }

    // Get total count for pagination using admin client
    let countQuery = adminClient
      .from('posts')
      .select('*', { count: 'exact', head: true });

    if (hashtag) {
      countQuery = countQuery.contains('hashtags', [hashtag.toLowerCase()]);
    }
    if (userId) {
      countQuery = countQuery.eq('user_id', userId);
    }

    const { count: totalCount } = await countQuery;

    return NextResponse.json({
      posts: posts || [],
      likedPostIds,
      repostedPostIds,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
        hasMore: offset + limit < (totalCount || 0),
      },
    });
  } catch (error) {
    console.error('Error in GET /api/posts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new post
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const body = await request.json();
    const { content, mediaUrls, hashtags: providedHashtags, mentions: providedMentions } = body;

    // Validate that either content or media is provided
    if ((!content || content.trim().length === 0) && (!mediaUrls || mediaUrls.length === 0)) {
      return NextResponse.json(
        { error: 'Content or media is required' },
        { status: 400 }
      );
    }

    // Validate content length (increased to 1000 characters)
    if (content && content.length > 1000) {
      return NextResponse.json(
        { error: 'Content exceeds 1000 characters' },
        { status: 400 }
      );
    }

    // Validate media URLs
    if (mediaUrls && mediaUrls.length > 4) {
      return NextResponse.json(
        { error: 'Maximum 4 media files allowed' },
        { status: 400 }
      );
    }

    // Use provided hashtags/mentions or extract from content
    let hashtags: string[] = [];
    let mentions: string[] = [];

    if (providedHashtags && Array.isArray(providedHashtags)) {
      hashtags = [...new Set(providedHashtags.map(tag => tag.toLowerCase()))];
    } else if (content) {
      const hashtagRegex = /#(\w+)/g;
      const matches = content.match(hashtagRegex) as string[] | null;
      hashtags = matches 
        ? [...new Set(matches.map((tag: string) => tag.slice(1).toLowerCase()))]
        : [];
    }

    if (providedMentions && Array.isArray(providedMentions)) {
      mentions = [...new Set(providedMentions.map(mention => mention.toLowerCase()))];
    } else if (content) {
      const mentionRegex = /@(\w+)/g;
      const mentionMatches = content.match(mentionRegex) as string[] | null;
      mentions = mentionMatches 
        ? [...new Set(mentionMatches.map((mention: string) => mention.slice(1).toLowerCase()))]
        : [];
    }

    // Create the post
    const postData: {
      user_id: string;
      content: string;
      media_urls: string[] | null;
      hashtags: string[] | null;
      mentions: string[] | null;
    } = {
      user_id: session.user.id,
      content: content ? content.trim() : '',
      media_urls: mediaUrls && mediaUrls.length > 0 ? mediaUrls : null,
      hashtags: hashtags.length > 0 ? hashtags : null,
      mentions: mentions.length > 0 ? mentions : null,
    };

    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert(postData)
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
      .single();

    if (postError) {
      console.error('Error creating post:', postError);
      return NextResponse.json(
        { error: 'Failed to create post' },
        { status: 500 }
      );
    }

    // Update hashtag counts
    if (hashtags.length > 0) {
      for (const tag of hashtags) {
        const tagName: string = tag;
        // Try to update existing hashtag
        const { data: existingTag } = await supabase
          .from('hashtags')
          .select('id, posts_count')
          .eq('name', tagName)
          .single();

        if (existingTag) {
          await supabase
            .from('hashtags')
            .update({ 
              posts_count: existingTag.posts_count + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingTag.id);
        } else {
          await supabase
            .from('hashtags')
            .insert({ name: tagName, posts_count: 1 });
        }
      }
    }

    // Update user's posts count
    const { data: currentUser } = await supabase
      .from('users')
      .select('posts_count')
      .eq('id', session.user.id)
      .single();

    if (currentUser) {
      await supabase
        .from('users')
        .update({ posts_count: (currentUser.posts_count || 0) + 1 })
        .eq('id', session.user.id);
    }

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/posts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

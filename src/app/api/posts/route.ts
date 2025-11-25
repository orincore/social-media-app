import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

// Basic content moderation interface
interface ModerationResult {
  isViolation: boolean;
  violationType?: 'anti_national' | 'harassment' | 'sexual_harassment' | 'hate_speech' | 'violence' | 'spam' | 'other';
  confidence: number;
  reason?: string;
}

// Strike result interface
interface StrikeResult {
  strike_id: string;
  strike_count: number;
  should_suspend: boolean;
}

// Extended admin client interface for RPC calls
interface ExtendedAdminClient {
  rpc: (functionName: string, params: Record<string, unknown>) => Promise<{ data: StrikeResult | null }>;
}

// Fast keyword-based content moderation (no external dependencies)
function basicContentModeration(content: string): ModerationResult {
  const contentLower = content.toLowerCase().trim();
  
  // Enhanced keyword lists for comprehensive filtering
  const violationPatterns = [
    // Anti-national (High Priority - 95% confidence)
    {
      keywords: [
        'terrorist', 'terrorism', 'bomb', 'bombing', 'jihad', 'isis', 'al qaeda',
        'destroy country', 'overthrow government', 'kill president', 'destroy nation',
        'sedition', 'treason', 'anti national', 'death to', 'burn flag'
      ],
      type: 'anti_national' as const,
      confidence: 95,
      reason: 'Contains anti-national or terrorist content'
    },
    
    // Violence & Threats (High Priority - 90% confidence)
    {
      keywords: [
        'kill yourself', 'kys', 'i will kill', 'murder you', 'death threat',
        'shoot you', 'stab you', 'beat you up', 'hurt you', 'harm you',
        'violence', 'assault', 'attack you', 'destroy you'
      ],
      type: 'violence' as const,
      confidence: 90,
      reason: 'Contains violent threats or content'
    },
    
    // Harassment (High Priority - 85% confidence)
    {
      keywords: [
        'kill yourself', 'go die', 'end yourself', 'worthless', 'pathetic loser',
        'nobody likes you', 'you suck', 'hate you', 'stupid idiot',
        'piece of shit', 'go to hell', 'waste of space'
      ],
      type: 'harassment' as const,
      confidence: 85,
      reason: 'Contains harassment or bullying language'
    },
    
    // Hate Speech (High Priority - 85% confidence)
    {
      keywords: [
        'racial slur', 'religious hate', 'bigot', 'racist', 'sexist',
        'homophobic', 'transphobic', 'hate speech', 'discrimination',
        'nazi', 'fascist', 'supremacist'
      ],
      type: 'hate_speech' as const,
      confidence: 85,
      reason: 'Contains hate speech or discriminatory content'
    },
    
    // Sexual Harassment (Medium Priority - 80% confidence)
    {
      keywords: [
        'send nudes', 'sexual favor', 'sexual harassment', 'inappropriate sexual',
        'explicit content', 'unwanted advance', 'sexual assault'
      ],
      type: 'sexual_harassment' as const,
      confidence: 80,
      reason: 'Contains sexual harassment content'
    },
    
    // Spam (Lower Priority - 70% confidence)
    {
      keywords: [
        'buy now', 'click here', 'free money', 'urgent offer', 'limited time',
        'act now', 'call now', 'order now', 'special deal', 'guaranteed money',
        'make money fast', 'work from home', 'get rich quick'
      ],
      type: 'spam' as const,
      confidence: 70,
      reason: 'Appears to be spam or promotional content'
    }
  ];

  // Check each pattern (ordered by priority)
  for (const pattern of violationPatterns) {
    for (const keyword of pattern.keywords) {
      if (contentLower.includes(keyword)) {
        return {
          isViolation: true,
          violationType: pattern.type,
          confidence: pattern.confidence,
          reason: pattern.reason
        };
      }
    }
  }

  return {
    isViolation: false,
    confidence: 0,
    reason: 'Content appears safe'
  };
}

// GET - Fetch posts with pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const hashtag = searchParams.get('hashtag');
    const userId = searchParams.get('userId');
    const feedType = searchParams.get('feedType');
    
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

    // Handle following feed type - only show posts from users the current user follows
    if (feedType === 'following' && session?.user?.id) {
      // First get the list of users the current user is following
      const { data: followingData, error: followingError } = await adminClient
        .from('follows')
        .select('following_id')
        .eq('follower_id', session.user.id);

      if (followingError) {
        console.error('Error fetching following list:', followingError);
        return NextResponse.json(
          { error: 'Failed to fetch following list' },
          { status: 500 }
        );
      }

      const followingIds = followingData?.map(f => f.following_id) || [];
      
      // If user is not following anyone, return empty results
      if (followingIds.length === 0) {
        return NextResponse.json({
          posts: [],
          pagination: {
            page,
            limit,
            hasMore: false
          },
          likedPostIds: [],
          repostedPostIds: []
        });
      }

      // Filter posts to only include those from followed users
      postsQuery = postsQuery.in('user_id', followingIds);
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
    const userIds = Array.from(new Set(rawPosts?.map(p => p.user_id).filter(Boolean) || []));

    // Also collect original post IDs for reposts so we can resolve original user
    const originalPostIds = Array.from(new Set(
      rawPosts
        ?.map(p => p.repost_of_id as string | null)
        .filter((id): id is string => !!id) || []
    ));

    // Map of user id -> user record
    interface UserRecord {
      id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
      is_verified: boolean;
    }
    let userMap = new Map<string, UserRecord>();
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

      let repostedFromUser: UserRecord | null = null;
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

    // Ensure content meets requirements
    let trimmedContent = content ? content.trim() : '';
    
    // Check if content is only whitespace/newlines (which might fail the constraint)
    const contentWithoutWhitespace = trimmedContent.replace(/\s+/g, ' ').trim();
    
    // Content validation passed - proceeding with post creation
    
    // If no media, content must be provided and non-empty
    if ((!mediaUrls || mediaUrls.length === 0)) {
      if (!trimmedContent || trimmedContent.length === 0) {
        return NextResponse.json(
          { error: 'Post content is required when no media is provided' },
          { status: 400 }
        );
      }
      
      // Check if content is only whitespace (which might fail database constraint)
      if (contentWithoutWhitespace.length === 0) {
        return NextResponse.json(
          { error: 'Post content cannot be only whitespace when no media is provided' },
          { status: 400 }
        );
      }
      
      // Minimum content length when no media
      if (contentWithoutWhitespace.length < 1) {
        return NextResponse.json(
          { error: 'Post content must contain at least 1 non-whitespace character' },
          { status: 400 }
        );
      }
    }
    
    // Ensure content is not just whitespace or empty after trimming
    if (trimmedContent.length === 0 && (!mediaUrls || mediaUrls.length === 0)) {
      return NextResponse.json(
        { error: 'Post cannot be empty' },
        { status: 400 }
      );
    }
    
    // If content is empty but media is provided, set a minimal content
    if (trimmedContent.length === 0 && mediaUrls && mediaUrls.length > 0) {
      // Set a space character to satisfy potential database constraints
      trimmedContent = ' ';
    }
    
    // The database constraint might require content to be non-empty when media_urls is null
    // Let's ensure we meet this requirement
    if ((!mediaUrls || mediaUrls.length === 0) && (!trimmedContent || trimmedContent.length === 0)) {
      return NextResponse.json(
        { error: 'Database constraint: Content is required when no media is provided' },
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

    // Fast keyword-only moderation for immediate posting
    if (trimmedContent) {
      const moderationResult = basicContentModeration(trimmedContent);
      
      // Block for any keyword violations (immediate)
      if (moderationResult.isViolation && moderationResult.confidence > 60) {
        return NextResponse.json({
          error: 'Content violates community guidelines',
          reason: moderationResult.reason,
          violationType: moderationResult.violationType,
          blocked: true
        }, { status: 400 });
      }
    }

    // Create the post
    // Ensure content is a valid string that meets database constraints
    // Clean up content to remove any potentially problematic characters
    let finalContent = trimmedContent && trimmedContent.length > 0 ? trimmedContent : '';
    
    // If we have content, ensure it doesn't contain any characters that might violate the constraint
    if (finalContent.length > 0) {
      // Replace any null bytes or other problematic characters
      finalContent = finalContent.replace(/\0/g, '').replace(/\x00/g, '');
      
      // Content length is now handled by database constraint (1000 characters)
      // No need for truncation since API validation already limits to 1000 chars
      
      // Ensure content is not empty after cleaning
      if (finalContent.trim().length === 0) {
        finalContent = 'Post content'; // Fallback content
      }
    }

    // Extract hashtags and mentions from the final processed content
    let hashtags: string[] = [];
    let mentions: string[] = [];

    if (providedHashtags && Array.isArray(providedHashtags)) {
      hashtags = Array.from(new Set(providedHashtags.map(tag => tag.toLowerCase())));
    } else if (finalContent) {
      const hashtagRegex = /#(\w+)/g;
      const matches = finalContent.match(hashtagRegex) as string[] | null;
      hashtags = matches 
        ? Array.from(new Set(matches.map((tag: string) => tag.slice(1).toLowerCase())))
        : [];
    }

    if (providedMentions && Array.isArray(providedMentions)) {
      mentions = Array.from(new Set(providedMentions.map(mention => mention.toLowerCase())));
    } else if (finalContent) {
      const mentionRegex = /@(\w+)/g;
      const mentionMatches = finalContent.match(mentionRegex) as string[] | null;
      mentions = mentionMatches 
        ? Array.from(new Set(mentionMatches.map((mention: string) => mention.slice(1).toLowerCase())))
        : [];
    }
    
    // TEMPORARY FIX: The database constraint seems to require either media_urls OR specific content format
    // Let's try to satisfy the constraint by ensuring we meet its exact requirements
    const postData: {
      user_id: string;
      content: string;
      media_urls: string[] | null;
      hashtags: string[] | null;
      mentions: string[] | null;
    } = {
      user_id: session.user.id,
      content: finalContent,
      // Ensure media_urls is properly set - null when no media, array when media exists
      media_urls: (mediaUrls && mediaUrls.length > 0) ? mediaUrls : null,
      hashtags: hashtags.length > 0 ? hashtags : null,
      mentions: mentions.length > 0 ? mentions : null,
    };

    // Insert post data into database

    const { data: post, error: postError } = await adminClient
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
      
      // Handle specific constraint violations
      if (postError.code === '23514') {
        if (postError.message.includes('posts_content_check')) {
          return NextResponse.json(
            { 
              error: 'Post content does not meet requirements. Content must be between 1-1000 characters when no media is provided.',
              details: `Content length: ${postData.content.length} characters.`,
              dbError: postError.message
            },
            { status: 400 }
          );
        }
      }
      
      return NextResponse.json(
        { error: 'Failed to create post', details: postError.message },
        { status: 500 }
      );
    }

    // Return immediately - no background processing
    // Note: Hashtag and user counts can be updated later if needed

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/posts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

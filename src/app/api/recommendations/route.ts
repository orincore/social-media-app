import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { adminClient } from '@/lib/supabase/admin';

// GET - Get personalized recommendations based on user activity
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'posts'; // 'posts', 'hashtags', 'users'
    const limit = parseInt(searchParams.get('limit') || '20');

    const userId = session.user.id;

    if (type === 'posts') {
      return await getRecommendedPosts(userId, limit);
    } else if (type === 'hashtags') {
      return await getRecommendedHashtags(userId, limit);
    } else if (type === 'users') {
      return await getRecommendedUsers(userId, limit);
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

  } catch (error) {
    console.error('Error in GET /api/recommendations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getRecommendedPosts(userId: string, limit: number) {
  try {
    // Get user's liked posts to understand preferences
    const { data: likedPosts } = await adminClient
      .from('likes')
      .select(`
        post_id,
        posts!inner (
          hashtags,
          media_urls,
          user_id
        )
      `)
      .eq('user_id', userId)
      .limit(50);

    // Get user's followed accounts
    const { data: following } = await adminClient
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);

    const followingIds = following?.map(f => f.following_id) || [];

    // Analyze user preferences
    const preferences = analyzeUserPreferences(likedPosts || []);

    // Build recommendation query with repost data
    let query = adminClient
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
      .neq('user_id', userId) // Don't recommend user's own posts
      .order('created_at', { ascending: false });

    // If user has preferences, filter by them
    if (preferences.preferredHashtags.length > 0) {
      query = query.overlaps('hashtags', preferences.preferredHashtags);
    }

    const { data: posts, error } = await query.limit(limit * 2); // Get more to filter

    if (error) {
      console.error('Error fetching posts:', error);
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }

    // Get liked post IDs for current user
    const { data: userLikes } = await adminClient
      .from('likes')
      .select('post_id')
      .eq('user_id', userId);

    const likedPostIds = userLikes?.map(like => like.post_id) || [];

    // Get reposted post IDs for current user
    const { data: userReposts } = await adminClient
      .from('posts')
      .select('repost_of_id')
      .eq('user_id', userId)
      .not('repost_of_id', 'is', null);

    const repostedPostIds = userReposts?.map(repost => repost.repost_of_id).filter(id => id !== null) || [];

    // Get original post data for reposts
    const repostIds = posts?.filter(p => p.repost_of_id).map(p => p.repost_of_id).filter(id => id !== null) || [];
    let originalPostMap = new Map();
    
    if (repostIds.length > 0) {
      const { data: originalPosts } = await adminClient
        .from('posts')
        .select(`
          id,
          user_id,
          user:users (
            id,
            username,
            display_name,
            avatar_url,
            is_verified
          )
        `)
        .in('id', repostIds);

      if (originalPosts) {
        originalPostMap = new Map(originalPosts.map(p => [p.id, p.user]));
      }
    }

    // Add reposted_from_user to posts and score them
    const scoredPosts = (posts || []).map(post => ({
      ...post,
      reposted_from_user: post.repost_of_id ? originalPostMap.get(post.repost_of_id) : null,
      score: calculatePostScore(post, preferences, followingIds)
    }));

    // Sort by score and return top posts
    const recommendedPosts = scoredPosts
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return NextResponse.json({ 
      posts: recommendedPosts,
      likedPostIds,
      repostedPostIds,
      preferences: {
        hashtags: preferences.preferredHashtags.slice(0, 5),
        mediaPreference: preferences.mediaPreference,
        totalLikes: likedPosts?.length || 0
      }
    });

  } catch (error) {
    console.error('Error getting recommended posts:', error);
    return NextResponse.json({ error: 'Failed to get recommendations' }, { status: 500 });
  }
}

async function getRecommendedHashtags(userId: string, limit: number) {
  try {
    // Get user's liked posts hashtags
    const { data: likedPosts } = await adminClient
      .from('likes')
      .select(`
        posts!inner (hashtags)
      `)
      .eq('user_id', userId);

    // Get trending hashtags from recent posts
    const { data: recentPosts } = await adminClient
      .from('posts')
      .select('hashtags')
      .not('hashtags', 'is', null)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(1000);

    // Count hashtag frequency
    const hashtagCounts: Record<string, number> = {};
    const userHashtags = new Set<string>();

    // User's preferred hashtags
    likedPosts?.forEach(like => {
      const post = like.posts as any;
      if (post?.hashtags) {
        post.hashtags.forEach((tag: string) => {
          userHashtags.add(tag.toLowerCase());
        });
      }
    });

    // Trending hashtags
    recentPosts?.forEach(post => {
      if (post.hashtags) {
        post.hashtags.forEach(tag => {
          const normalizedTag = tag.toLowerCase();
          hashtagCounts[normalizedTag] = (hashtagCounts[normalizedTag] || 0) + 1;
        });
      }
    });

    // Score hashtags (boost user preferences)
    const scoredHashtags = Object.entries(hashtagCounts)
      .map(([hashtag, count]) => ({
        hashtag,
        count,
        score: count + (userHashtags.has(hashtag) ? count * 2 : 0) // Boost user preferences
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return NextResponse.json({ hashtags: scoredHashtags });

  } catch (error) {
    console.error('Error getting recommended hashtags:', error);
    return NextResponse.json({ error: 'Failed to get hashtag recommendations' }, { status: 500 });
  }
}

async function getRecommendedUsers(userId: string, limit: number) {
  try {
    // Get users the current user is already following
    const { data: following } = await adminClient
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);

    const followingIds = following?.map(f => f.following_id) || [];
    followingIds.push(userId); // Don't recommend self

    // Get users with similar interests (liked similar posts)
    const { data: similarUsers } = await adminClient
      .from('likes')
      .select(`
        user_id,
        posts!inner (
          hashtags,
          user_id
        )
      `)
      .neq('user_id', userId)
      .not('user_id', 'in', `(${followingIds.join(',')})`)
      .limit(200);

    // Get user's liked hashtags for comparison
    const { data: userLikes } = await adminClient
      .from('likes')
      .select(`
        posts!inner (hashtags)
      `)
      .eq('user_id', userId);

    const userHashtags = new Set<string>();
    userLikes?.forEach(like => {
      const post = like.posts as any;
      if (post?.hashtags) {
        post.hashtags.forEach((tag: string) => userHashtags.add(tag.toLowerCase()));
      }
    });

    // Score users based on hashtag similarity
    const userScores: Record<string, number> = {};
    similarUsers?.forEach(like => {
      const post = like.posts as any;
      if (post?.hashtags && like.user_id) {
        const similarity = post.hashtags.filter((tag: string) => 
          userHashtags.has(tag.toLowerCase())
        ).length;
        userScores[like.user_id] = (userScores[like.user_id] || 0) + similarity;
      }
    });

    // Get top users
    const topUserIds = Object.entries(userScores)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([userId]) => userId);

    if (topUserIds.length === 0) {
      // Fallback to most followed users
      const { data: popularUsers } = await adminClient
        .from('users')
        .select('id, username, display_name, avatar_url, is_verified, followers_count')
        .not('id', 'in', `(${followingIds.join(',')})`)
        .order('followers_count', { ascending: false })
        .limit(limit);

      return NextResponse.json({ users: popularUsers || [] });
    }

    // Get user details
    const { data: recommendedUsers } = await adminClient
      .from('users')
      .select('id, username, display_name, avatar_url, is_verified, followers_count')
      .in('id', topUserIds);

    return NextResponse.json({ users: recommendedUsers || [] });

  } catch (error) {
    console.error('Error getting recommended users:', error);
    return NextResponse.json({ error: 'Failed to get user recommendations' }, { status: 500 });
  }
}

function analyzeUserPreferences(likedPosts: any[]) {
  const hashtags: Record<string, number> = {};
  let mediaCount = 0;
  let totalPosts = likedPosts.length;

  likedPosts.forEach(like => {
    const post = like.posts;
    if (post?.hashtags) {
      post.hashtags.forEach((tag: string) => {
        hashtags[tag.toLowerCase()] = (hashtags[tag.toLowerCase()] || 0) + 1;
      });
    }
    if (post?.media_urls && post.media_urls.length > 0) {
      mediaCount++;
    }
  });

  return {
    preferredHashtags: Object.entries(hashtags)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([tag]) => tag),
    mediaPreference: totalPosts > 0 ? mediaCount / totalPosts : 0.5
  };
}

function calculatePostScore(post: any, preferences: any, followingIds: string[]) {
  let score = 1;

  // Boost posts from followed users
  if (followingIds.includes(post.user_id)) {
    score += 5;
  }

  // Boost posts with preferred hashtags
  if (post.hashtags && preferences.preferredHashtags.length > 0) {
    const matchingHashtags = post.hashtags.filter((tag: string) =>
      preferences.preferredHashtags.includes(tag.toLowerCase())
    ).length;
    score += matchingHashtags * 3;
  }

  // Boost based on media preference
  const hasMedia = post.media_urls && post.media_urls.length > 0;
  if (hasMedia && preferences.mediaPreference > 0.5) {
    score += 2;
  } else if (!hasMedia && preferences.mediaPreference < 0.5) {
    score += 1;
  }

  // Boost recent posts
  const postAge = Date.now() - new Date(post.created_at).getTime();
  const daysSincePost = postAge / (1000 * 60 * 60 * 24);
  if (daysSincePost < 1) score += 2;
  else if (daysSincePost < 7) score += 1;

  // Boost posts with engagement
  const engagement = (post.likes_count || 0) + (post.reposts_count || 0) * 2 + (post.replies_count || 0) * 3;
  score += Math.min(engagement * 0.1, 5); // Cap engagement boost

  return score;
}

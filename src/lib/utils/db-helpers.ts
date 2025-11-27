/**
 * Database Query Optimization Helpers
 * 
 * Utilities for optimizing Supabase queries:
 * - Batch loading to avoid N+1 queries
 * - Efficient pagination
 * - Query result caching
 */

import { adminClient } from '@/lib/supabase/admin';
import { cacheAside, CacheKeys, CacheTTL } from '@/lib/cache';

/**
 * Batch load users by IDs
 * Prevents N+1 queries when loading user data for multiple posts/comments
 */
export async function batchLoadUsers(
  userIds: string[]
): Promise<Map<string, UserBasic>> {
  if (userIds.length === 0) return new Map();

  // Deduplicate IDs
  const uniqueIds = [...new Set(userIds)];

  const { data: users, error } = await adminClient
    .from('users')
    .select('id, username, display_name, avatar_url, is_verified')
    .in('id', uniqueIds);

  if (error) {
    console.error('Error batch loading users:', error);
    return new Map();
  }

  return new Map(users?.map((u) => [u.id, u]) || []);
}

interface UserBasic {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
}

/**
 * Batch load like status for posts
 */
export async function batchLoadLikeStatus(
  userId: string,
  postIds: string[]
): Promise<Set<string>> {
  if (!userId || postIds.length === 0) return new Set();

  const { data: likes, error } = await adminClient
    .from('likes')
    .select('post_id')
    .eq('user_id', userId)
    .in('post_id', postIds);

  if (error) {
    console.error('Error batch loading likes:', error);
    return new Set();
  }

  return new Set(likes?.map((l) => l.post_id).filter(Boolean) as string[]);
}

/**
 * Batch load repost status for posts
 */
export async function batchLoadRepostStatus(
  userId: string,
  postIds: string[]
): Promise<Set<string>> {
  if (!userId || postIds.length === 0) return new Set();

  const { data: reposts, error } = await adminClient
    .from('posts')
    .select('repost_of_id')
    .eq('user_id', userId)
    .in('repost_of_id', postIds);

  if (error) {
    console.error('Error batch loading reposts:', error);
    return new Set();
  }

  return new Set(reposts?.map((r) => r.repost_of_id).filter(Boolean) as string[]);
}

/**
 * Batch load bookmark status for posts
 */
export async function batchLoadBookmarkStatus(
  userId: string,
  postIds: string[]
): Promise<Set<string>> {
  if (!userId || postIds.length === 0) return new Set();

  const { data: bookmarks, error } = await adminClient
    .from('bookmarks')
    .select('post_id')
    .eq('user_id', userId)
    .in('post_id', postIds);

  if (error) {
    console.error('Error batch loading bookmarks:', error);
    return new Set();
  }

  return new Set(bookmarks?.map((b) => b.post_id).filter(Boolean) as string[]);
}

/**
 * Efficient cursor-based pagination
 * More efficient than offset-based for large datasets
 */
export interface CursorPaginationParams {
  cursor?: string; // ISO date string of last item
  limit: number;
  direction?: 'before' | 'after';
}

export interface CursorPaginationResult<T> {
  data: T[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
}

/**
 * Apply cursor pagination to a query
 */
export function applyCursorPagination<T extends { created_at: string }>(
  items: T[],
  params: CursorPaginationParams
): CursorPaginationResult<T> {
  const { cursor, limit, direction = 'after' } = params;

  let filtered = items;

  if (cursor) {
    const cursorDate = new Date(cursor);
    if (direction === 'after') {
      filtered = items.filter((item) => new Date(item.created_at) < cursorDate);
    } else {
      filtered = items.filter((item) => new Date(item.created_at) > cursorDate);
    }
  }

  const hasMore = filtered.length > limit;
  const data = filtered.slice(0, limit);

  return {
    data,
    nextCursor: data.length > 0 ? data[data.length - 1].created_at : null,
    prevCursor: data.length > 0 ? data[0].created_at : null,
    hasMore,
  };
}

/**
 * Optimized post fields selection
 * Only select fields that are actually needed
 */
export const PostSelectFields = {
  // Minimal fields for list views
  list: `
    id,
    user_id,
    content,
    media_urls,
    likes_count,
    reposts_count,
    replies_count,
    created_at,
    repost_of_id,
    is_edited,
    edited_at
  `,

  // Full fields for detail views
  detail: `
    id,
    user_id,
    content,
    media_urls,
    hashtags,
    mentions,
    likes_count,
    reposts_count,
    replies_count,
    views_count,
    created_at,
    updated_at,
    repost_of_id,
    reply_to_id,
    is_pinned,
    is_edited,
    edited_at
  `,

  // User fields to include
  user: `
    id,
    username,
    display_name,
    avatar_url,
    is_verified
  `,
} as const;

/**
 * Get cached user profile
 */
export async function getCachedUserProfile(userId: string) {
  return cacheAside(
    CacheKeys.userProfile(userId),
    async () => {
      const { data, error } = await adminClient
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    },
    { memoryTtl: 60, redisTtl: CacheTTL.MEDIUM }
  );
}

/**
 * Get cached user by username
 */
export async function getCachedUserByUsername(username: string) {
  return cacheAside(
    CacheKeys.userByUsername(username),
    async () => {
      const { data, error } = await adminClient
        .from('users')
        .select('*')
        .eq('username', username.toLowerCase())
        .single();

      if (error) throw error;
      return data;
    },
    { memoryTtl: 60, redisTtl: CacheTTL.MEDIUM }
  );
}

/**
 * Invalidate user cache
 */
export async function invalidateUserCache(userId: string, username?: string) {
  const { cacheDelete } = await import('@/lib/cache');
  
  await cacheDelete(CacheKeys.userProfile(userId));
  if (username) {
    await cacheDelete(CacheKeys.userByUsername(username));
  }
}

/**
 * Count posts with caching
 */
export async function getCachedPostCount(
  filters: { user_id?: string; hashtag?: string },
  cacheKey: string,
  ttl: number = CacheTTL.SHORT
): Promise<number> {
  return cacheAside(
    cacheKey,
    async () => {
      let query = adminClient.from('posts').select('*', { count: 'exact', head: true });

      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }
      if (filters.hashtag) {
        query = query.contains('hashtags', [filters.hashtag]);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    { memoryTtl: ttl, redisTtl: ttl }
  );
}

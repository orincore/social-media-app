/**
 * Multi-level Caching System
 * 
 * Provides in-memory caching with Redis fallback for expensive operations.
 * Implements cache-aside pattern with configurable TTL.
 */

import { redis, isRedisConfigured, CACHE_TTL } from '@/lib/redis/client';

// In-memory cache for ultra-fast access (L1 cache)
const memoryCache = new Map<string, { value: unknown; expires: number }>();

// Memory cache configuration
const MEMORY_CACHE_MAX_SIZE = 1000;
const MEMORY_CACHE_DEFAULT_TTL = 30; // 30 seconds for memory cache

/**
 * Clean expired entries from memory cache
 */
function cleanMemoryCache(): void {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expires < now) {
      memoryCache.delete(key);
    }
  }
  
  // If still over limit, remove oldest entries
  if (memoryCache.size > MEMORY_CACHE_MAX_SIZE) {
    const entries = Array.from(memoryCache.entries());
    entries.sort((a, b) => a[1].expires - b[1].expires);
    const toRemove = entries.slice(0, entries.length - MEMORY_CACHE_MAX_SIZE);
    toRemove.forEach(([key]) => memoryCache.delete(key));
  }
}

/**
 * Get from memory cache (L1)
 */
function getFromMemory<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  
  if (entry.expires < Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  
  return entry.value as T;
}

/**
 * Set in memory cache (L1)
 */
function setInMemory(key: string, value: unknown, ttlSeconds: number = MEMORY_CACHE_DEFAULT_TTL): void {
  cleanMemoryCache();
  memoryCache.set(key, {
    value,
    expires: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * Multi-level cache get
 * Checks memory first, then Redis
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  // L1: Memory cache
  const memoryResult = getFromMemory<T>(key);
  if (memoryResult !== null) {
    return memoryResult;
  }
  
  // L2: Redis cache
  if (isRedisConfigured) {
    try {
      const redisResult = await redis.get<T>(key);
      if (redisResult !== null) {
        // Populate memory cache for faster subsequent access
        setInMemory(key, redisResult);
        return redisResult;
      }
    } catch (error) {
      console.warn('Redis cache get error:', error);
    }
  }
  
  return null;
}

/**
 * Multi-level cache set
 * Sets in both memory and Redis
 */
export async function cacheSet(
  key: string,
  value: unknown,
  options: { memoryTtl?: number; redisTtl?: number } = {}
): Promise<void> {
  const { memoryTtl = MEMORY_CACHE_DEFAULT_TTL, redisTtl = 300 } = options;
  
  // L1: Memory cache
  setInMemory(key, value, memoryTtl);
  
  // L2: Redis cache
  if (isRedisConfigured) {
    try {
      await redis.set(key, value, { ex: redisTtl });
    } catch (error) {
      console.warn('Redis cache set error:', error);
    }
  }
}

/**
 * Multi-level cache delete
 */
export async function cacheDelete(key: string): Promise<void> {
  // L1: Memory cache
  memoryCache.delete(key);
  
  // L2: Redis cache
  if (isRedisConfigured) {
    try {
      await redis.del(key);
    } catch (error) {
      console.warn('Redis cache delete error:', error);
    }
  }
}

/**
 * Cache-aside pattern helper
 * Automatically handles cache miss by calling the factory function
 */
export async function cacheAside<T>(
  key: string,
  factory: () => Promise<T>,
  options: { memoryTtl?: number; redisTtl?: number } = {}
): Promise<T> {
  // Try to get from cache
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }
  
  // Cache miss - call factory
  const value = await factory();
  
  // Store in cache
  await cacheSet(key, value, options);
  
  return value;
}

/**
 * Invalidate cache by pattern (memory only, Redis requires SCAN)
 */
export function invalidateByPattern(pattern: RegExp): void {
  for (const key of memoryCache.keys()) {
    if (pattern.test(key)) {
      memoryCache.delete(key);
    }
  }
}

/**
 * Clear all memory cache
 */
export function clearMemoryCache(): void {
  memoryCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  memorySize: number;
  redisConfigured: boolean;
} {
  return {
    memorySize: memoryCache.size,
    redisConfigured: isRedisConfigured,
  };
}

// Cache key generators for common patterns
export const CacheKeys = {
  // User-related
  userProfile: (userId: string) => `user:profile:${userId}`,
  userByUsername: (username: string) => `user:username:${username}`,
  userFollowers: (userId: string) => `user:followers:${userId}`,
  userFollowing: (userId: string) => `user:following:${userId}`,
  
  // Post-related
  post: (postId: string) => `post:${postId}`,
  postComments: (postId: string, page: number) => `post:comments:${postId}:${page}`,
  userPosts: (userId: string, type: string, page: number) => `user:posts:${userId}:${type}:${page}`,
  
  // Feed-related
  feedForYou: (userId: string, page: number) => `feed:foryou:${userId}:${page}`,
  feedFollowing: (userId: string, page: number) => `feed:following:${userId}:${page}`,
  feedHashtag: (hashtag: string, page: number) => `feed:hashtag:${hashtag}:${page}`,
  
  // Trending
  trendingHashtags: () => 'trending:hashtags',
  trendingPosts: () => 'trending:posts',
  
  // Notifications
  userNotifications: (userId: string, page: number) => `notifications:${userId}:${page}`,
  unreadCount: (userId: string) => `notifications:unread:${userId}`,
} as const;

// Cache TTL presets (in seconds)
export const CacheTTL = {
  SHORT: 30,        // 30 seconds - for rapidly changing data
  MEDIUM: 300,      // 5 minutes - for moderately changing data
  LONG: 3600,       // 1 hour - for slowly changing data
  VERY_LONG: 86400, // 24 hours - for rarely changing data
} as const;

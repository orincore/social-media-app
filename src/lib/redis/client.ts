import { Redis } from '@upstash/redis';
import { env } from '@/lib/env';

/**
 * Upstash Redis Client Configuration
 * 
 * Redis is optional - the app will work without it but caching will be disabled.
 * This is useful for development or deployments that don't need caching.
 */

// Check if Redis is configured
export const isRedisConfigured = env.hasRedis;

// Lazy initialization of Redis client to prevent build-time errors
let _redis: Redis | null = null;

/**
 * Get the Redis client instance
 * Returns null if Redis is not configured
 */
export function getRedis(): Redis | null {
  if (!isRedisConfigured) {
    return null;
  }

  if (!_redis) {
    _redis = new Redis({
      url: env.redisUrl!,
      token: env.redisToken!,
    });
  }

  return _redis;
}

/**
 * Legacy export for backward compatibility
 * Creates a mock Redis client if not configured
 */
export const redis = isRedisConfigured
  ? new Redis({
      url: env.redisUrl!,
      token: env.redisToken!,
    })
  : createMockRedis();

/**
 * Create a mock Redis client for when Redis is not configured
 * All operations are no-ops that return sensible defaults
 */
function createMockRedis(): Redis {
  const mockHandler = {
    get: () => Promise.resolve(null),
    set: () => Promise.resolve('OK'),
    del: () => Promise.resolve(0),
    incr: () => Promise.resolve(1),
    decr: () => Promise.resolve(0),
    expire: () => Promise.resolve(1),
    ttl: () => Promise.resolve(-1),
    exists: () => Promise.resolve(0),
    hget: () => Promise.resolve(null),
    hset: () => Promise.resolve(1),
    hdel: () => Promise.resolve(0),
    hgetall: () => Promise.resolve(null),
    sadd: () => Promise.resolve(1),
    srem: () => Promise.resolve(0),
    smembers: () => Promise.resolve([]),
    sismember: () => Promise.resolve(0),
    zadd: () => Promise.resolve(1),
    zrem: () => Promise.resolve(0),
    zrange: () => Promise.resolve([]),
    zrevrange: () => Promise.resolve([]),
    zscore: () => Promise.resolve(null),
    lpush: () => Promise.resolve(1),
    rpush: () => Promise.resolve(1),
    lpop: () => Promise.resolve(null),
    rpop: () => Promise.resolve(null),
    lrange: () => Promise.resolve([]),
    llen: () => Promise.resolve(0),
    keys: () => Promise.resolve([]),
    scan: () => Promise.resolve([0, []]),
    pipeline: () => ({
      exec: () => Promise.resolve([]),
    }),
    multi: () => ({
      exec: () => Promise.resolve([]),
    }),
  };

  return mockHandler as unknown as Redis;
}

// Cache keys
export const CACHE_KEYS = {
  TRENDING_HASHTAGS: 'trending:hashtags',
  USER_FEED: (userId: string) => `feed:user:${userId}`,
  POST_LIKES: (postId: string) => `post:${postId}:likes`,
  POST_VIEWS: (postId: string) => `post:${postId}:views`,
  USER_FOLLOWERS: (userId: string) => `user:${userId}:followers`,
  USER_FOLLOWING: (userId: string) => `user:${userId}:following`,
  RATE_LIMIT: (key: string) => `rate_limit:${key}`,
} as const;

// Cache TTL in seconds
export const CACHE_TTL = {
  TRENDING_HASHTAGS: 300, // 5 minutes
  USER_FEED: 60, // 1 minute
  POST_STATS: 30, // 30 seconds
  USER_STATS: 300, // 5 minutes
  RATE_LIMIT: 3600, // 1 hour
} as const;

/**
 * Check if Redis is available and properly configured
 */
export function isRedisAvailable(): boolean {
  return isRedisConfigured;
}

/**
 * Safe cache get - returns null if Redis is not available
 */
export async function safeGet<T>(key: string): Promise<T | null> {
  if (!isRedisConfigured) return null;
  try {
    return await redis.get<T>(key);
  } catch (error) {
    console.warn('Redis get error:', error);
    return null;
  }
}

/**
 * Safe cache set - no-op if Redis is not available
 */
export async function safeSet(key: string, value: unknown, ttlSeconds?: number): Promise<boolean> {
  if (!isRedisConfigured) return false;
  try {
    if (ttlSeconds) {
      await redis.set(key, value, { ex: ttlSeconds });
    } else {
      await redis.set(key, value);
    }
    return true;
  } catch (error) {
    console.warn('Redis set error:', error);
    return false;
  }
}

/**
 * Safe cache delete - no-op if Redis is not available
 */
export async function safeDel(key: string): Promise<boolean> {
  if (!isRedisConfigured) return false;
  try {
    await redis.del(key);
    return true;
  } catch (error) {
    console.warn('Redis del error:', error);
    return false;
  }
}

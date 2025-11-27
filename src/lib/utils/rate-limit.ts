/**
 * Rate Limiting Utility
 * 
 * Implements token bucket algorithm for rate limiting API requests.
 * Uses in-memory storage with optional Redis backing.
 */

import { redis, isRedisConfigured, CACHE_KEYS } from '@/lib/redis/client';

interface RateLimitConfig {
  // Maximum number of requests allowed
  limit: number;
  // Time window in seconds
  window: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number; // Unix timestamp when the limit resets
  limit: number;
}

// In-memory rate limit storage (for when Redis is not available)
const memoryStore = new Map<string, { count: number; resetAt: number }>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of memoryStore.entries()) {
    if (value.resetAt < now) {
      memoryStore.delete(key);
    }
  }
}, 60000); // Clean every minute

/**
 * Check rate limit using in-memory storage
 */
function checkMemoryRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const windowMs = config.window * 1000;
  const resetAt = now + windowMs;

  const existing = memoryStore.get(key);

  if (!existing || existing.resetAt < now) {
    // First request or window expired
    memoryStore.set(key, { count: 1, resetAt });
    return {
      success: true,
      remaining: config.limit - 1,
      reset: Math.floor(resetAt / 1000),
      limit: config.limit,
    };
  }

  if (existing.count >= config.limit) {
    // Rate limit exceeded
    return {
      success: false,
      remaining: 0,
      reset: Math.floor(existing.resetAt / 1000),
      limit: config.limit,
    };
  }

  // Increment counter
  existing.count++;
  return {
    success: true,
    remaining: config.limit - existing.count,
    reset: Math.floor(existing.resetAt / 1000),
    limit: config.limit,
  };
}

/**
 * Check rate limit using Redis (distributed rate limiting)
 */
async function checkRedisRateLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
  const redisKey = CACHE_KEYS.RATE_LIMIT(key);
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - config.window;

  try {
    // Use Redis sorted set for sliding window rate limiting
    const pipeline = redis.pipeline();
    
    // Remove old entries outside the window
    pipeline.zremrangebyscore(redisKey, 0, windowStart);
    
    // Count current requests in window
    pipeline.zcard(redisKey);
    
    // Add current request
    pipeline.zadd(redisKey, { score: now, member: `${now}-${Math.random()}` });
    
    // Set expiry on the key
    pipeline.expire(redisKey, config.window);

    const results = await pipeline.exec();
    const currentCount = (results?.[1] as number) || 0;

    if (currentCount >= config.limit) {
      return {
        success: false,
        remaining: 0,
        reset: now + config.window,
        limit: config.limit,
      };
    }

    return {
      success: true,
      remaining: config.limit - currentCount - 1,
      reset: now + config.window,
      limit: config.limit,
    };
  } catch (error) {
    console.warn('Redis rate limit error, falling back to memory:', error);
    return checkMemoryRateLimit(key, config);
  }
}

/**
 * Main rate limit check function
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  if (isRedisConfigured) {
    return checkRedisRateLimit(identifier, config);
  }
  return checkMemoryRateLimit(identifier, config);
}

/**
 * Rate limit presets for different API endpoints
 */
export const RateLimitPresets = {
  // Standard API calls
  api: { limit: 100, window: 60 }, // 100 requests per minute
  
  // Authentication endpoints
  auth: { limit: 10, window: 60 }, // 10 requests per minute
  
  // Post creation
  createPost: { limit: 30, window: 60 }, // 30 posts per minute
  
  // Comments
  createComment: { limit: 60, window: 60 }, // 60 comments per minute
  
  // Likes/interactions
  interactions: { limit: 200, window: 60 }, // 200 interactions per minute
  
  // Search
  search: { limit: 30, window: 60 }, // 30 searches per minute
  
  // Media uploads
  upload: { limit: 20, window: 60 }, // 20 uploads per minute
  
  // Strict limit for abuse prevention
  strict: { limit: 5, window: 60 }, // 5 requests per minute
} as const;

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  };
}

/**
 * Create rate limited response
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: result.reset - Math.floor(Date.now() / 1000),
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': (result.reset - Math.floor(Date.now() / 1000)).toString(),
        ...getRateLimitHeaders(result),
      },
    }
  );
}

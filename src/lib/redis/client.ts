import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

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

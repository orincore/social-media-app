-- Performance optimizations for post creation
-- Run these SQL commands in your Supabase SQL editor

-- 1. Create function to increment user posts count atomically
CREATE OR REPLACE FUNCTION increment_user_posts_count(user_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE users 
  SET posts_count = COALESCE(posts_count, 0) + 1
  WHERE id = user_id;
END;
$$;

-- 2. Create function to increment hashtag count with upsert
CREATE OR REPLACE FUNCTION increment_hashtag_count(hashtag_name TEXT)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO hashtags (name, posts_count, created_at, updated_at)
  VALUES (hashtag_name, 1, NOW(), NOW())
  ON CONFLICT (name) 
  DO UPDATE SET 
    posts_count = hashtags.posts_count + 1,
    updated_at = NOW();
END;
$$;

-- 3. Add indexes for better performance if they don't exist
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hashtags_name ON hashtags(name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username ON users(username);

-- 4. Enable RLS policies for the functions (if using RLS)
-- These functions should be callable by authenticated users
GRANT EXECUTE ON FUNCTION increment_user_posts_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_hashtag_count(TEXT) TO authenticated;

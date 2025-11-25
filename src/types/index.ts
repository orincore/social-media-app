export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
  location?: string;
  website?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  birth_date?: string;
  is_verified: boolean;
  is_private: boolean;
  followers_count: number;
  following_count: number;
  posts_count: number;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  media_urls?: string[];
  hashtags?: string[];
  mentions?: string[];
  reply_to_id?: string;
  repost_of_id?: string;
  likes_count: number;
  reposts_count: number;
  replies_count: number;
  views_count: number;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  user?: User;
  is_liked?: boolean;
  is_reposted?: boolean;
  is_bookmarked?: boolean;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  media_urls?: string[];
  likes_count: number;
  replies_count: number;
  reply_to_id?: string;
  created_at: string;
  updated_at: string;
  user?: User;
  is_liked?: boolean;
}

export interface Like {
  id: string;
  user_id: string;
  post_id?: string;
  comment_id?: string;
  created_at: string;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'repost';
  actor_id: string;
  post_id?: string;
  comment_id?: string;
  content?: string;
  is_read: boolean;
  created_at: string;
  actor?: User;
  post?: Post;
}

export interface Chat {
  id: string;
  participants: string[];
  last_message_id?: string;
  last_message_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  media_urls?: string[];
  is_read: boolean;
  created_at: string;
  sender?: User;
}

export interface Hashtag {
  id: string;
  name: string;
  posts_count: number;
  trending_score: number;
  created_at: string;
  updated_at: string;
}

export interface MediaUpload {
  id: string;
  user_id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  url: string;
  thumbnail_url?: string;
  width?: number;
  height?: number;
  duration?: number;
  created_at: string;
}

export interface OnboardingData {
  username: string;
  display_name: string;
  bio?: string;
  location?: string;
  website?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  birth_date?: string;
  avatar_file?: File;
  banner_file?: File;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
  total?: number;
}

export interface FeedFilters {
  type?: 'all' | 'following' | 'trending';
  hashtag?: string;
  user_id?: string;
  cursor?: string;
  limit?: number;
}

export interface SearchFilters {
  query: string;
  type?: 'users' | 'posts' | 'hashtags' | 'all';
  cursor?: string;
  limit?: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface AuthSession {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          username: string;
          display_name: string;
          bio: string | null;
          avatar_url: string | null;
          banner_url: string | null;
          location: string | null;
          website: string | null;
          gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
          birth_date: string | null;
          is_verified: boolean;
          is_private: boolean;
          followers_count: number;
          following_count: number;
          posts_count: number;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          username: string;
          display_name: string;
          bio?: string | null;
          avatar_url?: string | null;
          banner_url?: string | null;
          location?: string | null;
          website?: string | null;
          gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
          birth_date?: string | null;
          is_verified?: boolean;
          is_private?: boolean;
          followers_count?: number;
          following_count?: number;
          posts_count?: number;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          username?: string;
          display_name?: string;
          bio?: string | null;
          avatar_url?: string | null;
          banner_url?: string | null;
          location?: string | null;
          website?: string | null;
          gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
          birth_date?: string | null;
          is_verified?: boolean;
          is_private?: boolean;
          followers_count?: number;
          following_count?: number;
          posts_count?: number;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          user_id: string;
          content: string;
          media_urls: string[] | null;
          hashtags: string[] | null;
          mentions: string[] | null;
          reply_to_id: string | null;
          repost_of_id: string | null;
          likes_count: number;
          reposts_count: number;
          replies_count: number;
          views_count: number;
          is_pinned: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          content: string;
          media_urls?: string[] | null;
          hashtags?: string[] | null;
          mentions?: string[] | null;
          reply_to_id?: string | null;
          repost_of_id?: string | null;
          likes_count?: number;
          reposts_count?: number;
          replies_count?: number;
          views_count?: number;
          is_pinned?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          content?: string;
          media_urls?: string[] | null;
          hashtags?: string[] | null;
          mentions?: string[] | null;
          reply_to_id?: string | null;
          repost_of_id?: string | null;
          likes_count?: number;
          reposts_count?: number;
          replies_count?: number;
          views_count?: number;
          is_pinned?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          content: string;
          media_urls: string[] | null;
          likes_count: number;
          replies_count: number;
          reply_to_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          content: string;
          media_urls?: string[] | null;
          likes_count?: number;
          replies_count?: number;
          reply_to_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          content?: string;
          media_urls?: string[] | null;
          likes_count?: number;
          replies_count?: number;
          reply_to_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      likes: {
        Row: {
          id: string;
          user_id: string;
          post_id: string | null;
          comment_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          post_id?: string | null;
          comment_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          post_id?: string | null;
          comment_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          follower_id?: string;
          following_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: 'like' | 'comment' | 'follow' | 'mention' | 'repost';
          actor_id: string;
          post_id: string | null;
          comment_id: string | null;
          content: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'like' | 'comment' | 'follow' | 'mention' | 'repost';
          actor_id: string;
          post_id?: string | null;
          comment_id?: string | null;
          content?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'like' | 'comment' | 'follow' | 'mention' | 'repost';
          actor_id?: string;
          post_id?: string | null;
          comment_id?: string | null;
          content?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      chats: {
        Row: {
          id: string;
          participants: string[];
          last_message_id: string | null;
          last_message_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          participants: string[];
          last_message_id?: string | null;
          last_message_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          participants?: string[];
          last_message_id?: string | null;
          last_message_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          chat_id: string;
          sender_id: string;
          content: string;
          media_urls: string[] | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          chat_id: string;
          sender_id: string;
          content: string;
          media_urls?: string[] | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          chat_id?: string;
          sender_id?: string;
          content?: string;
          media_urls?: string[] | null;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      hashtags: {
        Row: {
          id: string;
          name: string;
          posts_count: number;
          trending_score: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          posts_count?: number;
          trending_score?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          posts_count?: number;
          trending_score?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      media_uploads: {
        Row: {
          id: string;
          user_id: string;
          filename: string;
          original_name: string;
          mime_type: string;
          size: number;
          url: string;
          thumbnail_url: string | null;
          width: number | null;
          height: number | null;
          duration: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          filename: string;
          original_name: string;
          mime_type: string;
          size: number;
          url: string;
          thumbnail_url?: string | null;
          width?: number | null;
          height?: number | null;
          duration?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          filename?: string;
          original_name?: string;
          mime_type?: string;
          size?: number;
          url?: string;
          thumbnail_url?: string | null;
          width?: number | null;
          height?: number | null;
          duration?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      bookmarks: {
        Row: {
          id: string;
          user_id: string;
          post_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          post_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          post_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          notification_preferences: Json;
          privacy_settings: Json;
          appearance_settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          notification_preferences?: Json;
          privacy_settings?: Json;
          appearance_settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          notification_preferences?: Json;
          privacy_settings?: Json;
          appearance_settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_sessions: {
        Row: {
          id: string;
          user_id: string;
          session_token: string;
          device_info: Json;
          ip_address: string | null;
          user_agent: string | null;
          location_info: Json;
          is_current: boolean;
          last_active: string;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_token: string;
          device_info?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          location_info?: Json;
          is_current?: boolean;
          last_active?: string;
          created_at?: string;
          expires_at: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          session_token?: string;
          device_info?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          location_info?: Json;
          is_current?: boolean;
          last_active?: string;
          created_at?: string;
          expires_at?: string;
        };
        Relationships: [];
      };
      login_history: {
        Row: {
          id: string;
          user_id: string;
          device_info: Json;
          ip_address: string | null;
          user_agent: string | null;
          location_info: Json;
          login_method: string;
          success: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          device_info?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          location_info?: Json;
          login_method?: string;
          success?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          device_info?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          location_info?: Json;
          login_method?: string;
          success?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      follow_requests: {
        Row: {
          id: string;
          requester_id: string;
          target_id: string;
          status: 'pending' | 'accepted' | 'declined';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          requester_id: string;
          target_id: string;
          status?: 'pending' | 'accepted' | 'declined';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          requester_id?: string;
          target_id?: string;
          status?: 'pending' | 'accepted' | 'declined';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      clean_expired_sessions: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<
  TName extends keyof Database['public']['Tables']
> = Database['public']['Tables'][TName]['Row'];

export type TablesInsert<
  TName extends keyof Database['public']['Tables']
> = Database['public']['Tables'][TName]['Insert'];

export type TablesUpdate<
  TName extends keyof Database['public']['Tables']
> = Database['public']['Tables'][TName]['Update'];

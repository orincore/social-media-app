'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Hash, TrendingUp, UserPlus, Check } from 'lucide-react';

interface TrendingHashtag {
  id: string;
  name: string;
  posts_count: number;
  rank: number;
  display: string;
  category: string;
}

interface UserSuggestion {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
  bio: string | null;
  followers_count: number;
  posts_count: number;
  reason: string;
}

export function RightSidebar() {
  const router = useRouter();
  const [trendingHashtags, setTrendingHashtags] = useState<TrendingHashtag[]>([]);
  const [userSuggestions, setUserSuggestions] = useState<UserSuggestion[]>([]);
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch trending hashtags
      const hashtagsResponse = await fetch('/api/hashtags/trending?limit=5');
      if (hashtagsResponse.ok) {
        const hashtagsData = await hashtagsResponse.json();
        setTrendingHashtags(hashtagsData.hashtags || []);
      }

      // Fetch user suggestions
      const usersResponse = await fetch('/api/users/suggestions?limit=3');
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUserSuggestions(usersData.users || []);
      }
    } catch (error) {
      console.error('Error fetching sidebar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHashtagClick = (hashtag: string) => {
    router.push(`/hashtag/${hashtag}`);
  };

  const handleUserClick = (username: string) => {
    router.push(`/${username}`);
  };

  const handleFollow = async (userId: string) => {
    try {
      const response = await fetch('/api/users/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        setFollowedUsers(prev => new Set(prev).add(userId));
      }
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  if (loading) {
    return (
      <div className="hidden lg:block w-80 min-h-screen border-l border-border">
        <div className="h-screen overflow-y-auto px-4 py-4">
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hidden lg:block w-80 min-h-screen border-l border-border">
      <div className="h-screen overflow-y-auto px-4 py-4">
        <div className="space-y-4">
          {/* Who to Follow */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center space-x-2 mb-4">
              <UserPlus className="w-5 h-5 text-foreground" />
              <h2 className="text-xl font-bold text-foreground">Who to follow</h2>
            </div>
            
            <div className="space-y-4">
              {userSuggestions.map((user) => {
                const isFollowed = followedUsers.has(user.id);
                
                return (
                  <div
                    key={user.id}
                    className="flex items-start space-x-3 p-3 rounded-2xl hover:bg-accent/60 transition-all duration-200"
                  >
                    <Avatar 
                      className="h-10 w-10 cursor-pointer ring-2 ring-gray-200 dark:ring-gray-700"
                      onClick={() => handleUserClick(user.username)}
                    >
                      <AvatarImage src={user.avatar_url || ''} alt={user.display_name} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                        {user.display_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1">
                        <p 
                          className="font-semibold text-foreground text-sm truncate cursor-pointer hover:underline"
                          onClick={() => handleUserClick(user.username)}
                        >
                          {user.display_name}
                        </p>
                        {user.is_verified && (
                          <div className="flex items-center justify-center w-4 h-4 bg-blue-500 rounded-full">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </div>
                      <p 
                        className="text-blue-500 text-xs hover:underline transition-colors cursor-pointer"
                        onClick={() => handleUserClick(user.username)}
                      >
                        @{user.username}
                      </p>
                      {user.bio && (
                        <p className="text-muted-foreground text-xs mt-1 line-clamp-2">
                          {user.bio}
                        </p>
                      )}
                      <div className="flex items-center space-x-3 mt-1 text-xs text-muted-foreground">
                        <span>{formatCount(user.followers_count)} followers</span>
                        <span>•</span>
                        <span>{formatCount(user.posts_count)} posts</span>
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => handleFollow(user.id)}
                      variant={isFollowed ? "outline" : "default"}
                      size="sm"
                      disabled={isFollowed}
                      className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${
                        isFollowed 
                          ? 'border-border text-muted-foreground' 
                          : 'bg-foreground text-background hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {isFollowed ? 'Following' : 'Follow'}
                    </Button>
                  </div>
                );
              })}
            </div>
            
            <button 
              className="w-full mt-4 text-blue-500 hover:text-blue-600 text-sm font-medium py-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200"
              onClick={() => router.push('/explore')}
            >
              Show more
            </button>
          </div>

          {/* Trending Topics */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center space-x-2 mb-4">
              <TrendingUp className="w-5 h-5 text-foreground" />
              <h2 className="text-xl font-bold text-foreground">Trending</h2>
            </div>
            
            <div className="space-y-3">
              {trendingHashtags.map((hashtag, index) => (
                <div
                  key={hashtag.id}
                  className="cursor-pointer hover:bg-accent/60 p-3 rounded-2xl transition-all duration-200"
                  onClick={() => handleHashtagClick(hashtag.name)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-muted-foreground font-medium">
                          {index + 1} · {hashtag.category}
                        </span>
                        <TrendingUp className="w-3 h-3 text-green-500" />
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
                          <Hash className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-semibold text-blue-500 hover:underline transition-colors">
                          #{hashtag.name}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatCount(hashtag.posts_count)} posts
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <button 
              className="w-full mt-4 text-blue-500 hover:text-blue-600 text-sm font-medium py-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200"
              onClick={() => router.push('/trending')}
            >
              Show more
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

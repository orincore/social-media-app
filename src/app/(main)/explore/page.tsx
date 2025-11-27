'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RightSidebar } from '@/components/sidebar/right-sidebar';
import { Search, Settings, Hash, TrendingUp, Users, Sparkles, Compass } from 'lucide-react';
import { Feed } from '@/components/feed/feed';

interface TrendingHashtag {
  id: string;
  name: string;
  posts_count: number;
  rank: number;
  display: string;
  category: string;
  updated_at: string;
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
}

const tabs = ['For You', 'Trending', 'People', 'Topics'];

function ExploreContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = (searchParams.get('tab') || '').toLowerCase();
  const initialTab: 'For You' | 'Trending' | 'People' | 'Topics' =
    tabParam === 'people'
      ? 'People'
      : tabParam === 'trending'
      ? 'Trending'
      : tabParam === 'topics'
      ? 'Topics'
      : 'For You';

  const [activeTab, setActiveTab] = useState<'For You' | 'Trending' | 'People' | 'Topics'>(initialTab);
  const [trendingHashtags, setTrendingHashtags] = useState<TrendingHashtag[]>([]);
  const [recommendedUsers, setRecommendedUsers] = useState<UserSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Keep active tab in sync with URL query param (e.g. /explore?tab=people)
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleHashtagClick = (hashtag: string) => {
    router.push(`/hashtag/${hashtag}`);
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const handleUserClick = (username: string) => {
    router.push(`/${username}`);
  };

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch trending hashtags
        const hashtagsResponse = await fetch('/api/hashtags/trending?limit=15');
        if (hashtagsResponse.ok) {
          const hashtagsData = await hashtagsResponse.json();
          setTrendingHashtags(hashtagsData.hashtags || []);
        }

        // Fetch user suggestions
        const usersResponse = await fetch('/api/users/suggestions?limit=10');
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setRecommendedUsers(usersData.users || []);
        }

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchData();
    }
  }, [status]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-foreground" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    redirect('/auth/signin');
  }

  return (
    <div className="h-screen flex w-full overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 border-r border-border h-screen overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
            <div className="px-4 py-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full">
                  <Compass className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Explore</h1>
                  <p className="text-sm text-muted-foreground">Discover trending topics and people</p>
                </div>
              </div>

              {/* Search Bar */}
              <div className="flex items-center bg-card border border-border rounded-full px-4 py-2 mb-4">
                <Search className="h-4 w-4 mr-3 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search topics, people, or hashtags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-foreground placeholder-muted-foreground text-sm focus:outline-none"
                />
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                      activeTab === tab
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {tab}
                    {activeTab === tab && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-14 h-1 bg-blue-500 rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 py-6">
            {/* For You Tab */}
            {activeTab === 'For You' && (
              <div className="space-y-6">
                <div className="bg-card border border-border rounded-2xl p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                    <h2 className="text-lg font-semibold text-foreground">Recommended for you</h2>
                  </div>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-500" />
                    </div>
                  ) : (
                    <Feed />
                  )}
                </div>
              </div>
            )}

            {/* Trending Tab */}
            {activeTab === 'Trending' && (
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-orange-500" />
                    <h2 className="text-lg font-semibold text-foreground">Trending Hashtags</h2>
                  </div>
                </div>
                
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-500" />
                  </div>
                ) : trendingHashtags.length > 0 ? (
                  <div className="divide-y divide-border">
                    {trendingHashtags.map((hashtag, index) => (
                      <button
                        key={hashtag.id}
                        onClick={() => handleHashtagClick(hashtag.name)}
                        className="w-full px-6 py-4 text-left hover:bg-accent/50 transition-colors duration-200"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full text-white font-bold text-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                {hashtag.category}
                              </span>
                              <TrendingUp className="w-3 h-3 text-green-500" />
                            </div>
                            <div className="flex items-center space-x-2">
                              <Hash className="w-4 h-4 text-blue-500" />
                              <span className="font-semibold text-foreground">
                                {hashtag.name}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {formatCount(hashtag.posts_count)} posts
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-6 py-12 text-center">
                    <Hash className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No trending topics yet</h3>
                    <p className="text-muted-foreground">Start posting with hashtags to see trends!</p>
                  </div>
                )}
              </div>
            )}

            {/* People Tab */}
            {activeTab === 'People' && (
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                  <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-green-500" />
                    <h2 className="text-lg font-semibold text-foreground">Suggested for you</h2>
                  </div>
                </div>
                
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-500" />
                  </div>
                ) : recommendedUsers.length > 0 ? (
                  <div className="divide-y divide-border">
                    {recommendedUsers.map((user) => (
                      <div key={user.id} className="px-6 py-4 flex items-center justify-between hover:bg-accent/50 transition-colors">
                        <div 
                          className="flex items-center space-x-3 flex-1 cursor-pointer"
                          onClick={() => handleUserClick(user.username)}
                        >
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                            {user.display_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-foreground">{user.display_name}</span>
                              {user.is_verified && (
                                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">@{user.username}</div>
                            {user.bio && (
                              <div className="text-sm text-muted-foreground mt-1 line-clamp-2">{user.bio}</div>
                            )}
                            <div className="flex items-center space-x-3 mt-2 text-xs text-muted-foreground">
                              <span>{formatCount(user.followers_count)} followers</span>
                              <span>•</span>
                              <span>{formatCount(user.posts_count)} posts</span>
                            </div>
                          </div>
                        </div>
                        <Button className="bg-foreground text-background font-bold rounded-full px-4 py-1.5 text-sm hover:opacity-90">
                          Follow
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-6 py-12 text-center">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No suggestions available</h3>
                    <p className="text-muted-foreground">Check back later for new people to follow!</p>
                  </div>
                )}
              </div>
            )}

            {/* Topics Tab */}
            {activeTab === 'Topics' && (
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Hash className="w-5 h-5 text-purple-500" />
                  <h2 className="text-lg font-semibold text-foreground">Browse Topics</h2>
                </div>
                <div className="text-center py-8">
                  <Hash className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Topic categories coming soon</h3>
                  <p className="text-muted-foreground">We're working on organizing topics by categories like Technology, Sports, Entertainment, and more!</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <RightSidebar />
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-foreground" />
        </div>
      }
    >
      <ExploreContent />
    </Suspense>
  );
}

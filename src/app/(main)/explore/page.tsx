'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Settings, MoreHorizontal, X } from 'lucide-react';
import { Feed } from '@/components/feed/feed';

// Mock data for Today's News
const todaysNews = [
  {
    id: '1',
    title: "Bollywood Icon Dharmendra Passes Away at 89",
    time: '21 hours ago',
    category: 'Entertainment',
    posts: '129K posts',
  },
  {
    id: '2',
    title: "Justice Surya Kant Sworn In as India's 53rd Chief Justice",
    time: '1 day ago',
    category: 'Other',
    posts: '31K posts',
  },
  {
    id: '3',
    title: "Modi to Hoist Saffron Dharma Dhwaj at Ayodhya Ram Temple",
    time: '1 day ago',
    category: 'Other',
    posts: '34K posts',
  },
];

// Mock data for Trending
const trendingTopics = [
  { id: '1', category: 'Trending in Cricket', title: 'Smriti Mandhana', posts: '3,793 posts' },
  { id: '2', category: 'Trending in India', title: 'सिख धर्म', posts: '2,773 posts' },
  { id: '3', category: 'Smriti Mandhana · Trending', title: 'Palash', posts: '4,049 posts' },
  { id: '4', category: 'Trending in India', title: 'प्रभु राम', posts: '26.6K posts' },
  { id: '5', category: 'Trending in India', title: '#ShaheediDiwas', posts: null },
  { id: '6', category: 'Trending in India', title: 'Maoist', posts: '27.1K posts' },
];

// Mock data for Who to follow
const whoToFollow = [
  { id: '1', name: 'PMO India', username: 'PMOIndia', verified: true, avatar: null },
  { id: '2', name: 'Kevin Pietersen', username: 'KP24', verified: true, avatar: null },
  { id: '3', name: 'Harsh Dhaka', username: 'tooharsdhaka', verified: true, avatar: null },
];

// Right sidebar news
const sidebarNews = [
  {
    id: '1',
    title: "Vijay Sethupathi Joins Vetrimaaran's Arasan with Silambarasan TR",
    time: '2 hours ago',
    category: 'Entertainment',
    posts: '3,504 posts',
  },
  {
    id: '2',
    title: "Everton Stuns Manchester United 1-0 at Old Trafford After Early Red Card",
    time: '9 hours ago',
    category: 'Sports',
    posts: '117.7K posts',
  },
  {
    id: '3',
    title: "Delhi Air Pollution Protest Turns Chaotic with Maoist Slogans",
    time: '18 hours ago',
    category: 'News',
    posts: '101.4K posts',
  },
];

// Right sidebar who to follow
const sidebarWhoToFollow = [
  { id: '1', name: 'Kevin Pietersen', username: 'KP24', verified: true, avatar: null },
  { id: '2', name: 'Harsh Dhaka', username: 'tooharsdhaka', verified: true, avatar: null },
  { id: '3', name: 'Prajakta Koli', username: 'iamMostlySane', verified: true, avatar: null },
];

const tabs = ['For You', 'Trending', 'News', 'Sports', 'Entertainment'];

function ExploreContent() {
  const { status } = useSession();
  const [activeTab, setActiveTab] = useState<'For You' | 'Trending' | 'News' | 'Sports' | 'Entertainment'>('For You');
  const [recommendedPosts, setRecommendedPosts] = useState([]);
  const [trendingHashtags, setTrendingHashtags] = useState([]);
  const [recommendedUsers, setRecommendedUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch recommendations
  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        
        // Fetch recommended posts
        const postsResponse = await fetch('/api/recommendations?type=posts&limit=20');
        if (postsResponse.ok) {
          const postsData = await postsResponse.json();
          setRecommendedPosts(postsData.posts || []);
        }

        // Fetch trending hashtags
        const hashtagsResponse = await fetch('/api/recommendations?type=hashtags&limit=10');
        if (hashtagsResponse.ok) {
          const hashtagsData = await hashtagsResponse.json();
          setTrendingHashtags(hashtagsData.hashtags || []);
        }

        // Fetch recommended users
        const usersResponse = await fetch('/api/recommendations?type=users&limit=5');
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setRecommendedUsers(usersData.users || []);
        }

      } catch (error) {
        console.error('Error fetching recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchRecommendations();
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
    <div className="min-h-screen flex w-full">
      {/* Main Content */}
      <div className="flex-1 border-r border-border min-h-screen">
        {/* Search Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center px-4 py-2 gap-3">
            <div className="flex-1 flex items-center bg-background rounded-full px-4 py-2 border border-border">
              <Search className="h-4 w-4 mr-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search"
                className="flex-1 bg-transparent text-foreground placeholder-muted-foreground text-sm focus:outline-none"
              />
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex">
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

        {/* Content based on active tab */}
        {activeTab === 'For You' && (
          <div>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-500" />
              </div>
            ) : (
              <Feed />
            )}
          </div>
        )}

        {activeTab === 'Trending' && (
          <div className="divide-y divide-border">
            <h2 className="text-xl font-bold px-4 py-3 text-foreground">Trending Hashtags</h2>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-500" />
              </div>
            ) : trendingHashtags.length > 0 ? (
              trendingHashtags.map((hashtag: any, index) => (
                <div key={index} className="px-4 py-3 hover:bg-accent cursor-pointer">
                  <div className="text-xs text-muted-foreground">Trending</div>
                  <div className="font-bold text-foreground">#{hashtag.hashtag}</div>
                  <div className="text-xs text-muted-foreground">{hashtag.count} posts</div>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-muted-foreground">
                No trending hashtags found
              </div>
            )}
          </div>
        )}

        {(activeTab === 'News' || activeTab === 'Sports' || activeTab === 'Entertainment') && (
          <div className="divide-y divide-border">
            <h2 className="text-xl font-bold px-4 py-3 text-foreground">{activeTab}</h2>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-500" />
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-muted-foreground">
                Category-specific posts coming soon
              </div>
            )}
          </div>
        )}

        {/* Who to follow in main feed */}
        <div className="border-t border-border">
          <h2 className="text-xl font-bold px-4 py-3 text-foreground">Who to follow</h2>
          <div className="divide-y divide-border">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-500" />
              </div>
            ) : recommendedUsers.length > 0 ? (
              recommendedUsers.map((user: any) => (
                <div key={user.id} className="px-4 py-3 flex items-center justify-between hover:bg-accent cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        {user.display_name?.charAt(0) || user.username?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center space-x-1">
                        <span className="font-bold text-foreground">{user.display_name || user.username}</span>
                        {user.is_verified && (
                          <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">@{user.username}</div>
                    </div>
                  </div>
                  <Button className="bg-foreground text-background font-bold rounded-full px-4 py-1 text-sm hover:opacity-90">
                    Follow
                  </Button>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-muted-foreground">
                No user recommendations available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="hidden lg:block w-80 min-h-screen border-l border-border">
        <div className="h-screen overflow-y-auto px-4 py-4">
          <div className="space-y-4">
            {/* Today's News Card */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold text-foreground">Today's News</h2>
                <button className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                {sidebarNews.map((news) => (
                  <div key={news.id} className="cursor-pointer hover:bg-accent p-2 rounded">
                    <h3 className="font-medium text-sm mb-1 text-foreground">{news.title}</h3>
                    <div className="flex items-center text-xs text-muted-foreground space-x-2">
                      <div className="flex items-center space-x-1">
                        <div className="w-4 h-4 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
                        <div className="w-4 h-4 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
                      </div>
                      <span>{news.time}</span>
                      <span>·</span>
                      <span>{news.category}</span>
                      <span>·</span>
                      <span>{news.posts}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Who to follow Card */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <h2 className="text-xl font-bold mb-3 text-foreground">Who to follow</h2>
              <div className="space-y-3">
                {sidebarWhoToFollow.map((user) => (
                  <div key={user.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar || undefined} />
                        <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                          {user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center space-x-1">
                          <span className="font-bold text-sm text-foreground">{user.name}</span>
                          {user.verified && (
                            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
                            </svg>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">@{user.username}</div>
                      </div>
                    </div>
                    <Button variant="outline" className="rounded-full px-4 py-1 text-sm font-bold border-border">
                      Follow
                    </Button>
                  </div>
                ))}
                <button className="text-blue-500 hover:underline text-sm">Show more</button>
              </div>
            </div>

            {/* Footer Links */}
            <div className="text-xs text-muted-foreground space-x-2">
              <a href="#" className="hover:underline">Terms of Service</a>
              <span>|</span>
              <a href="#" className="hover:underline">Privacy Policy</a>
              <span>|</span>
              <a href="#" className="hover:underline">Cookie Policy</a>
              <span>|</span>
              <a href="#" className="hover:underline">Accessibility</a>
              <span>|</span>
              <a href="#" className="hover:underline">Ads info</a>
              <span>|</span>
              <a href="#" className="hover:underline">More...</a>
              <span className="block mt-1">© 2025 X Corp.</span>
            </div>
          </div>
        </div>
      </div>
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

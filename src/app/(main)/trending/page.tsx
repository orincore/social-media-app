'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RightSidebar } from '@/components/sidebar/right-sidebar';
import { Flame, TrendingUp, Clock, Hash, Globe2, ArrowUpRight, Sparkles } from 'lucide-react';

interface TrendingHashtag {
  id: string;
  name: string;
  posts_count: number;
  rank: number;
  display: string;
  category: string;
  updated_at: string;
}

function TrendingContent() {
  const { status } = useSession();
  const router = useRouter();
  const [trendingHashtags, setTrendingHashtags] = useState<TrendingHashtag[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('24h');

  useEffect(() => {
    fetchTrendingData();
  }, []);

  const fetchTrendingData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/hashtags/trending?limit=20');
      if (response.ok) {
        const data = await response.json();
        setTrendingHashtags(data.hashtags || []);
      }
    } catch (error) {
      console.error('Error fetching trending data:', error);
    } finally {
      setLoading(false);
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

  const handleHashtagClick = (hashtag: string) => {
    router.push(`/hashtag/${hashtag}`);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
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
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
            <div className="px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-full">
                    <Flame className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">Trending</h1>
                    <p className="text-sm text-muted-foreground">Discover what's happening now</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => setTimeFilter(timeFilter === '24h' ? '7d' : '24h')}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Last {timeFilter}
                </Button>
              </div>
            </div>
          </div>

          {/* Trending Stats */}
          <div className="px-4 py-6">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full mx-auto mb-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-foreground">{trendingHashtags.length}</div>
                <div className="text-xs text-muted-foreground">Active Topics</div>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <div className="flex items-center justify-center w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-full mx-auto mb-2">
                  <Sparkles className="w-4 h-4 text-green-500" />
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {formatCount(trendingHashtags.reduce((sum, h) => sum + h.posts_count, 0))}
                </div>
                <div className="text-xs text-muted-foreground">Total Posts</div>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <div className="flex items-center justify-center w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-full mx-auto mb-2">
                  <Globe2 className="w-4 h-4 text-purple-500" />
                </div>
                <div className="text-2xl font-bold text-foreground">Global</div>
                <div className="text-xs text-muted-foreground">Coverage</div>
              </div>
            </div>

            {/* Trending List */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Flame className="w-5 h-5 text-orange-500" />
                    <h2 className="text-lg font-semibold text-foreground">Top Trending</h2>
                  </div>
                  <span className="text-sm text-muted-foreground">Real-time data</span>
                </div>
              </div>
              
              <div className="divide-y divide-border">
                {trendingHashtags.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <Hash className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No trending topics yet</h3>
                    <p className="text-muted-foreground">Start posting with hashtags to see trends!</p>
                  </div>
                ) : (
                  trendingHashtags.map((hashtag, index) => (
                    <button
                      key={hashtag.id}
                      onClick={() => handleHashtagClick(hashtag.name)}
                      className="w-full px-6 py-4 text-left hover:bg-accent/50 transition-colors duration-200"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              {hashtag.category}
                            </span>
                            <TrendingUp className="w-3 h-3 text-green-500" />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Hash className="w-4 h-4 text-blue-500" />
                            <span className="font-semibold text-foreground hover:text-blue-500 transition-colors">
                              {hashtag.name}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {formatCount(hashtag.posts_count)} posts
                          </p>
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Info Section */}
            <div className="mt-6 bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center space-x-2 mb-3">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-semibold text-foreground">How trending works</h3>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Trending topics are determined by the volume and velocity of posts using specific hashtags. 
                Our algorithm considers engagement quality, user diversity, and recent activity to surface 
                the most relevant conversations happening right now.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <RightSidebar />
    </div>
  );
}

export default function TrendingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
        </div>
      }
    >
      <TrendingContent />
    </Suspense>
  );
}

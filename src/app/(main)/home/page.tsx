'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect, useRouter } from 'next/navigation';
import { CreatePost } from '@/components/post/create-post';
import { Feed } from '@/components/feed/feed';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

function HomeContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'foryou' | 'following'>('foryou');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handlePostCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Check if profile is complete, redirect to onboarding if not
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const user = session.user as any;
      // Check if profile is incomplete (missing required fields)
      if (!user.profile_complete) {
        router.push('/onboarding');
      }
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    redirect('/auth/signin');
  }

  // Show loading while checking profile completion
  if (session?.user && !(session.user as any).profile_complete) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex w-full">
      {/* Main Feed */}
      <div className="flex-1 border-r border-border min-h-screen">
        {/* Header with Tabs */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex">
            <button
              onClick={() => setActiveTab('foryou')}
              className={`flex-1 px-4 py-4 text-center font-medium transition-colors relative ${
                activeTab === 'foryou'
                  ? 'text-foreground'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-900'
              }`}
            >
              For you
              {activeTab === 'foryou' && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-14 h-1 bg-blue-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('following')}
              className={`flex-1 px-4 py-4 text-center font-medium transition-colors relative ${
                activeTab === 'following'
                  ? 'text-foreground'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-900'
              }`}
            >
              Following
              {activeTab === 'following' && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-14 h-1 bg-blue-500 rounded-full" />
              )}
            </button>
            <div className="flex items-center px-4">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Create Post */}
        <CreatePost onPostCreated={handlePostCreated} />

        {/* Feed */}
        <div className="pb-4">
          <Feed refreshTrigger={refreshTrigger} />
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="hidden lg:block w-80 min-h-screen border-l border-border">
        <div className="h-screen overflow-y-auto px-4 py-4">
          <div className="space-y-4">
            {/* Subscribe to Premium */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <h2 className="text-xl font-bold mb-2 text-foreground">Subscribe to Premium</h2>
              <p className="text-sm mb-3 text-muted-foreground">
                Subscribe to unlock new features and if eligible, receive a share of revenue.
              </p>
              <Button className="bg-foreground text-background font-bold rounded-full px-6 py-2 hover:opacity-90">
                Subscribe
              </Button>
            </div>

            {/* Today's News */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold text-foreground">Today's News</h2>
                <button className="text-muted-foreground hover:text-foreground">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                  </svg>
                </button>
              </div>
              <div className="space-y-3">
                <div className="cursor-pointer hover:bg-accent p-2 rounded">
                  <h3 className="font-medium text-sm mb-1 text-foreground">
                    Vijay Sethupathi Joins Vetrimaaran's Arasan with Silambarasan TR
                  </h3>
                  <div className="flex items-center text-xs text-muted-foreground space-x-2">
                    <div className="flex items-center space-x-1">
                      <div className="w-4 h-4 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
                      <div className="w-4 h-4 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
                    </div>
                    <span>2 hours ago</span>
                    <span>•</span>
                    <span>Entertainment</span>
                    <span>•</span>
                    <span>3,504 posts</span>
                  </div>
                </div>
                <div className="cursor-pointer hover:bg-accent p-2 rounded">
                  <h3 className="font-medium text-sm mb-1 text-foreground">
                    Everton Stuns Manchester United 1-0 at Old Trafford After Early Red Card
                  </h3>
                  <div className="flex items-center text-xs text-muted-foreground space-x-2">
                    <div className="flex items-center space-x-1">
                      <div className="w-4 h-4 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
                      <div className="w-4 h-4 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
                    </div>
                    <span>3 hours ago</span>
                    <span>•</span>
                    <span>Sports</span>
                    <span>•</span>
                    <span>117K posts</span>
                  </div>
                </div>
                <div className="cursor-pointer hover:bg-accent p-2 rounded">
                  <h3 className="font-medium text-sm mb-1 text-foreground">
                    Delhi Air Pollution Protest Turns Chaotic with Maoist Slogans
                  </h3>
                  <div className="flex items-center text-xs text-muted-foreground space-x-2">
                    <div className="flex items-center space-x-1">
                      <div className="w-4 h-4 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
                      <div className="w-4 h-4 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
                    </div>
                    <span>17 hours ago</span>
                    <span>•</span>
                    <span>News</span>
                    <span>•</span>
                    <span>101.4K posts</span>
                  </div>
                </div>
              </div>
            </div>

            {/* What's happening */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <h2 className="text-xl font-bold mb-3 text-foreground">What's happening</h2>
              <div className="space-y-3">
                <div className="cursor-pointer hover:bg-accent p-2 rounded">
                  <div className="text-xs text-muted-foreground mb-1">Trending in India</div>
                  <div className="font-bold text-sm text-foreground">#कोर हुकुम</div>
                  <div className="text-xs text-muted-foreground">4,773 posts</div>
                </div>
                <div className="cursor-pointer hover:bg-accent p-2 rounded">
                  <div className="text-xs text-muted-foreground mb-1">Only on X • Trending</div>
                  <div className="font-bold text-sm text-foreground">#StressFreeLife</div>
                  <div className="text-xs text-muted-foreground">14.4K posts</div>
                </div>
                <div className="cursor-pointer hover:bg-accent p-2 rounded">
                  <div className="text-xs text-muted-foreground mb-1">Trending in India</div>
                  <div className="font-bold text-sm text-foreground">#AgriHisHere</div>
                </div>
                <div className="cursor-pointer hover:bg-accent p-2 rounded">
                  <div className="text-xs text-muted-foreground mb-1">Trending in India</div>
                  <div className="font-bold text-sm text-foreground">#ProudlyIndian</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}

'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect, useRouter } from 'next/navigation';
import { CreatePost } from '@/components/post/create-post';
import { Feed } from '@/components/feed/feed';
import { RightSidebar } from '@/components/sidebar/right-sidebar';
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
          <Feed 
            refreshTrigger={refreshTrigger} 
            feedType={activeTab === 'following' ? 'following' : 'foryou'}
          />
        </div>
      </div>

      {/* Right Sidebar */}
      <RightSidebar />
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

'use client';

import { Suspense, use } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Feed } from '@/components/feed/feed';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface HashtagPageProps {
  params: Promise<{ tag: string }>;
}

function HashtagContent({ params }: HashtagPageProps) {
  const { tag } = use(params);
  const { status } = useSession();

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
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center px-4 py-3 gap-4">
            <Link href="/home">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-foreground">#{tag}</h1>
              <p className="text-sm text-muted-foreground">Posts with this hashtag</p>
            </div>
          </div>
        </div>

        {/* Feed filtered by hashtag */}
        <Feed hashtag={tag} />
      </div>

      {/* Right Sidebar */}
      <div className="hidden lg:block w-80 min-h-screen border-l border-border">
        <div className="h-screen overflow-y-auto px-4 py-4">
          <div className="space-y-4">
            {/* Hashtag Info Card */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <h2 className="text-xl font-bold text-foreground mb-2">#{tag}</h2>
              <p className="text-muted-foreground text-sm mb-4">
                View all posts containing this hashtag
              </p>
              <Button className="w-full bg-foreground text-background font-bold rounded-full hover:opacity-90">
                Follow
              </Button>
            </div>

            {/* Related hashtags placeholder */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <h2 className="text-lg font-bold text-foreground mb-3">Related hashtags</h2>
              <div className="space-y-2">
                <p className="text-muted-foreground text-sm">
                  Related hashtags will appear here
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HashtagPage({ params }: HashtagPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-foreground" />
        </div>
      }
    >
      <HashtagContent params={params} />
    </Suspense>
  );
}

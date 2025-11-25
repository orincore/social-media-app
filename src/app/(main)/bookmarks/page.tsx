'use client';

import { Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { BookmarkPlus, Clock, Sparkles } from 'lucide-react';
import { TrendingTopics } from '@/components/trending/trending-topics';
import { WhoToFollow } from '@/components/suggestions/who-to-follow';
import { Button } from '@/components/ui/button';

interface SavedPost {
  id: string;
  author: string;
  handle: string;
  time: string;
  excerpt: string;
  context: string;
}

const savedPosts: SavedPost[] = [
  {
    id: '1',
    author: 'Policy Futures Lab',
    handle: 'policyfutures',
    time: '2d',
    excerpt: 'Three principles for citizen-led AI governance in cities.',
    context: 'Thread · Civic tech',
  },
  {
    id: '2',
    author: 'Civic Signals Council',
    handle: 'civic_signals',
    time: '5d',
    excerpt: 'Metrics that actually measure healthy conversations—not just engagement.',
    context: 'Article · Research',
  },
  {
    id: '3',
    author: 'Open Data Commons',
    handle: 'opendatacommons',
    time: '1w',
    excerpt: 'Designing APIs that respect communities and their contexts.',
    context: 'Space recap · Infrastructure',
  },
];

function BookmarksContent() {
  const { status } = useSession();

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-b-2 border-blue-500" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    redirect('/auth/signin');
  }

  return (
    <div className="min-h-screen w-full pb-12">
      <div className="mx-auto mt-4 flex w-full max-w-[1500px] flex-col gap-8 px-3 sm:mt-6 sm:px-6 lg:mt-8 lg:flex-row lg:items-start lg:px-8 xl:gap-12">
        {/* Bookmarks feed */}
        <section className="flex-1 w-full max-w-[960px] rounded-3xl border border-border/60 bg-slate-950/60 backdrop-blur">
          {/* Header */}
          <div className="border-b border-border/40 bg-slate-950/90 backdrop-blur-xl">
            <div className="flex items-center justify-between px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 text-blue-400 sm:h-10 sm:w-10">
                  <BookmarkPlus className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white sm:text-2xl">Bookmarks</h1>
                  <p className="text-sm text-slate-400">Your saved threads, reports, and Spaces.</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full border border-border/60 text-slate-300 hover:border-border hover:text-white"
              >
                <Clock className="mr-2 h-4 w-4" />
                Sort
              </Button>
            </div>
          </div>

          {/* Empty / Saved posts */}
          {savedPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center text-slate-400">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-900 text-blue-400">
                <BookmarkPlus className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white sm:text-xl">No bookmarks yet</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Save posts you want to revisit later. They will appear here in a clean, distraction-free list.
                </p>
              </div>
              <Button className="rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-6 text-sm font-semibold shadow-blue-500/25">
                <Sparkles className="mr-2 h-4 w-4" />
                Discover posts to bookmark
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {savedPosts.map((post) => (
                <article key={post.id} className="px-4 py-5 transition-colors hover:bg-slate-900/60 sm:px-6">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-9 w-9 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white sm:text-[15px]">{post.author}</p>
                        <span className="text-xs text-slate-400">@{post.handle}</span>
                        <span className="text-xs text-slate-500">· {post.time}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-200 sm:text-[15px]">{post.excerpt}</p>
                      <p className="mt-1 text-xs font-medium text-slate-400">{post.context}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full border border-border/60 text-slate-400 hover:border-blue-500 hover:text-blue-400"
                    >
                      <BookmarkPlus className="h-4 w-4" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Right Sidebar */}
        <aside className="hidden w-full lg:block lg:max-w-[330px] xl:max-w-[360px] lg:ml-auto">
          <div className="sticky top-10 space-y-4 pr-1 xl:pr-2">
            <TrendingTopics />
            <WhoToFollow />
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function BookmarksPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="h-9 w-9 animate-spin rounded-full border-b-2 border-blue-500" />
        </div>
      }
    >
      <BookmarksContent />
    </Suspense>
  );
}

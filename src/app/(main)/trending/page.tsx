'use client';

import { Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { TrendingTopics } from '@/components/trending/trending-topics';
import { WhoToFollow } from '@/components/suggestions/who-to-follow';
import { Flame, TrendingUp, Clock, Hash, Globe2, ArrowUpRight } from 'lucide-react';

interface TrendItem {
  id: string;
  category: string;
  title: string;
  posts: string;
  change: string;
  region: string;
}

const topTrends: TrendItem[] = [
  {
    id: '1',
    category: 'Politics',
    title: 'Election2024',
    posts: '127K',
    change: '+21% today',
    region: 'Global',
  },
  {
    id: '2',
    category: 'Technology',
    title: 'AI Safety',
    posts: '89K',
    change: '+13% today',
    region: 'US · EU',
  },
  {
    id: '3',
    category: 'Climate',
    title: 'ClimateAction',
    posts: '56K',
    change: '+34% today',
    region: 'Global South',
  },
  {
    id: '4',
    category: 'Economy',
    title: 'CostOfLiving',
    posts: '42K',
    change: '+8% today',
    region: 'UK',
  },
  {
    id: '5',
    category: 'Rights',
    title: 'DigitalFreedom',
    posts: '31K',
    change: '+19% today',
    region: 'Global',
  },
];

function TrendingContent() {
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
      <div className="mx-auto mt-4 flex w-full max-w-[1000px] flex-col gap-8 px-3 sm:mt-6 sm:px-6 lg:mt-8 lg:px-8">
        {/* Trending Feed */}
        <section className="w-full space-y-6">
          {/* Header */}
          <div className="rounded-3xl border border-border/60 bg-slate-950/80 px-4 py-4 backdrop-blur sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 text-blue-400 sm:h-10 sm:w-10">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white sm:text-2xl">Trending</h1>
                  <p className="text-sm text-slate-400">Live view of topics shaping the conversation.</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full border border-border/60 text-slate-300 hover:border-border hover:text-white"
              >
                <Clock className="mr-2 h-4 w-4" />
                Last 24h
              </Button>
            </div>
          </div>

          {/* Top trends list */}
          <div className="rounded-3xl border border-border/60 bg-slate-950/70 p-4 backdrop-blur sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400">
                <Flame className="h-4 w-4 text-orange-400" />
                <span className="text-xs font-semibold uppercase tracking-widest">Top trends</span>
              </div>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Globe2 className="h-3.5 w-3.5" />
                Global + local mix
              </span>
            </div>
            <div className="divide-y divide-border/40">
              {topTrends.map((trend, index) => (
                <button
                  key={trend.id}
                  className="flex w-full items-center gap-3 py-3 text-left transition hover:bg-slate-900/70 rounded-2xl px-2"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-slate-400 text-xs font-semibold">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{trend.category}</span>
                      <span className="text-[11px] text-slate-500">· {trend.region}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Hash className="h-4 w-4 text-blue-400" />
                      <p className="truncate text-sm font-semibold text-white sm:text-[15px]">{trend.title}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{trend.posts} posts · {trend.change}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 flex-shrink-0 text-slate-500" />
                </button>
              ))}
            </div>
          </div>

          {/* Context section */}
          <div className="rounded-3xl border border-border/60 bg-slate-950/70 p-5 backdrop-blur">
            <div className="flex items-center gap-2 text-slate-300">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              <p className="text-sm font-semibold">Why these trends?</p>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              Trends on Social Pulse surface topics that are seeing meaningful, high-quality participation—not just raw volume.
              Signals include cross-community engagement, diversity of voices, and healthy reply ratios.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function TrendingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="h-9 w-9 animate-spin rounded-full border-b-2 border-blue-500" />
        </div>
      }
    >
      <TrendingContent />
    </Suspense>
  );
}

'use client';

import { Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { TrendingTopics } from '@/components/trending/trending-topics';
import { WhoToFollow } from '@/components/suggestions/who-to-follow';
import {
  BellRing,
  Heart,
  MessageCircle,
  Repeat2,
  ShieldAlert,
  Sparkles,
  UserPlus,
  Megaphone,
} from 'lucide-react';

const notificationFilters = ['All', 'Mentions', 'Verified', 'System'];

const notifications = [
  {
    id: '1',
    type: 'like',
    icon: Heart,
    title: 'Impact Labs liked your post',
    description: '“Policy prototypes for equitable AI deployment.”',
    time: '5m',
    accent: 'text-red-400 bg-red-500/10',
  },
  {
    id: '2',
    type: 'repost',
    icon: Repeat2,
    title: 'Civic Circle reposted you',
    description: '“Community budgets need radical transparency.”',
    time: '22m',
    accent: 'text-green-400 bg-green-500/10',
  },
  {
    id: '3',
    type: 'mention',
    icon: MessageCircle,
    title: 'You were mentioned in a Space',
    description: '“Join the open governance AMA this evening.”',
    time: '1h',
    accent: 'text-blue-400 bg-blue-500/10',
  },
  {
    id: '4',
    type: 'system',
    icon: ShieldAlert,
    title: 'Safety center update',
    description: 'Your account has new verification controls available.',
    time: '3h',
    accent: 'text-amber-400 bg-amber-500/10',
  },
  {
    id: '5',
    type: 'follow',
    icon: UserPlus,
    title: 'Nora Kaplan followed you',
    description: 'Senior researcher at Civic Vision Labs',
    time: '6h',
    accent: 'text-purple-400 bg-purple-500/10',
  },
];

function NotificationsContent() {
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
        {/* Notifications Feed */}
        <section className="flex-1 w-full max-w-[960px] space-y-6">
          {/* Header */}
          <div className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/90 backdrop-blur-xl">
            <div className="flex items-center justify-between px-4 py-4 sm:px-6">
              <div className="flex items-center space-x-3">
                <BellRing className="h-6 w-6 text-blue-400" />
                <div>
                  <h1 className="text-xl font-bold text-white">Notifications</h1>
                  <p className="text-sm text-slate-400">Stay ahead of the conversations that matter.</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full px-4 py-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </div>

            <div className="flex w-full gap-2 overflow-auto px-3 pb-3 sm:px-6">
              {notificationFilters.map((filter) => (
                <button
                  key={filter}
                  className="rounded-2xl border border-transparent px-4 py-2 text-sm font-medium text-slate-400 transition hover:border-blue-500/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Notification Cards */}
          <div className="space-y-3">
            {notifications.map((notification) => {
              const Icon = notification.icon;
              return (
                <article
                  key={notification.id}
                  className="group rounded-3xl border border-slate-800/70 bg-slate-950/60 p-5 backdrop-blur transition hover:border-blue-500/60 hover:bg-slate-900/60"
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${notification.accent}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-white">{notification.title}</h3>
                        <span className="text-xs text-slate-500">{notification.time}</span>
                      </div>
                      <p className="text-sm text-slate-300">{notification.description}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Alerts */}
          <div className="rounded-3xl border border-blue-500/30 bg-blue-500/10 p-6 text-white shadow-lg shadow-blue-900/30">
            <div className="flex items-start gap-3">
              <Megaphone className="h-6 w-6 text-blue-300" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Civic alerts</h3>
                <p className="text-sm text-blue-50/80">
                  Enable trusted alerts to get real-time updates from verified institutions during emergencies or breaking
                  policy shifts.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button className="rounded-full bg-white/90 px-5 text-sm font-semibold text-slate-900 hover:bg-white">
                    Enable now
                  </Button>
                  <Button variant="ghost" className="rounded-full border border-white/30 text-white hover:bg-white/10">
                    Learn more
                  </Button>
                </div>
              </div>
            </div>
          </div>
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

export default function NotificationsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="h-9 w-9 animate-spin rounded-full border-b-2 border-blue-500" />
        </div>
      }
    >
      <NotificationsContent />
    </Suspense>
  );
}

'use client';

import { Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { CreatePost } from '@/components/post/create-post';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles } from 'lucide-react';

function CreatePostContent() {
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
    <div className="min-h-screen w-full bg-slate-950 pb-12 pt-16 lg:pt-0">
      <div className="mx-auto mt-2 flex w-full max-w-[800px] flex-col gap-4 px-4 sm:mt-4 sm:px-6 lg:mt-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-3 pb-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-white sm:text-lg">Create post</p>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-blue-400" />
              Share a thoughtful update with your followers
            </p>
          </div>
        </div>

        {/* Composer card */}
        <section className="overflow-hidden rounded-3xl border border-slate-800/70 bg-slate-950/80 backdrop-blur">
          <CreatePost />
        </section>
      </div>
    </div>
  );
}

export default function CreatePostPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="h-9 w-9 animate-spin rounded-full border-b-2 border-blue-500" />
        </div>
      }
    >
      <CreatePostContent />
    </Suspense>
  );
}

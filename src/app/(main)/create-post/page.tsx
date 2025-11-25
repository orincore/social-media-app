'use client';

import { Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { redirect, useRouter } from 'next/navigation';
import { CreatePost } from '@/components/post/create-post';
import { RightSidebar } from '@/components/sidebar/right-sidebar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles, Edit3, Feather } from 'lucide-react';

function CreatePostContent() {
  const { status } = useSession();
  const router = useRouter();

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

  return (
    <div className="min-h-screen flex w-full">
      {/* Main Content */}
      <div className="flex-1 border-r border-border min-h-screen">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
            <div className="px-4 py-4">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => router.back()}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full">
                    <Edit3 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">Create Post</h1>
                    <p className="text-sm text-muted-foreground">Share your thoughts with the world</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 py-6">
            {/* Tips Card */}
            <div className="bg-card border border-border rounded-2xl p-6 mb-6">
              <div className="flex items-center space-x-2 mb-4">
                <Feather className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-semibold text-foreground">Writing Tips</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div className="flex items-start space-x-2">
                  <Sparkles className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span>Use hashtags to reach more people</span>
                </div>
                <div className="flex items-start space-x-2">
                  <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>Mention others with @ to start conversations</span>
                </div>
                <div className="flex items-start space-x-2">
                  <Sparkles className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Add images to make your post stand out</span>
                </div>
                <div className="flex items-start space-x-2">
                  <Sparkles className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span>Keep it authentic and engaging</span>
                </div>
              </div>
            </div>

            {/* Create Post Card */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <div className="flex items-center space-x-2">
                  <Edit3 className="w-5 h-5 text-green-500" />
                  <h2 className="text-lg font-semibold text-foreground">Compose Your Post</h2>
                </div>
              </div>
              
              <div className="p-6">
                <CreatePost />
              </div>
            </div>

            {/* Guidelines Card */}
            <div className="mt-6 bg-card border border-border rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-3">Community Guidelines</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• Be respectful and kind to others</p>
                <p>• No spam, harassment, or inappropriate content</p>
                <p>• Share original content and give credit when needed</p>
                <p>• Follow local laws and platform terms of service</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <RightSidebar />
    </div>
  );
}

export default function CreatePostPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
        </div>
      }
    >
      <CreatePostContent />
    </Suspense>
  );
}

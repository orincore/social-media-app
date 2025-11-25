'use client';

import { Suspense, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect, useRouter } from 'next/navigation';
import { BookmarkPlus, Clock, Sparkles, Bookmark, Heart, MessageCircle, Repeat2, Share, Archive } from 'lucide-react';
import { RightSidebar } from '@/components/sidebar/right-sidebar';
import { Button } from '@/components/ui/button';
import { useBookmarks } from '@/hooks/use-bookmarks';


function BookmarksContent() {
  const { status } = useSession();
  const router = useRouter();
  const { bookmarks, isLoading, error, fetchBookmarks, removeBookmark } = useBookmarks();

  useEffect(() => {
    if (status === 'authenticated') {
      fetchBookmarks();
    }
  }, [status, fetchBookmarks]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return diffInMinutes < 1 ? 'now' : `${diffInMinutes}m`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d`;
    }
  };

  const handlePostClick = (postId: string) => {
    router.push(`/post/${postId}`);
  };

  const handleRemoveBookmark = async (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    await removeBookmark(postId);
  };

  if (status === 'loading' || isLoading) {
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
                  <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full">
                    <Archive className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">Bookmarks</h1>
                    <p className="text-sm text-muted-foreground">Your saved posts and content</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Sort
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 py-6">
            {bookmarks.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-8 text-center">
                <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full mx-auto mb-6">
                  <Archive className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">No bookmarks yet</h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Save posts you want to revisit later. They will appear here in a clean, organized list.
                </p>
                <Button 
                  onClick={() => router.push('/')}
                  className="bg-foreground text-background font-bold rounded-full px-6 py-2 hover:opacity-90"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Discover posts to bookmark
                </Button>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Archive className="w-5 h-5 text-amber-500" />
                      <h2 className="text-lg font-semibold text-foreground">Saved Posts</h2>
                      <span className="text-sm text-muted-foreground">({bookmarks.length})</span>
                    </div>
                  </div>
                </div>
                
                <div className="divide-y divide-border">
                  {bookmarks.map((bookmark) => (
                    <article 
                      key={bookmark.id} 
                      className="px-6 py-4 transition-colors hover:bg-accent/50 cursor-pointer"
                      onClick={() => handlePostClick(bookmark.post.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="relative">
                          {bookmark.post.users.avatar_url ? (
                            <img
                              src={bookmark.post.users.avatar_url}
                              alt={bookmark.post.users.display_name}
                              className="h-10 w-10 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-700"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold ring-2 ring-gray-200 dark:ring-gray-700">
                              {bookmark.post.users.display_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-semibold text-foreground">
                              {bookmark.post.users.display_name}
                            </span>
                            <span className="text-sm text-muted-foreground">@{bookmark.post.users.username}</span>
                            <span className="text-sm text-muted-foreground">·</span>
                            <span className="text-sm text-muted-foreground">{formatTime(bookmark.post.created_at)}</span>
                          </div>
                          <p className="text-foreground mb-3 leading-relaxed">{bookmark.post.content}</p>
                          
                          {/* Post stats */}
                          <div className="flex items-center space-x-6 text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <MessageCircle className="h-4 w-4" />
                              <span className="text-sm">{bookmark.post.replies_count}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Repeat2 className="h-4 w-4" />
                              <span className="text-sm">{bookmark.post.reposts_count}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Heart className="h-4 w-4" />
                              <span className="text-sm">{bookmark.post.likes_count}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleRemoveBookmark(e, bookmark.post.id)}
                          className="h-8 w-8 rounded-full text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                          title="Remove bookmark"
                        >
                          <Bookmark className="h-4 w-4 fill-current" />
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <RightSidebar />
    </div>
  );
}

export default function BookmarksPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
        </div>
      }
    >
      <BookmarksContent />
    </Suspense>
  );
}

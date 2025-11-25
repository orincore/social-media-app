'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, Loader2, Heart, MessageCircle, Send } from 'lucide-react';

interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  likes_count: number;
  replies_count: number;
  created_at: string;
  user: User;
}

interface Post {
  id: string;
  user_id: string;
  content: string;
  likes_count: number;
  reposts_count: number;
  replies_count: number;
  created_at: string;
  user?: User;
}

interface CommentModalProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
  onCommentAdded?: () => void;
}

export function CommentModal({ post, isOpen, onClose, onCommentAdded }: CommentModalProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchComments = useCallback(async (pageNum: number, append: boolean = false) => {
    try {
      if (pageNum === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      const response = await fetch(`/api/posts/${post.id}/comments?page=${pageNum}&limit=10`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }

      const data = await response.json();
      
      if (append) {
        setComments(prev => [...prev, ...data.comments]);
      } else {
        setComments(data.comments);
      }
      
      setHasMore(data.pagination.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comments');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [post.id]);

  useEffect(() => {
    if (isOpen) {
      setPage(1);
      fetchComments(1, false);
    }
  }, [isOpen, fetchComments]);

  const loadMore = () => {
    if (!isLoadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchComments(nextPage, true);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim() || isSubmitting || !session?.user?.id) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add comment');
      }

      const data = await response.json();
      
      // Add new comment to the top of the list
      setComments(prev => [data.comment, ...prev]);
      setNewComment('');
      
      if (onCommentAdded) {
        onCommentAdded();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'now';
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)}m`;
    } else if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)}h`;
    } else {
      const diffInDays = Math.floor(diffInSeconds / 86400);
      return `${diffInDays}d`;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-background border border-border rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Comments</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Original Post Preview */}
        <div className="px-4 py-3 border-b border-border bg-accent/30">
          <div className="flex space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={post.user?.avatar_url || undefined} />
              <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs">
                {post.user?.display_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1">
                <span className="font-bold text-sm text-foreground">{post.user?.display_name || 'Unknown'}</span>
                <span className="text-xs text-muted-foreground">@{post.user?.username || 'unknown'}</span>
              </div>
              <p className="text-sm text-foreground line-clamp-2">{post.content}</p>
            </div>
          </div>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <p className="text-red-500 text-sm mb-2">{error}</p>
              <Button onClick={() => fetchComments(1, false)} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <MessageCircle className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-muted-foreground text-sm">No comments yet</p>
              <p className="text-muted-foreground text-xs">Be the first to comment!</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {comments.map((comment) => {
                const isOwnComment = session?.user?.id === comment.user_id;
                const displayName = comment.user?.display_name || (isOwnComment ? session?.user?.name || 'You' : 'Unknown');
                const username = comment.user?.username || (isOwnComment ? 'you' : 'unknown');
                const avatarUrl = comment.user?.avatar_url || (isOwnComment ? session?.user?.image || null : null);

                return (
                  <div key={comment.id} className="px-4 py-3 hover:bg-accent/50 transition-colors">
                    <div className="flex space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={avatarUrl || undefined} />
                        <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs">
                          {displayName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-1 mb-0.5">
                          <span className="font-bold text-sm text-foreground">{displayName}</span>
                          {comment.user?.is_verified && (
                            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
                            </svg>
                          )}
                          <span className="text-xs text-muted-foreground">@{username}</span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">{formatDate(comment.created_at)}</span>
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{comment.content}</p>
                        <div className="flex items-center space-x-4 mt-2">
                          <button className="flex items-center space-x-1 text-muted-foreground hover:text-red-500 transition-colors">
                            <Heart className="h-3.5 w-3.5" />
                            <span className="text-xs">{comment.likes_count}</span>
                          </button>
                          <button className="flex items-center space-x-1 text-muted-foreground hover:text-blue-500 transition-colors">
                            <MessageCircle className="h-3.5 w-3.5" />
                            <span className="text-xs">{comment.replies_count}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Load More */}
              {hasMore && (
                <div className="p-3 flex justify-center">
                  <Button
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    variant="ghost"
                    size="sm"
                    className="text-blue-500"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load more comments'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Comment Input */}
        <div className="border-t border-border px-4 py-3">
          <form onSubmit={handleSubmitComment} className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={session?.user?.image || undefined} />
              <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs">
                {session?.user?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 flex items-center bg-accent rounded-full px-4 py-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 bg-transparent text-foreground placeholder-muted-foreground text-sm focus:outline-none"
                maxLength={280}
                disabled={isSubmitting}
              />
              <Button
                type="submit"
                disabled={!newComment.trim() || isSubmitting}
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-blue-500 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
          {newComment.length > 0 && (
            <div className="text-right mt-1">
              <span className={`text-xs ${newComment.length > 260 ? 'text-red-500' : 'text-muted-foreground'}`}>
                {280 - newComment.length}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

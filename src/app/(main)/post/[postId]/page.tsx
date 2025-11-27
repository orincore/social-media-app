'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Loader2, MessageCircle } from 'lucide-react';
import { ShareModal } from '@/components/post/share-modal';
import { PostDetailHeader } from '@/components/post/post-detail-header';
import { PostActionsBar } from '@/components/post/post-actions-bar';
import { ReplyInput } from '@/components/post/reply-input';
import { CommentThread } from '@/components/post/comment-thread';
import { MediaDisplay } from '@/components/post/media-display';
import { ClickableContent } from '@/components/ui/clickable-content';

interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
}

interface Post {
  id: string;
  user_id: string;
  content: string;
  media_urls: string[] | null;
  hashtags: string[] | null;
  mentions: string[] | null;
  likes_count: number;
  reposts_count: number;
  replies_count: number;
  views_count: number;
  created_at: string;
  user: User | null;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  likes_count: number;
  replies_count: number;
  reply_to_id: string | null;
  created_at: string;
  user: User | null;
  replies?: Comment[];
  hasMoreReplies?: boolean;
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const postId = params.postId as string;

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const [isLiked, setIsLiked] = useState(false);
  const [isReposted, setIsReposted] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);

  // Fetch post details
  const fetchPost = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/posts/${postId}`);
      
      if (!response.ok) {
        throw new Error('Post not found');
      }

      const data = await response.json();
      setPost(data.post);
      setIsLiked(data.isLiked || false);
      setIsReposted(data.isReposted || false);
      setIsBookmarked(data.isBookmarked || false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load post');
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  // Fetch comments
  const fetchComments = useCallback(async (pageNum: number, append: boolean = false) => {
    try {
      if (pageNum === 1) {
        setIsLoadingComments(true);
      } else {
        setIsLoadingMore(true);
      }

      const response = await fetch(`/api/posts/${postId}/comments?page=${pageNum}&limit=10`);
      
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
      
      // Set liked comments
      if (data.likedCommentIds) {
        if (append) {
          setLikedComments(prev => {
            const newSet = new Set(prev);
            data.likedCommentIds.forEach((id: string) => newSet.add(id));
            return newSet;
          });
        } else {
          setLikedComments(new Set(data.likedCommentIds));
        }
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setIsLoadingComments(false);
      setIsLoadingMore(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchPost();
    fetchComments(1, false);
  }, [fetchPost, fetchComments]);

  const loadMoreComments = () => {
    if (!isLoadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchComments(nextPage, true);
    }
  };

  const loadMoreReplies = useCallback(async (commentId: string) => {
    try {
      // First check if it's a top-level comment
      let comment = comments.find(c => c.id === commentId);
      let isNestedReply = false;
      let parentCommentId: string | null = null;
      
      // If not found in top-level, search in replies (nested)
      if (!comment) {
        for (const c of comments) {
          const foundReply = c.replies?.find(r => r.id === commentId);
          if (foundReply) {
            comment = foundReply;
            isNestedReply = true;
            parentCommentId = c.id;
            break;
          }
        }
      }
      
      if (!comment) return;

      const currentRepliesCount = comment.replies?.length || 0;
      const response = await fetch(`/api/posts/${postId}/comments?parentId=${commentId}&offset=${currentRepliesCount}&limit=10`);
      
      if (!response.ok) {
        throw new Error('Failed to load replies');
      }
      
      const data = await response.json();
      
      if (isNestedReply && parentCommentId) {
        // Update nested reply's replies
        setComments(prev => prev.map(c => {
          if (c.id === parentCommentId) {
            return {
              ...c,
              replies: c.replies?.map(r => {
                if (r.id === commentId) {
                  return {
                    ...r,
                    replies: [...(r.replies || []), ...data.comments],
                    hasMoreReplies: data.hasMore
                  };
                }
                return r;
              })
            };
          }
          return c;
        }));
      } else {
        // Update top-level comment's replies
        setComments(prev => prev.map(c => {
          if (c.id === commentId) {
            return {
              ...c,
              replies: [...(c.replies || []), ...data.comments],
              hasMoreReplies: data.hasMore
            };
          }
          return c;
        }));
      }

      // Update liked comments for replies
      if (data.likedCommentIds) {
        setLikedComments(prev => {
          const newSet = new Set(prev);
          data.likedCommentIds.forEach((id: string) => newSet.add(id));
          return newSet;
        });
      }
    } catch (err) {
      console.error('Error loading more replies:', err);
    }
  }, [postId, comments]);

  const handleLike = async () => {
    if (!session?.user?.id || !post) return;

    const wasLiked = isLiked;
    
    // Optimistic update
    setIsLiked(!isLiked);
    setPost(prev => prev ? {
      ...prev,
      likes_count: wasLiked ? prev.likes_count - 1 : prev.likes_count + 1
    } : null);

    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: wasLiked ? 'DELETE' : 'POST',
      });

      if (!response.ok) {
        // Revert on error
        setIsLiked(wasLiked);
        setPost(prev => prev ? {
          ...prev,
          likes_count: wasLiked ? prev.likes_count + 1 : prev.likes_count - 1
        } : null);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleRepost = async () => {
    if (!session?.user?.id || !post) return;

    const wasReposted = isReposted;
    
    // Optimistic update
    setIsReposted(!isReposted);
    setPost(prev => prev ? {
      ...prev,
      reposts_count: wasReposted ? prev.reposts_count - 1 : prev.reposts_count + 1
    } : null);

    try {
      const response = await fetch(`/api/posts/${postId}/repost`, {
        method: wasReposted ? 'DELETE' : 'POST',
      });

      if (!response.ok) {
        // Revert on error
        setIsReposted(wasReposted);
        setPost(prev => prev ? {
          ...prev,
          reposts_count: wasReposted ? prev.reposts_count + 1 : prev.reposts_count - 1
        } : null);
      }
    } catch (error) {
      console.error('Error toggling repost:', error);
    }
  };

  const handleBookmark = async () => {
    if (!session?.user?.id) return;
    
    // Optimistic update
    setIsBookmarked(!isBookmarked);
    
    try {
      const response = await fetch(`/api/posts/${postId}/bookmark`, {
        method: isBookmarked ? 'DELETE' : 'POST',
      });

      if (!response.ok) {
        // Revert on error
        setIsBookmarked(isBookmarked);
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  const handleCommentLike = async (commentId: string) => {
    if (!session?.user?.id) return;

    const wasLiked = likedComments.has(commentId);
    
    // Optimistic update
    setComments(comments.map(comment => 
      comment.id === commentId 
        ? { ...comment, likes_count: wasLiked ? comment.likes_count - 1 : comment.likes_count + 1 }
        : comment
    ));

    if (wasLiked) {
      setLikedComments(prev => {
        const newSet = new Set(prev);
        newSet.delete(commentId);
        return newSet;
      });
    } else {
      setLikedComments(prev => new Set(prev).add(commentId));
    }

    try {
      await fetch(`/api/comments/${commentId}/like`, {
        method: wasLiked ? 'DELETE' : 'POST',
      });
    } catch (error) {
      console.error('Error toggling comment like:', error);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim() || isSubmitting || !session?.user?.id) return;
    
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: newComment.trim(),
          replyToId: replyingTo?.id 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      const data = await response.json();
      
      if (replyingTo) {
        // If replying to a comment, add to that comment's replies
        setComments(prev => prev.map(comment => {
          if (comment.id === replyingTo.id) {
            return {
              ...comment,
              replies: [...(comment.replies || []), data.comment],
              replies_count: comment.replies_count + 1
            };
          }
          return comment;
        }));
      } else {
        // If top-level comment, add to the top
        setComments(prev => [data.comment, ...prev]);
      }
      
      setNewComment('');
      setReplyingTo(null);
      
      // Update post replies count
      setPost(prev => prev ? { ...prev, replies_count: prev.replies_count + 1 } : null);
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    return `${Math.floor(diffInSeconds / 86400)}d`;
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
        <p className="text-red-500 mb-4">{error || 'Post not found'}</p>
        <Button onClick={() => router.back()} variant="outline">
          Go Back
        </Button>
      </div>
    );
  }

  const isOwnPost = session?.user?.id === post.user_id;
  const displayName = post.user?.display_name || (isOwnPost ? session?.user?.name || 'You' : 'Unknown');
  const username = post.user?.username || (isOwnPost ? 'you' : 'unknown');
  const avatarUrl = post.user?.avatar_url || (isOwnPost ? session?.user?.image : null) || null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto border-x border-border min-h-screen">
        {/* Header */}
        <PostDetailHeader
          user={post.user}
          displayName={displayName}
          username={username}
          avatarUrl={avatarUrl}
          showReportMenu={!isOwnPost}
          isHeaderMenuOpen={isHeaderMenuOpen}
          onToggleMenu={() => setIsHeaderMenuOpen((prev) => !prev)}
          postId={post.id}
        />

        {/* Post Content */}
        <article>
          {/* Post Text */}
          <div className="px-4 py-3">
            <ClickableContent 
              content={post.content}
              className="text-primary text-xl leading-relaxed whitespace-pre-wrap"
            />
          </div>

          {/* Media */}
          {post.media_urls && post.media_urls.length > 0 && (
            <div className="px-4 pb-3">
              <MediaDisplay mediaUrls={post.media_urls} />
            </div>
          )}

          {/* Timestamp & Views */}
          <div className="flex items-center gap-2 text-tertiary text-sm px-4 py-2">
            <time>{formatDate(post.created_at)}</time>
            <span>·</span>
            <span className="font-semibold text-secondary">{formatCount(post.views_count)}</span>
            <span>Views</span>
          </div>

          {/* Action Buttons */}
          <PostActionsBar
            isLiked={isLiked}
            isReposted={isReposted}
            isBookmarked={isBookmarked}
            repliesCount={post.replies_count}
            repostsCount={post.reposts_count}
            likesCount={post.likes_count}
            onLike={handleLike}
            onRepost={handleRepost}
            onBookmark={handleBookmark}
            onShare={() => setIsShareModalOpen(true)}
          />
        </article>

        {/* Reply Input */}
        <ReplyInput
          value={newComment}
          onChange={setNewComment}
          onSubmit={handleSubmitComment}
          isSubmitting={isSubmitting}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
        />

        {/* Comments Section */}
        <div>
          {isLoadingComments ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <MessageCircle className="h-12 w-12 text-quaternary mb-3" />
              <p className="text-secondary">No replies yet</p>
              <p className="text-tertiary text-sm">Be the first to reply!</p>
            </div>
          ) : (
            <>
              {comments.map((comment) => (
                <CommentThread
                  key={comment.id}
                  comment={comment}
                  likedComments={likedComments}
                  onReply={setReplyingTo}
                  onLike={handleCommentLike}
                  onLoadMoreReplies={loadMoreReplies}
                  formatRelativeDate={formatRelativeDate}
                />
              ))}

              {/* Load More Comments */}
              {hasMore && (
                <div className="p-4 flex justify-center">
                  <Button
                    onClick={loadMoreComments}
                    disabled={isLoadingMore}
                    variant="ghost"
                    className="text-blue-500 hover:bg-blue-500/10"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Show more replies'
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        postId={post.id}
        postContent={post.content}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />
    </div>
  );
}

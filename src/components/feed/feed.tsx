'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Repeat2, Share, MoreHorizontal, Loader2, Flag } from 'lucide-react';
import { ReportModal } from '@/components/report/report-modal';
import { CommentModal } from '@/components/post/comment-modal';
import { ShareModal } from '@/components/post/share-modal';
import { MediaDisplay } from '@/components/post/media-display';
import { EditPostModal } from '@/components/post/edit-post-modal';
import { useNotifications } from '@/hooks/use-notifications';
import { ClickableContent } from '@/components/ui/clickable-content';
import { ClickableAvatar } from '@/components/ui/clickable-avatar';
import { FeedSkeleton } from '@/components/ui/skeleton-loaders';

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
  repost_of_id?: string | null;
  user: User;
  reposted_from_user?: User | null;
  is_liked?: boolean;
  is_reposted?: boolean;
  is_edited?: boolean;
  edited_at?: string;
}

interface FeedProps {
  hashtag?: string;
  refreshTrigger?: number;
  feedType?: 'foryou' | 'following';
}

export function Feed({ hashtag, refreshTrigger, feedType = 'foryou' }: FeedProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { createNotification } = useNotifications();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [repostedPosts, setRepostedPosts] = useState<Set<string>>(new Set());
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [sharePostId, setSharePostId] = useState<string>('');
  const [sharePostContent, setSharePostContent] = useState<string>('');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const [reportPostAuthor, setReportPostAuthor] = useState<string | undefined>(undefined);

  const fetchPosts = useCallback(async (pageNum: number, append: boolean = false) => {
    try {
      if (pageNum === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '10',
      });

      if (hashtag) {
        params.set('hashtag', hashtag);
      }

      if (feedType) {
        params.set('feedType', feedType);
      }

      // Use regular posts API for now (recommendations can be added later)
      // TODO: Re-enable recommendations after fixing the algorithm
      
      // Fetch regular posts
      const response = await fetch(`/api/posts?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }

      const data = await response.json();
      
      
      if (append) {
        setPosts(prev => [...prev, ...(data.posts || [])]);
      } else {
        setPosts(data.posts || []);
        // Set liked/reposted posts from API response
        if (data.likedPostIds) {
          setLikedPosts(new Set(data.likedPostIds));
        }
        if (data.repostedPostIds) {
          setRepostedPosts(new Set(data.repostedPostIds));
        }
      }
      
      setHasMore(data.pagination.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [hashtag, feedType]);

  // Initial fetch and refresh when trigger changes
  useEffect(() => {
    setPage(1);
    fetchPosts(1, false);
  }, [fetchPosts, refreshTrigger]);

  const loadMore = () => {
    if (!isLoadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPosts(nextPage, true);
    }
  };

  const handleLike = async (postId: string) => {
    if (!session?.user?.id) return;

    const isCurrentlyLiked = likedPosts.has(postId);
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    // Optimistic update
    if (isCurrentlyLiked) {
      setLikedPosts(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, likes_count: Math.max(0, p.likes_count - 1) }
          : p
      ));
    } else {
      setLikedPosts(prev => new Set(prev).add(postId));
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, likes_count: p.likes_count + 1 }
          : p
      ));
    }

    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: isCurrentlyLiked ? 'DELETE' : 'POST',
      });

      // Notification is now handled in the API

      if (!response.ok) {
        // Revert optimistic update on error
        if (isCurrentlyLiked) {
          setLikedPosts(prev => new Set(prev).add(postId));
          setPosts(prev => prev.map(p => 
            p.id === postId 
              ? { ...p, likes_count: p.likes_count + 1 }
              : p
          ));
        } else {
          setLikedPosts(prev => {
            const newSet = new Set(prev);
            newSet.delete(postId);
            return newSet;
          });
          setPosts(prev => prev.map(p => 
            p.id === postId 
              ? { ...p, likes_count: Math.max(0, p.likes_count - 1) }
              : p
          ));
        }
      }
    } catch (error) {
      console.error('Error liking post:', error);
      // Revert optimistic update on error
      if (isCurrentlyLiked) {
        setLikedPosts(prev => new Set(prev).add(postId));
        setPosts(prev => prev.map(p => 
          p.id === postId 
            ? { ...p, likes_count: p.likes_count + 1 }
            : p
        ));
      } else {
        setLikedPosts(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
        setPosts(prev => prev.map(p => 
          p.id === postId 
            ? { ...p, likes_count: Math.max(0, p.likes_count - 1) }
            : p
        ));
      }
    }
  };

  const handleRepost = async (postId: string) => {
    if (!session?.user?.id) return;

    const isCurrentlyReposted = repostedPosts.has(postId);
    
    // Optimistic update
    setPosts(posts.map(post => 
      post.id === postId 
        ? { 
            ...post, 
            reposts_count: isCurrentlyReposted ? post.reposts_count - 1 : post.reposts_count + 1
          }
        : post
    ));

    if (isCurrentlyReposted) {
      setRepostedPosts(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    } else {
      setRepostedPosts(prev => new Set(prev).add(postId));
    }

    try {
      const response = await fetch(`/api/posts/${postId}/repost`, {
        method: isCurrentlyReposted ? 'DELETE' : 'POST',
      });

      if (!response.ok) {
        // Revert on error
        setPosts(posts.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                reposts_count: isCurrentlyReposted ? post.reposts_count + 1 : post.reposts_count - 1
              }
            : post
        ));
        if (isCurrentlyReposted) {
          setRepostedPosts(prev => new Set(prev).add(postId));
        } else {
          setRepostedPosts(prev => {
            const newSet = new Set(prev);
            newSet.delete(postId);
            return newSet;
          });
        }
      }
    } catch (error) {
      console.error('Error toggling repost:', error);
    }
  };

  const handleOpenComments = (post: Post) => {
    setSelectedPost(post);
    setIsCommentModalOpen(true);
  };

  const handleCloseComments = () => {
    setIsCommentModalOpen(false);
    setSelectedPost(null);
  };

  const handleCommentAdded = () => {
    // Update the replies count for the post
    if (selectedPost) {
      setPosts(posts.map(post => 
        post.id === selectedPost.id 
          ? { ...post, replies_count: post.replies_count + 1 }
          : post
      ));
    }
  };

  const handleOpenShare = (postId: string, content: string) => {
    setSharePostId(postId);
    setSharePostContent(content);
    setIsShareModalOpen(true);
  };

  const handleCloseShare = () => {
    setIsShareModalOpen(false);
    setSharePostId('');
    setSharePostContent('');
  };

  // Handle edit post
  const handleEditPost = (post: Post) => {
    setEditingPost(post);
    setIsEditModalOpen(true);
  };

  const handleCloseEdit = () => {
    setIsEditModalOpen(false);
    setEditingPost(null);
  };

  const handlePostUpdated = (updatedPost: Post) => {
    setPosts(prev => prev.map(post => 
      post.id === updatedPost.id ? updatedPost : post
    ));
  };

  // Handle dropdown toggle
  const handleDropdownToggle = (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenDropdownId(openDropdownId === postId ? null : postId);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenDropdownId(null);
    };

    if (openDropdownId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdownId]);

  // Handle delete post
  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPosts(prev => prev.filter(post => post.id !== postId));
      } else {
        console.error('Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
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


  const formatCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  // Helper to get valid avatar URL
  const getValidAvatarUrl = (url: string | null | undefined): string | undefined => {
    if (!url || url.trim() === '') return undefined;
    // Check if it's a valid URL format
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) {
      return url;
    }
    return undefined;
  };

  if (isLoading) {
    return <FeedSkeleton count={5} />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={() => fetchPosts(1, false)} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  if (posts.length === 0) {
    if (feedType === 'following') {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <p className="text-foreground text-lg font-semibold mb-2">No posts from people you follow</p>
          <p className="text-muted-foreground text-sm mb-4 max-w-md">
            Follow some users to see their posts here, or switch to "For you" to discover new content.
          </p>
          <Button 
            variant="outline" 
            onClick={() => router.push('/explore')}
            className="rounded-full"
          >
            Discover people to follow
          </Button>
        </div>
      );
    }
    
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground text-lg mb-2">No posts yet</p>
        <p className="text-muted-foreground text-sm">Be the first to post something!</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {posts.map((post) => {
        const isOwnPost = session?.user?.id === post.user_id;
        const displayName =
          post.user?.display_name ||
          (isOwnPost ? session?.user?.name || 'You' : 'Unknown User');
        const username =
          post.user?.username ||
          (isOwnPost ? (session as any)?.user?.username || 'you' : 'unknown');

        const isRepost = !!post.repost_of_id;
        const originalUser = post.reposted_from_user;
        
        
        // Get avatar URL - prioritize post user's avatar, then session avatar for own posts
        const postUserAvatar = post.user?.avatar_url;
        const sessionAvatar = session?.user?.image;
        // For other users, only use their avatar. For own posts, fallback to session avatar
        const avatarUrl = postUserAvatar || (isOwnPost ? sessionAvatar : null);
        const avatarInitial = (displayName?.charAt(0) || 'U').toUpperCase();

        return (
          <article 
            key={post.id} 
            className="p-4 transition-colors cursor-pointer"
            onClick={() => router.push(`/post/${post.id}`)}
          >
            <div className="flex space-x-3 items-start">
              {/* Clickable Avatar */}
              <ClickableAvatar
                username={username}
                displayName={displayName}
                avatarUrl={avatarUrl}
                size="md"
                className="flex-shrink-0"
              />

              {/* Post content */}
              <div className="flex-1 min-w-0">
                {/* Repost label */}
                {isRepost && originalUser && (
                  <div className="mb-0.5 text-xs text-gray-500 flex items-center space-x-1">
                    <Repeat2 className="h-3 w-3" />
                    <span>Reposted from</span>
                    <button
                      type="button"
                      className="text-blue-500 hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (originalUser.username) {
                          router.push(`/${originalUser.username}`);
                        }
                      }}
                    >
                      @{originalUser.username}
                    </button>
                  </div>
                )}

                {/* Header */}
                <div className="flex items-center space-x-1 mb-1">
                  <h3 
                    className="font-bold text-foreground hover:underline cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/${username}`);
                    }}
                  >
                    {displayName}
                  </h3>
                  {post.user?.is_verified && (
                  <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
                  </svg>
                )}
                  <span 
                    className="text-gray-500 hover:underline cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/${username}`);
                    }}
                  >
                    @{username}
                  </span>
                <span className="text-gray-500">·</span>
                <span className="text-gray-500 hover:underline cursor-pointer">{formatDate(post.created_at)}</span>
                {post.is_edited && post.edited_at && (
                  <>
                    <span className="text-gray-500">·</span>
                    <span className="text-gray-500 text-xs">
                      Edited 
                      <span className="ml-1">{formatDate(post.edited_at)}</span>
                    </span>
                  </>
                )}
                <div className="flex-1" />
                {isOwnPost ? (
                  <div className="relative">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={(e) => handleDropdownToggle(post.id, e)}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    {openDropdownId === post.id && (
                      <div className="absolute right-0 top-8 bg-background border border-border rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdownId(null);
                            handleEditPost(post);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent"
                        >
                          Edit post
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdownId(null);
                            handleDeletePost(post.id);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-accent"
                        >
                          Delete post
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={(e) => handleDropdownToggle(post.id, e)}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    {openDropdownId === post.id && (
                      <div className="absolute right-0 top-8 bg-background border border-border rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdownId(null);
                            setReportPostId(post.id);
                            setReportPostAuthor(post.user.username);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                          <Flag className="h-4 w-4" />
                          Report post
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="mb-3">
                <ClickableContent 
                  content={post.content}
                  className="text-foreground text-[15px] leading-normal whitespace-pre-wrap"
                />
              </div>

              {/* Media if exists */}
              {post.media_urls && post.media_urls.length > 0 && (
                <MediaDisplay mediaUrls={post.media_urls} />
              )}

              {/* Actions */}
              <div className="flex items-center justify-start space-x-8 text-gray-500">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenComments(post);
                  }}
                  className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full px-3 py-1.5 transition-colors group"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-sm">{formatCount(post.replies_count)}</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRepost(post.id);
                  }}
                  className={`flex items-center space-x-2 rounded-full px-3 py-1.5 transition-colors group ${
                    repostedPosts.has(post.id)
                      ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20' 
                      : 'text-gray-500 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                  }`}
                >
                  <Repeat2 className="h-4 w-4" />
                  <span className="text-sm">{formatCount(post.reposts_count)}</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('Like button clicked:', {
                      postId: post.id,
                      isLiked: likedPosts.has(post.id),
                      likedPostsSize: likedPosts.size
                    });
                    handleLike(post.id);
                  }}
                  className={`flex items-center space-x-2 rounded-full px-3 py-1.5 transition-colors group ${
                    likedPosts.has(post.id)
                      ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' 
                      : 'text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${likedPosts.has(post.id) ? 'fill-current' : ''}`} />
                  <span className="text-sm">{formatCount(post.likes_count)}</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenShare(post.id, post.content);
                  }}
                  className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full px-3 py-1.5 transition-colors group"
                >
                  <Share className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </article>
      );
      })}

      {/* Load More Button */}
      {hasMore && (
        <div className="p-4 flex justify-center">
          <Button
            onClick={loadMore}
            disabled={isLoadingMore}
            variant="outline"
            className="w-full"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
      )}

      {/* All caught up message */}
      {!hasMore && posts.length > 0 && (
        <div className="px-4 py-8 flex flex-col items-center justify-center text-center text-muted-foreground">
          <div className="mb-2 text-sm font-medium uppercase tracking-wide text-xs">You are all caught up</div>
          <p className="text-xs">No more posts to show right now. Check back later for new content.</p>
        </div>
      )}

      {/* Comment Modal */}
      {selectedPost && (
        <CommentModal
          post={selectedPost}
          isOpen={isCommentModalOpen}
          onClose={handleCloseComments}
          onCommentAdded={handleCommentAdded}
        />
      )}

      {/* Report Post Modal */}
      {reportPostId && (
        <ReportModal
          isOpen={!!reportPostId}
          onClose={() => setReportPostId(null)}
          targetType="post"
          targetId={reportPostId}
          targetName={reportPostAuthor}
        />
      )}

      {/* Share Modal */}
      <ShareModal
        postId={sharePostId}
        postContent={sharePostContent}
        isOpen={isShareModalOpen}
        onClose={handleCloseShare}
      />

      {/* Edit Post Modal */}
      {editingPost && (
        <EditPostModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEdit}
          post={editingPost}
          onPostUpdated={handlePostUpdated}
        />
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Users, Check } from 'lucide-react';

interface FollowingUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
  followers_count: number;
  followed_at: string;
  is_following: boolean;
  is_current_user: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export default function FollowingPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const username = params?.username as string;

  const [following, setFollowing] = useState<FollowingUser[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({});
  const [followLoadingStates, setFollowLoadingStates] = useState<Record<string, boolean>>({});

  const fetchFollowing = useCallback(async (page = 1, append = false) => {
    if (!username) return;

    if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await fetch(`/api/users/${username}/following?page=${page}&limit=20`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch following');
      }

      const data = await response.json();
      
      if (append) {
        setFollowing(prev => [...prev, ...data.following]);
      } else {
        setFollowing(data.following);
      }
      
      setPagination(data.pagination);

      // Initialize following states
      const states: Record<string, boolean> = {};
      data.following.forEach((f: FollowingUser) => {
        states[f.id] = f.is_following;
      });
      setFollowingStates(prev => ({ ...prev, ...states }));

    } catch (error) {
      console.error('Error fetching following:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [username]);

  useEffect(() => {
    fetchFollowing();
  }, [fetchFollowing]);

  const handleLoadMore = () => {
    if (pagination && pagination.hasMore) {
      fetchFollowing(pagination.page + 1, true);
    }
  };

  const handleFollow = async (userId: string) => {
    if (!session?.user?.id) {
      router.push('/auth/signin');
      return;
    }

    setFollowLoadingStates(prev => ({ ...prev, [userId]: true }));

    try {
      const isCurrentlyFollowing = followingStates[userId];
      const response = await fetch('/api/users/follow', {
        method: isCurrentlyFollowing ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        setFollowingStates(prev => ({
          ...prev,
          [userId]: !isCurrentlyFollowing,
        }));
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
    } finally {
      setFollowLoadingStates(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleUserClick = (userUsername: string) => {
    router.push(`/${userUsername}`);
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <div className="min-h-screen w-full pb-12 bg-background">
      <div className="mx-auto mt-4 flex w-full max-w-[600px] flex-col gap-4 px-3 sm:mt-6 sm:px-6 lg:mt-8 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-3 pb-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full border border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-foreground sm:text-lg">Following</p>
            <p className="text-xs text-muted-foreground">@{username}</p>
          </div>
        </div>

        {/* Content */}
        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : following.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Not following anyone</h3>
              <p className="text-muted-foreground text-sm">
                When @{username} follows someone, they&apos;ll show up here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {following.map((user) => (
                <div
                  key={user.id}
                  className="flex items-start gap-3 p-4 hover:bg-accent/30 transition-colors"
                >
                  {/* Avatar */}
                  <div
                    className="h-12 w-12 rounded-full overflow-hidden bg-muted cursor-pointer flex-shrink-0"
                    onClick={() => handleUserClick(user.username)}
                  >
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.display_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                        {user.display_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p
                        className="font-semibold text-foreground truncate cursor-pointer hover:underline"
                        onClick={() => handleUserClick(user.username)}
                      >
                        {user.display_name}
                      </p>
                      {user.is_verified && (
                        <div className="flex items-center justify-center w-4 h-4 bg-blue-500 rounded-full flex-shrink-0">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </div>
                    <p
                      className="text-sm text-muted-foreground cursor-pointer hover:underline"
                      onClick={() => handleUserClick(user.username)}
                    >
                      @{user.username}
                    </p>
                    {user.bio && (
                      <p className="text-sm text-foreground/80 mt-1 line-clamp-2">
                        {user.bio}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCount(user.followers_count)} followers
                    </p>
                  </div>

                  {/* Follow Button */}
                  {!user.is_current_user && (
                    <Button
                      onClick={() => handleFollow(user.id)}
                      disabled={followLoadingStates[user.id]}
                      variant={followingStates[user.id] ? 'outline' : 'default'}
                      size="sm"
                      className={`rounded-full px-4 text-sm font-semibold flex-shrink-0 ${
                        followingStates[user.id]
                          ? 'border-border text-foreground hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/20'
                          : 'bg-foreground text-background hover:opacity-90'
                      }`}
                    >
                      {followLoadingStates[user.id] ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : followingStates[user.id] ? (
                        'Following'
                      ) : (
                        'Follow'
                      )}
                    </Button>
                  )}
                </div>
              ))}

              {/* Load More */}
              {pagination?.hasMore && (
                <div className="p-4 text-center">
                  <Button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    variant="ghost"
                    className="text-blue-500 hover:text-blue-600"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load more'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect, useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { MessageCircle, MapPin, Link as LinkIcon, CalendarDays, MoreHorizontal, Lock, UserCheck, UserX, Clock } from 'lucide-react';
import { MediaDisplay } from '@/components/post/media-display';
import { EditPostModal } from '@/components/post/edit-post-modal';

const joinedLabel = 'Joined January 2024';

type TabType = 'Posts' | 'Reposts' | 'Media' | 'Likes';

interface Post {
  id: string;
  content: string;
  media_urls: string[];
  created_at: string;
  user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
  likes_count: number;
  replies_count: number;
  reposts_count: number;
  is_liked: boolean;
  is_reposted: boolean;
  is_edited?: boolean;
  edited_at?: string;
}

interface ProfileData {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  location: string;
  website: string;
  created_at: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
  is_private?: boolean;
}

interface FollowRequest {
  id: string;
  requester_id: string;
  status: string;
  created_at: string;
  user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
}

function UserProfileContent() {
  const { status, data } = useSession();
  const params = useParams();
  const router = useRouter();
  const username = params?.username as string;
  
  const [activeTab, setActiveTab] = useState<TabType>('Posts');
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [followRequestPending, setFollowRequestPending] = useState(false);
  const [pendingFollowRequests, setPendingFollowRequests] = useState<FollowRequest[]>([]);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  const currentUserId = data?.user?.id;
  const isOwnProfile = profileData?.id === currentUserId;
  const isPrivateProfile = profileData?.is_private === true;
  const canViewContent = isOwnProfile || isFollowing || !isPrivateProfile;

  // Fetch profile data by username
  useEffect(() => {
    if (!username) return;
    
    const fetchProfile = async () => {
      try {
        const response = await fetch(`/api/users/${username}`);
        if (response.ok) {
          const data = await response.json();
          setProfileData(data.user);
          setIsFollowing(data.isFollowing || false);
          setFollowRequestPending(data.followRequestPending || false);
        } else if (response.status === 404) {
          // User not found, redirect to 404 or home
          redirect('/home');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  // Fetch pending follow requests for own profile
  useEffect(() => {
    if (!isOwnProfile || !isPrivateProfile) return;
    
    const fetchFollowRequests = async () => {
      try {
        const response = await fetch('/api/follow-requests?type=received');
        if (response.ok) {
          const data = await response.json();
          setPendingFollowRequests(data.requests || []);
        }
      } catch (error) {
        console.error('Error fetching follow requests:', error);
      }
    };

    fetchFollowRequests();
  }, [isOwnProfile, isPrivateProfile]);

  // Fetch posts based on active tab
  useEffect(() => {
    if (!profileData?.id) return;
    
    // Don't fetch posts if profile is private and user can't view content
    if (!canViewContent) {
      setPosts([]);
      return;
    }
    
    const fetchPosts = async () => {
      setPostsLoading(true);
      try {
        // Map frontend tab names to API types
        const typeMap: Record<TabType, string> = {
          'Posts': 'posts',
          'Reposts': 'reposts', 
          'Media': 'media',
          'Likes': 'likes'
        };
        
        const apiType = typeMap[activeTab];
        console.log('Fetching posts for tab:', activeTab, 'API type:', apiType);
        
        const response = await fetch(`/api/profile/${profileData.id}/posts?type=${apiType}`);
        if (response.ok) {
          const data = await response.json();
          console.log('Profile posts API response:', {
            tab: activeTab,
            apiType,
            postsCount: data.posts?.length || 0,
            posts: data.posts?.slice(0, 2) // Log first 2 posts for debugging
          });
          // API returns { posts: [...], likedPostIds: [...], pagination: {...} }
          const postsArray = data.posts || [];
          setPosts(Array.isArray(postsArray) ? postsArray : []);
        } else {
          const errorData = await response.text();
          console.error('Failed to fetch posts:', response.status, errorData);
          setPosts([]);
        }
      } catch (error) {
        console.error('Error fetching posts:', error);
        setPosts([]);
      } finally {
        setPostsLoading(false);
      }
    };

    fetchPosts();
  }, [profileData?.id, activeTab, canViewContent]);

  // Handle follow/unfollow
  const handleFollow = async () => {
    if (!profileData || !currentUserId || isOwnProfile) return;
    
    setFollowLoading(true);
    try {
      const response = await fetch(`/api/users/${username}/follow`, {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        // Check if this was a follow request (for private profiles)
        if (data.requestSent) {
          setFollowRequestPending(true);
        } else {
          setIsFollowing(!isFollowing);
          // Update follower count optimistically
          setProfileData(prev => prev ? {
            ...prev,
            followers_count: prev.followers_count + (isFollowing ? -1 : 1)
          } : null);
        }
      } else if (data.requestPending) {
        setFollowRequestPending(true);
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  // Handle cancel follow request
  const handleCancelRequest = async () => {
    if (!profileData) return;
    
    setFollowLoading(true);
    try {
      const response = await fetch(`/api/follow-requests?target_id=${profileData.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setFollowRequestPending(false);
      }
    } catch (error) {
      console.error('Error canceling follow request:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  // Handle accept/decline follow request
  const handleFollowRequestResponse = async (requestId: string, action: 'accept' | 'decline') => {
    setProcessingRequestId(requestId);
    try {
      const response = await fetch('/api/follow-requests/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ request_id: requestId, action }),
      });

      if (response.ok) {
        // Remove the request from the list
        setPendingFollowRequests(prev => prev.filter(req => req.id !== requestId));
        
        // If accepted, update follower count
        if (action === 'accept') {
          setProfileData(prev => prev ? {
            ...prev,
            followers_count: prev.followers_count + 1
          } : null);
        }
      }
    } catch (error) {
      console.error('Error responding to follow request:', error);
    } finally {
      setProcessingRequestId(null);
    }
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

  // Handle dropdown toggle
  const handleDropdownToggle = (postId: string) => {
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

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-b-2 border-blue-500" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    redirect('/auth/signin');
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">User not found</h1>
          <p className="text-muted-foreground">The user @{username} does not exist.</p>
        </div>
      </div>
    );
  }

  // Profile data for display
  const displayName = profileData.display_name || 'User';
  const userUsername = profileData.username || 'user';
  const avatar = profileData.avatar_url || 'https://lh3.googleusercontent.com/a/ACg8ocIuWzWw1B56vwCXPzDzuzTzOvgyuH1i6yfFf5JCUFYQVH4u7qQK8A=s96-c';
  const bio = profileData.bio || '';
  const location = profileData.location || '';
  const website = profileData.website || '';
  const followersCount = profileData.followers_count || 0;
  const followingCount = profileData.following_count || 0;

  return (
    <div className="min-h-screen w-full pb-12 bg-background">
      <div className="mx-auto mt-4 flex w-full max-w-[1100px] flex-col gap-6 px-3 sm:mt-6 sm:px-6 lg:mt-8 lg:px-8">
        {/* Header bar */}
        <div className="flex items-center gap-3 pb-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full border border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
            onClick={() => window.history.back()}
          >
            <span className="sr-only">Back</span>
            {/* simple left chevron */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Button>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-foreground sm:text-lg">{displayName}</p>
            <p className="text-xs text-muted-foreground">@{userUsername}</p>
          </div>
        </div>

        {/* Profile card */}
        <section className="overflow-hidden rounded-3xl border border-border/60 bg-card/80 backdrop-blur">
          {/* Cover */}
          <div className="h-24 w-full bg-gradient-to-r from-blue-600/50 via-purple-600/50 to-emerald-500/40 sm:h-32" />

          {/* Avatar + actions */}
          <div className="flex items-start justify-between px-4 pb-4 pt-3 sm:px-6 sm:pb-6">
            <div className="-mt-10 flex items-end gap-3 sm:-mt-14">
              <div className="h-20 w-20 overflow-hidden rounded-full border-4 border-background bg-muted sm:h-24 sm:w-24">
                <img src={avatar} alt={displayName} className="h-full w-full object-cover" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="hidden h-9 w-9 rounded-full border-border text-muted-foreground hover:bg-accent sm:inline-flex"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
              {isOwnProfile ? (
                <Button 
                  onClick={() => router.push('/edit-profile')}
                  className="rounded-full border border-border bg-transparent px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent"
                >
                  Edit profile
                </Button>
              ) : followRequestPending ? (
                <Button 
                  onClick={handleCancelRequest}
                  disabled={followLoading}
                  className="rounded-full border border-border bg-transparent px-4 py-2 text-sm font-semibold text-foreground hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/20"
                >
                  {followLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-current" />
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Requested
                    </span>
                  )}
                </Button>
              ) : (
                <Button 
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    isFollowing 
                      ? 'border border-border bg-transparent text-foreground hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/20' 
                      : 'bg-foreground text-background hover:opacity-90'
                  }`}
                >
                  {followLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-current" />
                  ) : isFollowing ? (
                    'Following'
                  ) : isPrivateProfile ? (
                    <span className="flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5" />
                      Request to Follow
                    </span>
                  ) : (
                    'Follow'
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Bio section */}
          <div className="space-y-3 px-4 pb-4 sm:px-6 sm:pb-6">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-foreground sm:text-xl">{displayName}</h1>
                {isPrivateProfile && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full
                      bg-muted text-muted-foreground border border-border
                      dark:bg-amber-200 dark:text-amber-900 dark:border-amber-400"
                  >
                    <Lock className="h-3 w-3" />
                    Private
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">@{userUsername}</p>
            </div>
            
            {bio && (
              <p className="text-sm text-foreground/90">
                {bio}
              </p>
            )}

            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {location}
                </span>
              )}
              {website && (
                <span className="inline-flex items-center gap-1">
                  <LinkIcon className="h-3.5 w-3.5" />
                  <a
                    href={website.startsWith('http') ? website : `https://${website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    {website.replace(/^https?:\/\//, '')}
                  </a>
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {joinedLabel}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>
                <span className="font-semibold text-foreground">{followingCount}</span> Following
              </span>
              <span>
                <span className="font-semibold text-foreground">{followersCount >= 1000 ? `${(followersCount / 1000).toFixed(1)}K` : followersCount}</span> Followers
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-t border-border/40 text-sm text-muted-foreground">
            {(['Posts', 'Reposts', 'Media', 'Likes'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-3 text-center transition hover:bg-accent/60 ${
                  tab === activeTab ? 'border-b-2 border-blue-500 text-foreground font-semibold' : ''
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Follow Requests Section (only for own private profile) */}
          {isOwnProfile && isPrivateProfile && pendingFollowRequests.length > 0 && (
            <div className="border-t border-border/40 p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Follow Requests ({pendingFollowRequests.length})
              </h3>
              <div className="space-y-3">
                {pendingFollowRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 rounded-xl bg-accent/30">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full overflow-hidden bg-muted">
                        <img 
                          src={request.user?.avatar_url || 'https://lh3.googleusercontent.com/a/ACg8ocIuWzWw1B56vwCXPzDzuzTzOvgyuH1i6yfFf5JCUFYQVH4u7qQK8A=s96-c'} 
                          alt={request.user?.display_name || 'User'}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{request.user?.display_name || 'User'}</p>
                        <p className="text-xs text-muted-foreground">@{request.user?.username || 'user'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleFollowRequestResponse(request.id, 'accept')}
                        disabled={processingRequestId === request.id}
                        className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-xs"
                      >
                        {processingRequestId === request.id ? (
                          <div className="h-3 w-3 animate-spin rounded-full border-b-2 border-white" />
                        ) : (
                          <span className="flex items-center gap-1">
                            <UserCheck className="h-3 w-3" />
                            Accept
                          </span>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleFollowRequestResponse(request.id, 'decline')}
                        disabled={processingRequestId === request.id}
                        className="rounded-full border-border text-muted-foreground hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/20 px-3 py-1 text-xs"
                      >
                        <span className="flex items-center gap-1">
                          <UserX className="h-3 w-3" />
                          Decline
                        </span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Posts Content */}
          <div className="border-t border-border/40">
            {!canViewContent ? (
              <div className="py-12 text-center">
                <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">This Account is Private</h3>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                  Follow this account to see their posts and activity.
                </p>
              </div>
            ) : postsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-500" />
              </div>
            ) : !Array.isArray(posts) || posts.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">
                  {activeTab === 'Posts' && 'No posts yet'}
                  {activeTab === 'Reposts' && 'No reposts yet'}
                  {activeTab === 'Media' && 'No media posts yet'}
                  {activeTab === 'Likes' && 'No liked posts yet'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {Array.isArray(posts) && posts.map((post) => (
                  <article
                    key={post.id}
                    className="p-4 transition-colors cursor-pointer hover:bg-accent/30"
                    onClick={() => router.push(`/post/${post.id}`)}
                  >
                    <div className="flex gap-3">
                      <div className="h-10 w-10 rounded-full overflow-hidden bg-muted">
                        <img 
                          src={post.user.avatar_url || avatar} 
                          alt={post.user.display_name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-semibold text-foreground">{post.user.display_name}</span>
                            <span>@{post.user.username}</span>
                            <span>·</span>
                            <span>{new Date(post.created_at).toLocaleDateString()}</span>
                            {post.is_edited && (
                              <>
                                <span>·</span>
                                <span className="text-xs">Edited</span>
                              </>
                            )}
                          </div>
                          {isOwnProfile && (
                            <div className="relative">
                              <button 
                                className="p-1 rounded-full hover:bg-accent transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDropdownToggle(post.id);
                                }}
                              >
                                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                              </button>
                              {openDropdownId === post.id && (
                                <div className="absolute right-0 top-8 bg-background border border-border rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
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
                          )}
                        </div>
                        {post.content && (
                          <p className="mt-2 text-[15px] text-foreground leading-relaxed">
                            {post.content}
                          </p>
                        )}

                        {post.media_urls && post.media_urls.length > 0 && (
                          <div className="mt-3">
                            <MediaDisplay mediaUrls={post.media_urls} />
                          </div>
                        )}

                        <div className="mt-3 flex items-center gap-6 text-sm text-muted-foreground">
                          <button 
                            className="inline-flex items-center gap-1 hover:text-blue-500 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/post/${post.id}`);
                            }}
                          >
                            <MessageCircle className="h-4 w-4" />
                            {post.replies_count}
                          </button>
                          <span className="inline-flex items-center gap-1 hover:text-green-500 transition-colors">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {post.reposts_count}
                          </span>
                          <span className="inline-flex items-center gap-1 hover:text-red-500 transition-colors">
                            <svg className="h-4 w-4" fill={post.is_liked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            {post.likes_count}
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

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

export default function UserProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="h-9 w-9 animate-spin rounded-full border-b-2 border-blue-500" />
        </div>
      }
    >
      <UserProfileContent />
    </Suspense>
  );
}

'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { MessageCircle, MapPin, Link as LinkIcon, CalendarDays, MoreHorizontal } from 'lucide-react';
import { MediaDisplay } from '@/components/post/media-display';

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
    avatar_url: string;
    is_verified: boolean;
  };
  likes_count: number;
  replies_count: number;
  reposts_count: number;
  is_liked: boolean;
  is_reposted: boolean;
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
}

function ProfileContent() {
  const { status, data } = useSession();
  const [activeTab, setActiveTab] = useState<TabType>('Posts');
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);

  const user = data?.user;
  const userId = user?.id;

  // Fetch profile data
  useEffect(() => {
    if (!userId) return;
    
    const fetchProfile = async () => {
      try {
        const response = await fetch(`/api/profile/${userId}`);
        if (response.ok) {
          const data = await response.json();
          setProfileData(data);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  // Fetch posts based on active tab
  useEffect(() => {
    if (!userId) return;
    
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
        
        const response = await fetch(`/api/profile/${userId}/posts?type=${apiType}`);
        if (response.ok) {
          const data = await response.json();
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
  }, [userId, activeTab]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-b-2 border-blue-500" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    redirect('/auth/signin');
  }

  // Fallback data for display
  const displayName = profileData?.display_name || user?.name || 'User';
  const username = profileData?.username || (user as any)?.username || 'user';
  const avatar = profileData?.avatar_url || user?.image || 'https://lh3.googleusercontent.com/a/ACg8ocIuWzWw1B56vwCXPzDzuzTzOvgyuH1i6yfFf5JCUFYQVH4u7qQK8A=s96-c';
  const bio = profileData?.bio || 'Building an open, safe space for meaningful conversations. Exploring policy, technology, and public impact.';
  const location = profileData?.location || 'Earth · Online';
  const website = profileData?.website || 'socialpulse.app';
  const followersCount = profileData?.followers_count || 3400;
  const followingCount = profileData?.following_count || 128;

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
            <p className="text-xs text-muted-foreground">Profile</p>
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
              <Button className="rounded-full border border-border bg-transparent px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent">
                Edit profile
              </Button>
            </div>
          </div>

          {/* Bio section */}
          <div className="space-y-3 px-4 pb-4 sm:px-6 sm:pb-6">
            <div>
              <h1 className="text-lg font-semibold text-foreground sm:text-xl">{displayName}</h1>
              <p className="text-sm text-muted-foreground">@{username}</p>
            </div>
            <p className="text-sm text-foreground/90">
              {bio}
            </p>

            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {location}
              </span>
              <span className="inline-flex items-center gap-1">
                <LinkIcon className="h-3.5 w-3.5" />
                <a
                  href={`https://${website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  {website}
                </a>
              </span>
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

          {/* Posts Content */}
          <div className="border-t border-border/40">
            {postsLoading ? (
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
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-semibold text-foreground">{post.user.display_name}</span>
                          <span>@{post.user.username}</span>
                          <span>·</span>
                          <span>{new Date(post.created_at).toLocaleDateString()}</span>
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
                          <span className="inline-flex items-center gap-1 hover:text-blue-500 transition-colors">
                            <MessageCircle className="h-4 w-4" />
                            {post.replies_count}
                          </span>
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
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="h-9 w-9 animate-spin rounded-full border-b-2 border-blue-500" />
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}

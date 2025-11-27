'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  Mail,
  User,
  Shield,
  Clock,
  Activity,
  Flag,
  Globe,
  CheckCircle,
  Trash2,
  MessageCircle,
} from 'lucide-react';

interface AdminUserDetail {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  banner_url?: string | null;
  bio: string | null;
  location?: string | null;
  website?: string | null;
  is_verified: boolean;
  is_private: boolean;
  status?: string;
  created_at: string;
  followers_count?: number;
  following_count?: number;
}

interface UserStats {
  posts_count: number;
  reports_count: number;
}

interface RecentReport {
  id: string;
  reason_code: string;
  status: string;
  created_at: string;
}

interface SessionInfo {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  last_active: string | null;
  created_at: string;
}

interface UserPost {
  id: string;
  content: string | null;
  media_urls?: string[] | null;
  created_at: string;
  likes_count?: number;
  replies_count?: number;
  reposts_count?: number;
}

interface UserPostsResponse {
  posts: UserPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

interface UserDetailResponse {
  user: AdminUserDetail;
  stats: UserStats;
  recent_reports: RecentReport[];
  sessions: SessionInfo[];
}

export default function AdminUserDetailPage() {
  const params = useParams<{ userId: string }>();
  const router = useRouter();
  const userId = params.userId;

  const [data, setData] = useState<UserDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState<string | null>(null);

  const fetchUser = async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch user');
      }
      const payload = (await res.json()) as UserDetailResponse;
      setData(payload);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to load user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    const loadPosts = async () => {
      if (!userId) return;
      setPostsLoading(true);
      setPostsError(null);
      try {
        const res = await fetch(`/api/admin/users/${userId}/posts?limit=20`);

        const contentType = res.headers.get('content-type') || '';
        const raw = await res.text();

        if (!contentType.includes('application/json')) {
          console.error('Admin posts API non-JSON response:', {
            status: res.status,
            contentType,
            bodyPreview: raw.slice(0, 200),
          });
          throw new Error('Unexpected response from posts API');
        }

        let body: UserPostsResponse | { error?: string };
        try {
          body = JSON.parse(raw) as UserPostsResponse | { error?: string };
        } catch (parseErr) {
          console.error('Failed to parse posts JSON:', parseErr, raw.slice(0, 200));
          throw new Error('Failed to parse posts response');
        }

        if (!res.ok) {
          throw new Error((body as any).error || 'Failed to fetch posts');
        }

        setPosts((body as UserPostsResponse).posts || []);
      } catch (err) {
        console.error(err);
        setPostsError('Failed to load posts');
      } finally {
        setPostsLoading(false);
      }
    };

    loadPosts();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.push('/admin/users')}
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to users
        </button>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-500">{error || 'User not found'}</p>
        </div>
      </div>
    );
  }

  const { user, stats, recent_reports, sessions } = data;

  const statusBadgeClass = (() => {
    switch (user.status) {
      case 'banned':
        return 'bg-red-500/10 text-red-400';
      case 'suspended':
        return 'bg-yellow-500/10 text-yellow-400';
      case 'deleted':
        return 'bg-gray-500/10 text-gray-400';
      default:
        return 'bg-green-500/10 text-green-400';
    }
  })();

  const handleBan = async () => {
    if (!userId) return;
    if (!window.confirm('Ban this user? This will sign them out and restrict access.')) return;

    setActionLoading('ban');
    setActionError(null);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Admin panel action',
          duration_days: null,
          notify_user: false,
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) {
        throw new Error(body.error || 'Failed to ban user');
      }
      setActionMessage('User banned successfully');
      await fetchUser();
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || 'Failed to ban user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnban = async () => {
    if (!userId) return;
    if (!window.confirm('Unban this user?')) return;

    setActionLoading('unban');
    setActionError(null);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'DELETE',
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) {
        throw new Error(body.error || 'Failed to unban user');
      }
      setActionMessage('User unbanned successfully');
      await fetchUser();
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || 'Failed to unban user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!userId) return;
    if (!window.confirm('Permanently mark this user as deleted? This cannot be easily undone.')) return;

    setActionLoading('delete');
    setActionError(null);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) {
        throw new Error(body.error || 'Failed to delete user');
      }
      setActionMessage('User deleted successfully');
      router.push('/admin/users');
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || 'Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  };

  const isBanned = user.status === 'banned';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/users')}
            className="inline-flex items-center justify-center rounded-full border border-border bg-background px-3 py-1 text-sm text-text-secondary hover:text-text-primary hover:bg-accent"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Users
          </button>
          <h1 className="text-2xl font-bold text-text-primary truncate">
            {user.display_name || user.username}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {user.is_verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400">
              <Shield className="w-3 h-3" />
              Verified
            </span>
          )}
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass}`}>
            {user.status || 'active'}
          </span>
        </div>
      </div>

      {/* Actions + info messages */}
      {(actionError || actionMessage) && (
        <div className="space-y-2">
          {actionError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-red-400">{actionError}</span>
            </div>
          )}
          {actionMessage && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-green-400">{actionMessage}</span>
            </div>
          )}
        </div>
      )}
      {/* Top section: profile + stats + actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="bg-card rounded-xl border border-border p-5 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center overflow-hidden">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.display_name || user.username}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <span className="text-background text-2xl font-semibold">
                  {(user.display_name || user.username || 'U').charAt(0)}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold text-text-primary truncate">
                  {user.display_name || user.username}
                </p>
              </div>
              <p className="text-sm text-text-tertiary truncate">@{user.username}</p>
              <p className="text-xs text-text-tertiary mt-1">
                Joined {new Date(user.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {user.bio && (
            <p className="text-sm text-text-secondary mt-2 whitespace-pre-line">
              {user.bio}
            </p>
          )}

          <div className="space-y-2 text-sm text-text-secondary mt-2">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-text-tertiary" />
              <span>{user.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-text-tertiary" />
              <span>{user.is_private ? 'Private account' : 'Public account'}</span>
            </div>
          </div>
        </div>

        {/* Stats + actions */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">Posts</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{stats.posts_count}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
          <div className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">Reports</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{stats.reports_count}</p>
            </div>
            <Flag className="w-8 h-8 text-red-500" />
          </div>

          <div className="bg-card rounded-xl border border-border p-4 flex flex-col gap-3 sm:col-span-2">
            <p className="text-sm font-semibold text-text-primary">Admin Actions</p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={isBanned ? handleUnban : handleBan}
                disabled={actionLoading === 'ban' || actionLoading === 'unban'}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors
                  ${isBanned ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'}
                  ${actionLoading === 'ban' || actionLoading === 'unban' ? 'opacity-60 cursor-not-allowed' : ''}
                `}
              >
                {actionLoading === 'ban' || actionLoading === 'unban' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
                {isBanned ? 'Unban User' : 'Ban User'}
              </button>

              <button
                onClick={handleDelete}
                disabled={actionLoading === 'delete'}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium bg-gray-800 hover:bg-gray-700 text-red-400 border border-red-500/40 transition-colors
                  ${actionLoading === 'delete' ? 'opacity-60 cursor-not-allowed' : ''}
                `}
              >
                {actionLoading === 'delete' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete User
              </button>
            </div>
            <p className="text-xs text-text-tertiary">
              Actions are logged in the admin audit log. Deleting a user performs a soft delete by marking the account as deleted.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom section: recent reports + sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent reports */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-text-primary">Recent Reports</h2>
            <span className="text-xs text-text-tertiary">Last 10</span>
          </div>
          <div className="divide-y divide-border">
            {recent_reports.length === 0 ? (
              <p className="px-4 py-6 text-center text-text-tertiary text-sm">No recent reports involving this user.</p>
            ) : (
              recent_reports.map((report) => (
                <Link
                  key={report.id}
                  href={`/admin/reports/${report.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-accent/60 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary capitalize">
                      {report.reason_code.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {new Date(report.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                      report.status === 'pending'
                        ? 'bg-yellow-500/10 text-yellow-400'
                        : report.status === 'resolved'
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-gray-500/10 text-gray-300'
                    }`}
                  >
                    {report.status}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Sessions */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-text-primary">Recent Sessions</h2>
            <span className="text-xs text-text-tertiary">Last 10</span>
          </div>
          <div className="divide-y divide-border">
            {sessions.length === 0 ? (
              <p className="px-4 py-6 text-center text-text-tertiary text-sm">No recent sessions found.</p>
            ) : (
              sessions.map((session) => (
                <div key={session.id} className="px-4 py-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <Globe className="w-4 h-4 mt-0.5 text-text-tertiary" />
                    <div>
                      <p className="text-sm text-text-primary">
                        {session.ip_address || 'Unknown IP'}
                      </p>
                      <p className="text-xs text-text-tertiary">
                        {session.user_agent?.slice(0, 80) || 'Unknown device'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-text-tertiary whitespace-nowrap">
                    <div className="flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      <span>
                        {session.last_active
                          ? new Date(session.last_active).toLocaleString()
                          : new Date(session.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* User posts */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            User Posts
          </h2>
          <span className="text-xs text-text-tertiary">Latest 20 posts</span>
        </div>
        {postsLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : postsError ? (
          <div className="px-4 py-3 text-sm text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{postsError}</span>
          </div>
        ) : posts.length === 0 ? (
          <p className="px-4 py-6 text-center text-text-tertiary text-sm">This user has no posts yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {posts.map((post) => (
              <div key={post.id} className="px-4 py-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary whitespace-pre-line">
                    {post.content || '[No content]'}
                  </p>
                  <p className="text-xs text-text-tertiary mt-1">
                    {new Date(post.created_at).toLocaleString()}
                  </p>
                  {(post.likes_count || post.replies_count || post.reposts_count) && (
                    <p className="text-xs text-text-tertiary mt-1 flex gap-3">
                      {post.likes_count ? <span>{post.likes_count} likes</span> : null}
                      {post.replies_count ? <span>{post.replies_count} replies</span> : null}
                      {post.reposts_count ? <span>{post.reposts_count} reposts</span> : null}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={async () => {
                      if (!window.confirm('Delete this post?')) return;
                      try {
                        const res = await fetch(`/api/admin/posts/${post.id}`, { method: 'DELETE' });
                        const body = await res.json().catch(() => ({}));
                        if (!res.ok || !body.success) {
                          throw new Error(body.error || 'Failed to delete post');
                        }
                        setPosts((prev) => prev.filter((p) => p.id !== post.id));
                      } catch (err) {
                        console.error(err);
                        alert('Failed to delete post');
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium bg-gray-800 hover:bg-gray-700 text-red-400 border border-red-500/40 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                  <Link
                    href={`/post/${post.id}`}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    View post
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

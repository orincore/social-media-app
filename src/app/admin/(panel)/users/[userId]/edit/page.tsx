'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  Save,
  User,
  Mail,
  AtSign,
  FileText,
  Shield,
  Lock,
  CheckCircle,
} from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  status?: string;
  is_verified: boolean;
  is_private: boolean;
  created_at: string;
}

export default function AdminUserEditPage() {
  const params = useParams<{ userId: string }>();
  const router = useRouter();
  const userId = params.userId;

  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    display_name: '',
    email: '',
    bio: '',
    is_verified: false,
    is_private: false,
  });

  const fetchUser = useCallback(async () => {
    if (!userId) return;
    
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch user');
      }
      const data = await res.json();
      setUser(data.user);
      setFormData({
        username: data.user.username || '',
        display_name: data.user.display_name || '',
        email: data.user.email || '',
        bio: data.user.bio || '',
        is_verified: data.user.is_verified || false,
        is_private: data.user.is_private || false,
      });
    } catch (err) {
      console.error(err);
      setError('Failed to load user');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update user');
      }

      setSuccess('User updated successfully');
      setUser(data.user);
      
      // Redirect after short delay
      setTimeout(() => {
        router.push(`/admin/users/${userId}`);
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleToggle = (field: 'is_verified' | 'is_private') => {
    setFormData(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to users
        </Link>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/admin/users/${userId}`}
          className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-border bg-background hover:bg-accent transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Edit User</h1>
          <p className="text-text-secondary text-sm">
            @{user?.username} • {user?.email}
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <p className="text-green-400 text-sm">{success}</p>
        </div>
      )}

      {/* User Avatar Preview */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.display_name}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <User className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <div>
            <p className="text-text-primary font-medium">{user?.display_name}</p>
            <p className="text-text-tertiary text-sm">@{user?.username}</p>
            <p className="text-text-tertiary text-xs mt-1">
              Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <User className="w-5 h-5" />
            Basic Information
          </h2>

          {/* Display Name */}
          <div>
            <label htmlFor="display_name" className="block text-sm font-medium text-text-secondary mb-2">
              Display Name
            </label>
            <input
              type="text"
              id="display_name"
              name="display_name"
              value={formData.display_name}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-muted/40 border border-border rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Display name"
            />
          </div>

          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-text-secondary mb-2">
              <AtSign className="w-4 h-4 inline mr-1" />
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-muted/40 border border-border rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="username"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-2">
              <Mail className="w-4 h-4 inline mr-1" />
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-muted/40 border border-border rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="email@example.com"
            />
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-text-secondary mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 bg-muted/40 border border-border rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="User bio..."
            />
            <p className="text-xs text-text-tertiary mt-1">
              {formData.bio.length}/500 characters
            </p>
          </div>
        </div>

        {/* Account Settings */}
        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Account Settings
          </h2>

          {/* Verified Toggle */}
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="text-text-primary font-medium flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-500" />
                Verified Account
              </p>
              <p className="text-text-tertiary text-sm">
                Display a verified badge on this user's profile
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleToggle('is_verified')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.is_verified ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.is_verified ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Private Account Toggle */}
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-text-primary font-medium flex items-center gap-2">
                <Lock className="w-4 h-4 text-orange-500" />
                Private Account
              </p>
              <p className="text-text-tertiary text-sm">
                Only approved followers can see this user's posts
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleToggle('is_private')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.is_private ? 'bg-orange-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.is_private ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-medium rounded-lg transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
          <Link
            href={`/admin/users/${userId}`}
            className="px-6 py-2 bg-muted hover:bg-muted/80 text-text-primary font-medium rounded-lg transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

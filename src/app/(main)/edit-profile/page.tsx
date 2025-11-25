'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Camera, X } from 'lucide-react';
import { AvatarUpload } from '@/components/profile/avatar-upload';
import { useMediaUpload } from '@/hooks/use-media-upload';

interface ProfileData {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  location: string;
  website: string;
  avatar_url: string;
  banner_url: string;
}

export default function EditProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const { uploadMedia, uploadedMedia, clearMedia, isUploading } = useMediaUpload();

  const [profileData, setProfileData] = useState<ProfileData>({
    id: '',
    username: '',
    display_name: '',
    bio: '',
    location: '',
    website: '',
    avatar_url: '',
    banner_url: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load current profile data
  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      redirect('/auth/signin');
      return;
    }

    const fetchProfile = async () => {
      try {
        const response = await fetch(`/api/users/${(session as any)?.user?.username}`);
        if (response.ok) {
          const data = await response.json();
          setProfileData(data.user);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchProfile();
    }
  }, [session, status]);

  // Handle avatar upload completion
  const handleAvatarUploadComplete = (avatarUrl: string) => {
    setProfileData(prev => ({ ...prev, avatar_url: avatarUrl }));
    setErrors(prev => ({ ...prev, avatar: '' }));
  };

  // Handle banner upload
  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, banner: 'Please select an image file' }));
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setErrors(prev => ({ ...prev, banner: 'Image must be less than 10MB' }));
      return;
    }

    setBannerFile(file);
    setErrors(prev => ({ ...prev, banner: '' }));
  };

  // Validate form data
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!profileData.display_name.trim()) {
      newErrors.display_name = 'Display name is required';
    } else if (profileData.display_name.length > 50) {
      newErrors.display_name = 'Display name must be less than 50 characters';
    }

    if (!profileData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (!/^[a-zA-Z0-9_]+$/.test(profileData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    } else if (profileData.username.length > 15) {
      newErrors.username = 'Username must be less than 15 characters';
    }

    if (profileData.bio.length > 160) {
      newErrors.bio = 'Bio must be less than 160 characters';
    }

    if (profileData.location.length > 30) {
      newErrors.location = 'Location must be less than 30 characters';
    }

    if (profileData.website && !isValidUrl(profileData.website)) {
      newErrors.website = 'Please enter a valid website URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string: string) => {
    try {
      const url = new URL(string.startsWith('http') ? string : `https://${string}`);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  };

  // Save profile changes
  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      let bannerUrl = profileData.banner_url;

      // Upload new banner if selected
      if (bannerFile) {
        try {
          await uploadMedia([bannerFile]);
          if (uploadedMedia.length > 0) {
            bannerUrl = uploadedMedia[0].url;
            clearMedia(); // Clear after using
          }
        } catch (error) {
          console.error('Banner upload failed:', error);
          setErrors(prev => ({ ...prev, banner: 'Failed to upload banner' }));
          setSaving(false);
          return;
        }
      }

      // Prepare website URL
      let websiteUrl = profileData.website;
      if (websiteUrl && !websiteUrl.startsWith('http')) {
        websiteUrl = `https://${websiteUrl}`;
      }

      const updateData = {
        display_name: profileData.display_name.trim(),
        username: profileData.username.trim(),
        bio: profileData.bio.trim(),
        location: profileData.location.trim(),
        website: websiteUrl,
        avatar_url: profileData.avatar_url,
        banner_url: bannerUrl
      };

      const response = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        // Update session if username or display name changed
        if (updateData.username !== (session as any)?.user?.username || 
            updateData.display_name !== session?.user?.name) {
          await update({
            ...session,
            user: {
              ...session?.user,
              name: updateData.display_name,
              username: updateData.username,
              image: profileData.avatar_url
            }
          });
        }

        // Redirect to updated profile
        router.push(`/${updateData.username}`);
      } else {
        const errorData = await response.json();
        if (errorData.field && errorData.message) {
          setErrors({ [errorData.field]: errorData.message });
        } else {
          setErrors({ general: 'Failed to update profile. Please try again.' });
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setErrors({ general: 'An error occurred. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="h-9 w-9 rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground">Edit profile</h1>
              </div>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving || isUploading}
              className="bg-foreground text-background hover:opacity-90 font-semibold px-6"
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>

        {/* Profile Form */}
        <div className="p-4 space-y-6">
          {/* Banner and Avatar Section */}
          <div className="relative">
            {/* Banner */}
            <div className="relative h-48 bg-gradient-to-r from-blue-600/50 via-purple-600/50 to-emerald-500/40 rounded-2xl overflow-hidden">
              {(bannerFile || profileData.banner_url) && (
                <img
                  src={bannerFile ? URL.createObjectURL(bannerFile) : profileData.banner_url}
                  alt="Banner"
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <label className="cursor-pointer bg-black/50 rounded-full p-3 hover:bg-black/70 transition-colors">
                  <Camera className="h-6 w-6 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Avatar */}
            <div className="absolute -bottom-16 left-4">
              <AvatarUpload
                currentAvatarUrl={profileData.avatar_url}
                displayName={profileData.display_name}
                size="lg"
                onUploadComplete={handleAvatarUploadComplete}
              />
            </div>
          </div>

          {/* Form Fields */}
          <div className="pt-20 space-y-6">
            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={profileData.display_name}
                onChange={(e) => setProfileData(prev => ({ ...prev, display_name: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your display name"
                maxLength={50}
              />
              {errors.display_name && (
                <p className="text-red-500 text-sm mt-1">{errors.display_name}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {profileData.display_name.length}/50
              </p>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Username
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-muted-foreground">@</span>
                <input
                  type="text"
                  value={profileData.username}
                  onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                  className="w-full pl-8 pr-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="username"
                  maxLength={15}
                />
              </div>
              {errors.username && (
                <p className="text-red-500 text-sm mt-1">{errors.username}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {profileData.username.length}/15
              </p>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Bio
              </label>
              <textarea
                value={profileData.bio}
                onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Tell the world about yourself"
                rows={3}
                maxLength={160}
              />
              {errors.bio && (
                <p className="text-red-500 text-sm mt-1">{errors.bio}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {profileData.bio.length}/160
              </p>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Location
              </label>
              <input
                type="text"
                value={profileData.location}
                onChange={(e) => setProfileData(prev => ({ ...prev, location: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Where are you located?"
                maxLength={30}
              />
              {errors.location && (
                <p className="text-red-500 text-sm mt-1">{errors.location}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {profileData.location.length}/30
              </p>
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Website
              </label>
              <input
                type="text"
                value={profileData.website}
                onChange={(e) => setProfileData(prev => ({ ...prev, website: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://yourwebsite.com"
              />
              {errors.website && (
                <p className="text-red-500 text-sm mt-1">{errors.website}</p>
              )}
            </div>

            {/* Upload Errors */}
            {errors.avatar && (
              <p className="text-red-500 text-sm">{errors.avatar}</p>
            )}
            {errors.banner && (
              <p className="text-red-500 text-sm">{errors.banner}</p>
            )}
            {errors.general && (
              <p className="text-red-500 text-sm">{errors.general}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

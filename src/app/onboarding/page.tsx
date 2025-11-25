'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSession, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { onboardingSchema, type OnboardingData } from '@/lib/validations';
import { supabase } from '@/lib/supabase/client';
import { Upload, User, MapPin, Globe, Calendar, Check, X, Loader2 } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema),
  });

  const watchedUsername = watch('username');

  // Set OAuth avatar as default preview when session loads
  useEffect(() => {
    if (session?.user?.image && !avatarPreview && !avatarFile) {
      setAvatarPreview(session.user.image);
    }
    // Pre-fill display name from OAuth
    if (session?.user?.name) {
      setValue('display_name', session.user.name);
    }
  }, [session, avatarPreview, avatarFile, setValue]);

  // Redirect only if profile is fully complete
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.profile_complete) {
      router.push('/home');
    }
  }, [session, status, router]);

  // Pre-fill existing data if user has partial profile
  useEffect(() => {
    if (session?.user) {
      const user = session.user as any;
      if (user.username) setValue('username', user.username);
      if (user.gender) setValue('gender', user.gender);
      if (user.birth_date) setValue('birth_date', user.birth_date);
      if (user.bio) setValue('bio', user.bio);
    }
  }, [session, setValue]);

  // Get missing fields message
  const getMissingFieldsMessage = () => {
    const missingFields = (session?.user as any)?.missing_fields || [];
    if (missingFields.length === 0) return null;
    
    const fieldNames: Record<string, string> = {
      username: 'Username',
      gender: 'Gender',
      birth_date: 'Date of Birth',
      avatar: 'Profile Picture',
    };
    
    const names = missingFields.map((f: string) => fieldNames[f] || f);
    return `Please complete the following required fields: ${names.join(', ')}`;
  };

  // Check if avatar is missing
  const isAvatarMissing = () => {
    const missingFields = (session?.user as any)?.missing_fields || [];
    return missingFields.includes('avatar') && !avatarPreview && !avatarFile;
  };

  // Check username availability with debounce
  const checkUsername = useCallback(async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameStatus('idle');
      setUsernameError(null);
      return;
    }

    setUsernameStatus('checking');
    setUsernameError(null);

    try {
      const response = await fetch(`/api/onboarding?username=${encodeURIComponent(username)}`);
      const data = await response.json();

      if (data.error) {
        setUsernameStatus('invalid');
        setUsernameError(data.error);
      } else if (data.available) {
        setUsernameStatus('available');
        setUsernameError(null);
      } else {
        setUsernameStatus('taken');
        setUsernameError('This username is already taken');
      }
    } catch (error) {
      setUsernameStatus('idle');
    }
  }, []);

  // Debounced username check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (watchedUsername) {
        checkUsername(watchedUsername);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [watchedUsername, checkUsername]);

  // Show loading while checking auth status
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to signin if not authenticated
  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: OnboardingData) => {
    setIsLoading(true);
    try {
      const currentSession = await getSession();
      if (!currentSession?.user?.email) {
        throw new Error('No authenticated user found');
      }

      let avatarUrl: string | null = null;

      // Upload avatar if user selected a new file
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const safeEmail = currentSession.user.email.replace(/[^a-zA-Z0-9]/g, '');
        const fileName = `${safeEmail}-${Date.now()}-avatar.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, { upsert: true });

        if (uploadError) {
          console.error('Avatar upload error:', uploadError);
          // If upload fails, try to use existing avatar
          avatarUrl = avatarPreview;
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
          avatarUrl = publicUrl;
        }
      } else if (avatarPreview) {
        // No new file uploaded, use existing OAuth avatar from preview
        avatarUrl = avatarPreview;
      }

      console.log('Submitting with avatar_url:', avatarUrl);

      // Send profile data to secure API route (server will update DB via admin client)
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: data.username,
          display_name: data.display_name,
          bio: data.bio || null,
          location: data.location || null,
          website: data.website || null,
          gender: data.gender || null,
          birth_date: data.birth_date || null,
          avatar_url: avatarUrl,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Failed to complete onboarding');
      }

      console.log('Onboarding successful, redirecting to home...');
      
      // Use window.location for a hard redirect to ensure session is refreshed
      window.location.href = '/home';
    } catch (error) {
      console.error('Onboarding error:', error);
      alert(error instanceof Error ? error.message : 'An error occurred during onboarding. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl grid gap-10 lg:grid-cols-[1.2fr,1fr] items-stretch">
        {/* Left: Context & Story */}
        <div className="hidden lg:flex flex-col justify-center space-y-6 rounded-3xl bg-gradient-to-br from-blue-600/40 via-purple-600/30 to-slate-900 border border-blue-500/30 p-10 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_0_0,_rgba(56,189,248,0.3)_0,_transparent_55%)]" />
          <div className="relative z-10 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-100">
              Step 1 · Profile onboarding
            </p>
            <h1 className="text-3xl xl:text-4xl font-bold leading-snug">
              Shape how the world <span className="text-blue-200">sees you</span>.
            </h1>
            <p className="text-sm xl:text-base text-blue-100/90 max-w-md leading-relaxed">
              Your profile is your identity on Social Pulse. Choose a handle, add context, and help others
              discover your voice across politics, culture, business, and the issues you care about most.
            </p>
          </div>
          <div className="relative z-10 grid grid-cols-3 gap-4 text-xs text-blue-100/80 mt-4">
            <div className="rounded-2xl bg-white/10 border border-white/15 p-4">
              <p className="text-lg font-bold">Public</p>
              <p className="mt-1 text-[11px] leading-relaxed">
                A clean public profile helps others quickly understand who you are and what you stand for.
              </p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <p className="text-lg font-bold">Trust</p>
              <p className="mt-1 text-[11px] leading-relaxed">
                Verified profile details reduce impersonation and build trust in conversations.
              </p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <p className="text-lg font-bold">Discovery</p>
              <p className="mt-1 text-[11px] leading-relaxed">
                Accurate info powers better recommendations, follows, and topic discovery.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Form Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl shadow-2xl shadow-blue-900/40 p-6 sm:p-8 backdrop-blur">
          <div className="mb-8 space-y-2 text-center sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-400">
              Complete your profile
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Let&apos;s personalise your experience
            </h2>
            <p className="text-sm text-slate-300">
              These details help others recognize you and tailor what you see across the platform.
            </p>
            {/* Show missing fields alert */}
            {getMissingFieldsMessage() && (
              <div className="mt-4 p-3 bg-amber-500/20 border border-amber-500/30 rounded-xl">
                <p className="text-sm text-amber-200">
                  ⚠️ {getMissingFieldsMessage()}
                </p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Avatar Upload */}
            <div className="space-y-3">
              <div className="flex flex-col items-center sm:items-start sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
                <div className="relative">
                  <Avatar className={`w-20 h-20 sm:w-24 sm:h-24 border-2 ${
                    isAvatarMissing() ? 'border-red-500' : avatarPreview ? 'border-green-500' : 'border-slate-700'
                  }`}>
                    <AvatarImage src={avatarPreview || undefined} />
                    <AvatarFallback className="bg-slate-800">
                      <User className="w-8 h-8 text-slate-500" />
                    </AvatarFallback>
                  </Avatar>
                  <label
                    htmlFor="avatar-upload"
                    className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-2 rounded-full cursor-pointer hover:bg-blue-400 border border-slate-900 shadow-lg"
                  >
                    <Upload className="w-3.5 h-3.5" />
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
                <div className="text-center sm:text-left space-y-1">
                  <p className="text-sm font-medium text-white">
                    Profile photo <span className="text-red-400">*</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    {avatarPreview 
                      ? '✓ Profile picture set. You can change this anytime.'
                      : 'Required: Upload a profile picture or use your Google photo.'}
                  </p>
                </div>
              </div>
              {isAvatarMissing() && (
                <p className="text-sm text-red-400 text-center sm:text-left">
                  ⚠️ Profile picture is required. Please upload an image.
                </p>
              )}
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm text-slate-200">
                Username <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="username"
                  placeholder="Choose a unique handle"
                  {...register('username')}
                  className={`${
                    errors.username || usernameStatus === 'taken' || usernameStatus === 'invalid'
                      ? 'border-red-500 focus-visible:ring-red-500' 
                      : usernameStatus === 'available'
                      ? 'border-green-500 focus-visible:ring-green-500'
                      : 'border-slate-700 focus-visible:ring-blue-500'
                  } bg-slate-900/60 text-sm pr-10`}
                />
                {/* Status indicator */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {usernameStatus === 'checking' && (
                    <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                  )}
                  {usernameStatus === 'available' && (
                    <Check className="w-4 h-4 text-green-500" />
                  )}
                  {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                    <X className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                Letters, numbers, and underscores only (3-20 characters). This is how people will mention you.
              </p>
              {usernameStatus === 'available' && (
                <p className="text-sm text-green-400">✓ Username is available!</p>
              )}
              {usernameError && (
                <p className="text-sm text-red-400">{usernameError}</p>
              )}
              {errors.username && !usernameError && (
                <p className="text-sm text-red-400">{errors.username.message}</p>
              )}
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="display_name" className="text-sm text-slate-200">
                Display name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="display_name"
                placeholder="What should people call you?"
                {...register('display_name')}
                className={`${errors.display_name ? 'border-red-500 focus-visible:ring-red-500' : 'border-slate-700 focus-visible:ring-blue-500'} bg-slate-900/60 text-sm`}
              />
              {errors.display_name && (
                <p className="text-sm text-red-400">{errors.display_name.message}</p>
              )}
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio" className="text-sm text-slate-200">
                Bio
              </Label>
              <textarea
                id="bio"
                placeholder="Tell people who you are, what you care about, or what you&apos;re working on."
                {...register('bio')}
                className="flex min-h-[90px] w-full rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white ring-offset-slate-900 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                maxLength={160}
              />
              <p className="text-[11px] text-slate-400">Up to 160 characters.</p>
              {errors.bio && (
                <p className="text-sm text-red-400">{errors.bio.message}</p>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location" className="text-sm text-slate-200">
                  <MapPin className="w-4 h-4 inline mr-1 text-slate-400" />
                  Location
                </Label>
                <Input
                  id="location"
                  placeholder="City, Country"
                  {...register('location')}
                  className="border-slate-700 bg-slate-900/60 text-sm"
                />
              </div>

              {/* Website */}
              <div className="space-y-2">
                <Label htmlFor="website" className="text-sm text-slate-200">
                  <Globe className="w-4 h-4 inline mr-1 text-slate-400" />
                  Website
                </Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://your-site.com"
                  {...register('website')}
                  className="border-slate-700 bg-slate-900/60 text-sm"
                />
                {errors.website && (
                  <p className="text-sm text-red-400">{errors.website.message}</p>
                )}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Gender */}
              <div className="space-y-2">
                <Label htmlFor="gender" className="text-sm text-slate-200">
                  Gender <span className="text-red-400">*</span>
                </Label>
                <select
                  id="gender"
                  {...register('gender', { required: 'Gender is required' })}
                  className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white ring-offset-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  <option value="">Select your gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
                {errors.gender && (
                  <p className="text-sm text-red-400">{errors.gender.message}</p>
                )}
              </div>

              {/* Birth Date */}
              <div className="space-y-2">
                <Label htmlFor="birth_date" className="text-sm text-slate-200">
                  <Calendar className="w-4 h-4 inline mr-1 text-slate-400" />
                  Birth date <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="birth_date"
                  type="date"
                  {...register('birth_date', { required: 'Date of birth is required' })}
                  className="border-slate-700 bg-slate-900/60 text-sm"
                  max={new Date().toISOString().split('T')[0]}
                />
                <p className="text-[11px] text-slate-400">You must be at least 13 years old to use this app.</p>
                {errors.birth_date && (
                  <p className="text-sm text-red-400">{errors.birth_date.message}</p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={
                isLoading || 
                usernameStatus === 'taken' || 
                usernameStatus === 'invalid' || 
                usernameStatus === 'checking' ||
                (!avatarPreview && !avatarFile) // Require avatar
              }
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving your profile…
                </>
              ) : !avatarPreview && !avatarFile ? (
                'Upload profile picture to continue'
              ) : (
                'Complete setup'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

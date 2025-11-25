import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface ProfilePrivacyInfo {
  isPrivate: boolean;
  isOwnProfile: boolean;
  canViewProfile: boolean;
  loading: boolean;
}

export function useProfilePrivacy(userId?: string): ProfilePrivacyInfo {
  const { data: session } = useSession();
  const [profileData, setProfileData] = useState<{
    is_private: boolean;
    user_id: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfilePrivacy = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // First check if it's the user's own profile
        if (session?.user?.id === userId) {
          setProfileData({
            is_private: false, // User can always see their own profile
            user_id: userId
          });
          setLoading(false);
          return;
        }

        // Fetch user's privacy settings
        const response = await fetch(`/api/users/${userId}/privacy`);
        if (response.ok) {
          const data = await response.json();
          setProfileData({
            is_private: data.is_private || false,
            user_id: userId
          });
        } else {
          // If we can't fetch privacy info, assume public
          setProfileData({
            is_private: false,
            user_id: userId
          });
        }
      } catch (error) {
        console.error('Error fetching profile privacy:', error);
        // Default to public on error
        setProfileData({
          is_private: false,
          user_id: userId
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfilePrivacy();
  }, [userId, session?.user?.id]);

  const isOwnProfile = session?.user?.id === userId;
  const isPrivate = profileData?.is_private ?? false;
  
  // User can view profile if:
  // 1. It's their own profile
  // 2. The profile is public
  // 3. They are following the user (we'll implement this check later)
  const canViewProfile = isOwnProfile || !isPrivate;

  return {
    isPrivate,
    isOwnProfile,
    canViewProfile,
    loading
  };
}

// Hook to get current user's privacy settings
export function useCurrentUserPrivacy() {
  const { data: session } = useSession();
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrivacySettings = async () => {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/settings/privacy');
        if (response.ok) {
          const data = await response.json();
          setIsPrivate(data.settings?.profile_visibility ?? false);
        }
      } catch (error) {
        console.error('Error fetching privacy settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrivacySettings();
  }, [session?.user?.id]);

  return { isPrivate, loading };
}

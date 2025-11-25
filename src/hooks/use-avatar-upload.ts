import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface UseAvatarUploadReturn {
  isUploading: boolean;
  uploadProgress: number;
  uploadAvatar: (file: File) => Promise<string>;
  error: string | null;
}

export function useAvatarUpload(): UseAvatarUploadReturn {
  const { update } = useSession();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadAvatar = useCallback(async (file: File): Promise<string> => {
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Validate file
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file');
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image must be less than 5MB');
      }

      // Create form data
      const formData = new FormData();
      formData.append('avatar', file);

      // Upload avatar
      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload avatar');
      }

      const { avatar_url, user } = await response.json();

      // Update session with new avatar
      await update({
        user: {
          image: avatar_url,
        }
      });

      setUploadProgress(100);
      return avatar_url;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload avatar';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  }, [update]);

  return {
    isUploading,
    uploadProgress,
    uploadAvatar,
    error,
  };
}

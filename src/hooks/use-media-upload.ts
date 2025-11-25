import { useState, useCallback, useEffect, useRef } from 'react';

interface UploadedMedia {
  id: string;
  url: string;
  type: 'image' | 'video';
  file: File;
  fileName?: string; // R2 file key for deletion
}

interface UseMediaUploadReturn {
  uploadedMedia: UploadedMedia[];
  isUploading: boolean;
  uploadProgress: number;
  uploadMedia: (files: FileList | File[]) => Promise<void>;
  removeMedia: (id: string) => void;
  clearMedia: () => void;
  markAsPosted: () => void; // Mark media as used in a post
}

export function useMediaUpload(): UseMediaUploadReturn {
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const isPostedRef = useRef(false); // Track if media was used in a post

  const uploadMedia = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    // Validate file count (max 4 files)
    if (uploadedMedia.length + fileArray.length > 4) {
      throw new Error('Maximum 4 media files allowed per post');
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Try presigned URL upload first, fallback to direct upload
      let uploadResults;
      
      try {
        uploadResults = await uploadToR2(fileArray);
      } catch (r2Error) {
        console.warn('Presigned URL upload failed, trying direct upload:', r2Error);
        uploadResults = await uploadDirectToR2(fileArray);
      }

      setUploadedMedia(prev => [...prev, ...uploadResults]);
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [uploadedMedia.length]);

  const uploadToR2 = async (fileArray: File[]) => {
    const uploadPromises = fileArray.map(async (file, index) => {
      // Get presigned URL
      const response = await fetch('/api/media/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get upload URL');
      }

      const { uploadUrl, publicUrl, fileName } = await response.json();

      // Upload file directly to R2
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to R2');
      }

      // Update progress
      const progress = ((index + 1) / fileArray.length) * 100;
      setUploadProgress(progress);

      return {
        id: `${Date.now()}-${index}`,
        url: publicUrl,
        type: file.type.startsWith('video/') ? 'video' as const : 'image' as const,
        file,
        fileName,
      };
    });

    return await Promise.all(uploadPromises);
  };

  const uploadDirectToR2 = async (fileArray: File[]) => {
    const formData = new FormData();
    fileArray.forEach(file => {
      formData.append('files', file);
    });

    const response = await fetch('/api/media/direct-upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload files to R2');
    }

    const { files } = await response.json();
    
    setUploadProgress(100);

    return files.map((file: any, index: number) => ({
      id: `${Date.now()}-${index}`,
      url: file.url,
      type: file.type as 'image' | 'video',
      file: fileArray[index],
      fileName: file.fileName,
    }));
  };

  const removeMedia = useCallback((id: string) => {
    setUploadedMedia(prev => prev.filter(media => media.id !== id));
  }, []);

  const clearMedia = useCallback(() => {
    setUploadedMedia([]);
  }, []);

  const markAsPosted = useCallback(() => {
    isPostedRef.current = true;
  }, []);

  // Cleanup function to delete unused media from R2
  const cleanupUnusedMedia = useCallback(async () => {
    if (isPostedRef.current || uploadedMedia.length === 0) {
      return; // Don't cleanup if media was posted or no media exists
    }

    try {
      // Delete all uploaded media from R2
      await Promise.all(
        uploadedMedia.map(async (media) => {
          try {
            await fetch('/api/media/delete', {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ mediaUrl: media.url }),
            });
          } catch (error) {
            console.error('Failed to cleanup media:', media.url, error);
          }
        })
      );
    } catch (error) {
      console.error('Error during media cleanup:', error);
    }
  }, [uploadedMedia]);

  // Setup cleanup on component unmount and page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!isPostedRef.current && uploadedMedia.length > 0) {
        // Use navigator.sendBeacon for reliable cleanup on page unload
        const mediaUrls = uploadedMedia.map(media => media.url);
        navigator.sendBeacon('/api/media/cleanup', JSON.stringify({ mediaUrls }));
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && !isPostedRef.current && uploadedMedia.length > 0) {
        // Cleanup when page becomes hidden (user switches tabs/minimizes)
        cleanupUnusedMedia();
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup on component unmount
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Cleanup unused media when component unmounts
      if (!isPostedRef.current && uploadedMedia.length > 0) {
        cleanupUnusedMedia();
      }
    };
  }, [uploadedMedia, cleanupUnusedMedia]);

  return {
    uploadedMedia,
    isUploading,
    uploadProgress,
    uploadMedia,
    removeMedia,
    clearMedia,
    markAsPosted,
  };
}

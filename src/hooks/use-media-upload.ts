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

// Detect if running on mobile device
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Simple client-side image compression using Canvas
// Uses Image element as fallback for mobile browsers that don't support createImageBitmap well
async function compressImage(file: File): Promise<File> {
  if (typeof window === 'undefined') return file;

  if (!file.type.startsWith('image/')) {
    return file;
  }

  // For GIFs, skip compression to preserve animation
  if (file.type === 'image/gif') {
    return file;
  }

  // On mobile, use smaller max dimension to reduce upload size and improve reliability
  const maxDimension = isMobileDevice() ? 1280 : 1920;

  try {
    // Try createImageBitmap first (faster, but not always available on mobile)
    let width: number;
    let height: number;
    let imageSource: ImageBitmap | HTMLImageElement;

    if (typeof createImageBitmap === 'function') {
      try {
        imageSource = await createImageBitmap(file);
        width = imageSource.width;
        height = imageSource.height;
      } catch {
        // Fallback to Image element if createImageBitmap fails
        imageSource = await loadImageFromFile(file);
        width = imageSource.width;
        height = imageSource.height;
      }
    } else {
      // Use Image element fallback for older browsers
      imageSource = await loadImageFromFile(file);
      width = imageSource.width;
      height = imageSource.height;
    }

    if (width > maxDimension || height > maxDimension) {
      const aspectRatio = width / height;
      if (width > height) {
        width = maxDimension;
        height = Math.round(maxDimension / aspectRatio);
      } else {
        height = maxDimension;
        width = Math.round(maxDimension * aspectRatio);
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.drawImage(imageSource, 0, 0, width, height);

    // Use lower quality on mobile to reduce file size
    const quality = isMobileDevice() ? 0.75 : 0.85;
    const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';

    const blob: Blob | null = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), outputType, quality);
    });

    if (!blob) return file;

    return new File([blob], file.name, { type: outputType });
  } catch (error) {
    console.warn('Image compression failed, using original file:', error);
    return file;
  }
}

// Load image using Image element (fallback for mobile)
function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    img.src = URL.createObjectURL(file);
  });
}

export function useMediaUpload(): UseMediaUploadReturn {
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const isPostedRef = useRef(false); // Track if media was used in a post

  const uploadMedia = useCallback(async (files: FileList | File[]) => {
    const originalFiles = Array.from(files);
    
    // Validate file count (max 4 files)
    if (uploadedMedia.length + originalFiles.length > 4) {
      throw new Error('Maximum 4 media files allowed per post');
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Compress images client-side before upload to save storage and bandwidth
      const fileArray = await Promise.all(originalFiles.map((file) => compressImage(file)));

      // Use Supabase Storage upload (most reliable across all platforms)
      // This avoids TLS issues with R2 on AWS Amplify and works on all mobile devices
      const uploadResults = await uploadToSupabase(fileArray);

      setUploadedMedia(prev => [...prev, ...uploadResults]);
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [uploadedMedia.length]);

  // Upload to Supabase Storage - reliable across all platforms including AWS Amplify
  const uploadToSupabase = async (fileArray: File[]) => {
    const formData = new FormData();
    fileArray.forEach(file => {
      formData.append('files', file);
    });

    // Use AbortController for timeout (90 seconds for larger files)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    try {
      setUploadProgress(10); // Show initial progress
      
      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      setUploadProgress(80); // Show progress after upload completes

      if (!response.ok) {
        let errorMessage = 'Failed to upload files';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Upload failed: ${response.statusText || response.status}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (!data.files || data.files.length === 0) {
        throw new Error('No files were uploaded. Please try again.');
      }
      
      setUploadProgress(100);

      return data.files.map((file: any, index: number) => ({
        id: `${Date.now()}-${index}`,
        url: file.url,
        type: file.type as 'image' | 'video',
        file: fileArray[index],
        fileName: file.fileName,
      }));
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Upload timed out. Please try with a smaller file or check your connection.');
      }
      
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      }
      
      throw new Error(error.message || 'Failed to upload files. Please try again.');
    }
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

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

// Simple client-side image compression using Canvas
async function compressImage(file: File): Promise<File> {
  if (typeof window === 'undefined') return file;

  if (!file.type.startsWith('image/')) {
    return file;
  }

  // For GIFs, skip compression to preserve animation
  if (file.type === 'image/gif') {
    return file;
  }

  const imageBitmap = await createImageBitmap(file);

  const maxDimension = 1920; // Max width/height
  let { width, height } = imageBitmap;

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

  ctx.drawImage(imageBitmap, 0, 0, width, height);

  const quality = 0.85; // High quality, visually lossless
  const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';

  const blob: Blob | null = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), outputType, quality);
  });

  if (!blob) return file;

  return new File([blob], file.name, { type: outputType });
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

      // Upload via presigned URLs (browser -> R2). This avoids server-side TLS issues
      // on some platforms (e.g. Amplify) when calling R2 directly from the backend.
      const uploadResults = await uploadToR2(fileArray);

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

      const { uploadUrl, publicUrl, fileName, contentDisposition } = await response.json();

      // Upload file directly to R2
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
          ...(contentDisposition ? { 'Content-Disposition': contentDisposition as string } : {}),
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

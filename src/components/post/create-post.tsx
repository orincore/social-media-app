'use client';

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Image, MapPin, Smile, Calendar, BarChart3, Globe, Loader2, X, Play, Video } from 'lucide-react';
import { useMediaUpload } from '@/hooks/use-media-upload';

interface CreatePostProps {
  onPostCreated?: () => void;
}

export function CreatePost({ onPostCreated }: CreatePostProps) {
  const { data: session } = useSession();
  const [content, setContent] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadedMedia, isUploading, uploadProgress, uploadMedia, removeMedia, clearMedia, markAsPosted } = useMediaUpload();

  const maxLength = 1000; // Extended to 1000 characters
  const remainingChars = maxLength - content.length;

  const extractHashtags = (text: string): string[] => {
    const hashtagRegex = /#[a-zA-Z0-9_]+/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.slice(1)) : [];
  };

  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@[a-zA-Z0-9_]+/g;
    const matches = text.match(mentionRegex);
    return matches ? matches.map(mention => mention.slice(1)) : [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if ((!content.trim() && uploadedMedia.length === 0) || isSubmitting) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      const hashtags = extractHashtags(content);
      const mentions = extractMentions(content);
      const mediaUrls = uploadedMedia.map(media => media.url);

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          content: content.trim(),
          mediaUrls,
          hashtags,
          mentions
        }),
      });

      if (response.ok) {
        // Mark media as successfully posted to prevent cleanup
        markAsPosted();
        
        setContent('');
        setIsExpanded(false);
        clearMedia();
        
        // Notify parent component to refresh feed
        onPostCreated?.();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create post');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Clear any previous errors
    setError(null);

    try {
      await uploadMedia(files);
    } catch (error) {
      console.error('File upload error:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload media. Please try again.');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleMediaButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteMedia = async (mediaId: string, mediaUrl: string) => {
    try {
      // Remove from UI immediately (optimistic update)
      removeMedia(mediaId);
      
      // Delete from R2 bucket
      await fetch('/api/media/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mediaUrl }),
      });
    } catch (error) {
      console.error('Error deleting media:', error);
      // Could add the media back to the list if deletion failed
      setError('Failed to delete media. Please try again.');
    }
  };

  const renderMediaPreview = () => {
    if (uploadedMedia.length === 0) return null;

    // Single media - show full resolution
    if (uploadedMedia.length === 1) {
      const media = uploadedMedia[0];
      return (
        <div className="mt-3">
          <div className="relative group">
            {media.type === 'image' ? (
              <img
                src={media.url}
                alt="Upload preview"
                className="w-full h-auto max-h-96 object-contain rounded-lg border border-gray-200 dark:border-gray-700"
              />
            ) : (
              <div className="relative w-full">
                <video
                  src={media.url}
                  className="w-full h-auto max-h-96 object-contain rounded-lg border border-gray-200 dark:border-gray-700"
                  controls
                  muted
                  preload="metadata"
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => handleDeleteMedia(media.id, media.url)}
              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 opacity-90 hover:opacity-100 transition-all shadow-lg"
              title="Delete media"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      );
    }

    // Multiple media - grid layout with full aspect ratio
    return (
      <div className="mt-3">
        <div className={`grid gap-2 ${uploadedMedia.length === 2 ? 'grid-cols-2' : uploadedMedia.length === 3 ? 'grid-cols-2' : 'grid-cols-2'}`}>
          {uploadedMedia.map((media, index) => (
            <div key={media.id} className="relative group">
              {media.type === 'image' ? (
                <img
                  src={media.url}
                  alt={`Upload preview ${index + 1}`}
                  className="w-full h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                />
              ) : (
                <div className="relative w-full h-48 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <video
                    src={media.url}
                    className="w-full h-full object-cover"
                    muted
                    preload="metadata"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play className="w-8 h-8 text-white drop-shadow-lg" />
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => handleDeleteMedia(media.id, media.url)}
                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                title="Delete media"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="border-b border-border p-4">
      <div className="flex space-x-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={session?.user?.image || undefined} />
          <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            {session?.user?.name?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onFocus={() => setIsExpanded(true)}
                placeholder="What's happening?"
                className="w-full bg-transparent text-foreground placeholder-gray-500 text-xl resize-none border-none outline-none min-h-[60px] max-h-[300px] focus:ring-0"
                maxLength={maxLength}
              />
            </div>

            {/* Media Preview */}
            {renderMediaPreview()}

            {/* Upload Progress */}
            {isUploading && (
              <div className="mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading media... {Math.round(uploadProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mt-2">
                  <div 
                    className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            {isExpanded && (
              <div className="mb-4">
                <div className="flex items-center text-blue-500 text-sm mb-3">
                  <Globe className="w-4 h-4 mr-1" />
                  <span>Everyone can reply</span>
                </div>
              </div>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={handleMediaButtonClick}
                  disabled={isUploading || uploadedMedia.length >= 4}
                  className="p-2 rounded-full text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Image className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  className="p-2 rounded-full text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="p-2 rounded-full text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <BarChart3 className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  className="p-2 rounded-full text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <Smile className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  className="p-2 rounded-full text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <Calendar className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  className="p-2 rounded-full text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <MapPin className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                {/* Character Counter */}
                {isExpanded && (
                  <div className="flex items-center gap-2">
                    <div className={`text-sm ${remainingChars < 50 ? 'text-red-500' : 'text-muted-foreground'}`}>
                      {remainingChars}
                    </div>
                    <div className="w-6 h-6 relative">
                      <svg className="w-6 h-6 transform -rotate-90" viewBox="0 0 24 24">
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="2"
                          fill="none"
                          className="text-gray-200 dark:text-gray-700"
                        />
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="2"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 10}`}
                          strokeDashoffset={`${2 * Math.PI * 10 * (remainingChars / maxLength)}`}
                          className={remainingChars < 50 ? 'text-red-500' : 'text-blue-500'}
                        />
                      </svg>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={(content.trim().length === 0 && uploadedMedia.length === 0) || isSubmitting || isUploading || remainingChars < 0}
                  className="bg-blue-500 text-white font-bold px-4 py-1.5 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    'Post'
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

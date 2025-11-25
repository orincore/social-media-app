'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAvatarUpload } from '@/hooks/use-avatar-upload';
import { useSession } from 'next-auth/react';

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  displayName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onUploadComplete?: (avatarUrl: string) => void;
  className?: string;
}

const sizeClasses = {
  sm: 'h-16 w-16',
  md: 'h-24 w-24',
  lg: 'h-32 w-32',
  xl: 'h-40 w-40'
};

export function AvatarUpload({
  currentAvatarUrl,
  displayName = 'User',
  size = 'lg',
  onUploadComplete,
  className = ''
}: AvatarUploadProps) {
  const { data: session } = useSession();
  const { isUploading, uploadProgress, uploadAvatar, error } = useAvatarUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const avatarInitial = (displayName?.charAt(0) || 'U').toUpperCase();
  const displayAvatarUrl = previewUrl || currentAvatarUrl || session?.user?.image;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    try {
      const avatarUrl = await uploadAvatar(file);
      onUploadComplete?.(avatarUrl);
    } catch (error) {
      console.error('Avatar upload failed:', error);
      setPreviewUrl(null); // Reset preview on error
    }
  };

  const handleAvatarClick = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className={`relative ${sizeClasses[size]} rounded-full overflow-hidden border-4 border-white shadow-lg`}>
        <Avatar className="w-full h-full">
          <AvatarImage 
            src={displayAvatarUrl || ''} 
            alt={displayName}
            className="object-cover"
          />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-lg">
            {avatarInitial}
          </AvatarFallback>
        </Avatar>

        {/* Upload Overlay */}
        <div
          onClick={handleAvatarClick}
          className={`
            absolute inset-0 bg-black/30 flex items-center justify-center 
            cursor-pointer transition-opacity rounded-full
            ${isUploading ? 'opacity-100' : 'opacity-0 hover:opacity-100'}
          `}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 text-white animate-spin" />
              <div className="text-xs text-white font-medium">
                {uploadProgress}%
              </div>
            </div>
          ) : (
            <Camera className="h-6 w-6 text-white" />
          )}
        </div>

        {/* Progress Ring */}
        {isUploading && uploadProgress > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="50%"
                cy="50%"
                r="45%"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="2"
              />
              <circle
                cx="50%"
                cy="50%"
                r="45%"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 45} ${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - uploadProgress / 100)}`}
                className="transition-all duration-300"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />

      {/* Error Message */}
      {error && (
        <p className="text-red-500 text-sm mt-2 text-center">{error}</p>
      )}

    </div>
  );
}

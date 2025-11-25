'use client';

import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ClickableAvatarProps {
  username: string;
  displayName: string;
  avatarUrl: string | null | undefined;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showVerified?: boolean;
  isVerified?: boolean;
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16'
};

export function ClickableAvatar({ 
  username, 
  displayName, 
  avatarUrl, 
  size = 'md',
  className = '',
  showVerified = false,
  isVerified = false
}: ClickableAvatarProps) {
  const router = useRouter();
  const avatarInitial = (displayName?.charAt(0) || 'U').toUpperCase();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/${username}`);
  };

  return (
    <div className="flex items-center gap-2">
      <Avatar 
        className={`${sizeClasses[size]} cursor-pointer hover:opacity-80 transition-opacity ${className}`}
        onClick={handleClick}
      >
        <AvatarImage src={avatarUrl || ''} alt={displayName} />
        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
          {avatarInitial}
        </AvatarFallback>
      </Avatar>
      
      {showVerified && isVerified && (
        <div className="flex items-center justify-center w-5 h-5 bg-blue-500 rounded-full">
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      )}
    </div>
  );
}

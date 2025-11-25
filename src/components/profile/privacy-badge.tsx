'use client';

import { Lock, Globe } from 'lucide-react';
import { useProfilePrivacy } from '@/hooks/use-profile-privacy';

interface PrivacyBadgeProps {
  userId: string;
  className?: string;
  showText?: boolean;
}

export function PrivacyBadge({ 
  userId, 
  className = '', 
  showText = false 
}: PrivacyBadgeProps) {
  const { isPrivate, isOwnProfile, loading } = useProfilePrivacy(userId);

  if (loading) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <div className="h-4 w-4 animate-pulse bg-slate-600 rounded" />
        {showText && <div className="h-3 w-12 animate-pulse bg-slate-600 rounded" />}
      </div>
    );
  }

  if (isPrivate) {
    return (
      <div className={`flex items-center gap-1 text-slate-400 ${className}`}>
        <Lock className="h-4 w-4" />
        {showText && (
          <span className="text-xs">
            {isOwnProfile ? 'Private account' : 'Private'}
          </span>
        )}
      </div>
    );
  }

  if (showText) {
    return (
      <div className={`flex items-center gap-1 text-slate-400 ${className}`}>
        <Globe className="h-4 w-4" />
        <span className="text-xs">Public</span>
      </div>
    );
  }

  return null; // Don't show anything for public profiles unless showText is true
}

// Component for showing privacy status in posts/feeds
export function PostPrivacyIndicator({ 
  userId, 
  className = '' 
}: { 
  userId: string; 
  className?: string; 
}) {
  const { isPrivate, loading } = useProfilePrivacy(userId);

  if (loading || !isPrivate) return null;

  return (
    <Lock className={`h-3 w-3 text-slate-500 ${className}`} />
  );
}

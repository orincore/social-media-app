'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, MoreHorizontal } from 'lucide-react';
import { ReportButton } from '@/components/report/report-button';

interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
}

interface PostDetailHeaderProps {
  user: User | null;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  showReportMenu?: boolean;
  isHeaderMenuOpen?: boolean;
  onToggleMenu?: () => void;
  postId?: string;
}

export function PostDetailHeader({ user, displayName, username, avatarUrl, showReportMenu, isHeaderMenuOpen, onToggleMenu, postId }: PostDetailHeaderProps) {
  const router = useRouter();
  const avatarInitial = (displayName?.charAt(0) || 'U').toUpperCase();

  return (
    <>
      {/* Sticky Header with Gradient */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-sm">
        <div className="flex items-center px-4 py-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.back()}
            className="h-10 w-10 mr-4 hover:bg-accent/80 rounded-full transition-all duration-200 hover:scale-105"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-primary">Post</h1>
            <p className="text-xs text-tertiary">Thread</p>
          </div>
        </div>
      </div>

      {/* Author Header */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar 
              className="h-12 w-12 cursor-pointer"
              onClick={() => router.push(`/${username}`)}
            >
              <AvatarImage src={avatarUrl || ''} alt={displayName} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                {avatarInitial}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <div className="flex items-center gap-1.5">
                <span 
                  className="font-bold text-primary hover:underline cursor-pointer"
                  onClick={() => router.push(`/${username}`)}
                >
                  {displayName}
                </span>
                {user?.is_verified && (
                  <div className="flex items-center justify-center w-5 h-5 bg-blue-500 rounded-full">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                )}
              </div>
              <p className="text-tertiary text-sm">@{username}</p>
            </div>
          </div>
          
          {showReportMenu && onToggleMenu && postId ? (
            <div className="relative">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 hover:bg-accent rounded-full"
                onClick={onToggleMenu}
              >
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </Button>
              {isHeaderMenuOpen && (
                <div className="absolute right-0 top-9 z-20 min-w-[160px] rounded-xl border border-border bg-background shadow-lg py-1">
                  <ReportButton
                    targetType="post"
                    targetId={postId}
                    targetName={username}
                    variant="menu-item"
                  />
                </div>
              )}
            </div>
          ) : (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 hover:bg-accent rounded-full"
            >
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

'use client';

import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBookmarks } from '@/hooks/use-bookmarks';
import { cn } from '@/lib/utils';

interface BookmarkButtonProps {
  postId: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
}

export function BookmarkButton({ 
  postId, 
  className, 
  size = 'md',
  showCount = false 
}: BookmarkButtonProps) {
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarks();
  const [isLoading, setIsLoading] = useState(false);
  const bookmarked = isBookmarked(postId);

  const handleToggleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);

    try {
      if (bookmarked) {
        await removeBookmark(postId);
      } else {
        await addBookmark(postId);
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'h-7 w-7',
    md: 'h-8 w-8',
    lg: 'h-9 w-9'
  };

  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-4.5 w-4.5'
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggleBookmark}
      disabled={isLoading}
      className={cn(
        'rounded-full transition-all duration-200',
        sizeClasses[size],
        bookmarked
          ? 'text-primary hover:bg-primary/10 border border-primary/20'
          : 'text-muted-foreground hover:text-primary hover:bg-primary/5',
        isLoading && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <Bookmark 
        className={cn(
          iconSizes[size],
          bookmarked && 'fill-current'
        )} 
      />
    </Button>
  );
}

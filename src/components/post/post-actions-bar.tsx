'use client';

import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Repeat2, Share, Bookmark } from 'lucide-react';

interface PostActionsBarProps {
  isLiked: boolean;
  isReposted: boolean;
  isBookmarked: boolean;
  repliesCount: number;
  repostsCount: number;
  likesCount: number;
  onLike: () => void;
  onRepost: () => void;
  onBookmark: () => void;
  onShare: () => void;
  onComment?: () => void;
}

export function PostActionsBar({
  isLiked,
  isReposted,
  isBookmarked,
  repliesCount,
  repostsCount,
  likesCount,
  onLike,
  onRepost,
  onBookmark,
  onShare,
  onComment,
}: PostActionsBarProps) {
  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="px-4 py-2">
      {/* Action buttons */}
      <div className="flex items-center justify-between max-w-md">
        <Button
          variant="ghost"
          size="sm"
          onClick={onComment}
          className="group flex items-center gap-1 h-8 px-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 rounded-full transition-colors"
        >
          <MessageCircle className="h-5 w-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onRepost}
          className={`group flex items-center gap-1 h-8 px-2 rounded-full transition-colors ${
            isReposted 
              ? 'text-green-500 hover:bg-green-500/10' 
              : 'text-muted-foreground hover:text-green-500 hover:bg-green-500/10'
          }`}
        >
          <Repeat2 className="h-5 w-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onLike}
          className={`group flex items-center gap-1 h-8 px-2 rounded-full transition-colors ${
            isLiked 
              ? 'text-red-500 hover:bg-red-500/10' 
              : 'text-muted-foreground hover:text-red-500 hover:bg-red-500/10'
          }`}
        >
          <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onBookmark}
          className={`group flex items-center gap-1 h-8 px-2 rounded-full transition-colors ${
            isBookmarked 
              ? 'text-blue-500 hover:bg-blue-500/10' 
              : 'text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10'
          }`}
        >
          <Bookmark className={`h-5 w-5 ${isBookmarked ? 'fill-current' : ''}`} />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onShare}
          className="group flex items-center gap-1 h-8 px-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 rounded-full transition-colors"
        >
          <Share className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Stats below actions */}
      {(repliesCount > 0 || repostsCount > 0 || likesCount > 0) && (
        <div className="flex items-center gap-4 mt-2 text-sm text-tertiary">
          {repliesCount > 0 && (
            <span><span className="font-semibold text-secondary">{formatCount(repliesCount)}</span> {repliesCount === 1 ? 'Reply' : 'Replies'}</span>
          )}
          {repostsCount > 0 && (
            <span><span className="font-semibold text-secondary">{formatCount(repostsCount)}</span> {repostsCount === 1 ? 'Repost' : 'Reposts'}</span>
          )}
          {likesCount > 0 && (
            <span><span className="font-semibold text-secondary">{formatCount(likesCount)}</span> {likesCount === 1 ? 'Like' : 'Likes'}</span>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Heart, MessageCircle, Share } from 'lucide-react';
import { ClickableContent } from '@/components/ui/clickable-content';
import { ClickableAvatar } from '@/components/ui/clickable-avatar';

interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  likes_count: number;
  replies_count: number;
  reply_to_id: string | null;
  created_at: string;
  user: User | null;
  replies?: Comment[];
  hasMoreReplies?: boolean;
}

interface CommentThreadProps {
  comment: Comment;
  likedComments: Set<string>;
  onReply: (comment: Comment) => void;
  onLike: (commentId: string) => void;
  onLoadMoreReplies: (commentId: string) => void;
  shouldShowReplies?: boolean;
  formatRelativeDate: (date: string) => string;
}

export function CommentThread({
  comment,
  likedComments,
  onReply,
  onLike,
  onLoadMoreReplies,
  shouldShowReplies,
  formatRelativeDate,
}: CommentThreadProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [showReplies, setShowReplies] = useState(false);
  
  const isOwnComment = session?.user?.id === comment.user_id;
  const displayName = comment.user?.display_name || (isOwnComment ? session?.user?.name || 'You' : 'Unknown');
  const username = comment.user?.username || (isOwnComment ? 'you' : 'unknown');
  const avatarUrl = comment.user?.avatar_url || (isOwnComment ? session?.user?.image : null);
  const avatarInitial = (displayName?.charAt(0) || 'U').toUpperCase();
  const isLiked = likedComments.has(comment.id);
  const hasReplies = comment.replies && comment.replies.length > 0;
  const totalReplies = comment.replies_count || 0;

  // Auto-show replies when shouldShowReplies prop changes
  useEffect(() => {
    if (shouldShowReplies !== undefined) {
      setShowReplies(shouldShowReplies);
    }
  }, [shouldShowReplies]);

  const handleShowReplies = () => {
    setShowReplies(!showReplies);
  };

  return (
    <div className="bg-background">
      {/* Parent Comment */}
      <article className="px-4 py-3 hover:bg-accent/10 transition-colors">
        <div className="flex gap-3 items-start">
          {/* Avatar with thread line */}
          <div className="flex flex-col items-center">
            <Avatar 
              className="h-10 w-10 cursor-pointer"
              onClick={() => router.push(`/${username}`)}
            >
              <AvatarImage src={avatarUrl || ''} alt={displayName} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                {avatarInitial}
              </AvatarFallback>
            </Avatar>
            
            {/* Thread line */}
            {showReplies && hasReplies && (
              <div className="w-0.5 flex-1 bg-border mt-2 min-h-[20px]" />
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span 
                className="font-bold text-primary hover:underline cursor-pointer"
                onClick={() => router.push(`/${username}`)}
              >
                {displayName}
              </span>
              {comment.user?.is_verified && (
                <div className="flex items-center justify-center w-4 h-4 bg-blue-500 rounded-full">
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}
              <span className="text-tertiary text-sm">@{username}</span>
              <span className="text-quaternary text-sm">·</span>
              <span className="text-tertiary text-sm">{formatRelativeDate(comment.created_at)}</span>
            </div>
            
            {/* Comment text */}
            <ClickableContent 
              content={comment.content}
              className="text-secondary text-[15px] leading-relaxed mt-1 whitespace-pre-wrap"
            />
            
            {/* Actions */}
            <div className="flex items-center gap-6 mt-2 -ml-2">
              <button 
                onClick={() => onReply(comment)}
                className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-blue-500/10 hover:text-blue-500 text-muted-foreground transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                {comment.replies_count > 0 && (
                  <span className="text-sm">{comment.replies_count}</span>
                )}
              </button>
              <button 
                onClick={() => onLike(comment.id)}
                className={`flex items-center gap-2 px-2 py-1 rounded-full transition-colors ${
                  isLiked 
                    ? 'text-red-500 hover:bg-red-500/10' 
                    : 'text-muted-foreground hover:bg-red-500/10 hover:text-red-500'
                }`}
              >
                <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                {comment.likes_count > 0 && (
                  <span className="text-sm">{comment.likes_count}</span>
                )}
              </button>
              <button className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-blue-500/10 hover:text-blue-500 text-muted-foreground transition-colors">
                <Share className="h-4 w-4" />
              </button>
            </div>

            {/* Show/Hide Replies Button */}
            {totalReplies > 0 && (
              <div className="mt-3">
                <button
                  onClick={handleShowReplies}
                  className="text-blue-500 text-sm font-medium hover:underline transition-colors"
                >
                  {showReplies ? (
                    `Hide ${totalReplies} ${totalReplies === 1 ? 'reply' : 'replies'}`
                  ) : (
                    `Show ${totalReplies} ${totalReplies === 1 ? 'reply' : 'replies'}`
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </article>

      {/* Replies */}
      {showReplies && hasReplies && (
        <div className="relative">
          {comment.replies?.map((reply, index) => (
            <ReplyItem
              key={reply.id}
              reply={reply}
              parentUsername={username}
              isLastReply={index === (comment.replies?.length || 0) - 1 && !comment.hasMoreReplies}
              likedComments={likedComments}
              onReply={onReply}
              onLike={onLike}
              onLoadMoreReplies={onLoadMoreReplies}
              formatRelativeDate={formatRelativeDate}
              depth={1}
            />
          ))}
        </div>
      )}

      {/* Show more replies */}
      {showReplies && comment.hasMoreReplies && (
        <div className="pl-[68px] py-2">
          <button 
            onClick={() => onLoadMoreReplies(comment.id)}
            className="text-blue-500 text-sm font-medium hover:underline"
          >
            Show more replies
          </button>
        </div>
      )}
    </div>
  );
}

interface ReplyItemProps {
  reply: Comment;
  parentUsername: string;
  isLastReply: boolean;
  likedComments: Set<string>;
  onReply: (comment: Comment) => void;
  onLike: (commentId: string) => void;
  onLoadMoreReplies: (commentId: string) => void;
  formatRelativeDate: (date: string) => string;
  depth?: number;
}

function ReplyItem({
  reply,
  parentUsername,
  isLastReply,
  likedComments,
  onReply,
  onLike,
  onLoadMoreReplies,
  formatRelativeDate,
  depth = 1,
}: ReplyItemProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [showNestedReplies, setShowNestedReplies] = useState(false);
  
  const isOwnReply = session?.user?.id === reply.user_id;
  const displayName = reply.user?.display_name || (isOwnReply ? session?.user?.name || 'You' : 'Unknown');
  const username = reply.user?.username || (isOwnReply ? 'you' : 'unknown');
  const avatarUrl = reply.user?.avatar_url || (isOwnReply ? session?.user?.image : null);
  const avatarInitial = (displayName?.charAt(0) || 'U').toUpperCase();
  const isLiked = likedComments.has(reply.id);
  const hasNestedReplies = reply.replies && reply.replies.length > 0;
  const totalNestedReplies = reply.replies_count || 0;

  return (
    <article className="px-4 py-2 hover:bg-accent/10 transition-colors">
      <div className="flex gap-3 pl-[52px] items-start">
        {/* Thread connection line */}
        <div className="absolute left-[68px] -mt-2 w-6 h-4 border-l-2 border-b-2 border-border rounded-bl-lg" />
        
        {/* Avatar */}
        <div className="flex flex-col items-center">
          <Avatar 
            className="h-8 w-8 cursor-pointer"
            onClick={() => router.push(`/${username}`)}
          >
            <AvatarImage src={avatarUrl || ''} alt={displayName} />
            <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-cyan-500 text-white text-xs font-semibold">
              {avatarInitial}
            </AvatarFallback>
          </Avatar>
          
          {!isLastReply && (
            <div className="w-0.5 flex-1 bg-border mt-1 min-h-[16px]" />
          )}
        </div>
        
        {/* Reply Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-1.5 flex-wrap text-sm">
            <span 
              className="font-bold text-primary hover:underline cursor-pointer"
              onClick={() => router.push(`/${username}`)}
            >
              {displayName}
            </span>
            {reply.user?.is_verified && (
              <div className="flex items-center justify-center w-3.5 h-3.5 bg-blue-500 rounded-full">
                <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            )}
            <span className="text-tertiary">@{username}</span>
            <span className="text-quaternary">·</span>
            <span className="text-tertiary">{formatRelativeDate(reply.created_at)}</span>
          </div>
          
          {/* Replying to indicator */}
          <p className="text-quaternary text-xs mt-0.5">
            Replying to <span className="text-blue-500 hover:underline cursor-pointer">@{parentUsername}</span>
          </p>
          
          {/* Reply text */}
          <ClickableContent 
            content={reply.content}
            className="text-secondary text-sm leading-relaxed mt-1.5 whitespace-pre-wrap"
          />
          
          {/* Reply Actions (no reply button for nested replies) */}
          <div className="flex items-center gap-4 mt-2 -ml-2">
            <button 
              onClick={() => onLike(reply.id)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full transition-colors ${
                isLiked 
                  ? 'text-red-500 hover:bg-red-500/10' 
                  : 'text-muted-foreground hover:bg-red-500/10 hover:text-red-500'
              }`}
            >
              <Heart className={`h-3.5 w-3.5 ${isLiked ? 'fill-current' : ''}`} />
              {reply.likes_count > 0 && (
                <span className="text-xs">{reply.likes_count}</span>
              )}
            </button>
            <button className="flex items-center gap-1.5 px-2 py-1 rounded-full hover:bg-blue-500/10 hover:text-blue-500 text-muted-foreground transition-colors">
              <Share className="h-4 w-4" />
            </button>
          </div>

          {/* Show/Hide Nested Replies Button */}
          {totalNestedReplies > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setShowNestedReplies(!showNestedReplies)}
                className="text-blue-500 text-xs font-medium hover:underline transition-colors"
              >
                {showNestedReplies ? (
                  `Hide ${totalNestedReplies} ${totalNestedReplies === 1 ? 'reply' : 'replies'}`
                ) : (
                  `Show ${totalNestedReplies} ${totalNestedReplies === 1 ? 'reply' : 'replies'}`
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Nested Replies */}
      {showNestedReplies && hasNestedReplies && depth < 5 && (
        <div className="ml-8">
          {reply.replies?.map((nestedReply, index) => (
            <ReplyItem
              key={nestedReply.id}
              reply={nestedReply}
              parentUsername={username}
              isLastReply={index === (reply.replies?.length || 0) - 1 && !reply.hasMoreReplies}
              likedComments={likedComments}
              onReply={onReply}
              onLike={onLike}
              onLoadMoreReplies={onLoadMoreReplies}
              formatRelativeDate={formatRelativeDate}
              depth={depth + 1}
            />
          ))}
        </div>
      )}

      {/* Show more nested replies */}
      {showNestedReplies && reply.hasMoreReplies && (
        <div className="ml-16 py-1">
          <button 
            onClick={() => onLoadMoreReplies(reply.id)}
            className="text-blue-500 text-xs font-medium hover:underline"
          >
            Show more replies
          </button>
        </div>
      )}
    </article>
  );
}

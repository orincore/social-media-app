'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';

/**
 * Base skeleton component
 */
export const Skeleton = memo(function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
});

/**
 * Post card skeleton
 */
export const PostSkeleton = memo(function PostSkeleton() {
  return (
    <div className="p-4 border-b border-border">
      <div className="flex gap-3">
        {/* Avatar */}
        <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
        
        <div className="flex-1 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
          
          {/* Content */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-6 pt-2">
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-12" />
          </div>
        </div>
      </div>
    </div>
  );
});

/**
 * Post with media skeleton
 */
export const PostWithMediaSkeleton = memo(function PostWithMediaSkeleton() {
  return (
    <div className="p-4 border-b border-border">
      <div className="flex gap-3">
        {/* Avatar */}
        <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
        
        <div className="flex-1 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
          
          {/* Content */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          
          {/* Media */}
          <Skeleton className="h-48 w-full rounded-xl" />
          
          {/* Actions */}
          <div className="flex items-center gap-6 pt-2">
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-12" />
          </div>
        </div>
      </div>
    </div>
  );
});

/**
 * Feed skeleton (multiple posts)
 */
export const FeedSkeleton = memo(function FeedSkeleton({
  count = 5,
}: {
  count?: number;
}) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <PostSkeleton key={i} />
      ))}
    </div>
  );
});

/**
 * User card skeleton
 */
export const UserCardSkeleton = memo(function UserCardSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-8 w-20 rounded-full" />
    </div>
  );
});

/**
 * Profile header skeleton
 */
export const ProfileHeaderSkeleton = memo(function ProfileHeaderSkeleton() {
  return (
    <div className="space-y-4">
      {/* Banner */}
      <Skeleton className="h-32 w-full" />
      
      {/* Avatar and info */}
      <div className="px-4 -mt-12 space-y-3">
        <div className="flex justify-between items-end">
          <Skeleton className="h-24 w-24 rounded-full border-4 border-background" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
        
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        
        <div className="flex gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
});

/**
 * Comment skeleton
 */
export const CommentSkeleton = memo(function CommentSkeleton() {
  return (
    <div className="flex gap-3 p-3">
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
});

/**
 * Notification skeleton
 */
export const NotificationSkeleton = memo(function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-3 p-4 border-b border-border">
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
});

/**
 * Message skeleton
 */
export const MessageSkeleton = memo(function MessageSkeleton({
  isOwn = false,
}: {
  isOwn?: boolean;
}) {
  return (
    <div className={cn('flex gap-2 p-2', isOwn ? 'justify-end' : 'justify-start')}>
      {!isOwn && <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />}
      <Skeleton className={cn('h-10 rounded-2xl', isOwn ? 'w-32' : 'w-48')} />
    </div>
  );
});

/**
 * Chat list skeleton
 */
export const ChatListSkeleton = memo(function ChatListSkeleton({
  count = 5,
}: {
  count?: number;
}) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 border-b border-border">
          <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-3 w-8" />
        </div>
      ))}
    </div>
  );
});

/**
 * Trending item skeleton
 */
export const TrendingSkeleton = memo(function TrendingSkeleton() {
  return (
    <div className="p-3 space-y-1">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
});

/**
 * Search result skeleton
 */
export const SearchResultSkeleton = memo(function SearchResultSkeleton({
  count = 5,
}: {
  count?: number;
}) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <UserCardSkeleton key={i} />
      ))}
    </div>
  );
});

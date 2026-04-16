'use client';

import { useEffect, useState } from 'react';

interface NotificationBadgeProps {
  count: number;
  className?: string;
}

export function NotificationBadge({ count, className = '' }: NotificationBadgeProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayCount, setDisplayCount] = useState(count);

  useEffect(() => {
    if (count !== displayCount) {
      setIsAnimating(true);
      setDisplayCount(count);
      
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 600);
      
      return () => clearTimeout(timer);
    }
  }, [count, displayCount]);

  // Don't render anything if count is 0 or less
  if (count <= 0) return null;

  return (
    <span 
      className={`
        absolute -top-1 -right-1 
        bg-red-500 
        text-white text-[10px] rounded-full 
        min-w-[16px] h-[16px] px-1 
        flex items-center justify-center 
        font-bold border-2 border-background
        transition-all duration-300 ease-out
        ${isAnimating ? 'animate-bounce scale-110' : ''}
        ${className}
      `}
    >
      {displayCount > 99 ? '99+' : displayCount}
    </span>
  );
}

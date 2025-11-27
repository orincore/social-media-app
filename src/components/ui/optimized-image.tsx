'use client';

import { useState, useEffect, useRef, memo } from 'react';
import Image, { ImageProps } from 'next/image';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends Omit<ImageProps, 'onLoad' | 'onError'> {
  fallbackSrc?: string;
  showSkeleton?: boolean;
  aspectRatio?: number;
  containerClassName?: string;
}

/**
 * Optimized Image Component
 * 
 * Features:
 * - Lazy loading with intersection observer
 * - Skeleton loading state
 * - Error fallback
 * - Blur placeholder
 * - Aspect ratio preservation
 */
function OptimizedImageComponent({
  src,
  alt,
  fallbackSrc = '/placeholder.png',
  showSkeleton = true,
  aspectRatio,
  containerClassName,
  className,
  priority = false,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLDivElement>(null);

  // Intersection observer for lazy loading
  useEffect(() => {
    if (priority || !imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '200px', // Start loading 200px before visible
        threshold: 0.01,
      }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [priority]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const imageSrc = hasError ? fallbackSrc : src;

  return (
    <div
      ref={imgRef}
      className={cn(
        'relative overflow-hidden',
        containerClassName
      )}
      style={aspectRatio ? { aspectRatio: `${aspectRatio}` } : undefined}
    >
      {/* Skeleton loader */}
      {showSkeleton && isLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}

      {/* Only render image when in view */}
      {isInView && (
        <Image
          src={imageSrc}
          alt={alt}
          className={cn(
            'transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100',
            className
          )}
          onLoad={handleLoad}
          onError={handleError}
          priority={priority}
          {...props}
        />
      )}
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export const OptimizedImage = memo(OptimizedImageComponent);

/**
 * Avatar-specific optimized image
 */
interface OptimizedAvatarProps {
  src: string | null | undefined;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallback?: string;
}

const sizeMap = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

function OptimizedAvatarComponent({
  src,
  alt,
  size = 'md',
  className,
  fallback,
}: OptimizedAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const dimension = sizeMap[size];
  const initial = (alt?.charAt(0) || 'U').toUpperCase();

  if (!src || hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold',
          className
        )}
        style={{ width: dimension, height: dimension, fontSize: dimension * 0.4 }}
      >
        {fallback || initial}
      </div>
    );
  }

  return (
    <div
      className={cn('relative rounded-full overflow-hidden', className)}
      style={{ width: dimension, height: dimension }}
    >
      <Image
        src={src}
        alt={alt}
        width={dimension}
        height={dimension}
        className="object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

export const OptimizedAvatar = memo(OptimizedAvatarComponent);

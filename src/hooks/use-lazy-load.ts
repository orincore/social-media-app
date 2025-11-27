'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseLazyLoadOptions {
  // Root margin for intersection observer
  rootMargin?: string;
  // Threshold for intersection
  threshold?: number;
  // Only trigger once
  triggerOnce?: boolean;
  // Initial state
  initialInView?: boolean;
}

interface UseLazyLoadResult {
  ref: React.RefObject<HTMLDivElement | null>;
  isInView: boolean;
  hasBeenInView: boolean;
}

/**
 * Hook for lazy loading components when they enter the viewport
 */
export function useLazyLoad(options: UseLazyLoadOptions = {}): UseLazyLoadResult {
  const {
    rootMargin = '200px',
    threshold = 0.1,
    triggerOnce = true,
    initialInView = false,
  } = options;

  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(initialInView);
  const [hasBeenInView, setHasBeenInView] = useState(initialInView);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Skip if already triggered and triggerOnce is true
    if (triggerOnce && hasBeenInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const inView = entry.isIntersecting;
          setIsInView(inView);

          if (inView) {
            setHasBeenInView(true);
            if (triggerOnce) {
              observer.disconnect();
            }
          }
        });
      },
      {
        rootMargin,
        threshold,
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [rootMargin, threshold, triggerOnce, hasBeenInView]);

  return { ref, isInView, hasBeenInView };
}

/**
 * Hook for infinite scroll with intersection observer
 */
interface UseInfiniteScrollOptions {
  // Callback when bottom is reached
  onLoadMore: () => void;
  // Whether more data is available
  hasMore: boolean;
  // Whether currently loading
  isLoading: boolean;
  // Root margin for triggering load
  rootMargin?: string;
}

interface UseInfiniteScrollResult {
  sentinelRef: React.RefObject<HTMLDivElement | null>;
}

export function useInfiniteScroll(
  options: UseInfiniteScrollOptions
): UseInfiniteScrollResult {
  const { onLoadMore, hasMore, isLoading, rootMargin = '400px' } = options;
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      {
        rootMargin,
        threshold: 0,
      }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [onLoadMore, hasMore, isLoading, rootMargin]);

  return { sentinelRef };
}

/**
 * Hook for debounced value
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for throttled callback
 */
export function useThrottledCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();

      if (now - lastRun.current >= delay) {
        lastRun.current = now;
        callback(...args);
      } else if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          lastRun.current = Date.now();
          timeoutRef.current = null;
          callback(...args);
        }, delay - (now - lastRun.current));
      }
    }) as T,
    [callback, delay]
  );
}

/**
 * Hook for detecting scroll direction
 */
export function useScrollDirection(): 'up' | 'down' | null {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const updateScrollDirection = () => {
      const scrollY = window.scrollY;

      if (scrollY > lastScrollY.current) {
        setScrollDirection('down');
      } else if (scrollY < lastScrollY.current) {
        setScrollDirection('up');
      }

      lastScrollY.current = scrollY;
    };

    window.addEventListener('scroll', updateScrollDirection, { passive: true });

    return () => window.removeEventListener('scroll', updateScrollDirection);
  }, []);

  return scrollDirection;
}

/**
 * Hook for preloading images
 */
export function useImagePreload(urls: string[]): boolean {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (urls.length === 0) {
      setLoaded(true);
      return;
    }

    let loadedCount = 0;
    const images: HTMLImageElement[] = [];

    urls.forEach((url) => {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        loadedCount++;
        if (loadedCount === urls.length) {
          setLoaded(true);
        }
      };
      img.onerror = () => {
        loadedCount++;
        if (loadedCount === urls.length) {
          setLoaded(true);
        }
      };
      images.push(img);
    });

    return () => {
      images.forEach((img) => {
        img.onload = null;
        img.onerror = null;
      });
    };
  }, [urls]);

  return loaded;
}

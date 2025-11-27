/**
 * Performance Utilities
 * 
 * Collection of utilities for optimizing frontend performance:
 * - Debounce/Throttle for rate limiting
 * - Intersection Observer for lazy loading
 * - Request batching
 * - Performance monitoring
 */

/**
 * Debounce function - delays execution until after wait milliseconds
 * have elapsed since the last time it was invoked
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (this: unknown, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func.apply(this, args);
      timeoutId = null;
    }, wait);
  };
}

/**
 * Throttle function - ensures function is called at most once per wait period
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let lastTime = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (this: unknown, ...args: Parameters<T>) {
    const now = Date.now();

    if (now - lastTime >= wait) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastTime = now;
      func.apply(this, args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastTime = Date.now();
        timeoutId = null;
        func.apply(this, args);
      }, wait - (now - lastTime));
    }
  };
}

/**
 * Request batcher - batches multiple requests into a single request
 */
export class RequestBatcher<K, V> {
  private pending = new Map<K, { resolve: (v: V) => void; reject: (e: Error) => void }[]>();
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private batchFn: (keys: K[]) => Promise<Map<K, V>>,
    private delay: number = 10
  ) {}

  async load(key: K): Promise<V> {
    return new Promise((resolve, reject) => {
      const existing = this.pending.get(key);
      if (existing) {
        existing.push({ resolve, reject });
      } else {
        this.pending.set(key, [{ resolve, reject }]);
      }

      if (!this.timeoutId) {
        this.timeoutId = setTimeout(() => this.flush(), this.delay);
      }
    });
  }

  private async flush(): Promise<void> {
    this.timeoutId = null;
    const batch = new Map(this.pending);
    this.pending.clear();

    try {
      const keys = Array.from(batch.keys());
      const results = await this.batchFn(keys);

      for (const [key, callbacks] of batch) {
        const value = results.get(key);
        if (value !== undefined) {
          callbacks.forEach((cb) => cb.resolve(value));
        } else {
          callbacks.forEach((cb) => cb.reject(new Error(`No result for key: ${key}`)));
        }
      }
    } catch (error) {
      for (const callbacks of batch.values()) {
        callbacks.forEach((cb) => cb.reject(error as Error));
      }
    }
  }
}

/**
 * Intersection Observer hook helper for lazy loading
 */
export function createIntersectionObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options: IntersectionObserverInit = {}
): IntersectionObserver | null {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return null;
  }

  return new IntersectionObserver(callback, {
    root: null,
    rootMargin: '100px', // Start loading 100px before element is visible
    threshold: 0.1,
    ...options,
  });
}

/**
 * Performance timing helper
 */
export function measurePerformance<T>(
  name: string,
  fn: () => T
): T {
  if (process.env.NODE_ENV === 'development') {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    console.debug(`[Perf] ${name}: ${(end - start).toFixed(2)}ms`);
    return result;
  }
  return fn();
}

/**
 * Async performance timing helper
 */
export async function measurePerformanceAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  if (process.env.NODE_ENV === 'development') {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    console.debug(`[Perf] ${name}: ${(end - start).toFixed(2)}ms`);
    return result;
  }
  return fn();
}

/**
 * Preload critical resources
 */
export function preloadResource(href: string, as: 'image' | 'script' | 'style' | 'font'): void {
  if (typeof document === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;
  
  if (as === 'font') {
    link.crossOrigin = 'anonymous';
  }

  document.head.appendChild(link);
}

/**
 * Prefetch page for faster navigation
 */
export function prefetchPage(href: string): void {
  if (typeof document === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  document.head.appendChild(link);
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Idle callback wrapper for non-critical work
 */
export function runWhenIdle(callback: () => void, timeout: number = 1000): void {
  if (typeof window === 'undefined') {
    callback();
    return;
  }

  if ('requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void })
      .requestIdleCallback(callback, { timeout });
  } else {
    setTimeout(callback, 1);
  }
}

/**
 * Memory-efficient array chunking for large datasets
 */
export function* chunkArray<T>(array: T[], chunkSize: number): Generator<T[]> {
  for (let i = 0; i < array.length; i += chunkSize) {
    yield array.slice(i, i + chunkSize);
  }
}

/**
 * Virtual list helper - calculates visible items
 */
export function getVisibleItems<T>(
  items: T[],
  containerHeight: number,
  itemHeight: number,
  scrollTop: number,
  overscan: number = 3
): { visibleItems: T[]; startIndex: number; endIndex: number; offsetY: number } {
  const totalItems = items.length;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight) + 2 * overscan;
  const endIndex = Math.min(totalItems - 1, startIndex + visibleCount);

  return {
    visibleItems: items.slice(startIndex, endIndex + 1),
    startIndex,
    endIndex,
    offsetY: startIndex * itemHeight,
  };
}

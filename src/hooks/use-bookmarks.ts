import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface BookmarkPost {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  likes_count: number;
  replies_count: number;
  reposts_count: number;
  user_id: string;
  users: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
}

interface Bookmark {
  id: string;
  created_at: string;
  post: BookmarkPost;
}

interface UseBookmarksReturn {
  bookmarks: Bookmark[];
  isLoading: boolean;
  error: string | null;
  fetchBookmarks: () => Promise<void>;
  addBookmark: (postId: string) => Promise<boolean>;
  removeBookmark: (postId: string) => Promise<boolean>;
  isBookmarked: (postId: string) => boolean;
}

export function useBookmarks(): UseBookmarksReturn {
  const { data: session } = useSession();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBookmarks = useCallback(async () => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/bookmarks');
      if (!response.ok) {
        throw new Error('Failed to fetch bookmarks');
      }

      const data = await response.json();
      setBookmarks(data.bookmarks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bookmarks');
      console.error('Error fetching bookmarks:', err);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  const addBookmark = useCallback(async (postId: string): Promise<boolean> => {
    if (!session?.user?.id) return false;

    try {
      const response = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add bookmark');
      }

      // Refresh bookmarks to get the updated list
      await fetchBookmarks();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add bookmark');
      console.error('Error adding bookmark:', err);
      return false;
    }
  }, [session?.user?.id, fetchBookmarks]);

  const removeBookmark = useCallback(async (postId: string): Promise<boolean> => {
    if (!session?.user?.id) return false;

    try {
      const response = await fetch('/api/bookmarks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove bookmark');
      }

      // Remove from local state immediately for better UX
      setBookmarks(prev => prev.filter(bookmark => bookmark.post.id !== postId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove bookmark');
      console.error('Error removing bookmark:', err);
      return false;
    }
  }, [session?.user?.id]);

  const isBookmarked = useCallback((postId: string): boolean => {
    return bookmarks.some(bookmark => bookmark.post.id === postId);
  }, [bookmarks]);

  return {
    bookmarks,
    isLoading,
    error,
    fetchBookmarks,
    addBookmark,
    removeBookmark,
    isBookmarked
  };
}

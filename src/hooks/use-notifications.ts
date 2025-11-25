'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useMessages } from './use-messages';

interface NotificationHook {
  unreadCount: number;
  unreadMessageCount: number;
  refreshNotifications: () => void;
  incrementUnreadCount: () => void;
  decrementUnreadCount: (amount?: number) => void;
  createNotification: (data: {
    user_id: string;
    type: 'like' | 'comment' | 'follow' | 'mention' | 'repost';
    content: string;
    post_id?: string;
    comment_id?: string;
  }) => Promise<void>;
}

export function useNotifications(): NotificationHook {
  const { data: session } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);
  const { unreadMessageCount } = useMessages();

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch('/api/notifications?unread=true&limit=1');
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [session?.user?.id]);

  // Create notification
  const createNotification = useCallback(async (data: {
    user_id: string;
    type: 'like' | 'comment' | 'follow' | 'mention' | 'repost';
    content: string;
    post_id?: string;
    comment_id?: string;
  }) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (response.ok) {
        // Force immediate refresh of unread count
        setTimeout(fetchUnreadCount, 500);
      }
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }, [fetchUnreadCount]);

  // Refresh notifications
  const refreshNotifications = useCallback(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Increment unread count (for real-time updates)
  const incrementUnreadCount = useCallback(() => {
    setUnreadCount(prev => prev + 1);
  }, []);

  // Decrement unread count (for real-time updates)
  const decrementUnreadCount = useCallback((amount: number = 1) => {
    setUnreadCount(prev => Math.max(0, prev - amount));
  }, []);

  // Set up Server-Sent Events for real-time updates
  useEffect(() => {
    if (!session?.user?.id) return;

    fetchUnreadCount();
    
    // Set up SSE connection for real-time updates
    const eventSource = new EventSource('/api/notifications/stream');
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'unread_count') {
          setUnreadCount(data.count);
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      // Fallback to polling if SSE fails
      eventSource.close();
      const interval = setInterval(fetchUnreadCount, 10000);
      return () => clearInterval(interval);
    };

    return () => {
      eventSource.close();
    };
  }, [fetchUnreadCount, session?.user?.id]);

  // Also poll when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      if (session?.user?.id) {
        fetchUnreadCount();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchUnreadCount, session?.user?.id]);

  return {
    unreadCount,
    unreadMessageCount,
    createNotification,
    refreshNotifications,
    incrementUnreadCount,
    decrementUnreadCount
  };
}

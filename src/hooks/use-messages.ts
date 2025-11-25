'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface MessageHook {
  unreadMessageCount: number;
  refreshMessageCount: () => void;
}

export function useMessages(): MessageHook {
  const { data: session } = useSession();
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  // Fetch unread message count
  const fetchUnreadMessageCount = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      // Get user's chats
      const response = await fetch('/api/messages');
      if (response.ok) {
        const data = await response.json();
        const totalUnread = (data.chats || []).reduce((sum: number, chat: any) => sum + (chat.unread_count || 0), 0);
        setUnreadMessageCount(totalUnread);
      }
    } catch (error) {
      console.error('Error fetching unread message count:', error);
    }
  }, [session?.user?.id]);

  // Refresh message count
  const refreshMessageCount = useCallback(() => {
    fetchUnreadMessageCount();
  }, [fetchUnreadMessageCount]);

  // Set up SSE for real-time message updates
  useEffect(() => {
    if (!session?.user?.id) return;

    const eventSource = new EventSource('/api/messages/stream');
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'unread_count') {
          setUnreadMessageCount(data.count || 0);
        }
      } catch (error) {
        console.error('Error parsing message SSE data:', error);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [session?.user?.id]);

  // Initial fetch
  useEffect(() => {
    if (session?.user?.id) {
      fetchUnreadMessageCount();
    }
  }, [session?.user?.id, fetchUnreadMessageCount]);

  return {
    unreadMessageCount,
    refreshMessageCount
  };
}

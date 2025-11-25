'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';

interface TypingUser {
  userId: string;
  username: string;
  displayName: string;
}

interface UserActivity {
  isOnline: boolean;
  lastSeen: number;
}

interface TypingActivityHook {
  typingUsers: Record<string, TypingUser[]>; // chatId -> typing users
  userActivities: Record<string, UserActivity>; // userId -> activity
  setTyping: (chatId: string, isTyping: boolean) => void;
  sendHeartbeat: () => void;
}

export function useTypingActivity(): TypingActivityHook {
  const { data: session } = useSession();
  const [typingUsers, setTypingUsers] = useState<Record<string, TypingUser[]>>({});
  const [userActivities, setUserActivities] = useState<Record<string, UserActivity>>({});
  const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const typingDebounceRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Set typing indicator with debouncing
  const setTyping = useCallback(async (chatId: string, isTyping: boolean) => {
    if (!session?.user?.id) return;

    // For stopping typing, send immediately
    if (!isTyping) {
      // Clear any pending debounced calls
      if (typingDebounceRef.current[chatId]) {
        clearTimeout(typingDebounceRef.current[chatId]);
        delete typingDebounceRef.current[chatId];
      }
      
      // Clear auto-clear timeout
      if (typingTimeoutRef.current[chatId]) {
        clearTimeout(typingTimeoutRef.current[chatId]);
        delete typingTimeoutRef.current[chatId];
      }

      try {
        await fetch(`/api/messages/${chatId}/typing`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isTyping: false })
        });
      } catch (error) {
        console.error('Error clearing typing indicator:', error);
      }
      return;
    }

    // For starting/continuing typing, debounce to prevent excessive calls
    if (typingDebounceRef.current[chatId]) {
      clearTimeout(typingDebounceRef.current[chatId]);
    }

    typingDebounceRef.current[chatId] = setTimeout(async () => {
      try {
        await fetch(`/api/messages/${chatId}/typing`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isTyping: true })
        });

        // Clear existing auto-clear timeout
        if (typingTimeoutRef.current[chatId]) {
          clearTimeout(typingTimeoutRef.current[chatId]);
        }

        // Set new timeout to clear typing (reduced to 800ms)
        typingTimeoutRef.current[chatId] = setTimeout(() => {
          setTyping(chatId, false);
        }, 800);
      } catch (error) {
        console.error('Error setting typing indicator:', error);
      }
    }, 100); // 100ms debounce for typing start/continue (reduced for faster response)
  }, [session?.user?.id]);

  // Send activity heartbeat
  const sendHeartbeat = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      await fetch('/api/users/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'heartbeat' })
      });
    } catch (error) {
      console.error('Error sending heartbeat:', error);
    }
  }, [session?.user?.id]);

  // Set up SSE for real-time typing indicators
  useEffect(() => {
    if (!session?.user?.id) return;

    const typingEventSource = new EventSource('/api/messages/typing-stream');
    
    typingEventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'typing_indicators') {
          setTypingUsers(prev => ({
            ...prev,
            [data.chatId]: data.typingUsers || []
          }));
        }
      } catch (error) {
        console.error('Error parsing typing SSE data:', error);
      }
    };

    typingEventSource.onerror = () => {
      typingEventSource.close();
    };

    return () => {
      typingEventSource.close();
    };
  }, [session?.user?.id]);

  // Set up SSE for real-time activity updates
  useEffect(() => {
    if (!session?.user?.id) return;

    const activityEventSource = new EventSource('/api/users/activity-stream');
    
    activityEventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'user_activity') {
          setUserActivities(prev => ({
            ...prev,
            ...data.activities
          }));
        }
      } catch (error) {
        console.error('Error parsing activity SSE data:', error);
      }
    };

    activityEventSource.onerror = () => {
      activityEventSource.close();
    };

    return () => {
      activityEventSource.close();
    };
  }, [session?.user?.id]);

  // Send heartbeat every 30 seconds
  useEffect(() => {
    if (!session?.user?.id) return;

    // Send initial heartbeat
    sendHeartbeat();

    const interval = setInterval(sendHeartbeat, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [session?.user?.id, sendHeartbeat]);

  // Send heartbeat on page visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [sendHeartbeat]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(typingTimeoutRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });
      Object.values(typingDebounceRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, []);

  return {
    typingUsers,
    userActivities,
    setTyping,
    sendHeartbeat
  };
}

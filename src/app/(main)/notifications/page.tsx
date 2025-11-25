'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { redirect, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNotifications } from '@/hooks/use-notifications';
import {
  BellRing,
  Heart,
  MessageCircle,
  Repeat2,
  UserPlus,
  Settings,
  CheckCheck,
  Loader2,
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'repost';
  content: string;
  is_read: boolean;
  created_at: string;
  post_id?: string;
  comment_id?: string;
  actor: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
  post?: {
    id: string;
    content: string;
    media_urls: string[] | null;
  };
}

const notificationFilters = ['All', 'Unread', 'Mentions', 'Follows'];

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'like': return Heart;
    case 'comment': return MessageCircle;
    case 'repost': return Repeat2;
    case 'follow': return UserPlus;
    case 'mention': return MessageCircle;
    default: return BellRing;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'like': return 'text-red-500';
    case 'comment': return 'text-blue-500';
    case 'repost': return 'text-green-500';
    case 'follow': return 'text-purple-500';
    case 'mention': return 'text-blue-500';
    default: return 'text-gray-500';
  }
};

function NotificationsContent() {
  const { status } = useSession();
  const router = useRouter();
  const { decrementUnreadCount, refreshNotifications } = useNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState('All');
  const [markingAsRead, setMarkingAsRead] = useState(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (activeFilter === 'Unread') {
        params.set('unread', 'true');
      }
      
      const response = await fetch(`/api/notifications?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  // Mark all as read
  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    
    setMarkingAsRead(true);
    try {
      const response = await fetch('/api/notifications/read', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true })
      });
      
      if (response.ok) {
        const currentUnread = notifications.filter(n => !n.is_read).length;
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        decrementUnreadCount(currentUnread); // Update global count
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    } finally {
      setMarkingAsRead(false);
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      try {
        await fetch('/api/notifications/read', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationIds: [notification.id] })
        });
        
        setNotifications(prev => prev.map(n => 
          n.id === notification.id ? { ...n, is_read: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
        decrementUnreadCount(1); // Update global count
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
    
    // Navigate based on notification type
    if (notification.post_id) {
      router.push(`/post/${notification.post_id}`);
    } else if (notification.type === 'follow') {
      router.push(`/${notification.actor.username}`);
    }
  };

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    return `${Math.floor(diffInSeconds / 86400)}d`;
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    switch (activeFilter) {
      case 'Unread': return !notification.is_read;
      case 'Mentions': return notification.type === 'mention';
      case 'Follows': return notification.type === 'follow';
      default: return true;
    }
  });

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Set up polling for live updates
  useEffect(() => {
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-b-2 border-blue-500" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    redirect('/auth/signin');
  }

  return (
    <div className="min-h-screen w-full pb-12 bg-background">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center space-x-3">
              <BellRing className="h-6 w-6 text-blue-500" />
              <div>
                <h1 className="text-xl font-bold text-foreground">Notifications</h1>
                {unreadCount > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  disabled={markingAsRead}
                  className="text-sm"
                >
                  {markingAsRead ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCheck className="h-4 w-4 mr-2" />
                  )}
                  Mark all read
                </Button>
              )}
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex w-full gap-1 overflow-auto px-4 pb-3">
            {notificationFilters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeFilter === filter
                    ? 'bg-blue-500 text-white'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                {filter}
                {filter === 'Unread' && unreadCount > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-8">
              <BellRing className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No notifications</h3>
              <p className="text-muted-foreground">
                {activeFilter === 'Unread' 
                  ? "You're all caught up!" 
                  : "When you get notifications, they'll show up here."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNotifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                const iconColor = getNotificationColor(notification.type);
                
                return (
                  <article
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-accent ${
                      notification.is_read ? 'border-border' : 'border-blue-200 bg-blue-50/50 dark:bg-blue-900/10'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Actor Avatar */}
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage 
                          src={notification.actor.avatar_url || ''} 
                          alt={notification.actor.display_name}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                          {notification.actor.display_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      {/* Notification Icon */}
                      <div className={`p-1 rounded-full ${iconColor}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-1">
                            <span className="font-semibold text-foreground">
                              {notification.actor.display_name}
                            </span>
                            {notification.actor.is_verified && (
                              <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
                              </svg>
                            )}
                            <span className="text-muted-foreground">@{notification.actor.username}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(notification.created_at)}
                          </span>
                        </div>
                        
                        <p className="text-sm text-foreground mb-2">
                          {notification.content}
                        </p>
                        
                        {/* Post preview if available */}
                        {notification.post && (
                          <div className="mt-2 p-3 bg-muted rounded-lg border">
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {notification.post.content}
                            </p>
                          </div>
                        )}
                        
                        {/* Unread indicator */}
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="h-9 w-9 animate-spin rounded-full border-b-2 border-blue-500" />
        </div>
      }
    >
      <NotificationsContent />
    </Suspense>
  );
}

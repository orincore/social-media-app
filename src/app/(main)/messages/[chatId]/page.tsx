'use client';

import { Suspense, useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect, useParams } from 'next/navigation';
import { ChatWindow } from '@/components/messages/chat-window';

interface Chat {
  id: string;
  type: 'direct';
  other_user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
  unread_count: number;
  updated_at: string;
}

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
}

function ChatContent() {
  const { data: session, status } = useSession();
  const params = useParams();
  const chatId = params.chatId as string;
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pagination, setPagination] = useState({ page: 1, hasMore: false, loading: false });

  // Fetch chat details
  const fetchChat = useCallback(async () => {
    try {
      const response = await fetch('/api/messages');
      if (response.ok) {
        const data = await response.json();
        const foundChat = data.chats?.find((c: Chat) => c.id === chatId);
        if (foundChat) {
          setChat(foundChat);
        }
      }
    } catch (error) {
      console.error('Error fetching chat:', error);
    }
  }, [chatId]);

  // Fetch messages for the chat
  const fetchMessages = useCallback(async (page = 1, append = false) => {
    try {
      setPagination(prev => ({ ...prev, loading: true }));
      const response = await fetch(`/api/messages/${chatId}?page=${page}&limit=50`);
      if (response.ok) {
        const data = await response.json();
        if (append) {
          setMessages(prev => [...data.messages, ...prev]);
        } else {
          setMessages(data.messages || []);
        }
        setPagination({
          page: data.pagination.page,
          hasMore: data.pagination.hasMore,
          loading: false
        });
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setPagination(prev => ({ ...prev, loading: false }));
    }
  }, [chatId]);

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    try {
      const response = await fetch(`/api/messages/${chatId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, data.message]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [chatId]);

  // Handle load more messages
  const handleLoadMore = useCallback(() => {
    if (pagination.hasMore && !pagination.loading) {
      fetchMessages(pagination.page + 1, true);
    }
  }, [pagination, fetchMessages]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    window.history.back();
  }, []);

  // Load chat and messages on mount
  useEffect(() => {
    if (session?.user?.id && chatId) {
      fetchChat();
      fetchMessages();
    }
  }, [session?.user?.id, chatId, fetchChat, fetchMessages]);

  // Set up SSE for real-time messages
  useEffect(() => {
    if (!session?.user?.id || !chatId) return;

    const eventSource = new EventSource('/api/messages/stream');
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'new_messages') {
          const newMessages = data.messages.filter((msg: Message) => 
            msg.chat_id === chatId && msg.sender_id !== session.user!.id
          );
          if (newMessages.length > 0) {
            setMessages(prev => [...prev, ...newMessages]);
          }
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [session?.user?.id, chatId]);

  // Early returns after all hooks
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    redirect('/auth/signin');
  }

  if (!chat) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Chat not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background">
      <div className="h-screen">
        <ChatWindow
          chat={chat}
          messages={messages}
          currentUserId={session?.user?.id || ''}
          onSendMessage={sendMessage}
          onBack={handleBack}
          onLoadMore={handleLoadMore}
          hasMore={pagination.hasMore}
          isLoadingMore={pagination.loading}
        />
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}

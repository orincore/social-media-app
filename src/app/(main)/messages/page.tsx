'use client';

import { Suspense, useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect, useRouter } from 'next/navigation';
import { ConversationList } from '@/components/messages/conversation-list';

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

function MessagesContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);

  // Fetch chats
  const fetchChats = useCallback(async () => {
    try {
      const response = await fetch('/api/messages');
      if (response.ok) {
        const data = await response.json();
        setChats(data.chats || []);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  }, []);

  // Handle selecting a conversation - navigate to chat page
  const handleSelectConversation = useCallback((id: string) => {
    router.push(`/messages/${id}`);
  }, [router]);

  // Start new chat
  const startNewChat = useCallback(async (recipientId: string, initialMessage?: string) => {
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          recipient_id: recipientId, 
          content: initialMessage || 'Hi!' 
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        fetchChats(); // Refresh chats
        router.push(`/messages/${data.chat_id}`);
      }
    } catch (error) {
      console.error('Error starting new chat:', error);
    }
  }, [fetchChats, router]);

  const handleDeleteChat = useCallback(async (chatId: string) => {
    try {
      const response = await fetch(`/api/messages/${chatId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete chat');
      }

      setChats(prev => prev.filter((chat) => chat.id !== chatId));
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  }, []);

  // Load chats on mount
  useEffect(() => {
    if (session?.user?.id) {
      fetchChats();
    }
  }, [session?.user?.id, fetchChats]);

  // Refresh chats periodically instead of SSE to avoid infinite loop
  useEffect(() => {
    if (!session?.user?.id) return;

    const interval = setInterval(() => {
      fetchChats();
    }, 30000); // Refresh every 30 seconds

    return () => {
      clearInterval(interval);
    };
  }, [session?.user?.id, fetchChats]);

  // Early returns after all hooks
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    redirect('/auth/signin');
  }

  return (
    <div className="min-h-screen w-full bg-background">
      <div className="mx-auto w-full max-w-[1200px] px-4 pb-6 sm:px-6 lg:px-8">
        <ConversationList
          chats={chats}
          selectedId={null}
          onSelect={handleSelectConversation}
          onStartNewChat={startNewChat}
          onDeleteChat={handleDeleteChat}
        />
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="h-9 w-9 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  );
}

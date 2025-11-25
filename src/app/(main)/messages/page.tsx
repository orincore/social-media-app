'use client';

import { Suspense, useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { ConversationList } from '@/components/messages/conversation-list';
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

function MessagesContent() {
  const { data: session, status } = useSession();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobileView, setIsMobileView] = useState(false);

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
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch messages for selected chat
  const fetchMessages = useCallback(async (chatId: string) => {
    try {
      const response = await fetch(`/api/messages/${chatId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, []);

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    if (!selectedChatId) return;
    
    try {
      const response = await fetch(`/api/messages/${selectedChatId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, data.message]);
        // Refresh chats to update last message
        fetchChats();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [selectedChatId, fetchChats]);

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
        // Refresh chats to show new chat
        await fetchChats();
        // Select the new chat
        setSelectedChatId(data.chat_id);
        setIsMobileView(true);
        // Fetch messages for the new chat
        fetchMessages(data.chat_id);
      }
    } catch (error) {
      console.error('Error starting new chat:', error);
    }
  }, [fetchChats, fetchMessages]);

  const handleSelectConversation = useCallback((id: string) => {
    setSelectedChatId(id);
    setIsMobileView(true);
    fetchMessages(id);
  }, [fetchMessages]);

  const handleBackToList = useCallback(() => {
    setIsMobileView(false);
    setSelectedChatId(null);
    setMessages([]);
  }, []);

  // Load chats on mount
  useEffect(() => {
    if (session?.user?.id) {
      fetchChats();
    }
  }, [session?.user?.id, fetchChats]);

  // Set up real-time messaging
  useEffect(() => {
    if (!session?.user?.id) return;

    const eventSource = new EventSource('/api/messages/stream');
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'new_messages' && data.messages.length > 0) {
          // Update messages if we're viewing the chat
          data.messages.forEach((message: Message) => {
            if (message.chat_id === selectedChatId) {
              setMessages(prev => {
                // Avoid duplicates
                if (prev.find(m => m.id === message.id)) return prev;
                return [...prev, message];
              });
            }
          });
          
          // Refresh chats to update unread counts
          fetchChats();
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
  }, [session?.user?.id, selectedChatId, fetchChats]);

  // Early returns after all hooks
  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    redirect('/auth/signin');
  }

  const selectedChat = chats.find(c => c.id === selectedChatId);

  return (
    <div className="min-h-screen w-full bg-slate-950 pt-16 lg:pt-0">
      {!selectedChatId ? (
        <div className="mx-auto w-full max-w-[1200px] px-4 pb-6 sm:px-6 lg:px-8">
          <ConversationList
            chats={chats}
            selectedId={selectedChatId}
            onSelect={handleSelectConversation}
            onStartNewChat={startNewChat}
          />
        </div>
      ) : (
        <div className="h-screen lg:mx-auto lg:max-w-[1200px] lg:px-4 lg:py-6 lg:sm:px-6 lg:lg:px-8">
          {selectedChat && (
            <ChatWindow
              chat={selectedChat}
              messages={messages}
              currentUserId={session?.user?.id || ''}
              onSendMessage={sendMessage}
              onBack={handleBackToList}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="h-9 w-9 animate-spin rounded-full border-b-2 border-blue-500" />
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  );
}

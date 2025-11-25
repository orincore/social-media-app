'use client';

import { Suspense, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { ConversationList } from '@/components/messages/conversation-list';
import { ChatWindow } from '@/components/messages/chat-window';

interface ConversationSummary {
  id: string;
  name: string;
  handle: string;
  preview: string;
  unread: number;
  isVerified: boolean;
  timestamp: string;
}

interface MessageItem {
  id: string;
  from: 'me' | 'them';
  content: string;
  time: string;
}

const conversations: ConversationSummary[] = [
  {
    id: '1',
    name: 'Civic Signals Council',
    handle: 'civic_signals',
    preview: 'Let’s finalize the community guidelines deck.',
    unread: 3,
    isVerified: true,
    timestamp: '12m',
  },
  {
    id: '2',
    name: 'Nora Kaplan',
    handle: 'nora_k',
    preview: 'Sending over the policy brief now.',
    unread: 0,
    isVerified: true,
    timestamp: '1h',
  },
  {
    id: '3',
    name: 'Open Governance Lab',
    handle: 'opengovlab',
    preview: 'Appreciate your comments during the session!',
    unread: 0,
    isVerified: false,
    timestamp: '3h',
  },
];

const conversationMessages: Record<string, MessageItem[]> = {
  '1': [
    { id: 'm1', from: 'them', content: 'Appreciate the feedback on moderation structure.', time: '11:42' },
    { id: 'm2', from: 'me', content: 'Happy to help. Uploading the revised framework shortly.', time: '11:44' },
    { id: 'm3', from: 'them', content: 'Great, let’s sync later today?', time: '11:45' },
  ],
  '2': [
    { id: 'm4', from: 'them', content: 'The beta numbers look promising.', time: '10:05' },
    { id: 'm5', from: 'me', content: 'Let’s highlight them in the community update.', time: '10:08' },
  ],
  '3': [
    { id: 'm6', from: 'them', content: 'Your remarks landed so well with the youth roundtable.', time: '08:12' },
  ],
};

function MessagesContent() {
  const { status } = useSession();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, MessageItem[]>>(conversationMessages);

  // All hooks must be called before any early returns
  const handleSelectConversation = useCallback((conversationId: string) => {
    setActiveConversationId(conversationId);
  }, []);

  const handleBackToList = useCallback(() => {
    setActiveConversationId(null);
  }, []);

  const handleSendMessage = useCallback((messageContent: string) => {
    if (!activeConversationId) return;

    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    
    const newMessage: MessageItem = {
      id: `msg_${now.getTime()}`,
      from: 'me',
      content: messageContent,
      time: `${hours}:${minutes}`,
    };

    setMessages(prev => ({
      ...prev,
      [activeConversationId]: [...(prev[activeConversationId] || []), newMessage]
    }));
  }, [activeConversationId]);

  // Early returns after all hooks
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-b-2 border-blue-500" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    redirect('/auth/signin');
  }

  const activeConversation = conversations.find((conv) => conv.id === activeConversationId);

  return (
    <div className="min-h-screen w-full bg-slate-950 pt-16 lg:pt-0">
      {!activeConversation ? (
        <div className="mx-auto w-full max-w-[1200px] px-4 pb-6 sm:px-6 lg:px-8">
          <ConversationList
            conversations={conversations}
            onSelectConversation={handleSelectConversation}
            activeConversationId={activeConversationId || undefined}
          />
        </div>
      ) : (
        <div className="h-screen lg:mx-auto lg:max-w-[1200px] lg:px-4 lg:py-6 lg:sm:px-6 lg:lg:px-8">
          <ChatWindow
            conversation={activeConversation}
            messages={messages[activeConversation.id] || []}
            onBack={handleBackToList}
            onSendMessage={handleSendMessage}
          />
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

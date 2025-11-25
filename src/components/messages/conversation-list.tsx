'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PencilLine, Search, ShieldCheck, MessageCircle } from 'lucide-react';
import { NewMessageModal } from './new-message-modal';

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

interface ConversationListProps {
  chats: Chat[];
  selectedId: string | null;
  onSelect: (chatId: string) => void;
  onStartNewChat: (userId: string) => void;
}

const safetyTips = [
  'Only accept requests from people you recognize.',
  'Enable safety prompts for suspicious links.',
  'Report harassment directly from the conversation.',
];

export function ConversationList({ chats, selectedId, onSelect, onStartNewChat }: ConversationListProps) {
  const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false);
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return diffInMinutes < 1 ? 'now' : `${diffInMinutes}m`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d`;
    }
  };
  return (
    <div className="flex h-full w-full flex-col rounded-3xl border border-slate-800/70 bg-gradient-to-b from-slate-950/90 to-slate-900/70 p-4 backdrop-blur lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500">Inbox</p>
          <h1 className="text-xl font-bold text-white lg:text-2xl">Messages</h1>
        </div>
        <Button 
          size="icon" 
          onClick={() => setIsNewMessageModalOpen(true)}
          className="h-10 w-10 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg shadow-blue-500/25 lg:h-12 lg:w-12"
        >
          <PencilLine className="h-4 w-4 lg:h-5 lg:w-5" />
        </Button>
      </div>

      {/* Search */}
      <div className="mt-6 flex items-center rounded-2xl bg-slate-900/70 px-4 py-3 text-sm text-slate-300 ring-1 ring-slate-800">
        <Search className="mr-3 h-5 w-5 text-slate-500" />
        <input
          type="search"
          placeholder="Search conversations"
          className="flex-1 bg-transparent text-base text-white placeholder:text-slate-500 focus:outline-none"
        />
      </div>

      {/* Conversations */}
      <div className="mt-6 flex-1 overflow-hidden">
        {chats.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center space-y-4 text-center">
            <MessageCircle className="h-12 w-12 text-slate-600" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-300">No conversations yet</h3>
              <p className="text-sm text-slate-500">Start a conversation by sending a message to someone.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => onSelect(chat.id)}
                className={`group flex cursor-pointer items-center space-x-3 rounded-2xl p-3 transition-all duration-200 hover:bg-slate-800/50 ${
                  selectedId === chat.id ? 'bg-slate-800/70' : ''
                }`}
              >
                <div className="relative">
                  {chat.other_user.avatar_url ? (
                    <img
                      src={chat.other_user.avatar_url}
                      alt={chat.other_user.display_name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                      {chat.other_user.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {chat.other_user.is_verified && (
                    <ShieldCheck className="absolute -bottom-1 -right-1 h-4 w-4 text-blue-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-200 truncate">{chat.other_user.display_name}</h3>
                    <span className="text-xs text-slate-500">{formatTimestamp(chat.updated_at)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm text-slate-400 truncate">@{chat.other_user.username}</p>
                    {chat.unread_count > 0 && (
                      <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                        {chat.unread_count > 99 ? '99+' : chat.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Safety Tips */}
      <div className="mt-6 rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5">
        <div className="flex items-center gap-3 text-white">
          <ShieldCheck className="h-5 w-5 text-blue-400" />
          <p className="font-semibold">Safety first</p>
        </div>
        <ul className="mt-4 space-y-3 text-sm text-slate-300">
          {safetyTips.map((tip) => (
            <li key={tip} className="flex items-start gap-3">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-400 flex-shrink-0" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* New Message Modal */}
      <NewMessageModal
        isOpen={isNewMessageModalOpen}
        onClose={() => setIsNewMessageModalOpen(false)}
        onStartChat={onStartNewChat}
      />
    </div>
  );
}

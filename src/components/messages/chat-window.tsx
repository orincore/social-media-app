'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  MessageCircle,
  ShieldCheck,
  PhoneCall,
  Video,
  MoreHorizontal,
  Image as ImageIcon,
  Smile,
  Mic,
  SendHorizontal,
  ArrowLeft,
} from 'lucide-react';

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

interface ChatWindowProps {
  chat: Chat;
  messages: Message[];
  currentUserId: string;
  onSendMessage: (message: string) => void;
  onBack: () => void;
}

export function ChatWindow({ chat, messages, currentUserId, onSendMessage, onBack }: ChatWindowProps) {
  const [draft, setDraft] = useState('');

  const handleSend = () => {
    if (!draft.trim()) return;
    onSendMessage(draft);
    setDraft('');
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-950 lg:relative lg:inset-auto lg:h-full lg:rounded-3xl lg:border lg:border-slate-800/70 lg:bg-slate-950/60 lg:backdrop-blur">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/70 p-4 lg:p-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-9 w-9 rounded-full border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white lg:h-10 lg:w-10"
        >
          <ArrowLeft className="h-4 w-4 lg:h-5 lg:w-5" />
        </Button>
        
        <div className="flex items-center space-x-3 flex-1 ml-4">
          <div className="relative">
            {chat.other_user.avatar_url ? (
              <img
                src={chat.other_user.avatar_url}
                alt={chat.other_user.display_name}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                {chat.other_user.display_name.charAt(0).toUpperCase()}
              </div>
            )}
            {chat.other_user.is_verified && (
              <ShieldCheck className="absolute -bottom-1 -right-1 h-3 w-3 text-blue-400" />
            )}
          </div>
          <div>
            <h2 className="font-semibold text-white">{chat.other_user.display_name}</h2>
            <p className="text-sm text-slate-400">@{chat.other_user.username}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 lg:gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full border border-slate-800 hover:border-slate-700 lg:h-10 lg:w-10">
            <PhoneCall className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full border border-slate-800 hover:border-slate-700 lg:h-10 lg:w-10">
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full border border-slate-800 hover:border-slate-700 lg:h-10 lg:w-10">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-4 p-4">
          {messages.map((message) => {
            const isFromMe = message.sender_id === currentUserId;
            return (
              <div
                key={message.id}
                className={`flex ${
                  isFromMe ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-xs rounded-2xl px-4 py-2 ${
                    isFromMe
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                      : 'bg-slate-800 text-slate-200'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p
                    className={`mt-1 text-xs ${
                      isFromMe ? 'text-blue-100' : 'text-slate-400'
                    }`}
                  >
                    {formatTime(message.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-slate-800/70 p-4">
        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Write a message..."
            className="h-12 w-full resize-none bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none lg:h-16"
            maxLength={1000}
            rows={2}
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1 text-slate-400 lg:gap-2">
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-slate-800 lg:h-8 lg:w-8">
                <ImageIcon className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-slate-800 lg:h-8 lg:w-8">
                <Smile className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-slate-800 lg:h-8 lg:w-8">
                <Mic className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 lg:gap-3">
              <span className="text-xs text-slate-500">{1000 - draft.length}</span>
              <Button
                onClick={handleSend}
                disabled={!draft.trim()}
                className="h-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-3.5 text-sm font-semibold shadow-lg shadow-blue-500/25 disabled:cursor-not-allowed disabled:opacity-50 lg:h-9 lg:px-5"
              >
                <SendHorizontal className="mr-1 h-4 w-4 lg:mr-2" />
                <span className="hidden sm:inline">Send</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

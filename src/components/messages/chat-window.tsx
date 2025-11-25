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

interface ChatWindowProps {
  conversation: ConversationSummary;
  messages: MessageItem[];
  onBack: () => void;
  onSendMessage: (message: string) => void;
}

export function ChatWindow({ conversation, messages, onBack, onSendMessage }: ChatWindowProps) {
  const [draft, setDraft] = useState('');

  const handleSend = () => {
    if (!draft.trim()) return;
    onSendMessage(draft);
    setDraft('');
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
      <div className="flex items-center gap-3 border-b border-slate-800/70 bg-slate-950/95 px-4 py-3 backdrop-blur-xl lg:px-6 lg:py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-9 w-9 rounded-full border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white lg:h-10 lg:w-10"
        >
          <ArrowLeft className="h-4 w-4 lg:h-5 lg:w-5" />
        </Button>
        
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg lg:h-12 lg:w-12" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-semibold text-white lg:text-lg">{conversation.name}</h2>
              {conversation.isVerified && <ShieldCheck className="h-4 w-4 flex-shrink-0 text-blue-400" />}
            </div>
            <p className="truncate text-sm text-slate-400">@{conversation.handle}</p>
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
      <div className="flex-1 overflow-y-auto px-4 py-4 lg:px-6 lg:py-6">
        <div className="space-y-3 lg:space-y-4">
          {messages.length === 0 ? (
            <div className="flex h-full min-h-[40vh] flex-col items-center justify-center gap-4 text-center text-slate-400">
              <MessageCircle className="h-12 w-12 text-slate-600 lg:h-16 lg:w-16" />
              <div>
                <h3 className="text-lg font-semibold text-white lg:text-xl">Start the conversation</h3>
                <p className="mt-2 text-sm text-slate-400">Send a message to begin your chat with {conversation.name}.</p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`flex ${message.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-lg lg:max-w-[75%] lg:px-4 lg:py-3 ${
                    message.from === 'me'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                      : 'border border-slate-800/70 bg-slate-900/70 text-slate-100'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <span className="mt-1 block text-xs opacity-70 lg:mt-2">{message.time}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Composer - Fixed at bottom */}
      <div className="border-t border-slate-800/70 bg-slate-950/95 px-4 py-2 backdrop-blur-xl lg:px-6 lg:py-3">
        <div className="flex flex-col gap-2 rounded-2xl border border-slate-800/80 bg-slate-900/70 p-2.5 lg:p-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Write a message..."
            className="h-12 w-full resize-none bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none lg:h-16"
            maxLength={1000}
            rows={2}
          />
          <div className="flex items-center justify-between">
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

'use client';

import { Button } from '@/components/ui/button';
import { PencilLine, Search, ShieldCheck, MessageCircle } from 'lucide-react';

interface ConversationSummary {
  id: string;
  name: string;
  handle: string;
  preview: string;
  unread: number;
  isVerified: boolean;
  timestamp: string;
}

interface ConversationListProps {
  conversations: ConversationSummary[];
  onSelectConversation: (conversationId: string) => void;
  activeConversationId?: string;
}

const safetyTips = [
  'Only accept requests from people you recognize.',
  'Enable safety prompts for suspicious links.',
  'Report harassment directly from the conversation.',
];

export function ConversationList({ conversations, onSelectConversation, activeConversationId }: ConversationListProps) {
  return (
    <div className="flex h-full w-full flex-col rounded-3xl border border-slate-800/70 bg-gradient-to-b from-slate-950/90 to-slate-900/70 p-4 backdrop-blur lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500">Inbox</p>
          <h1 className="text-xl font-bold text-white lg:text-2xl">Messages</h1>
        </div>
        <Button size="icon" className="h-10 w-10 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg shadow-blue-500/25 lg:h-12 lg:w-12">
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
        <div className="flex h-full flex-col gap-3 overflow-y-auto pr-2">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => onSelectConversation(conversation.id)}
              className={`flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-all duration-200 ${
                conversation.id === activeConversationId
                  ? 'border-blue-500/80 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                  : 'border-slate-800/70 bg-slate-900/60 hover:border-blue-500/50 hover:bg-slate-900/80'
              }`}
            >
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold text-white truncate">{conversation.name}</p>
                  {conversation.isVerified && <ShieldCheck className="h-4 w-4 text-blue-400 flex-shrink-0" />}
                  <span className="ml-auto text-sm text-slate-500 flex-shrink-0">{conversation.timestamp}</span>
                </div>
                <p className="text-sm text-slate-400 mt-1">@{conversation.handle}</p>
                <p className="text-sm text-slate-300 mt-2 line-clamp-2">{conversation.preview}</p>
              </div>
              {conversation.unread > 0 && (
                <span className="rounded-full bg-blue-500/90 px-3 py-1 text-sm font-semibold text-white shadow-lg flex-shrink-0">
                  {conversation.unread}
                </span>
              )}
            </button>
          ))}
        </div>
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
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PencilLine, Search, ShieldCheck, MessageCircle, Trash2, MoreHorizontal } from 'lucide-react';
import { NewMessageModal } from './new-message-modal';
import { ActivityStatus } from './activity-status';
import { useTypingActivity } from '@/hooks/use-typing-activity';

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
  onDeleteChat?: (chatId: string) => void;
}

const safetyTips = [
  'Only accept requests from people you recognize.',
  'Enable safety prompts for suspicious links.',
  'Report harassment directly from the conversation.',
];

export function ConversationList({ chats, selectedId, onSelect, onStartNewChat, onDeleteChat }: ConversationListProps) {
  const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false);
  const [activeChatMenuId, setActiveChatMenuId] = useState<string | null>(null);
  const { userActivities } = useTypingActivity();
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
    <div className="flex h-full w-full flex-col rounded-3xl border border-border bg-background/90 p-4 backdrop-blur lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Inbox</p>
          <h1 className="text-xl font-bold text-foreground lg:text-2xl">Messages</h1>
        </div>
        <Button 
          size="icon" 
          onClick={() => setIsNewMessageModalOpen(true)}
          className="h-10 w-10 rounded-2xl bg-primary text-primary-foreground shadow-lg lg:h-12 lg:w-12"
        >
          <PencilLine className="h-4 w-4 lg:h-5 lg:w-5" />
        </Button>
      </div>

      {/* Search */}
      <div className="mt-6 flex items-center rounded-2xl bg-muted/50 px-4 py-3 text-sm text-foreground ring-1 ring-border">
        <Search className="mr-3 h-5 w-5 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search conversations"
          className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      {/* Conversations */}
      <div className="mt-6 flex-1 overflow-hidden">
        {chats.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center space-y-4 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">No conversations yet</h3>
              <p className="text-sm text-muted-foreground">Start a conversation by sending a message to someone.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {chats.map((chat) => {
              const other = chat.other_user;
              // If for some reason the API did not include other_user, skip this chat safely
              if (!other) return null;

              const displayName = other.display_name || 'User';
              const username = other.username || 'user';

              return (
                <div
                  key={chat.id}
                  className={`group flex items-center space-x-3 rounded-2xl p-3 transition-all duration-200 hover:bg-accent/50 ${
                    selectedId === chat.id ? 'bg-accent/70' : ''
                  }`}
                >
                  <div className="relative">
                    {other.avatar_url ? (
                      <img
                        src={other.avatar_url}
                        alt={displayName}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {other.is_verified && (
                      <ShieldCheck className="absolute -bottom-1 -right-1 h-4 w-4 text-blue-400" />
                    )}
                  </div>
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => onSelect(chat.id)}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-foreground truncate">{displayName}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{formatTimestamp(chat.updated_at)}</span>
                        {onDeleteChat && (
                          <div className="relative flex items-center ml-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveChatMenuId((prev) => (prev === chat.id ? null : chat.id));
                              }}
                              className="rounded-full p-1.5 text-xs text-foreground hover:bg-accent transition-colors"
                              aria-label="Chat options"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                            {activeChatMenuId === chat.id && (
                              <div className="absolute right-1 top-7 z-40">
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-red-500 text-white hover:bg-red-600 rounded-full shadow-lg"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const confirmed = typeof window !== 'undefined'
                                      ? window.confirm('Delete this chat? This will remove the entire conversation.')
                                      : true;
                                    if (!confirmed) return;
                                    setActiveChatMenuId(null);
                                    onDeleteChat(chat.id);
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span className="whitespace-nowrap">Delete chat</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        <p className="text-sm text-muted-foreground truncate">@{username}</p>
                        <ActivityStatus 
                          isOnline={userActivities[other.id]?.isOnline || false}
                          lastSeen={userActivities[other.id]?.lastSeen}
                          className="flex-shrink-0"
                        />
                      </div>
                      {chat.unread_count > 0 && (
                        <span className="ml-2 bg-primary text-primary-foreground text-xs rounded-full px-2 py-1 min-w-[20px] text-center flex-shrink-0">
                          {chat.unread_count > 99 ? '99+' : chat.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Safety Tips */}
      <div className="mt-6 rounded-2xl border border-border bg-muted/50 p-5">
        <div className="flex items-center gap-3 text-foreground">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <p className="font-semibold">Safety first</p>
        </div>
        <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
          {safetyTips.map((tip) => (
            <li key={tip} className="flex items-start gap-3">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
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

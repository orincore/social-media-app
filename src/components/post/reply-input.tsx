'use client';

import { FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, X } from 'lucide-react';

interface Comment {
  id: string;
  user: {
    username: string;
  } | null;
}

interface ReplyInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  isSubmitting: boolean;
  replyingTo: Comment | null;
  onCancelReply: () => void;
  maxLength?: number;
}

export function ReplyInput({
  value,
  onChange,
  onSubmit,
  isSubmitting,
  replyingTo,
  onCancelReply,
  maxLength = 280,
}: ReplyInputProps) {
  const { data: session } = useSession();

  return (
    <div className="px-4 py-3">
      {replyingTo && (
        <div className="flex items-center justify-between mb-3 p-2 bg-blue-500/10 rounded-lg">
          <span className="text-sm text-tertiary">
            Replying to <span className="text-blue-500 font-medium">@{replyingTo.user?.username || 'unknown'}</span>
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onCancelReply}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      
      <form onSubmit={onSubmit} className="flex gap-3 items-center">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={session?.user?.image || ''} />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
            {session?.user?.name?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 flex items-center gap-3">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Post your reply"
            className="flex-1 bg-transparent text-primary placeholder-tertiary text-base focus:outline-none border-b border-border focus:border-blue-500 pb-1 transition-colors"
            maxLength={maxLength}
            disabled={isSubmitting}
          />
          
          <Button
            type="submit"
            disabled={!value.trim() || isSubmitting}
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-4 py-1.5 font-bold text-sm disabled:opacity-50 h-8"
          >
            {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Reply'}
          </Button>
        </div>
      </form>
    </div>
  );
}

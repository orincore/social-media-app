'use client';

interface TypingUser {
  userId: string;
  username: string;
  displayName: string;
}

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
  className?: string;
}

export function TypingIndicator({ typingUsers, className = '' }: TypingIndicatorProps) {
  if (!typingUsers || typingUsers.length === 0) {
    return null;
  }

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].displayName} is typing...`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].displayName} and ${typingUsers[1].displayName} are typing...`;
    } else {
      return `${typingUsers[0].displayName} and ${typingUsers.length - 1} others are typing...`;
    }
  };

  return (
    <div className={`flex items-center space-x-2 px-4 py-2 ${className}`}>
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
      <span className="text-sm text-slate-400 italic">
        {getTypingText()}
      </span>
    </div>
  );
}

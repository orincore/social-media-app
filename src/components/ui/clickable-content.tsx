'use client';

import { useRouter } from 'next/navigation';

interface ClickableContentProps {
  content: string;
  className?: string;
}

export function ClickableContent({ content, className = '' }: ClickableContentProps) {
  const router = useRouter();

  const renderContent = (text: string) => {
    // Split by hashtags and mentions while keeping the delimiters
    const parts = text.split(/([@#]\w+)/g);
    
    return parts.map((part, index) => {
      // Handle mentions (@username)
      if (part.startsWith('@') && part.length > 1) {
        const username = part.slice(1);
        return (
          <span 
            key={index} 
            className="text-blue-500 hover:text-blue-600 hover:underline cursor-pointer transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/${username}`);
            }}
          >
            {part}
          </span>
        );
      }
      
      // Handle hashtags (#hashtag)
      if (part.startsWith('#') && part.length > 1) {
        const hashtag = part.slice(1);
        return (
          <span 
            key={index} 
            className="text-blue-500 hover:text-blue-600 hover:underline cursor-pointer transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/hashtag/${hashtag}`);
            }}
          >
            {part}
          </span>
        );
      }
      
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <span className={className}>
      {renderContent(content)}
    </span>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Hash, User } from 'lucide-react';

interface HashtagSuggestion {
  name: string;
  posts_count: number;
  display: string;
  value: string;
}

interface UserSuggestion {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
  display: string;
  value: string;
  label: string;
}

interface AutocompleteDropdownProps {
  suggestions: HashtagSuggestion[] | UserSuggestion[];
  type: 'hashtag' | 'mention';
  onSelect: (suggestion: HashtagSuggestion | UserSuggestion) => void;
  position: { top: number; left: number };
  selectedIndex: number;
  isVisible: boolean;
}

export function AutocompleteDropdown({
  suggestions,
  type,
  onSelect,
  position,
  selectedIndex,
  isVisible
}: AutocompleteDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  if (!isVisible || suggestions.length === 0) {
    return null;
  }

  const isHashtagSuggestion = (suggestion: any): suggestion is HashtagSuggestion => {
    return type === 'hashtag';
  };

  const isUserSuggestion = (suggestion: any): suggestion is UserSuggestion => {
    return type === 'mention';
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute z-[9999] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto min-w-72 backdrop-blur-sm"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      {suggestions.map((suggestion, index) => (
        <div
          key={isHashtagSuggestion(suggestion) ? suggestion.name : suggestion.id}
          className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-200 ${
            index === selectedIndex
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
              : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100'
          }`}
          onClick={() => onSelect(suggestion)}
        >
          {type === 'hashtag' && isHashtagSuggestion(suggestion) && (
            <>
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
                <Hash className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  #{suggestion.name}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {suggestion.posts_count.toLocaleString()} posts
                </div>
              </div>
            </>
          )}

          {type === 'mention' && isUserSuggestion(suggestion) && (
            <>
              <Avatar className="w-10 h-10 ring-2 ring-gray-200 dark:ring-gray-700">
                <AvatarImage src={suggestion.avatar_url || ''} alt={suggestion.display_name} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-semibold">
                  {suggestion.display_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {suggestion.display_name}
                  </span>
                  {suggestion.is_verified && (
                    <div className="flex items-center justify-center w-5 h-5 bg-blue-500 rounded-full">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  @{suggestion.username}
                </div>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

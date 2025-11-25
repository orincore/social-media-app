'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { AutocompleteDropdown } from './autocomplete-dropdown';

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

interface AutocompleteTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
  rows?: number;
  minRows?: number;
  maxRows?: number;
  onMention?: (mentionedUsers: UserSuggestion[]) => void;
}

export function AutocompleteTextarea({
  value,
  onChange,
  placeholder,
  className = '',
  maxLength,
  rows = 3,
  minRows = 1,
  maxRows = 8,
  onMention
}: AutocompleteTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [suggestions, setSuggestions] = useState<HashtagSuggestion[] | UserSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentQuery, setCurrentQuery] = useState('');
  const [currentType, setCurrentType] = useState<'hashtag' | 'mention'>('hashtag');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionedUsers, setMentionedUsers] = useState<UserSuggestion[]>([]);

  // Debounced search
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea based on content
  const autoResize = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    
    // Calculate the number of lines
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
    const minHeight = lineHeight * minRows;
    const maxHeight = lineHeight * maxRows;
    
    // Set height based on content, but within min/max bounds
    const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
    
    // Enable/disable scrolling based on whether we've reached max height
    if (textarea.scrollHeight > maxHeight) {
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.overflowY = 'hidden';
    }
  }, [minRows, maxRows]);

  // Auto-resize when value changes
  useEffect(() => {
    autoResize();
  }, [value, autoResize]);

  // Initial auto-resize on mount
  useEffect(() => {
    autoResize();
  }, [autoResize]);

  const searchHashtags = useCallback(async (query: string) => {
    if (query.length < 1) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(`/api/hashtags/search?q=${encodeURIComponent(query)}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.hashtags || []);
      }
    } catch (error) {
      console.error('Error searching hashtags:', error);
      setSuggestions([]);
    }
  }, []);

  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 1) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(`/api/users/mention-search?q=${encodeURIComponent(query)}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.users || []);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setSuggestions([]);
    }
  }, []);

  const getCaretPosition = () => {
    if (!textareaRef.current) return { top: 30, left: 0 };

    const textarea = textareaRef.current;
    const rect = textarea.getBoundingClientRect();
    
    // Simple positioning - just below the textarea
    return {
      top: 30, // Fixed position below textarea
      left: 0
    };
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    onChange(newValue);
    setCursorPosition(cursorPos);

    // Find hashtag or mention at cursor position
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const hashtagMatch = textBeforeCursor.match(/#(\w*)$/);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (hashtagMatch) {
      const query = hashtagMatch[1];
      setCurrentQuery(query);
      setCurrentType('hashtag');
      setSelectedIndex(0);
      
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      searchTimeoutRef.current = setTimeout(() => {
        searchHashtags(query);
      }, 300);
      
      setDropdownPosition(getCaretPosition());
      setShowDropdown(true);
    } else if (mentionMatch) {
      const query = mentionMatch[1];
      setCurrentQuery(query);
      setCurrentType('mention');
      setSelectedIndex(0);
      
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      searchTimeoutRef.current = setTimeout(() => {
        searchUsers(query);
      }, 300);
      
      setDropdownPosition(getCaretPosition());
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
      setSuggestions([]);
    }
  };

  const handleSuggestionSelect = (suggestion: HashtagSuggestion | UserSuggestion) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    
    let newText = '';
    let insertText = '';
    
    if (currentType === 'hashtag') {
      const hashtagMatch = textBeforeCursor.match(/#(\w*)$/);
      if (hashtagMatch) {
        const beforeHashtag = textBeforeCursor.substring(0, textBeforeCursor.length - hashtagMatch[0].length);
        insertText = `#${(suggestion as HashtagSuggestion).name}`;
        newText = beforeHashtag + insertText + textAfterCursor;
      }
    } else if (currentType === 'mention') {
      const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
      if (mentionMatch) {
        const beforeMention = textBeforeCursor.substring(0, textBeforeCursor.length - mentionMatch[0].length);
        insertText = `@${(suggestion as UserSuggestion).username}`;
        newText = beforeMention + insertText + textAfterCursor;
        
        // Add to mentioned users
        const userSuggestion = suggestion as UserSuggestion;
        const newMentionedUsers = [...mentionedUsers];
        if (!newMentionedUsers.find(u => u.id === userSuggestion.id)) {
          newMentionedUsers.push(userSuggestion);
          setMentionedUsers(newMentionedUsers);
          onMention?.(newMentionedUsers);
        }
      }
    }
    
    onChange(newText);
    setShowDropdown(false);
    setSuggestions([]);
    
    // Set cursor position after the inserted text
    setTimeout(() => {
      const newCursorPos = cursorPosition - currentQuery.length - 1 + insertText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showDropdown || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        if (suggestions[selectedIndex]) {
          handleSuggestionSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSuggestions([]);
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowDropdown(false);
    };

    if (showDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDropdown]);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`resize-none border-0 outline-none focus:ring-0 rounded-xl transition-all duration-200 ${className}`}
        maxLength={maxLength}
        rows={minRows}
        style={{
          minHeight: `${minRows * 1.5}rem`,
          maxHeight: `${maxRows * 1.5}rem`,
        }}
      />
      
      <AutocompleteDropdown
        suggestions={suggestions}
        type={currentType}
        onSelect={handleSuggestionSelect}
        position={dropdownPosition}
        selectedIndex={selectedIndex}
        isVisible={showDropdown}
      />
      
    </div>
  );
}

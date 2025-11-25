'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Search, ShieldCheck } from 'lucide-react';

interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
}

interface NewMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartChat: (userId: string) => void;
}

export function NewMessageModal({ isOpen, onClose, onStartChat }: NewMessageModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Search users
  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  const handleStartChat = (userId: string) => {
    onStartChat(userId);
    onClose();
    setSearchQuery('');
    setSearchResults([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md mx-4 bg-slate-950 rounded-3xl border border-slate-800/70 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800/70">
          <h2 className="text-lg font-semibold text-white">New message</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-800/70">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search people"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900/70 border border-slate-800/70 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {isSearching ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-1 p-2">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleStartChat(user.id)}
                  className="w-full flex items-center space-x-3 p-3 rounded-2xl hover:bg-slate-800/50 transition-colors text-left"
                >
                  <div className="relative">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.display_name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                        {user.display_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {user.is_verified && (
                      <ShieldCheck className="absolute -bottom-1 -right-1 h-3 w-3 text-blue-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{user.display_name}</p>
                    <p className="text-sm text-slate-400 truncate">@{user.username}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : searchQuery.length >= 2 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Search className="h-8 w-8 text-slate-600 mb-2" />
              <p className="text-slate-400">No users found</p>
              <p className="text-sm text-slate-500">Try searching for a different name</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Search className="h-8 w-8 text-slate-600 mb-2" />
              <p className="text-slate-400">Search for people</p>
              <p className="text-sm text-slate-500">Start typing to find someone to message</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

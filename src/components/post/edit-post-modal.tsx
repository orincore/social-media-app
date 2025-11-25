'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: {
    id: string;
    content: string;
    user: {
      display_name: string;
      username: string;
      avatar_url: string | null;
    };
  };
  onPostUpdated: (updatedPost: any) => void;
}

export function EditPostModal({ isOpen, onClose, post, onPostUpdated }: EditPostModalProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && post) {
      setContent(post.content);
      setError('');
    }
  }, [isOpen, post]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setError('Content is required');
      return;
    }

    if (content.length > 280) {
      setError('Content must be less than 280 characters');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/posts/${post.id}/edit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        onPostUpdated(data.post);
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update post');
      }
    } catch (error) {
      console.error('Error updating post:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-background rounded-2xl shadow-xl border border-border max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              disabled={isSubmitting}
              className="h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold text-foreground">Edit post</h2>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !content.trim() || content === post.content}
            className="bg-blue-500 text-white hover:bg-blue-600 font-semibold px-6 rounded-full"
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex space-x-3">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <img
                src={post.user.avatar_url || 'https://lh3.googleusercontent.com/a/ACg8ocIuWzWw1B56vwCXPzDzuzTzOvgyuH1i6yfFf5JCUFYQVH4u7qQK8A=s96-c'}
                alt={post.user.display_name}
                className="h-10 w-10 rounded-full object-cover"
              />
            </div>

            {/* Form */}
            <div className="flex-1 min-w-0">
              <div className="mb-2">
                <span className="font-semibold text-foreground">{post.user.display_name}</span>
                <span className="text-muted-foreground ml-1">@{post.user.username}</span>
              </div>

              <form onSubmit={handleSubmit}>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What's happening?"
                  className="w-full min-h-[120px] p-3 text-lg bg-transparent text-foreground placeholder-muted-foreground border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={280}
                  disabled={isSubmitting}
                  autoFocus
                />

                {/* Character count */}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center space-x-2">
                    {error && (
                      <span className="text-red-500 text-sm">{error}</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm ${
                      content.length > 260 
                        ? content.length > 280 
                          ? 'text-red-500' 
                          : 'text-yellow-500'
                        : 'text-muted-foreground'
                    }`}>
                      {content.length}/280
                    </span>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

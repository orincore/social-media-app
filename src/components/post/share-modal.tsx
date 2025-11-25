'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Copy, Check, Twitter, Facebook, Linkedin, Mail, Link2 } from 'lucide-react';

interface ShareModalProps {
  postId: string;
  postContent: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareModal({ postId, postContent, isOpen, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const postUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/post/${postId}` 
    : `/post/${postId}`;

  const shareText = postContent.length > 100 
    ? postContent.substring(0, 100) + '...' 
    : postContent;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareOptions = [
    {
      name: 'Copy link',
      icon: copied ? Check : Copy,
      onClick: handleCopyLink,
      className: copied ? 'text-green-500' : '',
    },
    {
      name: 'Share to Twitter/X',
      icon: Twitter,
      onClick: () => {
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(postUrl)}`;
        window.open(url, '_blank', 'width=550,height=420');
      },
    },
    {
      name: 'Share to Facebook',
      icon: Facebook,
      onClick: () => {
        const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`;
        window.open(url, '_blank', 'width=550,height=420');
      },
    },
    {
      name: 'Share to LinkedIn',
      icon: Linkedin,
      onClick: () => {
        const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`;
        window.open(url, '_blank', 'width=550,height=420');
      },
    },
    {
      name: 'Share via Email',
      icon: Mail,
      onClick: () => {
        const subject = 'Check out this post';
        const body = `${shareText}\n\n${postUrl}`;
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      },
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-background border border-border rounded-2xl w-full max-w-sm shadow-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Share post</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Share Options */}
        <div className="p-2">
          {shareOptions.map((option) => (
            <button
              key={option.name}
              onClick={option.onClick}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-accent transition-colors ${option.className || ''}`}
            >
              <option.icon className="h-5 w-5" />
              <span className="text-foreground font-medium">{option.name}</span>
            </button>
          ))}
        </div>

        {/* Link Preview */}
        <div className="px-4 pb-4">
          <div className="flex items-center space-x-2 bg-accent rounded-xl px-4 py-3">
            <Link2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-muted-foreground truncate">{postUrl}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

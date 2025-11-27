'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ActivityStatus } from './activity-status';
import { useTypingActivity } from '@/hooks/use-typing-activity';
import { useMediaUpload } from '@/hooks/use-media-upload';
import {
  ShieldCheck,
  MoreHorizontal,
  Image as ImageIcon,
  SendHorizontal,
  ArrowLeft,
  Flag,
} from 'lucide-react';
import { ReportModal } from '@/components/report/report-modal';

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

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  media_urls?: string[] | null;
  is_read: boolean;
  created_at: string;
  sender: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
}

interface ChatWindowProps {
  chat: Chat;
  messages: Message[];
  currentUserId: string;
  onSendMessage: (message: string, mediaUrls?: string[]) => void;
  onBack: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

export function ChatWindow({ chat, messages, currentUserId, onSendMessage, onBack, onLoadMore, hasMore, isLoadingMore }: ChatWindowProps) {
  const [draft, setDraft] = useState('');
  const { userActivities } = useTypingActivity();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [reportingMessageId, setReportingMessageId] = useState<string | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showProfileReportModal, setShowProfileReportModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadedMedia, isUploading, uploadProgress, uploadMedia, removeMedia, clearMedia, markAsPosted } = useMediaUpload();
  const [overlayMediaUrl, setOverlayMediaUrl] = useState<string | null>(null);
  const [overlayIsVideo, setOverlayIsVideo] = useState(false);

  const handleSend = () => {
    const trimmed = draft.trim();
    const mediaUrls = uploadedMedia.map((m) => m.url);
    if (!trimmed && mediaUrls.length === 0) return;

    onSendMessage(trimmed, mediaUrls.length > 0 ? mediaUrls : undefined);
    setDraft('');
    if (mediaUrls.length > 0) {
      markAsPosted();
      clearMedia();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Scroll to bottom when component mounts
  useEffect(() => {
    scrollToBottom();
  }, []);

  const handleMediaButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      await uploadMedia(files);
    } catch (error) {
      console.error('Chat media upload error:', error);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const openMediaOverlay = (url: string) => {
    const isVideo = /\.(mp4|webm|mov)$/i.test((url.split('?')[0] || ''));
    setOverlayIsVideo(isVideo);
    setOverlayMediaUrl(url);
  };

  const closeMediaOverlay = () => {
    setOverlayMediaUrl(null);
    setOverlayIsVideo(false);
  };

  const handleDownloadMedia = () => {
    if (!overlayMediaUrl) return;

    try {
      const link = document.createElement('a');
      link.href = overlayMediaUrl;

      const urlPath = (overlayMediaUrl.split('?')[0] || '').split('/');
      const fallbackName = 'media';
      const lastSegment = urlPath[urlPath.length - 1] || fallbackName;
      link.download = lastSegment || fallbackName;
      link.rel = 'noopener noreferrer';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download media', error);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background lg:relative lg:inset-auto lg:h-full lg:rounded-3xl lg:border lg:border-border lg:bg-background/60 lg:backdrop-blur">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4 lg:p-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-9 w-9 rounded-full border border-border text-muted-foreground hover:border-accent hover:text-foreground lg:h-10 lg:w-10"
        >
          <ArrowLeft className="h-4 w-4 lg:h-5 lg:w-5" />
        </Button>
        
        <div className="flex items-center space-x-3 flex-1 ml-4">
          <div className="relative">
            {chat.other_user.avatar_url ? (
              <img
                src={chat.other_user.avatar_url}
                alt={chat.other_user.display_name}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                {chat.other_user.display_name.charAt(0).toUpperCase()}
              </div>
            )}
            {chat.other_user.is_verified && (
              <ShieldCheck className="absolute -bottom-1 -right-1 h-3 w-3 text-blue-400" />
            )}
          </div>
          <div>
            <h2 className="font-semibold text-foreground">{chat.other_user.display_name}</h2>
            <div className="flex items-center space-x-2">
              <p className="text-sm text-muted-foreground">@{chat.other_user.username}</p>
              <ActivityStatus 
                isOnline={userActivities[chat.other_user.id]?.isOnline || false}
                lastSeen={userActivities[chat.other_user.id]?.lastSeen}
              />
            </div>
          </div>
        </div>

        <div className="relative flex items-center gap-1 lg:gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full border border-border hover:border-accent lg:h-10 lg:w-10"
            onClick={() => setShowHeaderMenu((prev) => !prev)}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          {showHeaderMenu && (
            <div className="absolute right-0 top-10 z-50 min-w-[180px] rounded-xl border border-border bg-background shadow-lg py-1">
              <button
                className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-accent/60"
                onClick={() => {
                  setShowHeaderMenu(false);
                  window.location.href = `/${chat.other_user.username}`;
                }}
              >
                View profile
              </button>
              <button
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10"
                onClick={() => {
                  setShowHeaderMenu(false);
                  setShowProfileReportModal(true);
                }}
              >
                <Flag className="h-4 w-4" />
                Report profile
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto">
        <div className="space-y-4 p-4">
          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center pb-4">
              <button
                onClick={onLoadMore}
                disabled={isLoadingMore}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                {isLoadingMore ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span>Loading...</span>
                  </div>
                ) : (
                  'Load older messages'
                )}
              </button>
            </div>
          )}
          
          {messages.map((message) => {
            const isFromMe = message.sender_id === currentUserId;
            const isHovered = hoveredMessageId === message.id;
            return (
              <div
                key={message.id}
                className={`flex items-end gap-1 ${
                  isFromMe ? 'justify-end' : 'justify-start'
                }`}
                onMouseEnter={() => setHoveredMessageId(message.id)}
                onMouseLeave={() => setHoveredMessageId(null)}
              >
                {/* Report button for received messages */}
                {!isFromMe && isHovered && (
                  <button
                    onClick={() => setReportingMessageId(message.id)}
                    className="p-1.5 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors opacity-0 animate-fade-in"
                    style={{ opacity: isHovered ? 1 : 0 }}
                    title="Report message"
                  >
                    <Flag className="h-3.5 w-3.5" />
                  </button>
                )}
                <div
                  className={`max-w-xs rounded-2xl px-4 py-2 ${
                    isFromMe
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                      : 'bg-card text-card-foreground border border-border shadow-sm'
                  }`}
                >
                  {/* Render media if present */}
                  {message.media_urls && message.media_urls.length > 0 && (
                    <div className={`flex flex-wrap gap-1 ${message.content?.trim() ? 'mb-2' : ''}`}>
                      {message.media_urls.map((url, idx) => {
                        const isVideo = /\.(mp4|webm|mov)$/i.test((url.split('?')[0] || ''));
                        return isVideo ? (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => openMediaOverlay(url)}
                            className="overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/70"
                          >
                            <video
                              src={url}
                              className="max-w-full max-h-48 object-cover"
                              muted
                            />
                          </button>
                        ) : (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => openMediaOverlay(url)}
                            className="overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/70"
                          >
                            <img
                              src={url}
                              alt="Media"
                              className="max-w-full max-h-48 object-cover"
                            />
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {/* Render text content if present */}
                  {message.content?.trim() && (
                    <p className="text-sm">{message.content}</p>
                  )}
                  <p
                    className={`mt-1 text-xs ${
                      isFromMe ? 'text-white/70' : 'text-muted-foreground'
                    }`}
                  >
                    {formatTime(message.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
          
          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Report Modal */}
      {reportingMessageId && (
        <ReportModal
          isOpen={!!reportingMessageId}
          onClose={() => setReportingMessageId(null)}
          targetType="message"
          targetId={reportingMessageId}
        />
      )}

      {/* Report Profile Modal */}
      <ReportModal
        isOpen={showProfileReportModal}
        onClose={() => setShowProfileReportModal(false)}
        targetType="profile"
        targetId={chat.other_user.id}
        targetName={chat.other_user.username}
      />

      {/* Input */}
      <div className="border-t border-border p-4">
        <div className="rounded-2xl border border-border bg-muted/50 p-3">
          {/* Hidden file input for chat media */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Media preview */}
          {uploadedMedia.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {uploadedMedia.map((media) => (
                <div
                  key={media.id}
                  className="relative w-20 h-20 rounded-lg overflow-hidden border border-border bg-black/40"
                >
                  <button
                    type="button"
                    className="block h-full w-full"
                    onClick={() => openMediaOverlay(media.url)}
                  >
                    {media.type === 'image' ? (
                      <img src={media.url} alt="Attachment" className="h-full w-full object-cover" />
                    ) : (
                      <video src={media.url} className="h-full w-full object-cover" muted />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeMedia(media.id)}
                    className="absolute top-1 right-1 rounded-full bg-black/60 px-1 text-[10px] text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Write a message..."
            className="h-12 w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none lg:h-16"
            maxLength={1000}
            rows={2}
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1 text-muted-foreground lg:gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full hover:bg-accent lg:h-8 lg:w-8"
                onClick={handleMediaButtonClick}
                disabled={isUploading}
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
              {isUploading && (
                <span className="text-xs text-muted-foreground">
                  Uploading {Math.round(uploadProgress)}%
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 lg:gap-3">
              <span className="text-xs text-muted-foreground">{1000 - draft.length}</span>
              <Button
                onClick={handleSend}
                disabled={(!draft.trim() && uploadedMedia.length === 0) || isUploading}
                className="h-8 rounded-full bg-primary text-primary-foreground px-3.5 text-sm font-semibold shadow-lg disabled:cursor-not-allowed disabled:opacity-50 lg:h-9 lg:px-5"
              >
                <SendHorizontal className="mr-1 h-4 w-4 lg:mr-2" />
                <span className="hidden sm:inline">Send</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
      {overlayMediaUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6">
          <button
            type="button"
            onClick={closeMediaOverlay}
            className="absolute right-4 top-4 rounded-full bg-black/70 px-3 py-1 text-sm text-white shadow-lg hover:bg-black"
          >
            Close
          </button>
          <div className="flex max-h-[90vh] max-w-3xl flex-col gap-4">
            <div className="flex justify-between gap-2">
              <span className="text-sm text-white/70">Media preview</span>
              <button
                type="button"
                onClick={handleDownloadMedia}
                className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black shadow-md hover:bg-white/90"
              >
                Download
              </button>
            </div>
            <div className="flex items-center justify-center overflow-hidden rounded-2xl bg-black/60 p-2">
              {overlayIsVideo ? (
                <video
                  src={overlayMediaUrl}
                  controls
                  className="max-h-[80vh] max-w-full rounded-xl"
                />
              ) : (
                <img
                  src={overlayMediaUrl}
                  alt="Media preview"
                  className="max-h-[80vh] max-w-full rounded-xl object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

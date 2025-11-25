'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface MediaDisplayProps {
  mediaUrls: string[];
  className?: string;
}

export function MediaDisplay({ mediaUrls, className = '' }: MediaDisplayProps) {
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [mutedVideos, setMutedVideos] = useState<Set<string>>(new Set());

  if (!mediaUrls || mediaUrls.length === 0) {
    return null;
  }

  const getMediaType = (url: string): 'image' | 'video' => {
    const extension = url.split('.').pop()?.toLowerCase();
    const videoExtensions = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
    return videoExtensions.includes(extension || '') ? 'video' : 'image';
  };

  const toggleVideoPlay = (url: string, videoElement: HTMLVideoElement) => {
    if (playingVideo === url) {
      videoElement.pause();
      setPlayingVideo(null);
    } else {
      videoElement.play();
      setPlayingVideo(url);
    }
  };

  const toggleVideoMute = (url: string, videoElement: HTMLVideoElement) => {
    const newMutedVideos = new Set(mutedVideos);
    if (mutedVideos.has(url)) {
      newMutedVideos.delete(url);
      videoElement.muted = false;
    } else {
      newMutedVideos.add(url);
      videoElement.muted = true;
    }
    setMutedVideos(newMutedVideos);
  };

  const renderSingleMedia = (url: string, index: number, isGrid: boolean = false) => {
    const mediaType = getMediaType(url);
    const isPlaying = playingVideo === url;
    const isMuted = mutedVideos.has(url);

    // Use different sizing for grid vs single media
    // Use object-contain to preserve original aspect ratio while constraining max height
    // Grid items fill the column width, single media uses intrinsic width and is centered
    const mediaClasses = isGrid 
      ? "w-full h-auto max-h-64 object-contain rounded-lg border border-gray-200 dark:border-gray-700 bg-black/5 dark:bg-white/5"
      : "w-auto max-w-full h-auto max-h-80 object-contain rounded-2xl border border-gray-200 dark:border-gray-700 bg-black/5 dark:bg-white/5";

    if (mediaType === 'video') {
      const videoRef = useRef<HTMLVideoElement>(null);

      useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        // Initialize video as muted for autoplay
        setMutedVideos(prev => new Set(prev).add(url));

        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                // Pause all other videos so only one plays at a time
                const allVideos = document.querySelectorAll('video');
                allVideos.forEach((v) => {
                  if (v !== video) v.pause();
                });

                // Auto play when video comes into view
                video.muted = true; // Ensure muted for autoplay
                video.play().then(() => {
                  setPlayingVideo(url);
                }).catch(() => {
                  // Autoplay failed, that's okay
                });
              } else {
                // Pause when video goes out of view
                video.pause();
                setPlayingVideo(null);
              }
            });
          },
          { threshold: 0.5 } // Play when 50% visible
        );

        observer.observe(video);
        return () => observer.disconnect();
      }, [url]);

      const handleHoverPlay = () => {
        const video = videoRef.current;
        if (!video) return;

        // Pause all other videos so only one plays at a time
        const allVideos = document.querySelectorAll('video');
        allVideos.forEach((v) => {
          if (v !== video) v.pause();
        });

        video.muted = true;
        video.play().then(() => {
          setPlayingVideo(url);
        }).catch(() => {
          // Ignore autoplay errors on hover
        });
      };

      return (
        <div
          key={url}
          className="relative group inline-block"
          onMouseEnter={handleHoverPlay}
        >
          <video
            ref={videoRef}
            className={mediaClasses}
            muted={true} // Start muted for autoplay
            loop
            playsInline
            preload="metadata"
            onClick={(e) => {
              e.stopPropagation();
              toggleVideoPlay(url, e.currentTarget);
            }}
          >
            <source src={url} type="video/mp4" />
            <source src={url} type="video/webm" />
            Your browser does not support the video tag.
          </video>
          
          {/* Video Controls Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="bg-black bg-opacity-50 rounded-full p-3 pointer-events-auto">
              {isPlaying ? (
                <Pause className="w-8 h-8 text-white" />
              ) : (
                <Play className="w-8 h-8 text-white" />
              )}
            </div>
          </div>

          {/* Mute/Unmute Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (videoRef.current) toggleVideoMute(url, videoRef.current);
            }}
            className="absolute bottom-2 right-2 bg-black bg-opacity-50 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {mutedVideos.has(url) ? (
              <VolumeX className="w-4 h-4 text-white" />
            ) : (
              <Volume2 className="w-4 h-4 text-white" />
            )}
          </button>
        </div>
      );
    }

    return (
      <div key={url} className="inline-block">
        <img
          src={url}
          alt={`Media ${index + 1}`}
          className={mediaClasses}
          loading="lazy"
        />
      </div>
    );
  };

  const renderMediaGrid = () => {
    if (mediaUrls.length === 1) {
      return (
        <div className="mb-3">
          {renderSingleMedia(mediaUrls[0], 0)}
        </div>
      );
    }

    if (mediaUrls.length === 2) {
      return (
        <div className="mb-3 grid grid-cols-2 gap-2">
          {mediaUrls.map((url, index) => renderSingleMedia(url, index, true))}
        </div>
      );
    }

    if (mediaUrls.length === 3) {
      return (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div className="row-span-2">
            {renderSingleMedia(mediaUrls[0], 0, true)}
          </div>
          <div className="space-y-2">
            {renderSingleMedia(mediaUrls[1], 1, true)}
            {renderSingleMedia(mediaUrls[2], 2, true)}
          </div>
        </div>
      );
    }

    if (mediaUrls.length === 4) {
      return (
        <div className="mb-3 grid grid-cols-2 gap-2">
          {mediaUrls.map((url, index) => renderSingleMedia(url, index, true))}
        </div>
      );
    }

    // More than 4 media files - show first 3 and a "+X more" indicator
    return (
      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="row-span-2">
          {renderSingleMedia(mediaUrls[0], 0, true)}
        </div>
        <div className="space-y-2">
          {renderSingleMedia(mediaUrls[1], 1, true)}
          <div className="relative">
            {renderSingleMedia(mediaUrls[2], 2, true)}
            {mediaUrls.length > 3 && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg font-semibold">
                  +{mediaUrls.length - 3} more
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return <div className={className}>{renderMediaGrid()}</div>;
}

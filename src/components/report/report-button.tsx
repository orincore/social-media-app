'use client';

import { useState } from 'react';
import { Flag, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReportModal } from './report-modal';

type TargetType = 'message' | 'profile' | 'post';

interface ReportButtonProps {
  targetType: TargetType;
  targetId: string;
  targetName?: string;
  variant?: 'icon' | 'menu-item' | 'text';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ReportButton({
  targetType,
  targetId,
  targetName,
  variant = 'icon',
  size = 'md',
  className = '',
}: ReportButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  if (variant === 'menu-item') {
    return (
      <>
        <button
          onClick={(e) => {
            // Prevent parent click handlers (like card navigation) from firing
            e.preventDefault();
            e.stopPropagation();
            setIsModalOpen(true);
          }}
          className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors ${className}`}
        >
          <Flag className="h-4 w-4" />
          Report {targetType === 'profile' ? 'Profile' : targetType === 'message' ? 'Message' : 'Post'}
        </button>
        <ReportModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          targetType={targetType}
          targetId={targetId}
          targetName={targetName}
        />
      </>
    );
  }

  if (variant === 'text') {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className={`flex items-center gap-1.5 text-sm text-muted-foreground hover:text-red-500 transition-colors ${className}`}
        >
          <Flag className={iconSizes[size]} />
          <span>Report</span>
        </button>
        <ReportModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          targetType={targetType}
          targetId={targetId}
          targetName={targetName}
        />
      </>
    );
  }

  // Default: icon variant
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsModalOpen(true)}
        className={`${sizeClasses[size]} rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10 ${className}`}
        title={`Report ${targetType}`}
      >
        <Flag className={iconSizes[size]} />
      </Button>
      <ReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        targetType={targetType}
        targetId={targetId}
        targetName={targetName}
      />
    </>
  );
}

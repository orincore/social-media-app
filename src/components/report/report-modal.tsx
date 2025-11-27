'use client';

import { useState } from 'react';
import { X, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

type TargetType = 'message' | 'profile' | 'post';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: TargetType;
  targetId: string;
  targetName?: string;
}

const REPORT_REASONS = [
  { code: 'spam', label: 'Spam', description: 'Unwanted commercial content or repetitive posts' },
  { code: 'harassment', label: 'Harassment', description: 'Bullying, threats, or targeted attacks' },
  { code: 'hate_speech', label: 'Hate Speech', description: 'Discrimination based on race, religion, gender, etc.' },
  { code: 'violence', label: 'Violence', description: 'Threats of violence or graphic content' },
  { code: 'nudity', label: 'Nudity or Sexual Content', description: 'Inappropriate sexual content' },
  { code: 'misinformation', label: 'Misinformation', description: 'False or misleading information' },
  { code: 'impersonation', label: 'Impersonation', description: 'Pretending to be someone else' },
  { code: 'copyright', label: 'Copyright Violation', description: 'Using copyrighted content without permission' },
  { code: 'other', label: 'Other', description: 'Something else not listed above' },
] as const;

type ReasonCode = typeof REPORT_REASONS[number]['code'];

export function ReportModal({ isOpen, onClose, targetType, targetId, targetName }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<ReasonCode | null>(null);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedReason) {
      setError('Please select a reason for your report');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId,
          reason_code: selectedReason,
          reason_text: additionalInfo.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit report');
      }

      setIsSuccess(true);
      
      // Close modal after showing success message
      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason(null);
    setAdditionalInfo('');
    setIsSuccess(false);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const getTargetLabel = () => {
    switch (targetType) {
      case 'message':
        return 'message';
      case 'profile':
        return targetName ? `@${targetName}'s profile` : 'this profile';
      case 'post':
        return 'post';
      default:
        return 'content';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-background rounded-2xl border border-border shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h2 className="text-lg font-semibold text-foreground">Report {getTargetLabel()}</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Report Submitted</h3>
              <p className="text-sm text-muted-foreground">
                Thank you for helping keep our community safe. We&apos;ll review your report and take appropriate action.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Why are you reporting this {targetType}? Your report is anonymous.
              </p>

              {/* Reason Selection */}
              <div className="space-y-2 mb-4">
                {REPORT_REASONS.map((reason) => (
                  <button
                    key={reason.code}
                    onClick={() => {
                      setSelectedReason(reason.code);
                      setError(null);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selectedReason === reason.code
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-border hover:border-border/80 hover:bg-accent/50'
                    }`}
                  >
                    <p className={`font-medium text-sm ${
                      selectedReason === reason.code ? 'text-blue-500' : 'text-foreground'
                    }`}>
                      {reason.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {reason.description}
                    </p>
                  </button>
                ))}
              </div>

              {/* Additional Info */}
              {selectedReason && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Additional information (optional)
                  </label>
                  <textarea
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                    placeholder="Provide any additional context that might help us understand the issue..."
                    className="w-full h-24 px-3 py-2 text-sm bg-background border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-right">
                    {additionalInfo.length}/500
                  </p>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!isSuccess && (
          <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedReason || isSubmitting}
              className="rounded-full bg-red-500 hover:bg-red-600 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Report'
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

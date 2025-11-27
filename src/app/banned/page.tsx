'use client';

import { useSession, signOut } from 'next-auth/react';
import { Shield, LogOut } from 'lucide-react';

export default function BannedPage() {
  const { data: session } = useSession();
  
  // Get ban info from session
  const banReason = (session?.user as any)?.ban_reason || 'Your account has been suspended for violating our Terms and Conditions.';
  const banExpiresAt = (session?.user as any)?.ban_expires_at;
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
      <div className="max-w-md text-center border border-border rounded-2xl px-6 py-8 bg-card shadow-lg">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
          <Shield className="w-8 h-8 text-red-500" />
        </div>
        
        <h1 className="text-2xl font-bold mb-3 text-red-500">Account Suspended</h1>
        
        <p className="text-sm text-text-secondary mb-4">
          {banReason}
        </p>
        
        {banExpiresAt && (
          <div className="bg-muted/50 rounded-lg p-3 mb-4">
            <p className="text-xs text-text-tertiary">
              Your suspension will be lifted on:
            </p>
            <p className="text-sm font-medium text-text-primary mt-1">
              {formatDate(banExpiresAt)}
            </p>
          </div>
        )}
        
        {!banExpiresAt && (
          <div className="bg-red-500/10 rounded-lg p-3 mb-4">
            <p className="text-xs text-red-400">
              This is a permanent suspension.
            </p>
          </div>
        )}
        
        <p className="text-xs text-text-tertiary mb-6">
          If you believe this is a mistake, please contact our support team for assistance.
        </p>
        
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="inline-flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-full text-sm font-medium text-text-primary transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

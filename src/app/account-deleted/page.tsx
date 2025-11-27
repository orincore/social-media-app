'use client';

import { useSession, signOut } from 'next-auth/react';
import { Trash2, LogOut, Mail } from 'lucide-react';

export default function AccountDeletedPage() {
  const { data: session } = useSession();
  
  // Get deletion info from session
  const deletedReason = (session?.user as any)?.deleted_reason || 'Your account was deleted due to violation of our Terms and Conditions.';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
      <div className="max-w-md text-center border border-border rounded-2xl px-6 py-8 bg-card shadow-lg">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
          <Trash2 className="w-8 h-8 text-red-500" />
        </div>
        
        <h1 className="text-2xl font-bold mb-3 text-red-500">Account Deleted</h1>
        
        <p className="text-sm text-text-secondary mb-4">
          {deletedReason}
        </p>
        
        <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left">
          <h3 className="text-sm font-semibold text-text-primary mb-2">
            Want to restore your account?
          </h3>
          <p className="text-xs text-text-tertiary mb-3">
            If you believe this was a mistake or would like to appeal this decision, 
            please contact our support team. Account restoration is reviewed on a case-by-case basis.
          </p>
          <a
            href="mailto:support@socialpulse.app?subject=Account%20Restoration%20Request"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-full text-sm font-medium text-white transition-colors"
          >
            <Mail className="w-4 h-4" />
            Contact Support
          </a>
        </div>
        
        <p className="text-xs text-text-tertiary mb-4">
          Please include your email address and any relevant information in your request.
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

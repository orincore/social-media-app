'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';

export default function ProfileRedirect() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      redirect('/auth/signin');
      return;
    }

    // Redirect to username-based profile
    const username = (session as any)?.user?.username;
    if (username) {
      redirect(`/${username}`);
    } else {
      // Fallback if no username
      redirect('/home');
    }
  }, [session, status]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="h-9 w-9 animate-spin rounded-full border-b-2 border-blue-500" />
    </div>
  );
}

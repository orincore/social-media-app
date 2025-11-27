'use client';

import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface BanCheckProviderProps {
  children: React.ReactNode;
}

/**
 * Provider that checks if the current user is banned or deleted and redirects them
 * to the appropriate page. This runs on every route change.
 */
export function BanCheckProvider({ children }: BanCheckProviderProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Don't check if session is loading
    if (status === 'loading') return;

    // Don't redirect if already on restriction pages or auth pages
    const restrictionPages = ['/banned', '/account-deleted', '/auth', '/'];
    if (restrictionPages.some(page => pathname === page || pathname.startsWith(page + '/'))) {
      return;
    }

    const user = session?.user as any;
    
    // Check if user account is deleted
    if (user?.deleted === true) {
      router.replace('/account-deleted');
      return;
    }

    // Check if user is banned
    if (user?.banned === true) {
      router.replace('/banned');
      return;
    }
  }, [session, status, pathname, router]);

  return <>{children}</>;
}

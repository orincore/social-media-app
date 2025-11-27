'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Users, 
  Flag, 
  FileText, 
  Settings, 
  LogOut,
  Menu,
  X,
  Shield,
  Bell,
  ChevronDown,
  MoreHorizontal
} from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  role: {
    id: string;
    name: string;
    display_name: string;
    permissions: Record<string, Record<string, boolean>>;
  };
}

interface AdminSession {
  authenticated: boolean;
  admin?: AdminUser;
  role?: AdminUser['role'];
}

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Reports', href: '/admin/reports', icon: Flag },
  { name: 'Audit Logs', href: '/admin/audit-logs', icon: FileText },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/admin/auth/session');
        const data = await response.json();
        
        if (data.authenticated) {
          setSession(data);
        } else {
          if (pathname !== '/admin/login') {
            router.push('/admin/login');
          }
        }
      } catch (error) {
        console.error('Session check failed:', error);
        if (pathname !== '/admin/login') {
          router.push('/admin/login');
        }
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [pathname, router]);

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
      setSession(null);
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [router]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Not authenticated
  if (!session?.authenticated) {
    return null;
  }

  const hasPermission = (resource: string, action: string) => {
    return session?.role?.permissions?.[resource]?.[action] === true;
  };

  return (
    <div className="min-h-screen bg-background text-foreground" data-theme="dark">
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border shadow-soft">
        <div className="flex items-center justify-between px-3 py-2.5">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-foreground hover:bg-accent rounded-lg"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
          
          <div className="flex items-center space-x-2">
            <Shield className="w-6 h-6 text-blue-500" />
            <span className="font-bold text-foreground">Admin</span>
          </div>

          <button className="relative p-2 text-foreground hover:bg-accent rounded-lg">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
              3
            </span>
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <div className={`
        fixed left-0 top-0 bottom-0 z-40 w-64 sm:w-72 lg:w-64 bg-background/95 backdrop-blur-md border-r border-border transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center px-5 py-5 lg:py-5">
            <Link href="/admin" className="flex items-center space-x-2.5">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-background" />
              </div>
              <span className="text-lg font-bold text-text-primary">Admin Panel</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-1.5 space-y-0.5">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === '/admin' 
                ? pathname === '/admin'
                : pathname.startsWith(item.href);
              
              let hasAccess = true;
              if (item.href === '/admin/users') hasAccess = hasPermission('users', 'view');
              if (item.href === '/admin/reports') hasAccess = hasPermission('reports', 'view');
              if (item.href === '/admin/audit-logs') hasAccess = hasPermission('audit_logs', 'view');
              if (item.href === '/admin/settings') hasAccess = hasPermission('settings', 'view');

              if (!hasAccess) return null;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    group flex items-center px-3 py-3 text-xl rounded-full transition-all duration-200
                    ${isActive
                      ? 'font-bold text-foreground'
                      : 'font-normal text-foreground hover:bg-accent'
                    }
                  `}
                >
                  <div className="flex items-center">
                    <Icon className={`mr-4 h-6 w-6 ${isActive ? 'text-blue-500' : 'text-foreground'}`} />
                    <span className="block">{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="border-t border-border p-4">
            <div className="flex items-center space-x-3 p-3 rounded-2xl hover:bg-accent transition-all duration-200 cursor-pointer group shadow-soft hover:shadow-medium">
              <span className="relative flex shrink-0 overflow-hidden rounded-full h-12 w-12 border-2 border-border shadow-soft">
                {session.admin?.avatar_url ? (
                  <img
                    className="aspect-square h-full w-full"
                    src={session.admin.avatar_url}
                    alt={session.admin?.display_name || 'Admin avatar'}
                  />
                ) : (
                  <div className="w-full h-full bg-blue-500 flex items-center justify-center">
                    <span className="text-white font-medium">
                      {session.admin?.display_name?.charAt(0) || 'A'}
                    </span>
                  </div>
                )}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">
                  {session.admin?.display_name || 'Admin'}
                </p>
                <p className="text-xs text-text-secondary truncate">
                  {session.role?.display_name || 'Administrator'}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-10 w-10 opacity-0 group-hover:opacity-100 transition-all duration-200 text-muted-foreground hover:text-accent-foreground hover:bg-accent"
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-3 space-y-1">
              <Link
                href="/admin/settings"
                className="flex items-center w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-all duration-200"
              >
                <Settings className="mr-3 h-4 w-4" />
                Settings
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all duration-200"
              >
                <LogOut className="mr-3 h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="lg:ml-64">
        <main className="min-h-screen pt-14 lg:pt-0 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

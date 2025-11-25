'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNotifications } from '@/hooks/use-notifications';
import { NotificationBadge } from '@/components/ui/notification-badge';
import { NotificationToast } from '@/components/ui/notification-toast';
import { 
  Home, 
  Search, 
  Bell, 
  Mail, 
  User, 
  Settings, 
  LogOut,
  Menu,
  X,
  Bookmark,
  Users,
  Zap,
  MoreHorizontal
} from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [previousUnreadCount, setPreviousUnreadCount] = useState(0);
  const { unreadCount, unreadMessageCount, refreshNotifications } = useNotifications();

  // Show toast when unread count increases
  useEffect(() => {
    if (unreadCount > previousUnreadCount && previousUnreadCount > 0) {
      setToastMessage(`You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`);
      setShowToast(true);
    }
    setPreviousUnreadCount(unreadCount);
  }, [unreadCount, previousUnreadCount]);

  const navigation = [
    { name: 'Home', href: '/home', icon: Home, badge: null },
    { name: 'Explore', href: '/explore', icon: Search, badge: null },
    { name: 'Notifications', href: '/notifications', icon: Bell, badge: unreadCount > 0 ? unreadCount : null },
    { name: 'Messages', href: '/messages', icon: Mail, badge: unreadMessageCount > 0 ? unreadMessageCount : null },
    { name: 'Bookmarks', href: '/bookmarks', icon: Bookmark, badge: null },
    { name: 'Communities', href: '/communities', icon: Users, badge: null },
  ];

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/signin' });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile Header - always visible, controls sidebar */}
      <div className="lg:hidden sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border shadow-soft">
        <div className="flex items-center justify-between px-3 py-2.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-foreground hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
          
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-foreground rounded-lg flex items-center justify-center">
              <X className="w-3.5 h-3.5 text-background" />
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="text-foreground hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Sidebar */}
      <div className={`
        fixed left-0 bottom-0 z-40 w-64 sm:w-72 lg:w-64 bg-background border-r border-border transform transition-transform duration-300 ease-in-out
        top-14
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:top-0 lg:bottom-0 lg:translate-x-0
      `}>
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center px-5 py-5 lg:py-5">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 bg-foreground rounded-full flex items-center justify-center">
                <X className="w-5 h-5 text-background" />
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-1.5 space-y-0.5">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isHomeItem = item.href === '/home';
              const isActive = isHomeItem
                ? (pathname === '/' || pathname.startsWith('/home'))
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    group flex items-center px-3 py-3 text-xl rounded-full transition-all duration-200
                    ${isActive
                      ? 'font-bold text-foreground'
                      : 'font-normal text-foreground hover:bg-gray-100 dark:hover:bg-gray-900'
                    }
                  `}
                >
                  <div className="flex items-center">
                    <div className="relative">
                      <Icon className={`mr-4 h-6 w-6 ${isActive ? 'text-foreground' : 'text-foreground'}`} />
                      {item.badge && <NotificationBadge count={item.badge} />}
                    </div>
                    <span className="block">{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Create Post Button */}
          <div className="px-4 py-4">
            <Link href="/create-post" onClick={() => setIsMobileMenuOpen(false)}>
              <Button className="w-full h-12 bg-blue-500 text-white font-bold rounded-full hover:bg-blue-600 transition-colors">
                Post
              </Button>
            </Link>
          </div>

          {/* User Profile */}
          <div className="border-t border-border p-4">
            <Link href={`/${(session as any)?.user?.username || 'profile'}`} className="block">
              <div className="flex items-center space-x-3 p-3 rounded-2xl hover:bg-accent transition-all duration-200 cursor-pointer group shadow-soft hover:shadow-medium">
                <span className="relative flex shrink-0 overflow-hidden rounded-full h-12 w-12 border-2 border-border shadow-soft">
                  <img
                    className="aspect-square h-full w-full"
                    src={session?.user?.image || 'https://lh3.googleusercontent.com/a/ACg8ocIuWzWw1B56vwCXPzDzuzTzOvgyuH1i6yfFf5JCUFYQVH4u7qQK8A=s96-c'}
                    alt={session?.user?.name || 'Profile avatar'}
                  />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {session?.user?.name || 'Adarsh Suradkar'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    @{(session as any)?.user?.username || 'adarsh'}
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 w-10 opacity-0 group-hover:opacity-100 transition-all duration-200 text-muted-foreground hover:text-accent-foreground hover:bg-accent"
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </Link>

            <div className="mt-3 space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-all duration-200"
                asChild
              >
                <Link href="/settings">
                  <Settings className="mr-3 h-4 w-4" />
                  Settings & Privacy
                </Link>
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl"
                onClick={handleSignOut}
              >
                <LogOut className="mr-3 h-4 w-4" />
                Sign out
              </Button>
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
        <main className="min-h-screen">
          {children}
        </main>
      </div>

      {/* Notification Toast */}
      <NotificationToast
        show={showToast}
        message={toastMessage}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
}

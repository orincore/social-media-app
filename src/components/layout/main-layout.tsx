'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/use-notifications';
import { NotificationBadge } from '@/components/ui/notification-badge';
import { NotificationToast } from '@/components/ui/notification-toast';
import { useTheme } from '@/hooks/use-theme';
import { 
  Home, 
  Search, 
  Bell, 
  Mail, 
  User, 
  Settings, 
  LogOut,
  Bookmark,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
  HelpCircle,
  Shield
} from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [previousUnreadCount, setPreviousUnreadCount] = useState(0);
  const [showSettingsSupport, setShowSettingsSupport] = useState(false);
  const [drawerFollowing, setDrawerFollowing] = useState<number | null>(null);
  const [drawerFollowers, setDrawerFollowers] = useState<number | null>(null);
  const { unreadCount, unreadMessageCount } = useNotifications();
  const { resolvedTheme, toggleTheme } = useTheme();

  // Show toast when unread count increases
  useEffect(() => {
    if (unreadCount > previousUnreadCount && previousUnreadCount > 0) {
      setToastMessage(`You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`);
      setShowToast(true);
    }
    setPreviousUnreadCount(unreadCount);
  }, [unreadCount, previousUnreadCount]);

  // Fetch following/followers for mobile drawer header
  useEffect(() => {
    const username = (session as any)?.user?.username;
    if (!username) return;
    fetch(`/api/users/${username}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.user) {
          setDrawerFollowing(d.user.following_count ?? null);
          setDrawerFollowers(d.user.followers_count ?? null);
        }
      })
      .catch(() => {});
  }, [(session as any)?.user?.username]);

  const navigation = [
    { name: 'Home', href: '/home', icon: Home, badge: null },
    { name: 'Explore', href: '/explore', icon: Search, badge: null },
    { name: 'Notifications', href: '/notifications', icon: Bell, badge: unreadCount > 0 ? unreadCount : null },
    { name: 'Messages', href: '/messages', icon: Mail, badge: unreadMessageCount > 0 ? unreadMessageCount : null },
    { name: 'Bookmarks', href: '/bookmarks', icon: Bookmark, badge: null },
    { name: 'Settings', href: '/settings', icon: Settings, badge: null },
  ];

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/signin' });
  };

  const drawerNavItems = [
    { name: 'Profile', href: `/${(session as any)?.user?.username || 'profile'}`, icon: User },
    { name: 'Home', href: '/home', icon: Home },
    { name: 'Explore', href: '/explore', icon: Search },
    { name: 'Notifications', href: '/notifications', icon: Bell, badge: unreadCount > 0 ? unreadCount : null },
    { name: 'Messages', href: '/messages', icon: Mail, badge: unreadMessageCount > 0 ? unreadMessageCount : null },
    { name: 'Bookmarks', href: '/bookmarks', icon: Bookmark },
  ];

  const settingsSupportItems = [
    { name: 'Settings & Privacy', href: '/settings', icon: Settings },
    { name: 'Help Center', href: '/help', icon: HelpCircle },
    { name: 'Safety', href: '/safety', icon: Shield },
    { name: 'Sign out', href: '#', icon: LogOut, onClick: handleSignOut, danger: true },
  ];

  const username = (session as any)?.user?.username;
  const displayName = session?.user?.name || 'User';
  const avatarUrl = session?.user?.image || 'https://lh3.googleusercontent.com/a/ACg8ocIuWzWw1B56vwCXPzDzuzTzOvgyuH1i6yfFf5JCUFYQVH4u7qQK8A=s96-c';

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile Header */}
      {!pathname.startsWith('/messages/') && (
        <div className="lg:hidden sticky top-0 z-50 bg-background border-b border-border">
          <div className="flex items-center justify-between px-3 py-2.5">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full overflow-hidden"
            >
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            </button>

            <div className="flex items-center space-x-2">
              <Link href="/home">
                <span className="text-base font-bold text-foreground tracking-tight">Sociobook.in</span>
              </Link>
            </div>

            <Link href="/explore">
              <Button
                variant="ghost"
                size="icon"
                className="text-foreground hover:bg-accent rounded-full"
              >
                <Search className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex fixed left-0 top-0 bottom-0 z-40 w-64 flex-col bg-background border-r border-border">
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center px-5 py-5">
            <Link href="/home">
              <span className="text-xl font-bold text-foreground tracking-tight">Sociobook.in</span>
            </Link>
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
                  className={`group flex items-center px-3 py-3 text-xl rounded-full transition-all duration-200 ${isActive ? 'font-bold text-foreground' : 'font-normal text-foreground hover:bg-gray-100 dark:hover:bg-gray-900'}`}
                >
                  <div className="flex items-center">
                    <div className="relative">
                      <Icon className="mr-4 h-6 w-6 text-foreground" />
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
            <Link href="/create-post">
              <Button className="w-full h-12 bg-blue-500 text-white font-bold rounded-full hover:bg-blue-600 transition-colors">
                Post
              </Button>
            </Link>
          </div>

          {/* User Profile */}
          <div className="border-t border-border p-4">
            <Link href={`/${username || 'profile'}`} className="block">
              <div className="flex items-center space-x-3 p-3 rounded-2xl hover:bg-accent transition-all duration-200 cursor-pointer group">
                <span className="relative flex shrink-0 overflow-hidden rounded-full h-10 w-10 border-2 border-border">
                  <img className="aspect-square h-full w-full" src={avatarUrl} alt={displayName} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">@{username || 'user'}</p>
                </div>
                <MoreHorizontal className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div className={`
        fixed left-0 top-0 bottom-0 z-50 w-[82vw] max-w-[320px] bg-background
        transform transition-transform duration-300 ease-in-out lg:hidden
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full overflow-y-auto">

          {/* Drawer Header: Avatar + name + username + more button */}
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-start justify-between">
              <div
                className="h-12 w-12 rounded-full overflow-hidden border-2 border-border cursor-pointer"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  router.push(`/${username || 'profile'}`);
                }}
              >
                <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
              </div>
              <button
                className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <MoreHorizontal className="h-5 w-5 text-foreground" />
              </button>
            </div>

            <div
              className="mt-3 cursor-pointer"
              onClick={() => {
                setIsMobileMenuOpen(false);
                router.push(`/${username || 'profile'}`);
              }}
            >
              <p className="text-base font-bold text-foreground leading-tight">{displayName}</p>
              <p className="text-sm text-muted-foreground mt-0.5">@{username || 'user'}</p>
            </div>

            <div className="flex items-center gap-4 mt-3 text-sm text-foreground">
              <button
                className="hover:underline"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  router.push(`/${username || 'profile'}/following`);
                }}
              >
                <span className="font-bold">{drawerFollowing ?? '—'}</span>
                <span className="text-muted-foreground ml-1">Following</span>
              </button>
              <button
                className="hover:underline"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  router.push(`/${username || 'profile'}/followers`);
                }}
              >
                <span className="font-bold">{drawerFollowers ?? '—'}</span>
                <span className="text-muted-foreground ml-1">Followers</span>
              </button>
            </div>
          </div>

          <div className="mx-5 border-t border-border my-2" />

          {/* Drawer Nav Items */}
          <nav className="flex-1 px-2 py-1">
            {drawerNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-5 px-3 py-3.5 rounded-full text-foreground hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="relative shrink-0">
                    <Icon className="h-6 w-6" />
                    {(item as any).badge && <NotificationBadge count={(item as any).badge} />}
                  </div>
                  <span className="text-[19px] font-bold">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mx-5 border-t border-border my-2" />

          {/* Settings & Support collapsible */}
          <div className="px-2">
            <button
              className="flex w-full items-center justify-between px-3 py-3.5 rounded-full text-foreground hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              onClick={() => setShowSettingsSupport(!showSettingsSupport)}
            >
              <span className="text-base font-bold">Settings &amp; Support</span>
              {showSettingsSupport ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </button>

            {showSettingsSupport && (
              <div className="pl-2 pb-1 space-y-0.5">
                {settingsSupportItems.map((item) => {
                  const Icon = item.icon;
                  if (item.onClick) {
                    return (
                      <button
                        key={item.name}
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          item.onClick!();
                        }}
                        className={`flex w-full items-center gap-4 px-3 py-3 rounded-full transition-colors ${item.danger ? 'text-red-500 hover:bg-red-500/10' : 'text-foreground hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        <span className="text-sm font-medium">{item.name}</span>
                      </button>
                    );
                  }
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-4 px-3 py-3 rounded-full text-foreground hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="text-sm font-medium">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Theme toggle at bottom */}
          <div className="px-5 py-5">
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle theme"
            >
              {resolvedTheme === 'dark' ? (
                <Moon className="h-6 w-6 text-foreground" />
              ) : (
                <Sun className="h-6 w-6 text-foreground" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64">
        <main className="min-h-screen mt-0">
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

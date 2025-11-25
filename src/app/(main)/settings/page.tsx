"use client";

import { Suspense } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Bell,
  ShieldCheck,
  Lock,
  Palette,
  Mail,
  Smartphone,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useNotificationSettings, usePrivacySettings, useAppearanceSettings } from "@/hooks/use-settings";
import { SettingsToggle } from "@/components/ui/settings-toggle";
import { SessionsManager } from "@/components/settings/sessions-manager";

const notifications = [
  { id: 'mentions', label: 'Mentions & replies', description: 'Get notified when someone engages you directly.' },
  { id: 'community', label: 'Community updates', description: 'Digest of trending conversations you follow.' },
];

function SettingsContent() {
  const { status, data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const { preferences: notificationPrefs, togglePreference } = useNotificationSettings();
  const { settings: privacySettings, toggleSetting } = usePrivacySettings();
  const { settings: appearanceSettings, updateSettings: updateAppearance } = useAppearanceSettings();

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    redirect('/auth/signin');
  }

  return (
    <div className="min-h-screen w-full bg-background pb-12 pt-16 lg:pt-0 mt-5 text-foreground">
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-3 pb-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full border border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="mt-1">
            <h1 className="text-lg font-semibold sm:text-xl text-foreground">Settings</h1>
            <p className="text-xs text-muted-foreground">Control your presence and notifications.</p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
          {/* Left column */}
          <section className="space-y-5">
            <div className="rounded-3xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground">Notification preferences</h2>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose what you hear about. Critical safety alerts stay on by default.
              </p>
              <div className="mt-4 space-y-4">
                {notifications.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <SettingsToggle 
                      checked={notificationPrefs?.[item.id as keyof typeof notificationPrefs] ?? false}
                      onChange={(newValue) => togglePreference(item.id as keyof typeof notificationPrefs)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground">Privacy & safety</h2>
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Adjust your visibility and defenses against abuse or spam.
              </p>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Lock className="h-4 w-4 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">Profile visibility</p>
                        <p className="text-xs text-muted-foreground">Only approved followers can see my posts.</p>
                      </div>
                    </div>
                    <SettingsToggle 
                      checked={privacySettings?.profile_visibility ?? false}
                      onChange={(newValue) => toggleSetting('profile_visibility')}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground">Account security</h2>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3">
                  <div>
                    <p className="font-medium text-foreground">Login alerts</p>
                    <p className="text-xs text-muted-foreground">Alert me when someone logs in from a new device.</p>
                  </div>
                  <SettingsToggle 
                    checked={notificationPrefs?.login_alerts ?? true}
                    onChange={(newValue) => togglePreference('login_alerts')}
                  />
                </div>
                <div className="h-px bg-border" />
                <div>
                  <p className="font-medium text-foreground mb-2">Active Sessions</p>
                  <p className="text-xs text-muted-foreground mb-4">Manage devices currently signed in to your account.</p>
                  <SessionsManager />
                </div>
              </div>
            </div>
          </section>

          {/* Right column */}
          <aside className="space-y-5">
            <div className="rounded-3xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground">Appearance</h2>
                <Palette className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Switch between light and dark themes.</p>
              <div className="mt-4 space-y-3">
                <div className="text-xs text-muted-foreground mb-2">Current theme: <span className="capitalize font-medium text-foreground">{appearanceSettings?.theme || theme}</span></div>
                <Button
                  className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-sm font-semibold text-white"
                  type="button"
                  onClick={async () => {
                    const newTheme = theme === 'dark' ? 'light' : 'dark';
                    await updateAppearance({ theme: newTheme });
                    toggleTheme();
                  }}
                >
                  {(appearanceSettings?.theme || theme) === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                </Button>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Contact email</p>
                  <p className="text-xs text-muted-foreground">{session?.user?.email || 'No email set'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Smartphone className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Account info</p>
                  <p className="text-xs text-muted-foreground">@{session?.user?.username || 'username'} · {session?.user?.name || 'Display Name'}</p>
                </div>
              </div>
              <Button variant="ghost" className="w-full rounded-2xl border border-border text-sm text-foreground hover:bg-accent">
                Manage contact info
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="h-9 w-9 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}

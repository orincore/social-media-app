"use client";

import { Suspense, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Bell,
  ShieldCheck,
  Lock,
  Globe2,
  Palette,
  Mail,
  Smartphone,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

const notifications = [
  { id: 'mentions', label: 'Mentions & replies', description: 'Get notified when someone engages you directly.' },
  { id: 'community', label: 'Community updates', description: 'Digest of trending conversations you follow.' },
  { id: 'product', label: 'Product insights', description: 'Research updates on product safety & integrity.' },
];

const privacyControls = [
  { icon: ShieldCheck, title: 'Safety prompts', description: 'Warn me about suspicious links or unfamiliar accounts.', enabled: true },
  { icon: Lock, title: 'Profile visibility', description: 'Only approved followers can see my posts.', enabled: false },
  { icon: Globe2, title: 'Discoverability', description: 'Let people find me by email or phone.', enabled: true },
];

function Toggle({ defaultChecked = false }: { defaultChecked?: boolean }) {
  const [enabled, setEnabled] = useState(defaultChecked);

  return (
    <button
      type="button"
      onClick={() => setEnabled((prev) => !prev)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full border border-border transition-colors ${
        enabled ? 'bg-blue-600' : 'bg-slate-700'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function SettingsContent() {
  const { status } = useSession();
  const { theme, toggleTheme } = useTheme();

  // Debug: Log theme changes
  console.log('Current theme:', theme);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-b-2 border-blue-500" />
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
            className="h-9 w-9 rounded-full border border-border text-slate-300 hover:border-border/80 hover:text-white"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="mt-1">
            <h1 className="text-lg font-semibold sm:text-xl">Settings</h1>
            <p className="text-xs text-slate-400">Control your presence, notifications, and safety prompts.</p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
          {/* Left column */}
          <section className="space-y-5">
            <div className="rounded-3xl border border-border bg-background p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Notification preferences</h2>
                <Bell className="h-4 w-4 text-slate-400" />
              </div>
              <p className="mt-1 text-sm text-slate-400">
                Choose what you hear about. Critical safety alerts stay on by default.
              </p>
              <div className="mt-4 space-y-4">
                {notifications.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-slate-400">{item.description}</p>
                    </div>
                    <Toggle defaultChecked />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-background p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Privacy & safety</h2>
                <ShieldCheck className="h-4 w-4 text-slate-400" />
              </div>
              <p className="mt-1 text-sm text-slate-400">
                Adjust your visibility and defenses against abuse or spam.
              </p>
              <div className="mt-4 space-y-3">
                {privacyControls.map((control) => (
                  <div key={control.title} className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <control.icon className="h-4 w-4 text-blue-400" />
                        <div>
                          <p className="text-sm font-semibold">{control.title}</p>
                          <p className="text-xs text-slate-400">{control.description}</p>
                        </div>
                      </div>
                      <Toggle defaultChecked={control.enabled} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-background p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Account security</h2>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-2xl border border-border bg-slate-900/60 px-4 py-3">
                  <div>
                    <p className="font-medium">Login alerts</p>
                    <p className="text-xs text-slate-400">Alert me when someone logs in from a new device.</p>
                  </div>
                  <Toggle defaultChecked />
                </div>
                <div className="h-px bg-slate-800/70" />
                <div>
                  <p className="font-medium">Sessions</p>
                  <p className="font-medium text-white">Sessions</p>
                  <p className="text-xs text-slate-400">View devices currently signed in to your account.</p>
                  <Button variant="outline" className="mt-3 rounded-full border border-border text-sm text-slate-200 hover:bg-slate-800/60">
                    Review sessions
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Right column */}
          <aside className="space-y-5">
            <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-background p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Appearance</h2>
                <Palette className="h-4 w-4 text-slate-400" />
              </div>
              <p className="mt-1 text-sm text-slate-400">Switch themes, fonts, and motion preferences.</p>
              <div className="mt-4 space-y-3">
                <div className="text-xs text-gray-500 mb-2">Current theme: {theme}</div>
                <Button
                  className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-sm font-semibold"
                  type="button"
                  onClick={toggleTheme}
                >
                  {theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                </Button>
                <Button variant="outline" className="w-full rounded-2xl border border-border text-sm text-slate-200 hover:bg-slate-800/60">
                  Font & density
                </Button>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-background p-5 space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-blue-400" />
                <div>
                  <p className="text-sm font-semibold text-white">Contact email</p>
                  <p className="text-xs text-slate-400">adarsh@socialpulse.app</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Smartphone className="h-4 w-4 text-blue-400" />
                <div>
                  <p className="text-sm font-semibold text-white">Trusted device</p>
                  <p className="text-xs text-slate-400">Pixel 8 Pro · Added 2 months ago</p>
                </div>
              </div>
              <Button variant="ghost" className="w-full rounded-2xl border border-border text-sm text-slate-200 hover:bg-slate-800/60">
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
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="h-9 w-9 animate-spin rounded-full border-b-2 border-blue-500" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}

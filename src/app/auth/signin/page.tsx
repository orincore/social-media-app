'use client';

import { Suspense, useState } from 'react';
import { Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

function GoogleIcon({ className = 'h-5 w-5 text-white' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M23.546 12.279c0-.851-.076-1.67-.218-2.455H12.24v4.644h6.406a5.48 5.48 0 0 1-2.377 3.598v2.99h3.847c2.252-2.076 3.53-5.134 3.53-8.777"
        fill="currentColor"
      />
      <path
        d="M12.24 24c3.213 0 5.905-1.064 7.873-2.944l-3.847-2.99c-1.07.72-2.445 1.147-4.026 1.147-3.095 0-5.72-2.088-6.652-4.896H1.608v3.087C3.563 21.316 7.593 24 12.24 24"
        fill="currentColor"
      />
      <path
        d="M5.588 14.317a7.333 7.333 0 0 1-.383-2.317c0-.804.139-1.597.383-2.317V6.596H1.608A11.943 11.943 0 0 0 0 12c0 1.943.463 3.78 1.608 5.404l3.98-3.087"
        fill="currentColor"
      />
      <path
        d="M12.24 4.749c1.748 0 3.31.616 4.546 1.827l3.395-3.395C18.134 1.21 15.453 0 12.24 0 7.593 0 3.563 2.684 1.608 6.596l3.98 3.087c.932-2.808 3.557-4.934 6.652-4.934"
        fill="currentColor"
      />
    </svg>
  );
}

const highlights: { title: string; description: string }[] = [
  { title: 'Zero password storage', description: 'SSO through Google keeps credentials off-platform.' },
  { title: 'Device safety checks', description: 'Risky logins receive instant verification challenges.' },
  { title: 'End-to-end TLS', description: 'All requests tunnel through encrypted edge networks.' },
  { title: 'Adaptive protections', description: 'Real-time abuse prevention tuned for large communities.' },
];

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const callbackUrl = searchParams.get('callbackUrl') || '/home';
  const error = searchParams.get('error');

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const result = await signIn('google', {
        callbackUrl,
        redirect: false,
      });

      if (result?.ok) {
        const session = await getSession();
        if (session?.user) {
          router.push(callbackUrl);
        }
      } else {
        console.error('Sign in failed:', result?.error);
      }
    } catch (error) {
      console.error('Sign in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_55%)]" />
        <div className="absolute inset-y-0 left-1/2 w-[60%] -translate-x-1/2 bg-[radial-gradient(circle,_rgba(147,51,234,0.18),_transparent_60%)] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-16 lg:flex-row lg:items-center">
        <div className="w-full space-y-8 text-foreground">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-blue-500 dark:text-blue-300">
              <Sparkles className="h-3 w-3" /> Trusted access
            </span>
            <div>
              <p className="text-sm uppercase tracking-[0.45em] text-gray-500">Social Pulse</p>
              <h1 className="mt-3 text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
                Sign in securely to stay close to your community.
              </h1>
              <p className="mt-4 text-base text-gray-600 dark:text-gray-300">
                Enterprise-grade authentication powered by Google OAuth, Supabase, and adaptive defenses. Continue where you left off with full encryption and device posture checks.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {highlights.map((item) => (
              <div key={item.title} className="rounded-2xl border border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/5 p-4 backdrop-blur">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-blue-500 dark:text-blue-300" />
                  {item.title}
                </div>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-border/40 bg-gray-50 dark:bg-white/5 p-4 text-sm text-gray-600 dark:text-gray-300 backdrop-blur">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-emerald-300" /> TLS 1.3 enforced
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" /> RLS-enabled data controls
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-300" /> AI-powered anomaly alerts
            </div>
          </div>
        </div>

        <div className="w-full max-w-md rounded-3xl border border-border/60 bg-background/80 p-8 shadow-[0_35px_120px_rgba(0,0,0,0.1)] dark:shadow-[0_35px_120px_rgba(15,23,42,0.65)] backdrop-blur">
          <div className="space-y-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-500">Welcome back</p>
            <h2 className="text-2xl font-semibold text-foreground">Secure sign in</h2>
            <p className="text-sm text-gray-500">Authenticate with your verified Google workspace identity.</p>
          </div>

          <Button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 py-3 text-base font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:brightness-110"
          >
            <GoogleIcon className="h-5 w-5 text-white" />
            {isLoading ? 'Redirecting…' : 'Continue with Google'}
          </Button>

          {error ? (
            <p className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
              Unable to sign in. Please try again or contact support with code: {error}.
            </p>
          ) : (
            <p className="mt-4 text-xs text-gray-500">
              We never post without permission. Grant Social Pulse read-only access to your Google profile to continue.
            </p>
          )}

          <div className="mt-6 border-t border-border/40 pt-6 text-center text-xs text-gray-500">
            By continuing you agree to our{' '}
            <a href="/terms" className="text-blue-400 underline-offset-4 hover:underline">
              Terms
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-blue-400 underline-offset-4 hover:underline">
              Privacy Policy
            </a>
            .
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 px-6 py-16">
          <div className="mx-auto w-full max-w-6xl animate-pulse rounded-3xl border border-slate-900/80 bg-slate-900/40 p-10">
            <div className="h-4 w-32 rounded-full bg-slate-800" />
            <div className="mt-6 h-8 w-2/3 rounded-full bg-slate-800" />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-24 rounded-2xl bg-slate-900" />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}

'use client';

import Link from 'next/link';
import { 
  ArrowRight, 
  ShieldCheck, 
  MessageCircle, 
  Users, 
  Globe,
  Heart,
  TrendingUp,
  Image,
  Bell,
  Bookmark,
  Sun,
  Moon,
  Monitor,
  Smile
} from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';

const coreFeatures = [
  {
    icon: MessageCircle,
    title: 'Share Your Thoughts',
    description: 'Post what\'s on your mind, share moments, and start conversations with people who care.',
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    icon: Heart,
    title: 'Connect with People',
    description: 'Follow friends, family, and creators. Like, comment, and repost content you love.',
    gradient: 'from-pink-500 to-rose-500'
  },
  {
    icon: TrendingUp,
    title: 'Trending Topics',
    description: 'Stay in the loop with what\'s trending. Explore hashtags and join the conversations everyone\'s talking about.',
    gradient: 'from-purple-500 to-pink-500'
  },
  {
    icon: Image,
    title: 'Photos & Videos',
    description: 'Share your best moments with photos and videos. Your story, your way.',
    gradient: 'from-orange-500 to-yellow-500'
  },
  {
    icon: Bell,
    title: 'Real-time Notifications',
    description: 'Never miss a like, comment, or follow. Stay connected with instant notifications.',
    gradient: 'from-green-500 to-emerald-500'
  },
  {
    icon: Users,
    title: 'Grow Your Community',
    description: 'Build your following, discover new people, and be part of a vibrant social community.',
    gradient: 'from-indigo-500 to-purple-500'
  }
];

const stats = [
  { label: 'Posts Shared', value: '1M+', desc: 'And counting every day' },
  { label: 'Active Users', value: '50K+', desc: 'Growing community' },
  { label: 'Connections Made', value: '500K+', desc: 'Friendships formed' },
  { label: 'Always Online', value: '24/7', desc: 'Never miss a moment' }
];

export default function LandingPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const ThemeIcon = theme === 'system' ? Monitor : resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden transition-colors duration-300">
      {/* Hero Section */}
      <header className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-transparent dark:from-blue-600/20 dark:via-purple-600/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_rgba(59,130,246,0.15)_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,_rgba(168,85,247,0.1)_0%,_transparent_50%)]" />

        {/* Navigation */}
        <nav className="relative z-10 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Smile className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">Sociobook.in</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (theme === 'system') setTheme('light');
                else if (theme === 'light') setTheme('dark');
                else setTheme('system');
              }}
              className="p-2.5 rounded-full bg-muted hover:bg-accent border border-border transition-all duration-200"
              title={`Theme: ${theme}`}
            >
              <ThemeIcon className="w-4 h-4 text-foreground" />
            </button>
            <Link
              href="/auth/signin"
              className="px-6 py-2 bg-muted border border-border rounded-full hover:bg-accent transition-all duration-300 text-foreground"
            >
              Sign In
            </Link>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 lg:py-32">
          <div className="text-center space-y-8">
            <div className="inline-flex items-center px-4 py-2 bg-muted border border-border rounded-full text-sm font-medium text-foreground">
              <Heart className="w-4 h-4 mr-2 text-pink-500" />
              Your social world, all in one place
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight text-foreground">
              Connect, share &
              <br />
              <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                belong
              </span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Sociobook.in is where you share life's moments, follow the people you love, 
              and discover conversations that matter to you.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/auth/signin"
                className="group inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl font-semibold text-lg text-white shadow-2xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-1 transition-all duration-300"
              >
                Join Sociobook.in
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/auth/signin"
                className="inline-flex items-center justify-center px-8 py-4 border border-border rounded-2xl font-semibold text-lg hover:bg-accent transition-all duration-300 text-foreground"
              >
                Sign in
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-20">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className="text-center p-6 rounded-2xl bg-card border border-border hover:bg-accent transition-all duration-300"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="text-3xl lg:text-4xl font-bold text-foreground mb-2">{stat.value}</div>
                <div className="text-sm font-semibold text-foreground/80 mb-1">{stat.label}</div>
                <div className="text-xs text-muted-foreground">{stat.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Features Section */}
      <main className="relative z-10">
        <section id="features" className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-foreground">
              Everything you need to <span className="text-blue-500">stay connected</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From sharing posts to sliding into DMs — Sociobook.in has all the features you love.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {coreFeatures.map((feature) => (
              <div
                key={feature.title}
                className="group p-8 rounded-3xl bg-card border border-border hover:border-border hover:bg-accent transition-all duration-300"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-4 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Community Section */}
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="rounded-3xl bg-gradient-to-r from-card to-card/80 border border-border p-12 lg:p-16">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center px-4 py-2 bg-pink-500/10 border border-pink-500/20 rounded-full text-pink-600 dark:text-pink-400 text-sm font-medium mb-6">
                  <Users className="w-4 h-4 mr-2" />
                  A place for everyone
                </div>
                <h2 className="text-4xl font-bold mb-6 text-foreground">
                  Your community, <span className="text-pink-500">your vibe</span>
                </h2>
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                  Whether you're here to share memes, life updates, opinions, or just keep up with friends — 
                  Sociobook.in is your space. Be yourself, find your people.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Heart className="w-5 h-5 text-pink-500" />
                    <span className="text-muted-foreground">Like and comment on posts you love</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Bookmark className="w-5 h-5 text-blue-500" />
                    <span className="text-muted-foreground">Save posts to revisit anytime</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <ShieldCheck className="w-5 h-5 text-green-500" />
                    <span className="text-muted-foreground">Safe, moderated community</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Globe className="w-5 h-5 text-purple-500" />
                    <span className="text-muted-foreground">Connect with people across India and beyond</span>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-blue-500/10 rounded-3xl blur-3xl"></div>
                <div className="relative bg-card border border-border rounded-3xl p-8 text-center">
                  <div className="text-6xl mb-4">🎉</div>
                  <div className="text-2xl font-bold text-foreground mb-2">Join the fun</div>
                  <div className="text-muted-foreground mb-6">Thousands of people are already sharing, connecting, and having a great time on Sociobook.in</div>
                  <Link
                    href="/auth/signin"
                    className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-semibold text-white hover:-translate-y-0.5 transition-all duration-300"
                  >
                    Create your account
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-foreground">
              What are you <span className="text-blue-500">waiting for?</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-12 max-w-xl mx-auto">
              Sign up for free and start sharing your world with Sociobook.in today.
            </p>
            <Link
              href="/auth/signin"
              className="group inline-flex items-center justify-center px-12 py-5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl font-bold text-xl text-white shadow-2xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-1 transition-all duration-300"
            >
              Get started — it's free
              <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Smile className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-foreground">Sociobook.in</span>
          </div>
          <p className="text-muted-foreground text-xs mt-2">
            Bringing people together, one post at a time.
          </p>
          <p className="text-muted-foreground text-xs mt-1">© 2024 Sociobook.in · Made with ❤️ in India</p>
        </div>
      </footer>
    </div>
  );
}

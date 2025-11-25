'use client';

import Link from 'next/link';
import { 
  ArrowRight, 
  ShieldCheck, 
  MessageCircle, 
  Users, 
  Globe,
  Zap,
  Heart,
  TrendingUp,
  Lock,
  Eye,
  Megaphone,
  Scale,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';

const coreFeatures = [
  {
    icon: MessageCircle,
    title: 'Free Expression',
    description: 'Share thoughts, opinions, and engage in meaningful conversations without censorship of genuine discussions.',
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    icon: ShieldCheck,
    title: 'Safe Community',
    description: 'Strict moderation against harmful content with permanent bans for violent, abusive, or threatening behavior.',
    gradient: 'from-green-500 to-emerald-500'
  },
  {
    icon: TrendingUp,
    title: 'Trending Topics',
    description: 'Discover what\'s happening with hashtags, trending algorithms, and structured topic discovery.',
    gradient: 'from-purple-500 to-pink-500'
  },
  {
    icon: Globe,
    title: 'Global Conversations',
    description: 'Engage in discussions about politics, environment, social justice, business, and public welfare.',
    gradient: 'from-orange-500 to-red-500'
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Built with Next.js, Supabase realtime, and Redis caching for instant, smooth interactions.',
    gradient: 'from-yellow-500 to-orange-500'
  },
  {
    icon: Users,
    title: 'Modern Social',
    description: 'Posts, reposts, quote posts, DMs, notifications, profiles - everything you expect from modern social media.',
    gradient: 'from-indigo-500 to-purple-500'
  }
];

const impactAreas = [
  { icon: Scale, label: 'Politics & Governance', color: 'text-blue-500 dark:text-blue-400' },
  { icon: Globe, label: 'Environment & Climate', color: 'text-green-500 dark:text-green-400' },
  { icon: Heart, label: 'Social Justice', color: 'text-red-500 dark:text-red-400' },
  { icon: TrendingUp, label: 'Business & Economy', color: 'text-yellow-500 dark:text-yellow-400' },
  { icon: Megaphone, label: 'Activism & Awareness', color: 'text-purple-500 dark:text-purple-400' },
  { icon: Eye, label: 'Transparency & Corruption', color: 'text-cyan-500 dark:text-cyan-400' }
];

const stats = [
  { label: 'Open Discussions', value: '∞', desc: 'No limits on genuine conversation' },
  { label: 'Zero Tolerance', value: '0%', desc: 'For harassment and abuse' },
  { label: 'Real-time', value: '<100ms', desc: 'Lightning-fast interactions' },
  { label: 'Global Reach', value: '24/7', desc: 'Always-on community' }
];

export default function LandingPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const ThemeIcon = theme === 'system' ? Monitor : resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden transition-colors duration-300">
      {/* Hero Section */}
      <header className="relative">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-transparent dark:from-blue-600/20 dark:via-purple-600/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_rgba(59,130,246,0.15)_0%,_transparent_50%)] dark:bg-[radial-gradient(circle_at_30%_20%,_rgba(59,130,246,0.3)_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,_rgba(168,85,247,0.1)_0%,_transparent_50%)] dark:bg-[radial-gradient(circle_at_70%_80%,_rgba(168,85,247,0.2)_0%,_transparent_50%)]" />
        
        {/* Navigation */}
        <nav className="relative z-10 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">Social Pulse</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Theme Switcher */}
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
              className="px-6 py-2 bg-foreground/10 backdrop-blur-sm border border-border rounded-full hover:bg-foreground/20 transition-all duration-300 text-foreground"
            >
              Sign In
            </Link>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 lg:py-32">
          <div className="text-center space-y-8">
            <div className="inline-flex items-center px-4 py-2 bg-foreground/5 backdrop-blur-sm border border-border rounded-full text-sm font-medium text-foreground">
              <Megaphone className="w-4 h-4 mr-2 text-blue-500" />
              Where meaningful conversations happen
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight text-foreground">
              Express freely,
              <br />
              <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
                engage safely
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              An open, safe, and modern social platform where people can freely express impactful thoughts, 
              discover trending topics, and engage in meaningful conversations about what matters most.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/auth/signin"
                className="group inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl font-semibold text-lg text-white shadow-2xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-1 transition-all duration-300"
              >
                Join the conversation
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center justify-center px-8 py-4 border border-border rounded-2xl font-semibold text-lg hover:bg-accent transition-all duration-300 text-foreground"
              >
                Explore features
              </Link>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-20">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className="text-center p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border hover:bg-card/80 transition-all duration-300"
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
              Built for <span className="text-blue-500">meaningful impact</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Every feature designed to foster genuine conversations while maintaining a safe, inclusive environment for all voices.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {coreFeatures.map((feature) => (
              <div
                key={feature.title}
                className="group p-8 rounded-3xl bg-card/30 border border-border hover:border-border/80 backdrop-blur-sm hover:bg-card/50 transition-all duration-300"
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

        {/* Impact Areas */}
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-foreground">
              Conversations that <span className="text-purple-500">matter</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Engage in discussions about the topics shaping our world - from climate change to governance, 
              social justice to business ethics.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {impactAreas.map((area) => (
              <div
                key={area.label}
                className="text-center p-6 rounded-2xl bg-card/20 border border-border hover:border-border/80 hover:bg-card/40 transition-all duration-300 group"
              >
                <area.icon className={`w-8 h-8 mx-auto mb-3 ${area.color} group-hover:scale-110 transition-transform duration-300`} />
                <p className="text-sm font-medium text-muted-foreground">{area.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Safety & Trust Section */}
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="rounded-3xl bg-gradient-to-r from-card to-card/80 border border-border p-12 lg:p-16">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full text-green-600 dark:text-green-400 text-sm font-medium mb-6">
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Safety First
                </div>
                <h2 className="text-4xl font-bold mb-6 text-foreground">
                  Free speech with <span className="text-green-500">responsibility</span>
                </h2>
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                  We believe in open dialogue and free expression, but draw clear lines against harassment, 
                  threats, and abuse. Our community thrives because everyone feels safe to share their authentic voice.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Lock className="w-5 h-5 text-blue-500" />
                    <span className="text-muted-foreground">End-to-end encrypted messaging</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Eye className="w-5 h-5 text-purple-500" />
                    <span className="text-muted-foreground">Transparent moderation policies</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <ShieldCheck className="w-5 h-5 text-green-500" />
                    <span className="text-muted-foreground">AI-powered abuse detection</span>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-blue-500/10 dark:from-green-500/20 dark:to-blue-500/20 rounded-3xl blur-3xl"></div>
                <div className="relative bg-card/50 backdrop-blur-sm border border-border rounded-3xl p-8">
                  <div className="text-center">
                    <div className="text-6xl font-bold text-green-500 mb-2">0</div>
                    <div className="text-lg font-semibold text-foreground/80 mb-2">Tolerance Policy</div>
                    <div className="text-sm text-muted-foreground">For harassment, threats, or abuse</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-foreground">
              Ready to make your <span className="text-blue-500">voice heard</span>?
            </h2>
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
              Join thousands of people already engaging in meaningful conversations that shape our world.
            </p>
            <Link
              href="/auth/signin"
              className="group inline-flex items-center justify-center px-12 py-5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl font-bold text-xl text-white shadow-2xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-1 transition-all duration-300"
            >
              Start your journey
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
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-foreground">Social Pulse</span>
          </div>
          <p className="text-muted-foreground text-xs mt-2">
            Empowering meaningful conversations since 2024
          </p>
          <p className="text-muted-foreground text-xs mt-1">Powered by ORINCORE Technologies</p>
        </div>
      </footer>
    </div>
  );
}

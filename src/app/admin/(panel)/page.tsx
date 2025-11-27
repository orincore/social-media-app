'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  FileText, 
  Flag, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  ArrowUpRight,
  Loader2
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  activeUsers24h: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  totalPosts: number;
  postsToday: number;
  totalReports: number;
  pendingReports: number;
}

interface ChartData {
  userGrowth: { date: string; newUsers: number }[];
  reportTrend: { date: string; total: number; resolved: number }[];
}

interface RecentItem {
  id: string;
  [key: string]: unknown;
}

interface DashboardData {
  stats: DashboardStats;
  charts: ChartData;
  recent: {
    reports: RecentItem[];
    users: RecentItem[];
  };
  lastUpdated: string;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await fetch('/api/admin/analytics/dashboard');
        if (!response.ok) throw new Error('Failed to fetch dashboard');
        const dashboardData = await response.json();
        setData(dashboardData);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-red-500" />
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  const stats = data?.stats;

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers?.toLocaleString() || '0',
      change: stats?.newUsersToday || 0,
      changeLabel: 'new today',
      icon: Users,
      color: 'blue',
      href: '/admin/users',
    },
    {
      title: 'Active Users (24h)',
      value: stats?.activeUsers24h?.toLocaleString() || '0',
      change: Math.round(((stats?.activeUsers24h || 0) / (stats?.totalUsers || 1)) * 100),
      changeLabel: '% of total',
      icon: TrendingUp,
      color: 'green',
    },
    {
      title: 'Total Posts',
      value: stats?.totalPosts?.toLocaleString() || '0',
      change: stats?.postsToday || 0,
      changeLabel: 'today',
      icon: FileText,
      color: 'purple',
    },
    {
      title: 'Pending Reports',
      value: stats?.pendingReports?.toLocaleString() || '0',
      change: stats?.totalReports || 0,
      changeLabel: 'total reports',
      icon: Flag,
      color: 'red',
      href: '/admin/reports',
    },
  ];

  const colorClasses: Record<string, { bg: string; text: string; icon: string }> = {
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-500', icon: 'text-blue-500' },
    green: { bg: 'bg-green-500/10', text: 'text-green-500', icon: 'text-green-500' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-500', icon: 'text-purple-500' },
    red: { bg: 'bg-red-500/10', text: 'text-red-500', icon: 'text-red-500' },
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-text-secondary mt-1">
          Overview of your application&apos;s performance and activity
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const colors = colorClasses[stat.color];
          const CardWrapper = stat.href ? Link : 'div';
          
          return (
            <CardWrapper
              key={stat.title}
              href={stat.href || '#'}
              className={`bg-gray-800 rounded-xl p-5 border border-gray-700 ${stat.href ? 'hover:border-gray-600 transition-colors' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-text-secondary text-sm">{stat.title}</p>
                  <p className="text-2xl font-bold text-text-primary mt-1">{stat.value}</p>
                  <p className="text-sm mt-2">
                    <span className={colors.text}>{stat.change}</span>
                    <span className="text-gray-500 ml-1">{stat.changeLabel}</span>
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${colors.bg}`}>
                  <stat.icon className={`w-6 h-6 ${colors.icon}`} />
                </div>
              </div>
              {stat.href && (
                <div className="mt-4 pt-4 border-t border-gray-700 flex items-center text-sm text-gray-400 hover:text-white">
                  View all
                  <ArrowUpRight className="w-4 h-4 ml-1" />
                </div>
              )}
            </CardWrapper>
          );
        })}
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User growth chart */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">User Growth (Last 7 Days)</h3>
          <div className="h-48 flex items-end gap-2">
            {data?.charts.userGrowth.map((day, index) => {
              const maxValue = Math.max(...data.charts.userGrowth.map(d => d.newUsers), 1);
              const height = (day.newUsers / maxValue) * 100;
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div 
                    className="w-full bg-blue-500 rounded-t transition-all duration-300"
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                  <span className="text-xs text-gray-500">
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Report trend chart */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Reports (Last 7 Days)</h3>
          <div className="h-48 flex items-end gap-2">
            {data?.charts.reportTrend.map((day, index) => {
              const maxValue = Math.max(...data.charts.reportTrend.map(d => d.total), 1);
              const totalHeight = (day.total / maxValue) * 100;
              const resolvedHeight = (day.resolved / maxValue) * 100;
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full relative" style={{ height: `${Math.max(totalHeight, 4)}%` }}>
                    <div className="absolute bottom-0 w-full bg-red-500/30 rounded-t" style={{ height: '100%' }} />
                    <div 
                      className="absolute bottom-0 w-full bg-green-500 rounded-t"
                      style={{ height: `${(day.resolved / (day.total || 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500/30 rounded" />
              <span className="text-gray-400">Total</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded" />
              <span className="text-gray-400">Resolved</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent reports */}
        <div className="bg-gray-800 rounded-xl border border-gray-700">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Recent Reports</h3>
            <Link href="/admin/reports" className="text-sm text-blue-500 hover:text-blue-400">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-700">
            {data?.recent.reports.length === 0 ? (
              <p className="p-4 text-gray-500 text-center">No recent reports</p>
            ) : (
              data?.recent.reports.slice(0, 5).map((report) => (
                <Link
                  key={report.id}
                  href={`/admin/reports/${report.id}`}
                  className="p-4 flex items-center justify-between hover:bg-gray-700/50 transition-colors"
                >
                  <div>
                    <p className="text-white font-medium capitalize">
                      {String(report.reason_code).replace(/_/g, ' ')}
                    </p>
                    <p className="text-gray-500 text-sm">
                      {String(report.target_type)} report
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    report.status === 'pending' 
                      ? 'bg-yellow-500/10 text-yellow-500'
                      : report.status === 'resolved'
                      ? 'bg-green-500/10 text-green-500'
                      : 'bg-gray-500/10 text-gray-500'
                  }`}>
                    {String(report.status)}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent users */}
        <div className="bg-gray-800 rounded-xl border border-gray-700">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">New Users</h3>
            <Link href="/admin/users" className="text-sm text-blue-500 hover:text-blue-400">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-700">
            {data?.recent.users.length === 0 ? (
              <p className="p-4 text-gray-500 text-center">No recent users</p>
            ) : (
              data?.recent.users.slice(0, 5).map((user) => (
                <Link
                  key={user.id}
                  href={`/admin/users/${user.id}`}
                  className="p-4 flex items-center gap-3 hover:bg-gray-700/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                    {user.avatar_url ? (
                      <img 
                        src={String(user.avatar_url)} 
                        alt="" 
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-medium">
                        {String(user.display_name || user.username || 'U').charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">
                      {String(user.display_name || user.username)}
                    </p>
                    <p className="text-gray-500 text-sm truncate">
                      @{String(user.username)}
                    </p>
                  </div>
                  <p className="text-gray-500 text-sm">
                    {new Date(String(user.created_at)).toLocaleDateString()}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Last updated */}
      {data?.lastUpdated && (
        <p className="text-center text-gray-500 text-sm">
          Last updated: {new Date(data.lastUpdated).toLocaleString()}
        </p>
      )}
    </div>
  );
}

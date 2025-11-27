/**
 * Admin Dashboard Analytics API
 * GET /api/admin/analytics/dashboard - Get dashboard stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AdminPermissionConstants, addSecurityHeaders } from '@/lib/admin/middleware';
import { adminClient } from '@/lib/admin/db';
import type { AdminContext } from '@/lib/admin/middleware';

async function handleGetDashboard(request: NextRequest, context: AdminContext) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  try {
    // Fetch all stats in parallel
    const [
      totalUsersResult,
      activeUsers24hResult,
      newUsersTodayResult,
      newUsersWeekResult,
      totalPostsResult,
      postsTodayResult,
      totalReportsResult,
      pendingReportsResult,
      recentReportsResult,
      recentUsersResult,
    ] = await Promise.all([
      // Total users
      adminClient
        .from('users')
        .select('id', { count: 'exact', head: true }),
      
      // Active users in last 24h (users who have posts or activity)
      adminClient
        .from('users')
        .select('id', { count: 'exact', head: true })
        .gte('updated_at', yesterday.toISOString()),
      
      // New users today
      adminClient
        .from('users')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', today.toISOString()),
      
      // New users this week
      adminClient
        .from('users')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString()),
      
      // Total posts
      adminClient
        .from('posts')
        .select('id', { count: 'exact', head: true }),
      
      // Posts today
      adminClient
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', today.toISOString()),
      
      // Total reports
      adminClient
        .from('reports')
        .select('id', { count: 'exact', head: true }),
      
      // Pending reports
      adminClient
        .from('reports')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      
      // Recent reports (last 10)
      adminClient
        .from('reports')
        .select('id, reason_code, status, target_type, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
      
      // Recent users (last 10)
      adminClient
        .from('users')
        .select('id, username, display_name, avatar_url, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    // Calculate user growth data for the last 7 days
    const userGrowthData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      
      const { count } = await adminClient
        .from('users')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', date.toISOString())
        .lt('created_at', nextDate.toISOString());
      
      userGrowthData.push({
        date: date.toISOString().split('T')[0],
        newUsers: count || 0,
      });
    }

    // Calculate report trend data for the last 7 days
    const reportTrendData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      
      const [totalResult, resolvedResult] = await Promise.all([
        adminClient
          .from('reports')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', date.toISOString())
          .lt('created_at', nextDate.toISOString()),
        adminClient
          .from('reports')
          .select('id', { count: 'exact', head: true })
          .gte('reviewed_at', date.toISOString())
          .lt('reviewed_at', nextDate.toISOString())
          .in('status', ['resolved', 'dismissed']),
      ]);
      
      reportTrendData.push({
        date: date.toISOString().split('T')[0],
        total: totalResult.count || 0,
        resolved: resolvedResult.count || 0,
      });
    }

    // Build response
    const dashboardData = {
      stats: {
        totalUsers: totalUsersResult.count || 0,
        activeUsers24h: activeUsers24hResult.count || 0,
        newUsersToday: newUsersTodayResult.count || 0,
        newUsersThisWeek: newUsersWeekResult.count || 0,
        totalPosts: totalPostsResult.count || 0,
        postsToday: postsTodayResult.count || 0,
        totalReports: totalReportsResult.count || 0,
        pendingReports: pendingReportsResult.count || 0,
      },
      charts: {
        userGrowth: userGrowthData,
        reportTrend: reportTrendData,
      },
      recent: {
        reports: recentReportsResult.data || [],
        users: recentUsersResult.data || [],
      },
      lastUpdated: new Date().toISOString(),
    };

    return addSecurityHeaders(
      NextResponse.json(dashboardData)
    );
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return addSecurityHeaders(
      NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
    );
  }
}

export const GET = withAdminAuth(handleGetDashboard, AdminPermissionConstants.ANALYTICS_VIEW);

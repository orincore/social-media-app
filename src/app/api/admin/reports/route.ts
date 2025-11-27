/**
 * Admin Reports API
 * GET /api/admin/reports - List/search reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AdminPermissionConstants, addSecurityHeaders } from '@/lib/admin/middleware';
import { adminClient } from '@/lib/admin/db';
import { logAuditEvent } from '@/lib/admin/auth';
import type { AdminContext } from '@/lib/admin/middleware';

async function handleGetReports(request: NextRequest, context: AdminContext) {
  const { searchParams } = new URL(request.url);
  
  // Parse query parameters
  const status = searchParams.get('status');
  const priority = searchParams.get('priority');
  const targetType = searchParams.get('target_type');
  const assignedTo = searchParams.get('assigned_to');
  const sortBy = searchParams.get('sortBy') || 'created_at';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
  const offset = (page - 1) * limit;

  // Build query
  let dbQuery = adminClient
    .from('reports')
    .select('*', { count: 'exact' });

  // Apply filters
  if (status) {
    dbQuery = dbQuery.eq('status', status as 'pending' | 'reviewed' | 'resolved' | 'dismissed');
  }
  if (priority) {
    dbQuery = dbQuery.eq('priority', priority);
  }
  if (targetType) {
    dbQuery = dbQuery.eq('target_type', targetType as 'message' | 'profile' | 'post');
  }
  if (assignedTo) {
    dbQuery = dbQuery.eq('assigned_to', assignedTo);
  }

  // Apply sorting
  const validSortColumns = ['created_at', 'priority', 'status'];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  dbQuery = dbQuery.order(sortColumn, { ascending: sortOrder === 'asc' });

  // Apply pagination
  dbQuery = dbQuery.range(offset, offset + limit - 1);

  const { data: reports, error, count } = await dbQuery;

  if (error) {
    console.error('Error fetching reports:', error);
    return addSecurityHeaders(
      NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
    );
  }

  // Fetch reporter and target user details
  const reporterIds = [...new Set(reports?.map(r => r.reporter_id) || [])];
  const targetProfileIds = reports?.filter(r => r.target_profile_id).map(r => r.target_profile_id as string) || [];
  const allUserIds = [...new Set([...reporterIds, ...targetProfileIds])];

  let usersMap: Record<string, { id: string; username: string; display_name: string; avatar_url: string | null }> = {};
  
  if (allUserIds.length > 0) {
    const { data: users } = await adminClient
      .from('users')
      .select('id, username, display_name, avatar_url')
      .in('id', allUserIds);
    
    if (users) {
      usersMap = users.reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {} as typeof usersMap);
    }
  }

  // Enrich reports with user data
  const enrichedReports = reports?.map(report => ({
    ...report,
    reporter: usersMap[report.reporter_id] || null,
    target_user: report.target_profile_id ? usersMap[report.target_profile_id] || null : null,
  }));

  // Log the action
  await logAuditEvent({
    admin_id: context.admin.id,
    admin_email: context.admin.email,
    action_type: 'report_viewed',
    action_category: 'report_management',
    target_type: 'report_list',
    metadata: { status, priority, targetType, page, limit },
    ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
    user_agent: request.headers.get('user-agent') || 'unknown',
    session_id: context.session.id,
  });

  return addSecurityHeaders(
    NextResponse.json({
      data: enrichedReports,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasMore: offset + limit < (count || 0),
      },
    })
  );
}

export const GET = withAdminAuth(handleGetReports, AdminPermissionConstants.REPORTS_VIEW);

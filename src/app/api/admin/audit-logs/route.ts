/**
 * Admin Audit Logs API
 * GET /api/admin/audit-logs - List audit logs
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AdminPermissionConstants, addSecurityHeaders } from '@/lib/admin/middleware';
import { adminDb } from '@/lib/admin/db';
import type { AdminContext } from '@/lib/admin/middleware';

async function handleGetAuditLogs(request: NextRequest, context: AdminContext) {
  const { searchParams } = new URL(request.url);
  
  // Parse query parameters
  const adminId = searchParams.get('admin_id');
  const actionCategory = searchParams.get('action_category');
  const actionType = searchParams.get('action_type');
  const targetType = searchParams.get('target_type');
  const targetId = searchParams.get('target_id');
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
  const offset = (page - 1) * limit;

  // Build query
  let dbQuery = adminDb
    .from('admin_audit_logs')
    .select('*', { count: 'exact' });

  // Apply filters
  if (adminId) {
    dbQuery = dbQuery.eq('admin_id', adminId);
  }
  if (actionCategory) {
    dbQuery = dbQuery.eq('action_category', actionCategory);
  }
  if (actionType) {
    dbQuery = dbQuery.eq('action_type', actionType);
  }
  if (targetType) {
    dbQuery = dbQuery.eq('target_type', targetType);
  }
  if (targetId) {
    dbQuery = dbQuery.eq('target_id', targetId);
  }
  if (dateFrom) {
    dbQuery = dbQuery.gte('created_at', dateFrom);
  }
  if (dateTo) {
    dbQuery = dbQuery.lte('created_at', dateTo);
  }

  // Apply sorting (always descending by created_at)
  dbQuery = dbQuery.order('created_at', { ascending: false });

  // Apply pagination
  dbQuery = dbQuery.range(offset, offset + limit - 1);

  const { data: logs, error, count } = await dbQuery;

  if (error) {
    console.error('Error fetching audit logs:', error);
    return addSecurityHeaders(
      NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
    );
  }

  // Fetch admin details for the logs
  const adminIds = [...new Set(logs?.filter(l => l.admin_id).map(l => l.admin_id) || [])];
  let adminsMap: Record<string, { id: string; username: string; display_name: string }> = {};
  
  if (adminIds.length > 0) {
    const { data: admins } = await adminDb
      .from('admin_users')
      .select('id, username, display_name')
      .in('id', adminIds);
    
    if (admins) {
      adminsMap = admins.reduce((acc: typeof adminsMap, admin: { id: string; username: string; display_name: string }) => {
        acc[admin.id] = admin;
        return acc;
      }, {});
    }
  }

  // Enrich logs with admin data
  const enrichedLogs = logs?.map(log => ({
    ...log,
    admin: log.admin_id ? adminsMap[log.admin_id] || null : null,
  }));

  return addSecurityHeaders(
    NextResponse.json({
      data: enrichedLogs,
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

export const GET = withAdminAuth(handleGetAuditLogs, AdminPermissionConstants.AUDIT_LOGS_VIEW);

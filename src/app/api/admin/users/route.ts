/**
 * Admin Users API
 * GET /api/admin/users - List/search users
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AdminPermissionConstants, addSecurityHeaders } from '@/lib/admin/middleware';
import { adminDb, adminClient } from '@/lib/admin/db';
import { logAuditEvent } from '@/lib/admin/auth';
import type { AdminContext } from '@/lib/admin/middleware';

async function handleGetUsers(request: NextRequest, context: AdminContext) {
  const { searchParams } = new URL(request.url);
  
  // Parse query parameters
  const query = searchParams.get('query') || '';
  const status = searchParams.get('status');
  const sortBy = searchParams.get('sortBy') || 'created_at';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
  const offset = (page - 1) * limit;

  // Build query
  let dbQuery = adminClient
    .from('users')
    .select('*', { count: 'exact' });

  // Apply search filter
  if (query) {
    dbQuery = dbQuery.or(
      `username.ilike.%${query}%,email.ilike.%${query}%,display_name.ilike.%${query}%`
    );
  }

  // Apply status filter
  if (status) {
    dbQuery = dbQuery.eq('status', status);
  }

  // Apply sorting
  const validSortColumns = ['created_at', 'username', 'email', 'posts_count', 'followers_count'];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  dbQuery = dbQuery.order(sortColumn, { ascending: sortOrder === 'asc' });

  // Apply pagination
  dbQuery = dbQuery.range(offset, offset + limit - 1);

  const { data: users, error, count } = await dbQuery;

  if (error) {
    console.error('Error fetching users:', error);
    return addSecurityHeaders(
      NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    );
  }

  // Log the action
  await logAuditEvent({
    admin_id: context.admin.id,
    admin_email: context.admin.email,
    action_type: 'user_viewed',
    action_category: 'user_management',
    target_type: 'user_list',
    metadata: { query, status, page, limit },
    ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
    user_agent: request.headers.get('user-agent') || 'unknown',
    session_id: context.session.id,
  });

  return addSecurityHeaders(
    NextResponse.json({
      data: users,
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

export const GET = withAdminAuth(handleGetUsers, AdminPermissionConstants.USERS_VIEW);

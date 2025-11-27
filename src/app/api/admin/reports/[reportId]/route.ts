/**
 * Admin Report Detail API
 * GET /api/admin/reports/[reportId] - Get report details
 * PATCH /api/admin/reports/[reportId] - Update report status
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AdminPermissionConstants, addSecurityHeaders } from '@/lib/admin/middleware';
import { adminDb, adminClient } from '@/lib/admin/db';
import { logAuditEvent } from '@/lib/admin/auth';
import type { AdminContext } from '@/lib/admin/middleware';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ reportId: string }>;
}

// Validation schema for report updates
// NOTE: Database check constraint reports_status_check only allows
// specific status values. To avoid 23514 errors, we align the
// allowed values here with the DB constraint: pending, resolved,
// and dismissed.
const updateReportSchema = z.object({
  status: z.enum(['pending', 'resolved', 'dismissed']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  resolution_type: z.enum([
    'no_action', 
    'warning_issued', 
    'content_removed', 
    'user_suspended', 
    'user_banned', 
    'false_report'
  ]).optional().nullable(),
  resolution_notes: z.string().max(2000).optional().nullable(),
});

async function handleGetReport(
  request: NextRequest, 
  context: AdminContext,
  routeContext: RouteContext
) {
  const { reportId } = await routeContext.params;

  // Fetch report
  const { data: report, error } = await adminClient
    .from('reports')
    .select('*')
    .eq('id', reportId)
    .single();

  if (error || !report) {
    return addSecurityHeaders(
      NextResponse.json({ error: 'Report not found' }, { status: 404 })
    );
  }

  // Fetch related data
  const [reporterResult, targetUserResult, targetPostResult, notesResult] = await Promise.all([
    // Reporter info
    adminClient
      .from('users')
      .select('id, username, display_name, avatar_url')
      .eq('id', report.reporter_id)
      .single(),
    // Target user info (if profile report)
    report.target_profile_id 
      ? adminClient
          .from('users')
          .select('id, username, display_name, avatar_url, email, created_at')
          .eq('id', report.target_profile_id)
          .single()
      : Promise.resolve({ data: null }),
    // Target post info (if post report)
    report.target_post_id
      ? adminClient
          .from('posts')
          .select('id, content, media_urls, created_at, user_id')
          .eq('id', report.target_post_id)
          .single()
      : Promise.resolve({ data: null }),
    // Report notes
    adminDb
      .from('report_notes')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: false }),
  ]);

  // Log the action
  await logAuditEvent({
    admin_id: context.admin.id,
    admin_email: context.admin.email,
    action_type: 'report_viewed',
    action_category: 'report_management',
    target_type: 'report',
    target_id: reportId,
    ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
    user_agent: request.headers.get('user-agent') || 'unknown',
    session_id: context.session.id,
  });

  return addSecurityHeaders(
    NextResponse.json({
      report,
      reporter: reporterResult.data,
      target_user: targetUserResult.data,
      target_post: targetPostResult.data,
      notes: notesResult.data || [],
    })
  );
}

async function handleUpdateReport(
  request: NextRequest, 
  context: AdminContext,
  routeContext: RouteContext
) {
  const { reportId } = await routeContext.params;

  // Parse and validate request body
  const body = await request.json();
  const validation = updateReportSchema.safeParse(body);

  if (!validation.success) {
    return addSecurityHeaders(
      NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      )
    );
  }

  // Get current report state
  const { data: currentReport, error: fetchError } = await adminClient
    .from('reports')
    .select('*')
    .eq('id', reportId)
    .single();

  if (fetchError || !currentReport) {
    return addSecurityHeaders(
      NextResponse.json({ error: 'Report not found' }, { status: 404 })
    );
  }

  // Build update object
  const updateData: Record<string, unknown> = {};
  
  if (validation.data.status) {
    updateData.status = validation.data.status;
  }
  
  if (validation.data.priority !== undefined) {
    updateData.priority = validation.data.priority;
  }
  
  if (validation.data.assigned_to !== undefined) {
    updateData.assigned_to = validation.data.assigned_to;
  }
  
  if (validation.data.resolution_type !== undefined) {
    updateData.resolution_type = validation.data.resolution_type;
  }
  
  if (validation.data.resolution_notes !== undefined) {
    updateData.resolution_notes = validation.data.resolution_notes;
  }

  // Update report
  const { data: updatedReport, error: updateError } = await adminClient
    .from('reports')
    .update(updateData)
    .eq('id', reportId)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating report:', updateError);
    return addSecurityHeaders(
      NextResponse.json({ error: 'Failed to update report' }, { status: 500 })
    );
  }

  // Determine action type for audit log
  let actionType: 'report_status_changed' | 'report_assigned' | 'report_resolved' = 'report_status_changed';
  if (validation.data.assigned_to !== undefined) {
    actionType = 'report_assigned';
  }
  if (validation.data.status === 'resolved' || validation.data.status === 'dismissed') {
    actionType = 'report_resolved';
  }

  // Log the action
  await logAuditEvent({
    admin_id: context.admin.id,
    admin_email: context.admin.email,
    action_type: actionType,
    action_category: 'report_management',
    target_type: 'report',
    target_id: reportId,
    previous_state: currentReport,
    new_state: updatedReport,
    ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
    user_agent: request.headers.get('user-agent') || 'unknown',
    session_id: context.session.id,
  });

  return addSecurityHeaders(
    NextResponse.json({ success: true, report: updatedReport })
  );
}

// Export handlers
export async function GET(request: NextRequest, routeContext: RouteContext) {
  const handler = withAdminAuth(
    (req, ctx) => handleGetReport(req, ctx, routeContext),
    AdminPermissionConstants.REPORTS_VIEW
  );
  return handler(request);
}

export async function PATCH(request: NextRequest, routeContext: RouteContext) {
  const handler = withAdminAuth(
    (req, ctx) => handleUpdateReport(req, ctx, routeContext),
    AdminPermissionConstants.REPORTS_MANAGE
  );
  return handler(request);
}

/**
 * Admin User Ban API
 * POST /api/admin/users/[userId]/ban - Ban user
 * DELETE /api/admin/users/[userId]/ban - Unban user
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AdminPermissionConstants, addSecurityHeaders } from '@/lib/admin/middleware';
import { adminClient } from '@/lib/admin/db';
import { logAuditEvent } from '@/lib/admin/auth';
import type { AdminContext } from '@/lib/admin/middleware';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ userId: string }>;
}

// Validation schema for ban action
const banSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  duration_days: z.number().min(1).max(365).optional(), // null for permanent
  notify_user: z.boolean().optional().default(true),
});

async function handleBanUser(
  request: NextRequest, 
  context: AdminContext,
  routeContext: RouteContext
) {
  const { userId } = await routeContext.params;

  // Parse and validate request body
  const body = await request.json();
  const validation = banSchema.safeParse(body);

  if (!validation.success) {
    return addSecurityHeaders(
      NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      )
    );
  }

  const { reason, duration_days, notify_user } = validation.data;

  // Get current user state
  const { data: user, error: fetchError } = await adminClient
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (fetchError || !user) {
    return addSecurityHeaders(
      NextResponse.json({ error: 'User not found' }, { status: 404 })
    );
  }

  // Cast user to include admin fields (added by SQL migration)
  const userWithAdminFields = user as typeof user & {
    status?: string;
    suspension_count?: number;
    ban_reason?: string;
  };

  // Check if already banned
  if (userWithAdminFields.status === 'banned') {
    return addSecurityHeaders(
      NextResponse.json({ error: 'User is already banned' }, { status: 400 })
    );
  }

  // Calculate ban expiry
  const banExpiresAt = duration_days 
    ? new Date(Date.now() + duration_days * 24 * 60 * 60 * 1000).toISOString()
    : null;

  // Update user status
  const { data: updatedUser, error: updateError } = await adminClient
    .from('users')
    .update({
      status: 'banned',
      banned_at: new Date().toISOString(),
      banned_by: context.admin.id,
      ban_reason: reason,
      ban_expires_at: banExpiresAt,
      suspension_count: (userWithAdminFields.suspension_count || 0) + 1,
      updated_at: new Date().toISOString(),
    } as Record<string, unknown>)
    .eq('id', userId)
    .select()
    .single();

  if (updateError) {
    console.error('Error banning user:', updateError);
    return addSecurityHeaders(
      NextResponse.json({ error: 'Failed to ban user' }, { status: 500 })
    );
  }

  // Invalidate all user sessions
  await adminClient
    .from('user_sessions')
    .delete()
    .eq('user_id', userId);

  // Log the action
  await logAuditEvent({
    admin_id: context.admin.id,
    admin_email: context.admin.email,
    action_type: 'user_banned',
    action_category: 'user_management',
    target_type: 'user',
    target_id: userId,
    target_details: { 
      username: user.username, 
      email: user.email,
      duration_days: duration_days || 'permanent',
    },
    previous_state: { status: userWithAdminFields.status },
    new_state: { status: 'banned', ban_expires_at: banExpiresAt },
    reason,
    ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
    user_agent: request.headers.get('user-agent') || 'unknown',
    session_id: context.session.id,
  });

  // TODO: Send notification to user if notify_user is true
  if (notify_user) {
    // Implement email notification
    console.log(`Would notify user ${user.email} about ban`);
  }

  return addSecurityHeaders(
    NextResponse.json({ 
      success: true, 
      user: updatedUser,
      message: duration_days 
        ? `User banned for ${duration_days} days`
        : 'User permanently banned',
    })
  );
}

async function handleUnbanUser(
  request: NextRequest, 
  context: AdminContext,
  routeContext: RouteContext
) {
  const { userId } = await routeContext.params;

  // Get current user state
  const { data: user, error: fetchError } = await adminClient
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (fetchError || !user) {
    return addSecurityHeaders(
      NextResponse.json({ error: 'User not found' }, { status: 404 })
    );
  }

  // Cast user to include admin fields (added by SQL migration)
  const userWithAdminFields = user as typeof user & {
    status?: string;
    ban_reason?: string;
  };

  // Check if actually banned
  if (userWithAdminFields.status !== 'banned') {
    return addSecurityHeaders(
      NextResponse.json({ error: 'User is not banned' }, { status: 400 })
    );
  }

  // Update user status
  const { data: updatedUser, error: updateError } = await adminClient
    .from('users')
    .update({
      status: 'active',
      banned_at: null,
      banned_by: null,
      ban_reason: null,
      ban_expires_at: null,
      updated_at: new Date().toISOString(),
    } as Record<string, unknown>)
    .eq('id', userId)
    .select()
    .single();

  if (updateError) {
    console.error('Error unbanning user:', updateError);
    return addSecurityHeaders(
      NextResponse.json({ error: 'Failed to unban user' }, { status: 500 })
    );
  }

  // Log the action
  await logAuditEvent({
    admin_id: context.admin.id,
    admin_email: context.admin.email,
    action_type: 'user_unbanned',
    action_category: 'user_management',
    target_type: 'user',
    target_id: userId,
    target_details: { username: user.username, email: user.email },
    previous_state: { status: 'banned', ban_reason: userWithAdminFields.ban_reason },
    new_state: { status: 'active' },
    ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
    user_agent: request.headers.get('user-agent') || 'unknown',
    session_id: context.session.id,
  });

  return addSecurityHeaders(
    NextResponse.json({ 
      success: true, 
      user: updatedUser,
      message: 'User unbanned successfully',
    })
  );
}

// Export handlers
export async function POST(request: NextRequest, routeContext: RouteContext) {
  const handler = withAdminAuth(
    (req, ctx) => handleBanUser(req, ctx, routeContext),
    AdminPermissionConstants.USERS_BAN
  );
  return handler(request);
}

export async function DELETE(request: NextRequest, routeContext: RouteContext) {
  const handler = withAdminAuth(
    (req, ctx) => handleUnbanUser(req, ctx, routeContext),
    AdminPermissionConstants.USERS_BAN
  );
  return handler(request);
}

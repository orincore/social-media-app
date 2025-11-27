/**
 * Admin User Detail API
 * GET /api/admin/users/[userId] - Get user details
 * PATCH /api/admin/users/[userId] - Update user
 * DELETE /api/admin/users/[userId] - Delete user
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

// Validation schema for user updates
const updateUserSchema = z.object({
  username: z.string().min(3).max(30).optional(),
  display_name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  bio: z.string().max(500).optional().nullable(),
  is_verified: z.boolean().optional(),
  is_private: z.boolean().optional(),
});

async function handleGetUser(
  request: NextRequest, 
  context: AdminContext,
  routeContext: RouteContext
) {
  const { userId } = await routeContext.params;

  // Fetch user with related data
  const { data: user, error } = await adminClient
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !user) {
    return addSecurityHeaders(
      NextResponse.json({ error: 'User not found' }, { status: 404 })
    );
  }

  // Fetch additional stats
  const [postsResult, reportsResult, sessionsResult] = await Promise.all([
    adminClient
      .from('posts')
      .select('id', { count: 'exact' })
      .eq('user_id', userId),
    adminClient
      .from('reports')
      .select('id, reason_code, status, created_at', { count: 'exact' })
      .or(`reporter_id.eq.${userId},target_profile_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(10),
    adminClient
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('last_active', { ascending: false })
      .limit(10),
  ]);

  // Log the action
  await logAuditEvent({
    admin_id: context.admin.id,
    admin_email: context.admin.email,
    action_type: 'user_viewed',
    action_category: 'user_management',
    target_type: 'user',
    target_id: userId,
    target_details: { username: user.username, email: user.email },
    ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
    user_agent: request.headers.get('user-agent') || 'unknown',
    session_id: context.session.id,
  });

  return addSecurityHeaders(
    NextResponse.json({
      user,
      stats: {
        posts_count: postsResult.count || 0,
        reports_count: reportsResult.count || 0,
      },
      recent_reports: reportsResult.data || [],
      sessions: sessionsResult.data || [],
    })
  );
}

async function handleUpdateUser(
  request: NextRequest, 
  context: AdminContext,
  routeContext: RouteContext
) {
  const { userId } = await routeContext.params;

  // Parse and validate request body
  const body = await request.json();
  const validation = updateUserSchema.safeParse(body);

  if (!validation.success) {
    return addSecurityHeaders(
      NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      )
    );
  }

  // Get current user state for audit log
  const { data: currentUser, error: fetchError } = await adminClient
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (fetchError || !currentUser) {
    return addSecurityHeaders(
      NextResponse.json({ error: 'User not found' }, { status: 404 })
    );
  }

  // Update user
  const { data: updatedUser, error: updateError } = await adminClient
    .from('users')
    .update({
      ...validation.data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating user:', updateError);
    return addSecurityHeaders(
      NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    );
  }

  // Log the action
  await logAuditEvent({
    admin_id: context.admin.id,
    admin_email: context.admin.email,
    action_type: 'user_edited',
    action_category: 'user_management',
    target_type: 'user',
    target_id: userId,
    target_details: { username: currentUser.username, email: currentUser.email },
    previous_state: currentUser,
    new_state: updatedUser,
    ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
    user_agent: request.headers.get('user-agent') || 'unknown',
    session_id: context.session.id,
  });

  return addSecurityHeaders(
    NextResponse.json({ success: true, user: updatedUser })
  );
}

// Validation schema for delete action
const deleteUserSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters').optional(),
});

async function handleDeleteUser(
  request: NextRequest, 
  context: AdminContext,
  routeContext: RouteContext
) {
  const { userId } = await routeContext.params;

  // Parse optional reason from request body
  let reason = 'Your account was deleted due to violation of our Terms and Conditions.';
  try {
    const body = await request.json();
    const validation = deleteUserSchema.safeParse(body);
    if (validation.success && validation.data.reason) {
      reason = validation.data.reason;
    }
  } catch {
    // No body provided, use default reason
  }

  // Get user for audit log
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

  // Soft delete - update status to 'deleted' and set deleted_at timestamp
  const { error: updateError } = await adminClient
    .from('users')
    .update({
      status: 'deleted',
      deleted_at: new Date().toISOString(),
      deleted_by: context.admin.id,
      deleted_reason: reason,
      updated_at: new Date().toISOString(),
    } as Record<string, unknown>)
    .eq('id', userId);

  if (updateError) {
    console.error('Error deleting user:', updateError);
    return addSecurityHeaders(
      NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
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
    action_type: 'user_deleted',
    action_category: 'user_management',
    target_type: 'user',
    target_id: userId,
    target_details: { username: user.username, email: user.email },
    previous_state: user,
    reason,
    ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
    user_agent: request.headers.get('user-agent') || 'unknown',
    session_id: context.session.id,
  });

  return addSecurityHeaders(
    NextResponse.json({ success: true, message: 'User account soft deleted' })
  );
}

// Export handlers with proper context handling
export async function GET(request: NextRequest, routeContext: RouteContext) {
  const handler = withAdminAuth(
    (req, ctx) => handleGetUser(req, ctx, routeContext),
    AdminPermissionConstants.USERS_VIEW
  );
  return handler(request);
}

export async function PATCH(request: NextRequest, routeContext: RouteContext) {
  const handler = withAdminAuth(
    (req, ctx) => handleUpdateUser(req, ctx, routeContext),
    AdminPermissionConstants.USERS_EDIT
  );
  return handler(request);
}

export async function DELETE(request: NextRequest, routeContext: RouteContext) {
  const handler = withAdminAuth(
    (req, ctx) => handleDeleteUser(req, ctx, routeContext),
    AdminPermissionConstants.USERS_DELETE
  );
  return handler(request);
}

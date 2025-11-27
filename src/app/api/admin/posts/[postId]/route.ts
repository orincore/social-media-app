/**
 * Admin Post Management API
 * DELETE /api/admin/posts/[postId] - Delete a post as admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AdminPermissionConstants, addSecurityHeaders } from '@/lib/admin/middleware';
import { adminClient } from '@/lib/admin/db';
import { logAuditEvent } from '@/lib/admin/auth';
import type { AdminContext } from '@/lib/admin/middleware';

interface RouteContext {
  params: Promise<{ postId: string }>;
}

async function handleDeletePost(
  request: NextRequest,
  context: AdminContext,
  routeContext: RouteContext,
) {
  const { postId } = await routeContext.params;

  // Fetch post for audit log and existence check
  const { data: post, error: fetchError } = await adminClient
    .from('posts')
    .select('*')
    .eq('id', postId)
    .single();

  if (fetchError || !post) {
    return addSecurityHeaders(
      NextResponse.json({ error: 'Post not found' }, { status: 404 }),
    );
  }

  // Store user_id before deletion for notification
  const postOwnerId = post.user_id;

  const { error: deleteError } = await adminClient
    .from('posts')
    .delete()
    .eq('id', postId);

  if (deleteError) {
    console.error('Error deleting post as admin:', deleteError);
    return addSecurityHeaders(
      NextResponse.json({ error: 'Failed to delete post' }, { status: 500 }),
    );
  }

  // Send notification to the post owner about content removal
  // Using 'mention' type as a workaround since the DB schema doesn't have a 'system' type
  // The content clearly indicates this is a moderation action
  if (postOwnerId) {
    try {
      await adminClient
        .from('notifications')
        .insert({
          user_id: postOwnerId,
          actor_id: postOwnerId, // Self-reference as actor since actor_id is required
          type: 'mention' as const, // Using mention type for system notifications
          content: '⚠️ Your post was removed because it violates our Terms and Conditions. Please review our community guidelines to avoid future violations.',
          is_read: false,
          created_at: new Date().toISOString(),
        });
      console.log('Content removal notification sent to user:', postOwnerId);
    } catch (notifError) {
      // Log but don't fail the deletion if notification fails
      console.error('Failed to send content removal notification:', notifError);
    }
  }

  await logAuditEvent({
    admin_id: context.admin.id,
    admin_email: context.admin.email,
    action_type: 'post_deleted',
    action_category: 'content_moderation',
    target_type: 'post',
    target_id: postId,
    target_details: {
      user_id: post.user_id,
      created_at: post.created_at,
    },
    previous_state: post,
    ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
    user_agent: request.headers.get('user-agent') || 'unknown',
    session_id: context.session.id,
  });

  return addSecurityHeaders(
    NextResponse.json({ success: true }),
  );
}

export async function DELETE(request: NextRequest, routeContext: RouteContext) {
  const handler = withAdminAuth(
    (req, ctx) => handleDeletePost(req, ctx, routeContext),
    AdminPermissionConstants.POSTS_DELETE,
  );
  return handler(request);
}

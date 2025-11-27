/**
 * Admin User Posts API
 * GET /api/admin/users/[userId]/posts - List a user's posts for admin review
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AdminPermissionConstants, addSecurityHeaders } from '@/lib/admin/middleware';
import { adminClient } from '@/lib/admin/db';
import type { AdminContext } from '@/lib/admin/middleware';

interface RouteContext {
  params: Promise<{ userId: string }>;
}

async function handleGetUserPosts(
  request: NextRequest,
  _context: AdminContext,
  routeContext: RouteContext,
) {
  const { userId } = await routeContext.params;
  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
  const offset = (page - 1) * limit;

  // Fetch posts for this user (including originals, replies, reposts)
  const { data: posts, error } = await adminClient
    .from('posts')
    .select('id, content, media_urls, created_at, likes_count, replies_count, reposts_count')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching admin user posts:', error);
    return addSecurityHeaders(
      NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 }),
    );
  }

  const { count } = await adminClient
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  return addSecurityHeaders(
    NextResponse.json({
      posts: posts || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasMore: offset + limit < (count || 0),
      },
    }),
  );
}

export async function GET(request: NextRequest, routeContext: RouteContext) {
  const handler = withAdminAuth(
    (req, ctx) => handleGetUserPosts(req, ctx, routeContext),
    AdminPermissionConstants.POSTS_VIEW,
  );
  return handler(request);
}

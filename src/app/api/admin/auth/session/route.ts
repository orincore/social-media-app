/**
 * Admin Session API
 * GET /api/admin/auth/session - Get current admin session
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin/auth';
import { addSecurityHeaders } from '@/lib/admin/middleware';

export async function GET(request: NextRequest) {
  try {
    const adminData = await getAdminFromRequest(request);

    if (!adminData) {
      return addSecurityHeaders(
        NextResponse.json(
          { authenticated: false },
          { status: 401 }
        )
      );
    }

    const { admin, role } = adminData;

    return addSecurityHeaders(
      NextResponse.json({
        authenticated: true,
        admin: {
          id: admin.id,
          email: admin.email,
          username: admin.username,
          display_name: admin.display_name,
          avatar_url: admin.avatar_url,
          is_2fa_enabled: admin.is_2fa_enabled,
          last_login_at: admin.last_login_at,
        },
        role: {
          id: role.id,
          name: role.name,
          display_name: role.display_name,
          permissions: role.permissions,
        },
      })
    );
  } catch (error) {
    console.error('Admin session error:', error);
    return addSecurityHeaders(
      NextResponse.json(
        { error: 'An unexpected error occurred' },
        { status: 500 }
      )
    );
  }
}

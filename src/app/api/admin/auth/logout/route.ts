/**
 * Admin Logout API
 * POST /api/admin/auth/logout
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { 
  invalidateAdminSession, 
  getSessionCookieOptions,
  logAuditEvent,
  getAdminFromRequest
} from '@/lib/admin/auth';
import { addSecurityHeaders } from '@/lib/admin/middleware';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const cookieOptions = getSessionCookieOptions();
    const sessionToken = cookieStore.get(cookieOptions.name)?.value;

    if (sessionToken) {
      // Get admin info for audit log
      const adminData = await getAdminFromRequest(request);
      
      // Invalidate the session
      await invalidateAdminSession(sessionToken);

      // Log the logout
      if (adminData) {
        await logAuditEvent({
          admin_id: adminData.admin.id,
          admin_email: adminData.admin.email,
          action_type: 'admin_logout',
          action_category: 'auth',
          target_type: 'admin',
          target_id: adminData.admin.id,
          ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown',
          session_id: adminData.session.id,
        });
      }
    }

    // Create response and clear cookie
    const response = NextResponse.json({ success: true });
    
    response.cookies.set(cookieOptions.name, '', {
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      path: cookieOptions.path,
      maxAge: 0, // Expire immediately
    });

    return addSecurityHeaders(response);
  } catch (error) {
    console.error('Admin logout error:', error);
    return addSecurityHeaders(
      NextResponse.json(
        { error: 'An unexpected error occurred' },
        { status: 500 }
      )
    );
  }
}

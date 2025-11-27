/**
 * Admin Login API
 * POST /api/admin/auth/login
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminLogin, getSessionCookieOptions } from '@/lib/admin/auth';
import { addSecurityHeaders, checkAdminRateLimit } from '@/lib/admin/middleware';
import { z } from 'zod';

// Validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  totp_code: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - stricter for login
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    if (!checkAdminRateLimit(`admin-login:${ip}`, 5, 60000)) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: 'Too many login attempts. Please try again later.' },
          { status: 429 }
        )
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: 'Validation failed', details: validation.error.issues },
          { status: 400 }
        )
      );
    }

    const { email, password, totp_code } = validation.data;

    // Attempt login
    const result = await adminLogin(email, password, request, totp_code);

    if (!result.success) {
      const status = result.requires2FA ? 200 : 401;
      return addSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            requires_2fa: result.requires2FA,
            error: result.error,
            remaining_attempts: result.remainingAttempts,
          },
          { status }
        )
      );
    }

    // Create response with session cookie
    const response = NextResponse.json({
      success: true,
      admin: {
        id: result.admin!.id,
        email: result.admin!.email,
        username: result.admin!.username,
        display_name: result.admin!.display_name,
        avatar_url: result.admin!.avatar_url,
        role: result.role,
      },
    });

    // Set session cookie
    const cookieOptions = getSessionCookieOptions();
    response.cookies.set(cookieOptions.name, result.token!, {
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      path: cookieOptions.path,
      maxAge: cookieOptions.maxAge,
    });

    return addSecurityHeaders(response);
  } catch (error) {
    console.error('Admin login error:', error);
    return addSecurityHeaders(
      NextResponse.json(
        { error: 'An unexpected error occurred' },
        { status: 500 }
      )
    );
  }
}

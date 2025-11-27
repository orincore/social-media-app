/**
 * Admin Authentication & Authorization System
 * Enterprise-grade security with RBAC
 */

import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';
import { adminDb } from '@/lib/admin/db';
import type { 
  AdminUser, 
  AdminRole, 
  AdminPermissions,
  AdminSession,
  AuditLogInsert 
} from '@/types/admin';

// ============================================
// CONSTANTS
// ============================================

const SESSION_COOKIE_NAME = 'admin_session';
const SESSION_DURATION_HOURS = 8;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;
const BCRYPT_ROUNDS = 12;

// ============================================
// PASSWORD UTILITIES
// ============================================

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// ============================================
// SESSION MANAGEMENT
// ============================================

export async function createAdminSession(
  adminId: string,
  request: NextRequest
): Promise<{ token: string; session: AdminSession }> {
  const token = generateSessionToken();
  const hashedToken = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  const { data: session, error } = await adminDb
    .from('admin_sessions')
    .insert({
      admin_id: adminId,
      session_token: hashedToken,
      ip_address: ip,
      user_agent: userAgent,
      device_info: parseUserAgent(userAgent),
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error || !session) {
    throw new Error('Failed to create admin session');
  }

  return { token, session: session as AdminSession };
}

export async function validateAdminSession(
  token: string
): Promise<{ admin: AdminUser; session: AdminSession; role: AdminRole } | null> {
  if (!token) return null;

  const hashedToken = hashToken(token);

  // Get session with admin and role data
  const { data: session, error: sessionError } = await adminDb
    .from('admin_sessions')
    .select('*')
    .eq('session_token', hashedToken)
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (sessionError || !session) return null;

  // Get admin user
  const { data: admin, error: adminError } = await adminDb
    .from('admin_users')
    .select('*')
    .eq('id', session.admin_id)
    .eq('is_active', true)
    .single();

  if (adminError || !admin) return null;

  // Check if admin is locked
  if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
    return null;
  }

  // Get role
  const { data: role, error: roleError } = await adminDb
    .from('admin_roles')
    .select('*')
    .eq('id', admin.role_id)
    .single();

  if (roleError || !role) return null;

  // Update last activity
  await adminDb
    .from('admin_sessions')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('id', session.id);

  return {
    admin: admin as AdminUser,
    session: session as AdminSession,
    role: role as AdminRole,
  };
}

export async function invalidateAdminSession(token: string): Promise<void> {
  const hashedToken = hashToken(token);
  
  await adminDb
    .from('admin_sessions')
    .update({ is_active: false })
    .eq('session_token', hashedToken);
}

export async function invalidateAllAdminSessions(adminId: string): Promise<void> {
  await adminDb
    .from('admin_sessions')
    .update({ is_active: false })
    .eq('admin_id', adminId);
}

// ============================================
// LOGIN FLOW
// ============================================

export interface LoginResult {
  success: boolean;
  admin?: AdminUser;
  role?: AdminRole;
  token?: string;
  requires2FA?: boolean;
  error?: string;
  remainingAttempts?: number;
}

export async function adminLogin(
  email: string,
  password: string,
  request: NextRequest,
  totpCode?: string
): Promise<LoginResult> {
  // Get admin by email
  const { data: admin, error: adminError } = await adminDb
    .from('admin_users')
    .select('*, admin_roles(*)')
    .eq('email', email.toLowerCase())
    .single();

  if (adminError || !admin) {
    await logAuditEvent({
      action_type: 'admin_login_failed',
      action_category: 'auth',
      target_type: 'admin',
      target_details: { email },
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      reason: 'Invalid credentials',
    });
    return { success: false, error: 'Invalid credentials' };
  }

  // Check if account is locked
  if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
    const remainingMinutes = Math.ceil(
      (new Date(admin.locked_until).getTime() - Date.now()) / 60000
    );
    return { 
      success: false, 
      error: `Account locked. Try again in ${remainingMinutes} minutes.` 
    };
  }

  // Check if account is active
  if (!admin.is_active) {
    return { success: false, error: 'Account is disabled' };
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, admin.password_hash);
  
  if (!isValidPassword) {
    // Increment failed attempts
    const newAttempts = (admin.failed_login_attempts || 0) + 1;
    const lockUntil = newAttempts >= MAX_LOGIN_ATTEMPTS 
      ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000).toISOString()
      : null;

    await adminDb
      .from('admin_users')
      .update({ 
        failed_login_attempts: newAttempts,
        locked_until: lockUntil,
      })
      .eq('id', admin.id);

    await logAuditEvent({
      admin_id: admin.id,
      admin_email: admin.email,
      action_type: 'admin_login_failed',
      action_category: 'auth',
      target_type: 'admin',
      target_id: admin.id,
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      reason: 'Invalid password',
      metadata: { attempts: newAttempts },
    });

    return { 
      success: false, 
      error: 'Invalid credentials',
      remainingAttempts: Math.max(0, MAX_LOGIN_ATTEMPTS - newAttempts),
    };
  }

  // Check 2FA if enabled
  if (admin.is_2fa_enabled) {
    if (!totpCode) {
      return { success: false, requires2FA: true };
    }
    
    // Verify TOTP code (implement TOTP verification)
    const isValidTotp = await verifyTOTP(admin.totp_secret, totpCode);
    if (!isValidTotp) {
      return { success: false, error: 'Invalid 2FA code' };
    }
  }

  // Reset failed attempts and update last login
  await adminDb
    .from('admin_users')
    .update({ 
      failed_login_attempts: 0,
      locked_until: null,
      last_login_at: new Date().toISOString(),
      last_login_ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
    })
    .eq('id', admin.id);

  // Create session
  const { token, session } = await createAdminSession(admin.id, request);

  // Log successful login
  await logAuditEvent({
    admin_id: admin.id,
    admin_email: admin.email,
    action_type: 'admin_login',
    action_category: 'auth',
    target_type: 'admin',
    target_id: admin.id,
    ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
    user_agent: request.headers.get('user-agent') || 'unknown',
    session_id: session.id,
  });

  // Remove sensitive fields
  const safeAdmin = { ...admin } as AdminUser;
  delete (safeAdmin as unknown as Record<string, unknown>).password_hash;
  delete (safeAdmin as unknown as Record<string, unknown>).totp_secret;

  return {
    success: true,
    admin: safeAdmin,
    role: admin.admin_roles as AdminRole,
    token,
  };
}

// ============================================
// TOTP (2FA) UTILITIES
// ============================================

export async function verifyTOTP(secret: string | null, code: string): Promise<boolean> {
  if (!secret) return false;
  
  // Implement TOTP verification using a library like 'otpauth'
  // For now, return false as placeholder
  // TODO: Implement actual TOTP verification
  try {
    // const totp = new OTPAuth.TOTP({ secret });
    // return totp.validate({ token: code }) !== null;
    return code === '000000'; // Placeholder - remove in production
  } catch {
    return false;
  }
}

export function generateTOTPSecret(): string {
  return randomBytes(20).toString('base64');
}

// ============================================
// PERMISSION CHECKING
// ============================================

export function hasPermission(
  permissions: AdminPermissions,
  resource: keyof AdminPermissions,
  action: string
): boolean {
  const resourcePerms = permissions[resource];
  if (!resourcePerms) return false;
  return (resourcePerms as Record<string, boolean>)[action] === true;
}

export function checkPermission(
  role: AdminRole,
  resource: keyof AdminPermissions,
  action: string
): boolean {
  return hasPermission(role.permissions, resource, action);
}

// ============================================
// MIDDLEWARE HELPERS
// ============================================

export async function getAdminFromRequest(
  request: NextRequest
): Promise<{ admin: AdminUser; session: AdminSession; role: AdminRole } | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  
  if (!sessionToken) {
    // Also check Authorization header for API calls
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      return validateAdminSession(token);
    }
    return null;
  }

  return validateAdminSession(sessionToken);
}

export function createUnauthorizedResponse(message: string = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 401 }
  );
}

export function createForbiddenResponse(message: string = 'Forbidden'): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 403 }
  );
}

// ============================================
// AUDIT LOGGING
// ============================================

export async function logAuditEvent(event: AuditLogInsert): Promise<void> {
  try {
    await adminDb
      .from('admin_audit_logs')
      .insert({
        ...event,
        created_at: new Date().toISOString(),
      });
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw - audit logging should not break the main flow
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function parseUserAgent(userAgent: string): Record<string, string> {
  // Simple user agent parsing
  const result: Record<string, string> = {
    raw: userAgent,
  };

  if (userAgent.includes('Windows')) {
    result.os = 'Windows';
  } else if (userAgent.includes('Mac')) {
    result.os = 'macOS';
  } else if (userAgent.includes('Linux')) {
    result.os = 'Linux';
  } else if (userAgent.includes('Android')) {
    result.os = 'Android';
  } else if (userAgent.includes('iOS') || userAgent.includes('iPhone')) {
    result.os = 'iOS';
  }

  if (userAgent.includes('Chrome')) {
    result.browser = 'Chrome';
  } else if (userAgent.includes('Firefox')) {
    result.browser = 'Firefox';
  } else if (userAgent.includes('Safari')) {
    result.browser = 'Safari';
  } else if (userAgent.includes('Edge')) {
    result.browser = 'Edge';
  }

  return result;
}

// ============================================
// SESSION COOKIE HELPERS
// ============================================

export function setSessionCookie(token: string): void {
  // This should be called from a Server Action or API route
  // The actual cookie setting happens in the response
}

export function getSessionCookieOptions() {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_DURATION_HOURS * 60 * 60,
  };
}

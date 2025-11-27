/**
 * Admin RBAC Middleware
 * Protects admin routes with role-based access control
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getAdminFromRequest, 
  createUnauthorizedResponse, 
  createForbiddenResponse,
  checkPermission,
  logAuditEvent
} from './auth';
import type { AdminPermissions, AdminRole, AdminUser, AdminSession } from '@/types/admin';

// ============================================
// TYPES
// ============================================

export interface AdminContext {
  admin: AdminUser;
  session: AdminSession;
  role: AdminRole;
}

export type AdminRouteHandler = (
  request: NextRequest,
  context: AdminContext
) => Promise<NextResponse>;

export interface PermissionRequirement {
  resource: keyof AdminPermissions;
  action: string;
}

// ============================================
// MIDDLEWARE WRAPPER
// ============================================

/**
 * Wraps an admin route handler with authentication and authorization
 */
export function withAdminAuth(
  handler: AdminRouteHandler,
  permissions?: PermissionRequirement | PermissionRequirement[]
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Get admin from request
      const adminData = await getAdminFromRequest(request);
      
      if (!adminData) {
        return createUnauthorizedResponse('Admin authentication required');
      }

      const { admin, session, role } = adminData;

      // Check permissions if specified
      if (permissions) {
        const permissionList = Array.isArray(permissions) ? permissions : [permissions];
        
        for (const perm of permissionList) {
          if (!checkPermission(role, perm.resource, perm.action)) {
            await logAuditEvent({
              admin_id: admin.id,
              admin_email: admin.email,
              action_type: 'admin_login_failed',
              action_category: 'auth',
              target_type: 'permission',
              target_details: { 
                required_resource: perm.resource, 
                required_action: perm.action 
              },
              ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
              user_agent: request.headers.get('user-agent') || 'unknown',
              reason: 'Insufficient permissions',
            });

            return createForbiddenResponse(
              `Insufficient permissions: ${perm.resource}.${perm.action} required`
            );
          }
        }
      }

      // Call the handler with admin context
      return handler(request, { admin, session, role });
    } catch (error) {
      console.error('Admin middleware error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

// ============================================
// PERMISSION HELPERS
// ============================================

export const AdminPermissionConstants = {
  // User management
  USERS_VIEW: { resource: 'users' as const, action: 'view' },
  USERS_EDIT: { resource: 'users' as const, action: 'edit' },
  USERS_BAN: { resource: 'users' as const, action: 'ban' },
  USERS_DELETE: { resource: 'users' as const, action: 'delete' },
  USERS_EXPORT: { resource: 'users' as const, action: 'export' },

  // Reports management
  REPORTS_VIEW: { resource: 'reports' as const, action: 'view' },
  REPORTS_MANAGE: { resource: 'reports' as const, action: 'manage' },
  REPORTS_ASSIGN: { resource: 'reports' as const, action: 'assign' },
  REPORTS_RESOLVE: { resource: 'reports' as const, action: 'resolve' },

  // Posts management
  POSTS_VIEW: { resource: 'posts' as const, action: 'view' },
  POSTS_EDIT: { resource: 'posts' as const, action: 'edit' },
  POSTS_DELETE: { resource: 'posts' as const, action: 'delete' },
  POSTS_MODERATE: { resource: 'posts' as const, action: 'moderate' },

  // Comments management
  COMMENTS_VIEW: { resource: 'comments' as const, action: 'view' },
  COMMENTS_EDIT: { resource: 'comments' as const, action: 'edit' },
  COMMENTS_DELETE: { resource: 'comments' as const, action: 'delete' },
  COMMENTS_MODERATE: { resource: 'comments' as const, action: 'moderate' },

  // Analytics
  ANALYTICS_VIEW: { resource: 'analytics' as const, action: 'view' },
  ANALYTICS_EXPORT: { resource: 'analytics' as const, action: 'export' },

  // Settings
  SETTINGS_VIEW: { resource: 'settings' as const, action: 'view' },
  SETTINGS_EDIT: { resource: 'settings' as const, action: 'edit' },

  // Admin management
  ADMINS_VIEW: { resource: 'admins' as const, action: 'view' },
  ADMINS_CREATE: { resource: 'admins' as const, action: 'create' },
  ADMINS_EDIT: { resource: 'admins' as const, action: 'edit' },
  ADMINS_DELETE: { resource: 'admins' as const, action: 'delete' },

  // Audit logs
  AUDIT_LOGS_VIEW: { resource: 'audit_logs' as const, action: 'view' },
  AUDIT_LOGS_EXPORT: { resource: 'audit_logs' as const, action: 'export' },
};

// ============================================
// RATE LIMITING FOR ADMIN ROUTES
// ============================================

const adminRateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkAdminRateLimit(
  identifier: string, 
  limit: number = 60, 
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const record = adminRateLimitMap.get(identifier);

  // Clean old entries periodically
  if (adminRateLimitMap.size > 1000) {
    for (const [key, value] of adminRateLimitMap.entries()) {
      if (value.resetAt < now) {
        adminRateLimitMap.delete(key);
      }
    }
  }

  if (!record || record.resetAt < now) {
    adminRateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Wraps an admin route with rate limiting
 */
export function withAdminRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  limit: number = 60,
  windowMs: number = 60000
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    const identifier = `admin:${ip}:${request.nextUrl.pathname}`;
    
    if (!checkAdminRateLimit(identifier, limit, windowMs)) {
      return NextResponse.json(
        { error: 'Too many requests', message: 'Rate limit exceeded' },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil(windowMs / 1000).toString(),
          }
        }
      );
    }

    return handler(request);
  };
}

// ============================================
// SECURITY HEADERS
// ============================================

export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy for admin panel
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
  );
  
  // Prevent caching of sensitive admin data
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  
  return response;
}

// ============================================
// IP ALLOWLIST CHECK
// ============================================

export async function checkIPAllowlist(
  ip: string,
  adminDb: ReturnType<typeof import('@supabase/supabase-js').createClient>
): Promise<boolean> {
  // Check if IP allowlist is enabled
  const { data: allowlist, error } = await adminDb
    .from('admin_ip_allowlist')
    .select('*')
    .eq('is_active', true);

  if (error || !allowlist || allowlist.length === 0) {
    // No allowlist configured, allow all IPs
    return true;
  }

  // Check if IP is in the allowlist
  const now = new Date();
  return allowlist.some((entry: { ip_address: string; expires_at: string | null }) => {
    if (entry.expires_at && new Date(entry.expires_at) < now) {
      return false;
    }
    return entry.ip_address === ip || entry.ip_address === '*';
  });
}

/**
 * Admin Panel Type Definitions
 * Enterprise-grade type safety for admin operations
 */

// ============================================
// ROLE & PERMISSION TYPES
// ============================================

export type AdminRoleName = 'super_admin' | 'admin' | 'moderator';

export interface AdminPermissions {
  users: {
    view: boolean;
    edit: boolean;
    ban: boolean;
    delete: boolean;
    export: boolean;
  };
  reports: {
    view: boolean;
    manage: boolean;
    assign: boolean;
    resolve: boolean;
  };
  posts: {
    view: boolean;
    edit: boolean;
    delete: boolean;
    moderate: boolean;
  };
  comments: {
    view: boolean;
    edit: boolean;
    delete: boolean;
    moderate: boolean;
  };
  analytics: {
    view: boolean;
    export: boolean;
  };
  settings: {
    view: boolean;
    edit: boolean;
  };
  admins: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  audit_logs: {
    view: boolean;
    export: boolean;
  };
}

export interface AdminRole {
  id: string;
  name: AdminRoleName;
  display_name: string;
  description: string | null;
  permissions: AdminPermissions;
  is_system_role: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// ADMIN USER TYPES
// ============================================

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  role_id: string | null;
  role?: AdminRole;
  is_active: boolean;
  is_2fa_enabled: boolean;
  last_login_at: string | null;
  last_login_ip: string | null;
  failed_login_attempts: number;
  locked_until: string | null;
  password_changed_at: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface AdminUserInsert {
  email: string;
  username: string;
  password_hash: string;
  display_name: string;
  avatar_url?: string | null;
  role_id?: string | null;
  is_active?: boolean;
  is_2fa_enabled?: boolean;
  totp_secret?: string | null;
  created_by?: string | null;
}

export interface AdminUserUpdate {
  email?: string;
  username?: string;
  password_hash?: string;
  display_name?: string;
  avatar_url?: string | null;
  role_id?: string | null;
  is_active?: boolean;
  is_2fa_enabled?: boolean;
  totp_secret?: string | null;
  failed_login_attempts?: number;
  locked_until?: string | null;
}

// ============================================
// ADMIN SESSION TYPES
// ============================================

export interface AdminSession {
  id: string;
  admin_id: string;
  session_token: string;
  ip_address: string | null;
  user_agent: string | null;
  device_info: Record<string, unknown>;
  is_active: boolean;
  last_activity_at: string;
  created_at: string;
  expires_at: string;
}

export interface AdminSessionInsert {
  admin_id: string;
  session_token: string;
  ip_address?: string | null;
  user_agent?: string | null;
  device_info?: Record<string, unknown>;
  expires_at: string;
}

// ============================================
// AUDIT LOG TYPES
// ============================================

export type AuditActionCategory = 
  | 'auth'
  | 'user_management'
  | 'report_management'
  | 'content_moderation'
  | 'system_settings'
  | 'admin_management';

export type AuditActionType =
  // Auth actions
  | 'admin_login'
  | 'admin_logout'
  | 'admin_login_failed'
  | 'admin_2fa_enabled'
  | 'admin_2fa_disabled'
  | 'admin_password_changed'
  // User management actions
  | 'user_viewed'
  | 'user_edited'
  | 'user_banned'
  | 'user_unbanned'
  | 'user_warned'
  | 'user_deleted'
  | 'user_sessions_revoked'
  | 'user_email_reset'
  | 'user_username_reset'
  // Report management actions
  | 'report_viewed'
  | 'report_status_changed'
  | 'report_assigned'
  | 'report_escalated'
  | 'report_resolved'
  | 'report_dismissed'
  | 'report_note_added'
  // Content moderation actions
  | 'post_deleted'
  | 'post_hidden'
  | 'post_restored'
  | 'comment_deleted'
  | 'comment_hidden'
  | 'comment_restored'
  // System settings actions
  | 'settings_updated'
  | 'ip_allowlist_updated'
  // Admin management actions
  | 'admin_created'
  | 'admin_updated'
  | 'admin_deleted'
  | 'admin_role_changed';

export interface AuditLog {
  id: string;
  admin_id: string | null;
  admin_email: string | null;
  action_type: AuditActionType;
  action_category: AuditActionCategory;
  target_type: string | null;
  target_id: string | null;
  target_details: Record<string, unknown>;
  previous_state: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  session_id: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AuditLogInsert {
  admin_id?: string | null;
  admin_email?: string | null;
  action_type: AuditActionType;
  action_category: AuditActionCategory;
  target_type?: string | null;
  target_id?: string | null;
  target_details?: Record<string, unknown>;
  previous_state?: Record<string, unknown> | null;
  new_state?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  session_id?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}

// ============================================
// USER STATUS TYPES (Extended)
// ============================================

export type UserStatus = 'active' | 'suspended' | 'banned' | 'deleted';

export interface UserWithAdminDetails {
  id: string;
  email: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  location: string | null;
  website: string | null;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  birth_date: string | null;
  is_verified: boolean;
  is_private: boolean;
  followers_count: number;
  following_count: number;
  posts_count: number;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
  // Admin-specific fields
  status: UserStatus;
  banned_at: string | null;
  banned_by: string | null;
  ban_reason: string | null;
  ban_expires_at: string | null;
  suspension_count: number;
  last_warning_at: string | null;
  warning_count: number;
  risk_score: number;
}

// ============================================
// REPORT TYPES (Extended)
// ============================================

export type ReportPriority = 'low' | 'normal' | 'high' | 'urgent';
export type ReportStatus = 'pending' | 'investigating' | 'reviewed' | 'resolved' | 'dismissed';
export type ReportResolutionType = 
  | 'no_action'
  | 'warning_issued'
  | 'content_removed'
  | 'user_suspended'
  | 'user_banned'
  | 'false_report';

export interface ReportWithDetails {
  id: string;
  reporter_id: string;
  reporter?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  target_type: 'message' | 'profile' | 'post';
  target_message_id: string | null;
  target_profile_id: string | null;
  target_post_id: string | null;
  target_user?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    status: UserStatus;
    warning_count: number;
    suspension_count: number;
  };
  target_post?: {
    id: string;
    content: string;
    media_urls: string[] | null;
    created_at: string;
  };
  reason_code: string;
  reason_text: string | null;
  status: ReportStatus;
  priority: ReportPriority;
  assigned_to: string | null;
  assigned_admin?: {
    id: string;
    username: string;
    display_name: string;
  };
  resolution_type: ReportResolutionType | null;
  resolution_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  escalated_at: string | null;
  escalated_by: string | null;
  created_at: string;
  notes?: ReportNote[];
}

export interface ReportNote {
  id: string;
  report_id: string;
  admin_id: string;
  admin?: {
    id: string;
    username: string;
    display_name: string;
  };
  content: string;
  is_internal: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// ANALYTICS TYPES
// ============================================

export interface DashboardStats {
  totalUsers: number;
  activeUsers24h: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  bannedUsers: number;
  suspendedUsers: number;
  totalPosts: number;
  postsToday: number;
  totalReports: number;
  pendingReports: number;
  resolvedReportsToday: number;
  averageResolutionTime: number; // in hours
}

export interface UserGrowthData {
  date: string;
  newUsers: number;
  totalUsers: number;
}

export interface ReportTrendData {
  date: string;
  total: number;
  pending: number;
  resolved: number;
}

export interface ContentStats {
  totalPosts: number;
  totalComments: number;
  totalLikes: number;
  totalReposts: number;
  postsWithMedia: number;
  averagePostsPerUser: number;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  database: {
    status: 'connected' | 'disconnected';
    latency: number;
  };
  storage: {
    status: 'connected' | 'disconnected';
    usage: number;
  };
  lastChecked: string;
}

// ============================================
// SYSTEM ALERT TYPES
// ============================================

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';
export type AlertType = 
  | 'high_report_volume'
  | 'suspicious_activity'
  | 'system_error'
  | 'security_alert'
  | 'user_complaint'
  | 'content_violation';

export interface SystemAlert {
  id: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  is_read: boolean;
  read_by: string | null;
  read_at: string | null;
  created_at: string;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface AdminLoginRequest {
  email: string;
  password: string;
  totp_code?: string;
}

export interface AdminLoginResponse {
  success: boolean;
  admin?: Omit<AdminUser, 'password_hash' | 'totp_secret'>;
  session_token?: string;
  requires_2fa?: boolean;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface UserSearchParams {
  query?: string;
  status?: UserStatus;
  sortBy?: 'created_at' | 'username' | 'email' | 'posts_count' | 'risk_score';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ReportSearchParams {
  status?: ReportStatus;
  priority?: ReportPriority;
  target_type?: 'message' | 'profile' | 'post';
  assigned_to?: string;
  sortBy?: 'created_at' | 'priority' | 'status';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface AuditLogSearchParams {
  admin_id?: string;
  action_category?: AuditActionCategory;
  action_type?: AuditActionType;
  target_type?: string;
  target_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

// ============================================
// ACTION TYPES
// ============================================

export interface BanUserAction {
  user_id: string;
  reason: string;
  duration?: number; // in days, null for permanent
  notify_user?: boolean;
}

export interface WarnUserAction {
  user_id: string;
  reason: string;
  notify_user?: boolean;
}

export interface ResolveReportAction {
  report_id: string;
  resolution_type: ReportResolutionType;
  resolution_notes?: string;
  action_taken?: {
    type: 'warn' | 'suspend' | 'ban' | 'delete_content';
    target_id: string;
    duration?: number;
  };
}

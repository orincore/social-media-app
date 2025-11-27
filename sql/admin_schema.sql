-- ============================================
-- ADMIN PANEL DATABASE SCHEMA
-- ============================================
-- This file contains the SQL schema for the admin panel.
-- Run this in your Supabase SQL editor to create the required tables.

-- ============================================
-- 1. ADMIN ROLES TABLE
-- ============================================
-- Defines the available admin roles with their permissions

CREATE TABLE IF NOT EXISTS admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}',
  is_system_role BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default roles
INSERT INTO admin_roles (name, display_name, description, permissions, is_system_role) VALUES
(
  'super_admin',
  'Super Administrator',
  'Full system control with all permissions',
  '{
    "users": {"view": true, "edit": true, "ban": true, "delete": true, "export": true},
    "reports": {"view": true, "manage": true, "assign": true, "resolve": true},
    "posts": {"view": true, "edit": true, "delete": true, "moderate": true},
    "comments": {"view": true, "edit": true, "delete": true, "moderate": true},
    "analytics": {"view": true, "export": true},
    "settings": {"view": true, "edit": true},
    "admins": {"view": true, "create": true, "edit": true, "delete": true},
    "audit_logs": {"view": true, "export": true}
  }',
  TRUE
),
(
  'admin',
  'Administrator',
  'User and report management with limited system access',
  '{
    "users": {"view": true, "edit": true, "ban": true, "delete": false, "export": true},
    "reports": {"view": true, "manage": true, "assign": false, "resolve": true},
    "posts": {"view": true, "edit": false, "delete": true, "moderate": true},
    "comments": {"view": true, "edit": false, "delete": true, "moderate": true},
    "analytics": {"view": true, "export": false},
    "settings": {"view": true, "edit": false},
    "admins": {"view": true, "create": false, "edit": false, "delete": false},
    "audit_logs": {"view": true, "export": false}
  }',
  TRUE
),
(
  'moderator',
  'Moderator',
  'Reports and content moderation only',
  '{
    "users": {"view": true, "edit": false, "ban": false, "delete": false, "export": false},
    "reports": {"view": true, "manage": true, "assign": false, "resolve": true},
    "posts": {"view": true, "edit": false, "delete": false, "moderate": true},
    "comments": {"view": true, "edit": false, "delete": false, "moderate": true},
    "analytics": {"view": false, "export": false},
    "settings": {"view": false, "edit": false},
    "admins": {"view": false, "create": false, "edit": false, "delete": false},
    "audit_logs": {"view": false, "export": false}
  }',
  TRUE
)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 2. ADMIN USERS TABLE
-- ============================================
-- Stores admin accounts separately from regular users

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  role_id UUID REFERENCES admin_roles(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  is_2fa_enabled BOOLEAN DEFAULT FALSE,
  totp_secret VARCHAR(255),
  last_login_at TIMESTAMPTZ,
  last_login_ip VARCHAR(45),
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  password_changed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
CREATE INDEX IF NOT EXISTS idx_admin_users_role_id ON admin_users(role_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_is_active ON admin_users(is_active);

-- ============================================
-- 3. ADMIN SESSIONS TABLE
-- ============================================
-- Tracks active admin sessions for security

CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_info JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id ON admin_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);

-- ============================================
-- 4. ADMIN AUDIT LOGS TABLE
-- ============================================
-- Immutable log of all admin actions for security auditing

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  admin_email VARCHAR(255),
  action_type VARCHAR(100) NOT NULL,
  action_category VARCHAR(50) NOT NULL,
  target_type VARCHAR(50),
  target_id VARCHAR(255),
  target_details JSONB DEFAULT '{}',
  previous_state JSONB,
  new_state JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  session_id UUID REFERENCES admin_sessions(id) ON DELETE SET NULL,
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON admin_audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_category ON admin_audit_logs(action_category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_type ON admin_audit_logs(target_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_id ON admin_audit_logs(target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON admin_audit_logs(created_at DESC);

-- ============================================
-- 5. USER STATUS TRACKING (EXTEND USERS TABLE)
-- ============================================
-- Add ban-related columns to the existing users table

ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_by UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_warning_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS warning_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_banned_at ON users(banned_at);

-- ============================================
-- 6. REPORT NOTES TABLE
-- ============================================
-- Internal notes for reports (staff comments)

CREATE TABLE IF NOT EXISTS report_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_notes_report_id ON report_notes(report_id);
CREATE INDEX IF NOT EXISTS idx_report_notes_admin_id ON report_notes(admin_id);

-- ============================================
-- 7. EXTEND REPORTS TABLE
-- ============================================
-- Add additional fields to the reports table

ALTER TABLE reports ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES admin_users(id) ON DELETE SET NULL;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolution_type VARCHAR(50);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS escalated_by UUID REFERENCES admin_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reports_priority ON reports(priority);
CREATE INDEX IF NOT EXISTS idx_reports_assigned_to ON reports(assigned_to);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- ============================================
-- 8. USER ACTIVITY LOGS TABLE
-- ============================================
-- Tracks user activity for admin investigation

CREATE TABLE IF NOT EXISTS user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  activity_details JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON user_activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity_logs(created_at DESC);

-- ============================================
-- 9. SYSTEM ALERTS TABLE
-- ============================================
-- For admin dashboard alerts and notifications

CREATE TABLE IF NOT EXISTS system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'info',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  read_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_alerts_type ON system_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_system_alerts_is_read ON system_alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_system_alerts_created_at ON system_alerts(created_at DESC);

-- ============================================
-- 10. ANALYTICS CACHE TABLE
-- ============================================
-- Caches computed analytics for dashboard performance

CREATE TABLE IF NOT EXISTS analytics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR(100) NOT NULL,
  metric_value JSONB NOT NULL,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(metric_name, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_analytics_cache_metric ON analytics_cache(metric_name);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires ON analytics_cache(expires_at);

-- ============================================
-- 11. IP ALLOWLIST TABLE (OPTIONAL)
-- ============================================
-- For restricting admin access to specific IPs

CREATE TABLE IF NOT EXISTS admin_ip_allowlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address VARCHAR(45) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ip_allowlist_ip ON admin_ip_allowlist(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_allowlist_active ON admin_ip_allowlist(is_active);

-- ============================================
-- 12. FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_roles_updated_at ON admin_roles;
CREATE TRIGGER update_admin_roles_updated_at
  BEFORE UPDATE ON admin_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_report_notes_updated_at ON report_notes;
CREATE TRIGGER update_report_notes_updated_at
  BEFORE UPDATE ON report_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean expired admin sessions
CREATE OR REPLACE FUNCTION clean_expired_admin_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM admin_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to increment failed login attempts
CREATE OR REPLACE FUNCTION increment_failed_login(admin_email VARCHAR)
RETURNS void AS $$
DECLARE
  current_attempts INTEGER;
BEGIN
  UPDATE admin_users 
  SET failed_login_attempts = failed_login_attempts + 1,
      locked_until = CASE 
        WHEN failed_login_attempts >= 4 THEN NOW() + INTERVAL '30 minutes'
        ELSE locked_until
      END
  WHERE email = admin_email;
END;
$$ LANGUAGE plpgsql;

-- Function to reset failed login attempts on successful login
CREATE OR REPLACE FUNCTION reset_failed_login(admin_email VARCHAR)
RETURNS void AS $$
BEGIN
  UPDATE admin_users 
  SET failed_login_attempts = 0,
      locked_until = NULL,
      last_login_at = NOW()
  WHERE email = admin_email;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 13. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on admin tables
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

-- Note: Since admin operations use the service role key, 
-- RLS policies are bypassed. These are here for additional security
-- if you ever need to use anon/authenticated roles.

-- ============================================
-- 14. INITIAL SUPER ADMIN ACCOUNT
-- ============================================
-- Create a default super admin account
-- Password: Admin@123456 (bcrypt hash)
-- IMPORTANT: Change this password immediately after first login!

INSERT INTO admin_users (
  email,
  username,
  password_hash,
  display_name,
  role_id,
  is_active
) 
SELECT 
  'admin@socialpulse.app',
  'superadmin',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYWvqGPjKK2G', -- Admin@123456
  'Super Administrator',
  (SELECT id FROM admin_roles WHERE name = 'super_admin'),
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM admin_users WHERE email = 'admin@socialpulse.app'
);

-- ============================================
-- SCHEMA COMPLETE
-- ============================================
-- After running this script:
-- 1. Change the default admin password immediately
-- 2. Set up 2FA for all admin accounts
-- 3. Configure IP allowlist if needed
-- 4. Review and adjust role permissions as needed

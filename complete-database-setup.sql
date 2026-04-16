-- =============================================================================
-- SOCIAL MEDIA APP - COMPLETE DATABASE SETUP
-- =============================================================================
-- Run this entire script in your Supabase SQL Editor to recreate the database
-- Order: Core Tables → Settings → Admin → Moderation → Functions → Policies
-- =============================================================================

-- =============================================================================
-- SECTION 1: CORE TABLES
-- =============================================================================

-- Users table (for NextAuth.js - manages its own auth)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    banner_url TEXT,
    location TEXT,
    website TEXT,
    gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    birth_date DATE,
    is_verified BOOLEAN DEFAULT FALSE,
    is_private BOOLEAN DEFAULT FALSE,
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    posts_count INTEGER DEFAULT 0,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    -- Admin/moderation fields
    status VARCHAR(20) DEFAULT 'active',
    banned_at TIMESTAMPTZ,
    banned_by UUID,
    ban_reason TEXT,
    ban_expires_at TIMESTAMPTZ,
    suspension_count INTEGER DEFAULT 0,
    last_warning_at TIMESTAMPTZ,
    warning_count INTEGER DEFAULT 0,
    risk_score INTEGER DEFAULT 0,
    is_suspended BOOLEAN DEFAULT FALSE,
    suspended_at TIMESTAMPTZ,
    suspension_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    media_urls TEXT[],
    hashtags TEXT[],
    mentions TEXT[],
    reply_to_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    repost_of_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    likes_count INTEGER DEFAULT 0,
    reposts_count INTEGER DEFAULT 0,
    replies_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deletion_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    media_urls TEXT[],
    likes_count INTEGER DEFAULT 0,
    replies_count INTEGER DEFAULT 0,
    reply_to_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Likes table
CREATE TABLE IF NOT EXISTS likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_like_target CHECK (
        (post_id IS NOT NULL AND comment_id IS NULL) OR
        (post_id IS NULL AND comment_id IS NOT NULL)
    ),
    UNIQUE(user_id, post_id, comment_id)
);

-- Follows table
CREATE TABLE IF NOT EXISTS follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(follower_id, following_id)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'mention', 'repost', 'content_violation', 'account_suspended')),
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chats table
CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participants UUID[] NOT NULL,
    last_message_id UUID,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    media_urls TEXT[],
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hashtags table
CREATE TABLE IF NOT EXISTS hashtags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    posts_count INTEGER DEFAULT 0,
    trending_score INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media uploads table
CREATE TABLE IF NOT EXISTS media_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    width INTEGER,
    height INTEGER,
    duration INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);

-- =============================================================================
-- SECTION 2: USER SETTINGS & SESSIONS
-- =============================================================================

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_preferences JSONB DEFAULT '{
        "mentions": true,
        "community": true,
        "product": false,
        "login_alerts": true,
        "email_notifications": true,
        "push_notifications": true
    }'::jsonb,
    privacy_settings JSONB DEFAULT '{
        "safety_prompts": true,
        "profile_visibility": false,
        "discoverability": true,
        "show_online_status": true
    }'::jsonb,
    appearance_settings JSONB DEFAULT '{
        "theme": "dark",
        "font_size": "medium",
        "density": "comfortable"
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- User sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    device_info JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    location_info JSONB DEFAULT '{}'::jsonb,
    is_current BOOLEAN DEFAULT FALSE,
    last_active TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Login history table
CREATE TABLE IF NOT EXISTS login_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_info JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    location_info JSONB DEFAULT '{}'::jsonb,
    login_method VARCHAR(50) DEFAULT 'password',
    success BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- SECTION 3: FOLLOW REQUESTS (Private Profiles)
-- =============================================================================

CREATE TABLE IF NOT EXISTS follow_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(requester_id, target_id)
);

-- =============================================================================
-- SECTION 4: REPORTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('message', 'profile', 'post')),
    target_message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    target_profile_id UUID REFERENCES users(id) ON DELETE CASCADE,
    target_post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    reason_code VARCHAR(50) NOT NULL CHECK (reason_code IN ('spam', 'harassment', 'hate_speech', 'violence', 'nudity', 'misinformation', 'impersonation', 'copyright', 'other')),
    reason_text TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    priority VARCHAR(20) DEFAULT 'normal',
    assigned_to UUID,
    resolution_type VARCHAR(50),
    resolution_notes TEXT,
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    escalated_at TIMESTAMPTZ,
    escalated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- SECTION 5: CONTENT MODERATION (Strikes System)
-- =============================================================================

CREATE TABLE IF NOT EXISTS content_strikes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    violation_type VARCHAR(50) NOT NULL CHECK (violation_type IN ('anti_national', 'harassment', 'sexual_harassment', 'hate_speech', 'violence', 'spam', 'other')),
    content TEXT NOT NULL,
    post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '3 months')
);

-- Active strikes view
CREATE OR REPLACE VIEW active_strikes AS
SELECT * FROM content_strikes
WHERE created_at > (NOW() - INTERVAL '3 months');

-- =============================================================================
-- SECTION 6: ADMIN TABLES
-- =============================================================================

-- Admin roles table
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

-- Admin users table
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

-- Admin sessions table
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

-- Admin audit logs table
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

-- Report notes table
CREATE TABLE IF NOT EXISTS report_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User activity logs table
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    activity_details JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System alerts table
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

-- Analytics cache table
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

-- IP allowlist table
CREATE TABLE IF NOT EXISTS admin_ip_allowlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address VARCHAR(45) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- =============================================================================
-- SECTION 7: INDEXES
-- =============================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_banned_at ON users(banned_at);
CREATE INDEX IF NOT EXISTS idx_users_is_suspended ON users(is_suspended);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- Posts indexes
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_is_deleted ON posts(is_deleted);
CREATE INDEX IF NOT EXISTS idx_posts_hashtags ON posts USING GIN(hashtags);
CREATE INDEX IF NOT EXISTS idx_posts_mentions ON posts USING GIN(mentions);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_reply_to ON comments(reply_to_id);

-- Likes indexes
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_comment_id ON likes(comment_id);

-- Follows indexes
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Chats & Messages indexes
CREATE INDEX IF NOT EXISTS idx_chats_participants ON chats USING GIN(participants);
CREATE INDEX IF NOT EXISTS idx_chats_last_message_at ON chats(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);

-- Hashtags indexes
CREATE INDEX IF NOT EXISTS idx_hashtags_name ON hashtags(name);
CREATE INDEX IF NOT EXISTS idx_hashtags_posts_count ON hashtags(posts_count DESC);

-- Media uploads indexes
CREATE INDEX IF NOT EXISTS idx_media_uploads_user_id ON media_uploads(user_id);

-- Bookmarks indexes
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_post_id ON bookmarks(post_id);

-- User settings indexes
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- User sessions indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- Login history indexes
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_created_at ON login_history(created_at DESC);

-- Follow requests indexes
CREATE INDEX IF NOT EXISTS idx_follow_requests_requester ON follow_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_follow_requests_target ON follow_requests(target_id);
CREATE INDEX IF NOT EXISTS idx_follow_requests_status ON follow_requests(status);
CREATE INDEX IF NOT EXISTS idx_follow_requests_target_pending ON follow_requests(target_id, status) WHERE status = 'pending';

-- Reports indexes
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_priority ON reports(priority);
CREATE INDEX IF NOT EXISTS idx_reports_assigned_to ON reports(assigned_to);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- Content strikes indexes
CREATE INDEX IF NOT EXISTS idx_content_strikes_user_id ON content_strikes(user_id);
CREATE INDEX IF NOT EXISTS idx_content_strikes_created_at ON content_strikes(created_at);
CREATE INDEX IF NOT EXISTS idx_content_strikes_expires_at ON content_strikes(expires_at);

-- Admin indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
CREATE INDEX IF NOT EXISTS idx_admin_users_role_id ON admin_users(role_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_is_active ON admin_users(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id ON admin_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON admin_audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_category ON admin_audit_logs(action_category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_type ON admin_audit_logs(target_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_id ON admin_audit_logs(target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_notes_report_id ON report_notes(report_id);
CREATE INDEX IF NOT EXISTS idx_report_notes_admin_id ON report_notes(admin_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON user_activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_alerts_type ON system_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_system_alerts_is_read ON system_alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_metric ON analytics_cache(metric_name);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires ON analytics_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_ip_allowlist_ip ON admin_ip_allowlist(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_allowlist_active ON admin_ip_allowlist(is_active);

-- =============================================================================
-- SECTION 8: FUNCTIONS & TRIGGERS
-- =============================================================================

-- Update updated_at timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chats_updated_at ON chats;
CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_hashtags_updated_at ON hashtags;
CREATE TRIGGER update_hashtags_updated_at BEFORE UPDATE ON hashtags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_follow_requests_updated_at ON follow_requests;
CREATE TRIGGER update_follow_requests_updated_at BEFORE UPDATE ON follow_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_roles_updated_at ON admin_roles;
CREATE TRIGGER update_admin_roles_updated_at BEFORE UPDATE ON admin_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_report_notes_updated_at ON report_notes;
CREATE TRIGGER update_report_notes_updated_at BEFORE UPDATE ON report_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Clean expired sessions function
CREATE OR REPLACE FUNCTION clean_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Clean expired admin sessions function
CREATE OR REPLACE FUNCTION clean_expired_admin_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM admin_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Increment user posts count function
CREATE OR REPLACE FUNCTION increment_user_posts_count(user_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE users SET posts_count = COALESCE(posts_count, 0) + 1 WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Increment hashtag count function
CREATE OR REPLACE FUNCTION increment_hashtag_count(hashtag_name TEXT)
RETURNS void AS $$
BEGIN
    INSERT INTO hashtags (name, posts_count, created_at, updated_at)
    VALUES (hashtag_name, 1, NOW(), NOW())
    ON CONFLICT (name) DO UPDATE SET 
        posts_count = hashtags.posts_count + 1,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Cleanup expired strikes function
CREATE OR REPLACE FUNCTION cleanup_expired_strikes()
RETURNS void AS $$
BEGIN
    DELETE FROM content_strikes WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Check user suspension function
CREATE OR REPLACE FUNCTION check_user_suspension(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    active_strikes_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO active_strikes_count
    FROM content_strikes 
    WHERE user_id = user_uuid AND created_at > (NOW() - INTERVAL '3 months');
    RETURN active_strikes_count >= 3;
END;
$$ LANGUAGE plpgsql;

-- Auto suspend user trigger
CREATE OR REPLACE FUNCTION auto_suspend_user()
RETURNS TRIGGER AS $$
BEGIN
    IF check_user_suspension(NEW.user_id) THEN
        UPDATE users 
        SET is_suspended = TRUE, suspended_at = NOW(), suspension_reason = 'Multiple community guideline violations'
        WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_suspend ON content_strikes;
CREATE TRIGGER trigger_auto_suspend AFTER INSERT ON content_strikes FOR EACH ROW EXECUTE FUNCTION auto_suspend_user();

-- Add content strike function
CREATE OR REPLACE FUNCTION add_content_strike(
    p_user_id UUID,
    p_violation_type VARCHAR(50),
    p_content TEXT,
    p_reason TEXT
)
RETURNS JSON AS $$
DECLARE
    strike_id UUID;
    strike_count INTEGER;
    should_suspend BOOLEAN := FALSE;
BEGIN
    INSERT INTO content_strikes (user_id, violation_type, content, reason, created_at)
    VALUES (p_user_id, p_violation_type, p_content, p_reason, NOW())
    RETURNING id INTO strike_id;
    
    SELECT COUNT(*) INTO strike_count
    FROM content_strikes WHERE user_id = p_user_id AND created_at > (NOW() - INTERVAL '3 months');
    
    INSERT INTO notifications (user_id, type, content, is_read, created_at)
    VALUES (p_user_id, 'content_violation', 'Your post was blocked for violating community guidelines: ' || p_reason, FALSE, NOW());
    
    IF strike_count >= 3 THEN
        should_suspend := TRUE;
        UPDATE users SET is_suspended = TRUE, suspended_at = NOW(), suspension_reason = 'Multiple community guideline violations'
        WHERE id = p_user_id;
        
        INSERT INTO notifications (user_id, type, content, is_read, created_at)
        VALUES (p_user_id, 'account_suspended', 'Your account has been suspended due to repeated violations.', FALSE, NOW());
    END IF;
    
    RETURN json_build_object('strike_id', strike_id, 'strike_count', strike_count, 'should_suspend', should_suspend);
END;
$$ LANGUAGE plpgsql;

-- Admin failed login functions
CREATE OR REPLACE FUNCTION increment_failed_login(admin_email VARCHAR)
RETURNS void AS $$
BEGIN
    UPDATE admin_users 
    SET failed_login_attempts = failed_login_attempts + 1,
        locked_until = CASE WHEN failed_login_attempts >= 4 THEN NOW() + INTERVAL '30 minutes' ELSE locked_until END
    WHERE email = admin_email;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reset_failed_login(admin_email VARCHAR)
RETURNS void AS $$
BEGIN
    UPDATE admin_users 
    SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW()
    WHERE email = admin_email;
END;
$$ LANGUAGE plpgsql;

-- NOTE: NextAuth.js is used for authentication, not Supabase Auth
-- User creation is handled in /src/lib/auth/config.ts signIn callback

-- =============================================================================
-- SECTION 9: ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_strikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_ip_allowlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can delete own account" ON users FOR DELETE USING (auth.uid() = id);

-- Posts policies
CREATE POLICY "Posts are viewable by everyone" ON posts FOR SELECT USING (NOT is_deleted);
CREATE POLICY "Users can create posts" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON posts FOR DELETE USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Comments are viewable by everyone" ON comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (auth.uid() = user_id);

-- Likes policies
CREATE POLICY "Likes are viewable by everyone" ON likes FOR SELECT USING (true);
CREATE POLICY "Users can create likes" ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own likes" ON likes FOR DELETE USING (auth.uid() = user_id);

-- Follows policies
CREATE POLICY "Follows are viewable by everyone" ON follows FOR SELECT USING (true);
CREATE POLICY "Users can create follows" ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can delete own follows" ON follows FOR DELETE USING (auth.uid() = follower_id);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can create notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Chats policies
CREATE POLICY "Users can view their chats" ON chats FOR SELECT USING (auth.uid() = ANY(participants));
CREATE POLICY "Users can create chats" ON chats FOR INSERT WITH CHECK (auth.uid() = ANY(participants));

-- Messages policies
CREATE POLICY "Users can view chat messages" ON messages FOR SELECT USING (
    auth.uid() IN (SELECT unnest(participants) FROM chats WHERE id = messages.chat_id)
);
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND 
    auth.uid() IN (SELECT unnest(participants) FROM chats WHERE id = messages.chat_id)
);
CREATE POLICY "Users can update own messages" ON messages FOR UPDATE USING (auth.uid() = sender_id);
CREATE POLICY "Users can delete own messages" ON messages FOR DELETE USING (auth.uid() = sender_id);

-- Hashtags policies
CREATE POLICY "Hashtags are viewable by everyone" ON hashtags FOR SELECT USING (true);

-- Media uploads policies
CREATE POLICY "Users can view own uploads" ON media_uploads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create uploads" ON media_uploads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own uploads" ON media_uploads FOR DELETE USING (auth.uid() = user_id);

-- Bookmarks policies
CREATE POLICY "Users can view own bookmarks" ON bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create bookmarks" ON bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own bookmarks" ON bookmarks FOR DELETE USING (auth.uid() = user_id);

-- User settings policies
CREATE POLICY "Users can view own settings" ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (auth.uid() = user_id);

-- User sessions policies
CREATE POLICY "Users can view own sessions" ON user_sessions FOR SELECT USING (auth.uid() = user_id);

-- Login history policies
CREATE POLICY "Users can view own login history" ON login_history FOR SELECT USING (auth.uid() = user_id);

-- Follow requests policies
CREATE POLICY "Users can view own sent requests" ON follow_requests FOR SELECT USING (auth.uid() = requester_id);
CREATE POLICY "Users can view received requests" ON follow_requests FOR SELECT USING (auth.uid() = target_id);
CREATE POLICY "Users can create follow requests" ON follow_requests FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Target users can update request status" ON follow_requests FOR UPDATE USING (auth.uid() = target_id);
CREATE POLICY "Requesters can cancel pending requests" ON follow_requests FOR DELETE USING (auth.uid() = requester_id AND status = 'pending');

-- Reports policies
CREATE POLICY "Users can view own reports" ON reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "Users can create reports" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Content strikes policies
CREATE POLICY "Users can view own strikes" ON content_strikes FOR SELECT USING (auth.uid() = user_id);

-- =============================================================================
-- SECTION 10: STORAGE BUCKET SETUP
-- =============================================================================

-- Create media bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'media',
    'media',
    true,
    52428800,
    ARRAY[
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif',
        'video/mp4', 'video/webm', 'video/quicktime'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies
CREATE POLICY "Users can upload media to their own folder" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public media is viewable by everyone" ON storage.objects FOR SELECT TO public
USING (bucket_id = 'media');

CREATE POLICY "Users can update their own media" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own media" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Service role can manage all media" ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'media') WITH CHECK (bucket_id = 'media');

-- =============================================================================
-- SECTION 11: DEFAULT DATA
-- =============================================================================

-- Insert default admin roles
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

-- Create default super admin
-- Password: Admin@123456 (change immediately after first login!)
INSERT INTO admin_users (email, username, password_hash, display_name, role_id, is_active)
SELECT 
    'admin@socialpulse.app',
    'superadmin',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYWvqGPjKK2G',
    'Super Administrator',
    id,
    TRUE
FROM admin_roles WHERE name = 'super_admin'
ON CONFLICT (email) DO NOTHING;

-- =============================================================================
-- SECTION 12: GRANT PERMISSIONS
-- =============================================================================

-- Grant table permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON comments TO authenticated;
GRANT SELECT, INSERT, DELETE ON likes TO authenticated;
GRANT SELECT, INSERT, DELETE ON follows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON chats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO authenticated;
GRANT SELECT ON hashtags TO authenticated;
GRANT SELECT, INSERT, DELETE ON media_uploads TO authenticated;
GRANT SELECT, INSERT, DELETE ON bookmarks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_settings TO authenticated;
GRANT SELECT, INSERT, DELETE ON user_sessions TO authenticated;
GRANT SELECT, INSERT ON login_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON follow_requests TO authenticated;
GRANT SELECT, INSERT ON reports TO authenticated;
GRANT SELECT ON active_strikes TO authenticated;
GRANT SELECT ON content_strikes TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION increment_user_posts_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_hashtag_count(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION add_content_strike(UUID, VARCHAR, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_suspension(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_strikes() TO authenticated;

-- Grant all permissions to service role (for admin operations)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- =============================================================================
-- SETUP COMPLETE
-- =============================================================================
-- Next steps:
-- 1. Update your .env file with new Supabase credentials
-- 2. Enable Google OAuth in Supabase Dashboard → Authentication → Providers
-- 3. Change default admin password after first login
-- 4. Set up 2FA for admin accounts
-- =============================================================================

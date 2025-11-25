-- Settings Database Schema
-- Run these SQL commands to create the necessary tables

-- 1. User Settings Table
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 2. User Sessions Table for Active Session Management
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    device_info JSONB DEFAULT '{}'::jsonb, -- Store device name, OS, browser, etc.
    ip_address INET,
    user_agent TEXT,
    location_info JSONB DEFAULT '{}'::jsonb, -- Store country, city if available
    is_current BOOLEAN DEFAULT false,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 3. Login History Table for Security Monitoring
CREATE TABLE IF NOT EXISTS login_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_info JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    location_info JSONB DEFAULT '{}'::jsonb,
    login_method VARCHAR(50) DEFAULT 'password', -- 'password', 'oauth', 'magic_link'
    success BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_created_at ON login_history(created_at);

-- 5. Create updated_at trigger for user_settings
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_settings_updated_at 
    BEFORE UPDATE ON user_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Create function to clean expired sessions
CREATE OR REPLACE FUNCTION clean_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 7. RLS (Row Level Security) Policies
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;

-- Users can only access their own settings
CREATE POLICY user_settings_policy ON user_settings
    FOR ALL USING (auth.uid() = user_id);

-- Users can only access their own sessions
CREATE POLICY user_sessions_policy ON user_sessions
    FOR ALL USING (auth.uid() = user_id);

-- Users can only access their own login history
CREATE POLICY login_history_policy ON login_history
    FOR ALL USING (auth.uid() = user_id);

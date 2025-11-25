-- SQL statements to update the database for content moderation and strikes system

-- 1. Add columns to posts table for deleted posts tracking
ALTER TABLE posts 
ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN deletion_reason TEXT;

-- 2. Add columns to users table for suspension tracking
ALTER TABLE users 
ADD COLUMN is_suspended BOOLEAN DEFAULT FALSE,
ADD COLUMN suspended_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN suspension_reason TEXT;

-- 3. Create content_strikes table for tracking user violations
CREATE TABLE content_strikes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    violation_type VARCHAR(50) NOT NULL CHECK (violation_type IN ('anti_national', 'harassment', 'sexual_harassment', 'hate_speech', 'violence', 'spam', 'other')),
    content TEXT NOT NULL,
    post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '3 months')
);

-- 4. Create index on content_strikes for efficient queries
CREATE INDEX idx_content_strikes_user_id ON content_strikes(user_id);
CREATE INDEX idx_content_strikes_created_at ON content_strikes(created_at);
CREATE INDEX idx_content_strikes_expires_at ON content_strikes(expires_at);

-- 5. Update notifications table to support new notification types
ALTER TABLE notifications 
ALTER COLUMN type TYPE VARCHAR(50);

-- Update the type constraint to include new notification types
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('like', 'comment', 'follow', 'mention', 'repost', 'content_violation', 'account_suspended'));

-- 6. Create function to automatically clean up expired strikes
CREATE OR REPLACE FUNCTION cleanup_expired_strikes()
RETURNS void AS $$
BEGIN
    DELETE FROM content_strikes 
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 7. Create a scheduled job to run cleanup (if using pg_cron extension)
-- SELECT cron.schedule('cleanup-strikes', '0 0 * * *', 'SELECT cleanup_expired_strikes();');

-- 8. Create function to check if user should be suspended
CREATE OR REPLACE FUNCTION check_user_suspension(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    active_strikes_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO active_strikes_count
    FROM content_strikes 
    WHERE user_id = user_uuid 
    AND created_at > (NOW() - INTERVAL '3 months');
    
    RETURN active_strikes_count >= 3;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger to automatically suspend users with 3+ strikes
CREATE OR REPLACE FUNCTION auto_suspend_user()
RETURNS TRIGGER AS $$
BEGIN
    IF check_user_suspension(NEW.user_id) THEN
        UPDATE users 
        SET is_suspended = TRUE,
            suspended_at = NOW(),
            suspension_reason = 'Multiple community guideline violations'
        WHERE id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_suspend
    AFTER INSERT ON content_strikes
    FOR EACH ROW
    EXECUTE FUNCTION auto_suspend_user();

-- 10. Add RLS (Row Level Security) policies for content_strikes table
ALTER TABLE content_strikes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own strikes
CREATE POLICY "Users can view own strikes" ON content_strikes
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Only system/admin can insert strikes (API will use service role)
CREATE POLICY "System can insert strikes" ON content_strikes
    FOR INSERT WITH CHECK (true);

-- 11. Create view for active strikes (within 3 months)
CREATE VIEW active_strikes AS
SELECT *
FROM content_strikes
WHERE created_at > (NOW() - INTERVAL '3 months');

-- 12. Grant necessary permissions
GRANT SELECT ON active_strikes TO authenticated;
GRANT SELECT ON content_strikes TO authenticated;

-- 13. Create indexes for better performance
CREATE INDEX idx_posts_is_deleted ON posts(is_deleted);
CREATE INDEX idx_users_is_suspended ON users(is_suspended);

-- 14. Add comments for documentation
COMMENT ON TABLE content_strikes IS 'Tracks content violations and user strikes for community guideline enforcement';
COMMENT ON COLUMN content_strikes.violation_type IS 'Type of violation: anti_national, harassment, sexual_harassment, hate_speech, violence, spam, other';
COMMENT ON COLUMN content_strikes.expires_at IS 'Strike expires after 3 months from creation';
COMMENT ON COLUMN users.is_suspended IS 'User account suspension status';
COMMENT ON COLUMN posts.is_deleted IS 'Post deleted due to content violation';

-- 15. Create RPC functions for content moderation

-- Function to add a content strike
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
    -- Insert the strike
    INSERT INTO content_strikes (user_id, violation_type, content, reason, created_at)
    VALUES (p_user_id, p_violation_type, p_content, p_reason, NOW())
    RETURNING id INTO strike_id;
    
    -- Count active strikes (within 3 months)
    SELECT COUNT(*) INTO strike_count
    FROM content_strikes 
    WHERE user_id = p_user_id 
    AND created_at > (NOW() - INTERVAL '3 months');
    
    -- Send notification about the violation
    INSERT INTO notifications (user_id, type, content, is_read, created_at)
    VALUES (
        p_user_id, 
        'content_violation', 
        'Your post was blocked for violating community guidelines: ' || p_reason,
        FALSE,
        NOW()
    );
    
    -- Check if user should be suspended (3+ strikes)
    IF strike_count >= 3 THEN
        should_suspend := TRUE;
        
        -- Update user suspension status
        UPDATE users 
        SET is_suspended = TRUE,
            suspended_at = NOW(),
            suspension_reason = 'Multiple community guideline violations'
        WHERE id = p_user_id;
        
        -- Send suspension notification
        INSERT INTO notifications (user_id, type, content, is_read, created_at)
        VALUES (
            p_user_id,
            'account_suspended',
            'Your account has been suspended due to repeated violations of our community guidelines.',
            FALSE,
            NOW()
        );
    END IF;
    
    RETURN json_build_object(
        'strike_id', strike_id,
        'strike_count', strike_count,
        'should_suspend', should_suspend
    );
END;
$$ LANGUAGE plpgsql;

-- Function to check if user should be suspended
CREATE OR REPLACE FUNCTION check_user_suspension(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    strike_count INTEGER;
    should_suspend BOOLEAN := FALSE;
BEGIN
    -- Count active strikes (within 3 months)
    SELECT COUNT(*) INTO strike_count
    FROM content_strikes 
    WHERE user_id = p_user_id 
    AND created_at > (NOW() - INTERVAL '3 months');
    
    -- Check if user should be suspended
    IF strike_count >= 3 THEN
        should_suspend := TRUE;
        
        -- Update user suspension status if not already suspended
        UPDATE users 
        SET is_suspended = TRUE,
            suspended_at = NOW(),
            suspension_reason = 'Multiple community guideline violations'
        WHERE id = p_user_id AND is_suspended = FALSE;
        
        -- Send suspension notification if just suspended
        IF FOUND THEN
            INSERT INTO notifications (user_id, type, content, is_read, created_at)
            VALUES (
                p_user_id,
                'account_suspended',
                'Your account has been suspended due to repeated violations of our community guidelines.',
                FALSE,
                NOW()
            );
        END IF;
    END IF;
    
    RETURN json_build_object(
        'strike_count', strike_count,
        'should_suspend', should_suspend
    );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION add_content_strike(UUID, VARCHAR(50), TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_suspension(UUID) TO authenticated;

-- 16. Insert sample data for testing (optional)
-- INSERT INTO content_strikes (user_id, violation_type, content, reason) 
-- VALUES ('sample-user-id', 'spam', 'Sample violating content', 'Testing the strikes system');

-- Follow Requests Table for Private Profiles
-- Run this SQL in your Supabase SQL Editor

-- Create follow_requests table
CREATE TABLE IF NOT EXISTS follow_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(requester_id, target_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_follow_requests_requester ON follow_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_follow_requests_target ON follow_requests(target_id);
CREATE INDEX IF NOT EXISTS idx_follow_requests_status ON follow_requests(status);
CREATE INDEX IF NOT EXISTS idx_follow_requests_target_pending ON follow_requests(target_id, status) WHERE status = 'pending';

-- Add RLS policies
ALTER TABLE follow_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own sent requests
CREATE POLICY "Users can view own sent requests" ON follow_requests
    FOR SELECT USING (auth.uid() = requester_id);

-- Policy: Users can view requests sent to them
CREATE POLICY "Users can view received requests" ON follow_requests
    FOR SELECT USING (auth.uid() = target_id);

-- Policy: Users can create follow requests
CREATE POLICY "Users can create follow requests" ON follow_requests
    FOR INSERT WITH CHECK (auth.uid() = requester_id);

-- Policy: Target users can update request status (accept/decline)
CREATE POLICY "Target users can update request status" ON follow_requests
    FOR UPDATE USING (auth.uid() = target_id);

-- Policy: Requesters can delete their pending requests (cancel)
CREATE POLICY "Requesters can cancel pending requests" ON follow_requests
    FOR DELETE USING (auth.uid() = requester_id AND status = 'pending');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_follow_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS follow_requests_updated_at ON follow_requests;
CREATE TRIGGER follow_requests_updated_at
    BEFORE UPDATE ON follow_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_follow_request_updated_at();

-- Grant permissions for service role (for API access)
GRANT ALL ON follow_requests TO service_role;
GRANT ALL ON follow_requests TO authenticated;

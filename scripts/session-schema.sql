-- User Sessions Schema for iOS PWA Persistence
-- HTTP-only session cookies survive iOS PWA installs

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  device_info JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- Add phone column to push_subscriptions for re-linking
-- This allows us to restore sessions without OTP by validating push subscription
ALTER TABLE push_subscriptions
ADD COLUMN IF NOT EXISTS phone TEXT;

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_phone ON push_subscriptions(phone);

-- Auto-cleanup expired sessions (optional - can be run as cron)
-- DELETE FROM user_sessions WHERE expires_at < NOW();

-- RLS Policies
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for API routes)
CREATE POLICY "Service role has full access to user_sessions"
ON user_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Users can only see their own sessions
CREATE POLICY "Users can view own sessions"
ON user_sessions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can delete their own sessions (logout)
CREATE POLICY "Users can delete own sessions"
ON user_sessions
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

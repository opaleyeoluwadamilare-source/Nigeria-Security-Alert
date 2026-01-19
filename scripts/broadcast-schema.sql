-- =============================================
-- SafetyAlerts Broadcast Notifications Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Create broadcast type enum
CREATE TYPE broadcast_type AS ENUM ('emergency', 'announcement', 'maintenance', 'info', 'custom');

-- 2. Create broadcast target enum
CREATE TYPE broadcast_target AS ENUM ('all', 'area', 'users');

-- 3. Create broadcast status enum
CREATE TYPE broadcast_status AS ENUM ('draft', 'sending', 'sent', 'failed', 'scheduled');

-- =============================================
-- BROADCAST NOTIFICATIONS TABLE
-- =============================================
CREATE TABLE broadcast_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Content
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  broadcast_type broadcast_type NOT NULL DEFAULT 'announcement',

  -- Targeting
  target_type broadcast_target NOT NULL DEFAULT 'all',
  target_areas TEXT[],           -- Array of area_slugs for area targeting
  target_user_ids UUID[],        -- Array of user IDs for specific user targeting

  -- Delivery
  status broadcast_status NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,      -- For scheduled broadcasts
  sent_at TIMESTAMPTZ,

  -- Stats
  total_recipients INTEGER DEFAULT 0,
  successful_deliveries INTEGER DEFAULT 0,
  failed_deliveries INTEGER DEFAULT 0,

  -- Metadata
  action_url TEXT,               -- Optional URL to open when notification clicked
  icon TEXT,                     -- Emoji or icon identifier

  -- Admin tracking
  created_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_broadcasts_status ON broadcast_notifications(status);
CREATE INDEX idx_broadcasts_type ON broadcast_notifications(broadcast_type);
CREATE INDEX idx_broadcasts_created_at ON broadcast_notifications(created_at DESC);
CREATE INDEX idx_broadcasts_scheduled_at ON broadcast_notifications(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- =============================================
-- BROADCAST DELIVERY LOG TABLE
-- Track individual delivery attempts
-- =============================================
CREATE TABLE broadcast_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES broadcast_notifications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  subscription_endpoint TEXT NOT NULL,

  -- Delivery status
  success BOOLEAN NOT NULL,
  error_message TEXT,
  error_code TEXT,

  -- Timing
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for broadcast lookups
CREATE INDEX idx_delivery_log_broadcast ON broadcast_delivery_log(broadcast_id);
CREATE INDEX idx_delivery_log_user ON broadcast_delivery_log(user_id);

-- =============================================
-- BROADCAST TEMPLATES TABLE
-- Save reusable notification templates
-- =============================================
CREATE TABLE broadcast_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  broadcast_type broadcast_type NOT NULL DEFAULT 'announcement',
  icon TEXT,
  action_url TEXT,

  -- Admin tracking
  created_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_broadcast_templates_type ON broadcast_templates(broadcast_type);

-- =============================================
-- ENABLE RLS
-- =============================================
ALTER TABLE broadcast_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_delivery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_templates ENABLE ROW LEVEL SECURITY;

-- Service role policies
CREATE POLICY "Service role has full access to broadcast_notifications"
  ON broadcast_notifications FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to broadcast_delivery_log"
  ON broadcast_delivery_log FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to broadcast_templates"
  ON broadcast_templates FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================
-- UPDATE TIMESTAMP TRIGGER
-- =============================================
CREATE TRIGGER trigger_broadcasts_updated_at
  BEFORE UPDATE ON broadcast_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_broadcast_templates_updated_at
  BEFORE UPDATE ON broadcast_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================
-- INSERT DEFAULT TEMPLATES
-- =============================================
INSERT INTO broadcast_templates (name, title, body, broadcast_type, icon) VALUES
  ('Emergency Alert', '🚨 Emergency Alert', 'An emergency situation has been reported in your area. Please stay safe and follow local authorities instructions.', 'emergency', '🚨'),
  ('Security Update', '🛡️ Security Update', 'Important security information for your area. Please check the app for details.', 'announcement', '🛡️'),
  ('System Maintenance', '🔧 Scheduled Maintenance', 'SafetyAlerts will undergo brief maintenance. Some features may be temporarily unavailable.', 'maintenance', '🔧'),
  ('New Feature', '✨ New Feature Available', 'We have added new features to help keep your community safer. Open the app to learn more!', 'info', '✨'),
  ('Community Update', '📢 Community Update', 'Important update for your community. Tap to read more.', 'announcement', '📢')
ON CONFLICT DO NOTHING;

-- =============================================
-- DONE
-- =============================================
-- Run this SQL in your Supabase SQL Editor after running admin-schema.sql

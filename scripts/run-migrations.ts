/**
 * SafetyAlerts Database Migration Script
 * Executes SQL schema directly via Supabase REST API
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL_RAW = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY_RAW = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL_RAW || !SERVICE_ROLE_KEY_RAW) {
  console.error('Error: Missing Supabase environment variables.')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

// Type assertion after validation
const SUPABASE_URL: string = SUPABASE_URL_RAW
const SERVICE_ROLE_KEY: string = SERVICE_ROLE_KEY_RAW

// SQL statements to execute (split for better error handling)
const migrations = [
  // Enable extensions
  `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,

  // Users table
  `CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE,
    phone_verified BOOLEAN DEFAULT FALSE,
    trust_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );`,
  `CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);`,

  // User locations table
  `CREATE TABLE IF NOT EXISTS user_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    area_name VARCHAR(100) NOT NULL,
    area_slug VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );`,
  `CREATE INDEX IF NOT EXISTS idx_user_locations_user ON user_locations(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_user_locations_area ON user_locations(area_slug);`,

  // Reports table
  `CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    incident_type VARCHAR(50) NOT NULL,
    landmark VARCHAR(200),
    description TEXT,
    photo_url VARCHAR(500),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    area_name VARCHAR(100) NOT NULL,
    area_slug VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    confirmation_count INTEGER DEFAULT 1,
    denial_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE
  );`,
  `CREATE INDEX IF NOT EXISTS idx_reports_area ON reports(area_slug);`,
  `CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);`,
  `CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);`,

  // Confirmations table
  `CREATE TABLE IF NOT EXISTS confirmations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    distance_km DECIMAL(5, 2) NOT NULL,
    confirmation_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(report_id, user_id)
  );`,
  `CREATE INDEX IF NOT EXISTS idx_confirmations_report ON confirmations(report_id);`,

  // Push subscriptions table
  `CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    keys JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );`,
  `CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);`,

  // OTP codes table
  `CREATE TABLE IF NOT EXISTS otp_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );`,
  `CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone);`,

  // Trigger function for confirmation counts
  `CREATE OR REPLACE FUNCTION update_confirmation_counts()
  RETURNS TRIGGER AS $$
  BEGIN
    IF NEW.confirmation_type = 'confirm' THEN
      UPDATE reports
      SET confirmation_count = confirmation_count + 1
      WHERE id = NEW.report_id;
    ELSIF NEW.confirmation_type = 'deny' THEN
      UPDATE reports
      SET denial_count = denial_count + 1
      WHERE id = NEW.report_id;
    ELSIF NEW.confirmation_type = 'ended' THEN
      UPDATE reports
      SET status = 'ended', ended_at = NOW()
      WHERE id = NEW.report_id
      AND status = 'active';
    END IF;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;`,

  // Create trigger (drop first if exists to avoid errors)
  `DROP TRIGGER IF EXISTS trigger_update_confirmation_counts ON confirmations;`,
  `CREATE TRIGGER trigger_update_confirmation_counts
  AFTER INSERT ON confirmations
  FOR EACH ROW EXECUTE FUNCTION update_confirmation_counts();`,

  // Enable RLS on all tables
  `ALTER TABLE users ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE reports ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE confirmations ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;`,

  // RLS Policies - Users
  `DROP POLICY IF EXISTS "Users are viewable by authenticated users" ON users;`,
  `CREATE POLICY "Users are viewable by authenticated users" ON users FOR SELECT USING (true);`,
  `DROP POLICY IF EXISTS "Users can be created by anyone" ON users;`,
  `CREATE POLICY "Users can be created by anyone" ON users FOR INSERT WITH CHECK (true);`,
  `DROP POLICY IF EXISTS "Users can update their own data" ON users;`,
  `CREATE POLICY "Users can update their own data" ON users FOR UPDATE USING (true);`,

  // RLS Policies - User Locations
  `DROP POLICY IF EXISTS "User locations are viewable by owner" ON user_locations;`,
  `CREATE POLICY "User locations are viewable by owner" ON user_locations FOR SELECT USING (true);`,
  `DROP POLICY IF EXISTS "User locations can be created" ON user_locations;`,
  `CREATE POLICY "User locations can be created" ON user_locations FOR INSERT WITH CHECK (true);`,
  `DROP POLICY IF EXISTS "User locations can be deleted" ON user_locations;`,
  `CREATE POLICY "User locations can be deleted" ON user_locations FOR DELETE USING (true);`,

  // RLS Policies - Reports
  `DROP POLICY IF EXISTS "Reports are viewable by everyone" ON reports;`,
  `CREATE POLICY "Reports are viewable by everyone" ON reports FOR SELECT USING (true);`,
  `DROP POLICY IF EXISTS "Reports can be created by anyone" ON reports;`,
  `CREATE POLICY "Reports can be created by anyone" ON reports FOR INSERT WITH CHECK (true);`,
  `DROP POLICY IF EXISTS "Reports can be updated" ON reports;`,
  `CREATE POLICY "Reports can be updated" ON reports FOR UPDATE USING (true);`,

  // RLS Policies - Confirmations
  `DROP POLICY IF EXISTS "Confirmations are viewable by everyone" ON confirmations;`,
  `CREATE POLICY "Confirmations are viewable by everyone" ON confirmations FOR SELECT USING (true);`,
  `DROP POLICY IF EXISTS "Confirmations can be created" ON confirmations;`,
  `CREATE POLICY "Confirmations can be created" ON confirmations FOR INSERT WITH CHECK (true);`,

  // RLS Policies - Push Subscriptions
  `DROP POLICY IF EXISTS "Push subscriptions viewable by owner" ON push_subscriptions;`,
  `CREATE POLICY "Push subscriptions viewable by owner" ON push_subscriptions FOR SELECT USING (true);`,
  `DROP POLICY IF EXISTS "Push subscriptions can be created" ON push_subscriptions;`,
  `CREATE POLICY "Push subscriptions can be created" ON push_subscriptions FOR INSERT WITH CHECK (true);`,
  `DROP POLICY IF EXISTS "Push subscriptions can be deleted" ON push_subscriptions;`,
  `CREATE POLICY "Push subscriptions can be deleted" ON push_subscriptions FOR DELETE USING (true);`,

  // RLS Policies - OTP Codes
  `DROP POLICY IF EXISTS "OTP codes managed by service" ON otp_codes;`,
  `CREATE POLICY "OTP codes managed by service" ON otp_codes FOR ALL USING (true);`,
];

// Realtime enablement (run separately as it may fail if already enabled)
const realtimeMigrations = [
  `ALTER PUBLICATION supabase_realtime ADD TABLE reports;`,
  `ALTER PUBLICATION supabase_realtime ADD TABLE confirmations;`,
];

async function executeSql(sql: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ sql }),
    });

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: text };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function executeViaPgMeta(sql: string): Promise<{ success: boolean; error?: string; data?: unknown }> {
  try {
    const response = await fetch(`${SUPABASE_URL}/pg/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'x-connection-encrypted': 'true',
      },
      body: JSON.stringify({ query: sql }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      return { success: false, error: data.error || data.message || 'Unknown error' };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function runMigrations() {
  console.log('SafetyAlerts Database Migration');
  console.log('================================\n');

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < migrations.length; i++) {
    const sql = migrations[i];
    const shortSql = sql.substring(0, 60).replace(/\n/g, ' ') + '...';

    process.stdout.write(`[${i + 1}/${migrations.length}] ${shortSql} `);

    const result = await executeViaPgMeta(sql);

    if (result.success) {
      console.log('[OK]');
      successCount++;
    } else {
      // Some errors are expected (like "already exists")
      if (result.error?.includes('already exists') || result.error?.includes('duplicate')) {
        console.log('[SKIP - already exists]');
        successCount++;
      } else {
        console.log(`[FAIL] ${result.error}`);
        failCount++;
      }
    }
  }

  // Try realtime migrations (may fail if already configured)
  console.log('\nEnabling realtime...');
  for (const sql of realtimeMigrations) {
    const result = await executeViaPgMeta(sql);
    if (result.success) {
      console.log(`  [OK] ${sql.substring(0, 50)}...`);
    } else if (result.error?.includes('already member')) {
      console.log(`  [SKIP] Already enabled`);
    } else {
      console.log(`  [WARN] ${result.error}`);
    }
  }

  console.log('\n================================');
  console.log(`Results: ${successCount} succeeded, ${failCount} failed`);

  if (failCount === 0) {
    console.log('\n[SUCCESS] All migrations completed!');
    console.log('Run verification: npx tsx scripts/verify-database.ts');
  } else {
    console.log('\n[WARNING] Some migrations failed. Check errors above.');
  }
}

runMigrations().catch(console.error);

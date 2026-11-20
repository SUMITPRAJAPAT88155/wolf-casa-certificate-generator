/*
# Create certificates and settings tables (admin app with sign-in)

1. New Tables
- `certificates`
  - `id` (uuid, primary key)
  - `certificate_id` (text, unique, not null) — human-readable unique ID like WC-2026-XXXXXX
  - `recipient_name` (text, not null)
  - `course_name` (text, not null)
  - `organization_name` (text, not null, default 'Wolf Casa')
  - `start_date` (date)
  - `completion_date` (date)
  - `issue_date` (date)
  - `director_name` (text)
  - `created_at` (timestamptz, default now)
  - `user_id` (uuid, not null, defaults to the authenticated user)
- `app_settings`
  - `id` (integer primary key, always one row with id = 1)
  - `company_name` (text, default 'Wolf Casa')
  - `director_name` (text, default '')
  - `course_name` (text, default '')
  - `default_issue_date` (date, null)
  - `logo_url` (text, null) — data URL or hosted image URL
  - `signature_url` (text, null) — data URL or hosted image URL
  - `updated_at` (timestamptz, default now)
  - `user_id` (uuid, not null, defaults to the authenticated user)

2. Security
- Enable RLS on both tables.
- Grant SELECT, INSERT, UPDATE, DELETE to `authenticated` only (admin login required).
- Owner-scoped CRUD policies using auth.uid() = user_id so each admin sees only their own records.
- No anon access: unauthenticated visitors cannot read or write anything.

3. Notes
- The `user_id` defaults to auth.uid() so client inserts that omit it still satisfy RLS.
- A unique index on certificate_id guarantees every certificate ID is unique.
- An index on recipient_name and created_at supports search and "recent certificates".
*/

CREATE TABLE IF NOT EXISTS certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id text NOT NULL UNIQUE,
  recipient_name text NOT NULL,
  course_name text NOT NULL,
  organization_name text NOT NULL DEFAULT 'Wolf Casa',
  start_date date,
  completion_date date,
  issue_date date,
  director_name text,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_settings (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text NOT NULL DEFAULT 'Wolf Casa',
  director_name text NOT NULL DEFAULT '',
  course_name text NOT NULL DEFAULT '',
  default_issue_date date,
  logo_url text,
  signature_url text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON certificates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON app_settings TO authenticated;

DROP POLICY IF EXISTS "select_own_certificates" ON certificates;
CREATE POLICY "select_own_certificates" ON certificates FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_certificates" ON certificates;
CREATE POLICY "insert_own_certificates" ON certificates FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_certificates" ON certificates;
CREATE POLICY "update_own_certificates" ON certificates FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_certificates" ON certificates;
CREATE POLICY "delete_own_certificates" ON certificates FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "select_own_settings" ON app_settings;
CREATE POLICY "select_own_settings" ON app_settings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_settings" ON app_settings;
CREATE POLICY "insert_own_settings" ON app_settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_settings" ON app_settings;
CREATE POLICY "update_own_settings" ON app_settings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_settings" ON app_settings;
CREATE POLICY "delete_own_settings" ON app_settings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS certificates_recipient_name_idx ON certificates (recipient_name);
CREATE INDEX IF NOT EXISTS certificates_created_at_idx ON certificates (created_at DESC);
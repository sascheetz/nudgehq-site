/*
# Create assignment_sync table (single-tenant, no auth)

1. New Tables
- `assignment_sync`
  - `user_id` (text, primary key) — identifies the student (e.g. "50904", "50906")
  - `upcoming_raw` (text) — JSON string of upcoming assignments
  - `missing_raw` (text) — JSON string of missing assignments
  - `zeros_raw` (text) — JSON string of zeroed assignments
  - `course_map` (text) — JSON string of course ID to name mapping
  - `submitted_ids` (text) — JSON string of submitted assignment IDs
  - `completed_subs` (text) — JSON string of completed submissions
  - `synced_at` (text) — timestamp of last sync
  - `name` (text) — student display name
  - `updated_at` (timestamptz) — server timestamp of last upsert

2. Security
- Enable RLS on `assignment_sync`.
- Allow anon + authenticated full CRUD — this is a private family tool with no sign-in.
*/

CREATE TABLE IF NOT EXISTS assignment_sync (
  user_id text PRIMARY KEY,
  upcoming_raw text NOT NULL DEFAULT '[]',
  missing_raw text NOT NULL DEFAULT '[]',
  zeros_raw text NOT NULL DEFAULT '[]',
  course_map text NOT NULL DEFAULT '{}',
  submitted_ids text NOT NULL DEFAULT '[]',
  completed_subs text NOT NULL DEFAULT '[]',
  synced_at text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT 'Student',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE assignment_sync ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_assignment_sync" ON assignment_sync;
CREATE POLICY "anon_select_assignment_sync" ON assignment_sync
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_assignment_sync" ON assignment_sync;
CREATE POLICY "anon_insert_assignment_sync" ON assignment_sync
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_assignment_sync" ON assignment_sync;
CREATE POLICY "anon_update_assignment_sync" ON assignment_sync
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_assignment_sync" ON assignment_sync;
CREATE POLICY "anon_delete_assignment_sync" ON assignment_sync
  FOR DELETE TO anon, authenticated USING (true);

/*
# Close public Data API access to assignment_sync

1. Problem
The `assignment_sync` table was created with four permissive policies granting
`anon` and `authenticated` full SELECT / INSERT / UPDATE / DELETE with an
always-true predicate. Because the Supabase anon key is embedded in the
published JavaScript bundle, this made every stored record world-readable,
world-writable and world-deletable through the REST Data API.

2. Changes
- Drop policies `anon_select_assignment_sync`, `anon_insert_assignment_sync`,
  `anon_update_assignment_sync`, `anon_delete_assignment_sync`.
- Revoke ALL privileges on `assignment_sync` from `anon` and `authenticated`.
- Row level security remains ENABLED with no policies, so the Data API returns
  no rows and accepts no writes.

3. Why this does not break the application
The frontend never queries this table directly. It has no
`@supabase/supabase-js` dependency; all reads and writes go through the `sync`
edge function, which uses the service role key. The service role is not subject
to table grants or row level security, so the application continues to work
exactly as before. The edge function is now the only path to this data.

4. Important notes
1. This is a deliberate deny-by-default posture: no policies is the intended
   end state, not an oversight.
2. If a future feature needs direct browser access to this table, add a scoped
   policy for that specific case rather than restoring the always-true ones.
*/

DROP POLICY IF EXISTS "anon_select_assignment_sync" ON assignment_sync;
DROP POLICY IF EXISTS "anon_insert_assignment_sync" ON assignment_sync;
DROP POLICY IF EXISTS "anon_update_assignment_sync" ON assignment_sync;
DROP POLICY IF EXISTS "anon_delete_assignment_sync" ON assignment_sync;

REVOKE ALL PRIVILEGES ON TABLE assignment_sync FROM anon;
REVOKE ALL PRIVILEGES ON TABLE assignment_sync FROM authenticated;

ALTER TABLE assignment_sync ENABLE ROW LEVEL SECURITY;

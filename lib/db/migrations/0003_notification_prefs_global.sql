-- Allow per-user global mute (project_id NULL) alongside per-project prefs.
-- 0001 used PRIMARY KEY (user_id, project_id), which forces project_id NOT NULL in PostgreSQL.

ALTER TABLE notification_prefs DROP CONSTRAINT IF EXISTS notification_prefs_pkey;

ALTER TABLE notification_prefs ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
UPDATE notification_prefs SET id = gen_random_uuid() WHERE id IS NULL;
ALTER TABLE notification_prefs ALTER COLUMN id SET NOT NULL;

DO $$
BEGIN
  ALTER TABLE notification_prefs ADD CONSTRAINT notification_prefs_id_pkey PRIMARY KEY (id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS notification_prefs_user_project_unique
  ON notification_prefs (user_id, project_id)
  WHERE project_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS notification_prefs_user_global_unique
  ON notification_prefs (user_id)
  WHERE project_id IS NULL;

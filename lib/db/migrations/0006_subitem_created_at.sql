-- Track when each subitem was created so the weekly incomplete reminder cron can fire on day 7.
ALTER TABLE subitems ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Backfill existing rows using the parent project's last_updated_at as a best-effort proxy.
UPDATE subitems s
SET created_at = p.last_updated_at
FROM projects p
WHERE s.project_id = p.id;

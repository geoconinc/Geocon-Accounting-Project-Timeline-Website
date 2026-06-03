ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- Best-effort backfill from existing sessions (30-day session TTL at login).
UPDATE users u
SET last_login_at = s.inferred_login
FROM (
  SELECT user_id, MAX(expires_at) - interval '30 days' AS inferred_login
  FROM sessions
  GROUP BY user_id
) s
WHERE u.id = s.user_id AND u.last_login_at IS NULL;

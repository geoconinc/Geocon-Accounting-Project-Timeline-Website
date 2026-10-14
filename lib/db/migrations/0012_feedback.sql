-- User-submitted site feedback (ideas, bug reports, general comments), reviewed in the admin panel.
-- Additive only: no existing tables change. category is text (not an enum) so new categories
-- can ship without a type migration; the app maps unknown values to 'general'.

CREATE TABLE IF NOT EXISTS feedback (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  category    text NOT NULL DEFAULT 'general',
  message     text NOT NULL,
  page_path   text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback (created_at DESC);

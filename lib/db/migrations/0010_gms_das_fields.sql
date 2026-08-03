-- GMS DAS / prevailing wage fields (expand: nullable / defaults so old rows stay valid).

ALTER TABLE projects ADD COLUMN IF NOT EXISTS prevailing_wage boolean NOT NULL DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS pw_category text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS das_required boolean NOT NULL DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS das_status text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS das_completed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_projects_das_status ON projects (das_status)
  WHERE das_status IS NOT NULL;

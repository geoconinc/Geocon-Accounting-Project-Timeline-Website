-- GMS integration: store proposal ID for traceability and dedupe lookups.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS gms_proposal_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_gms_proposal_id
  ON projects (gms_proposal_id)
  WHERE gms_proposal_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_code ON projects (code);

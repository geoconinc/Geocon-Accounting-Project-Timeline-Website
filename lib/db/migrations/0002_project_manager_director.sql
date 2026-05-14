-- Add project manager and project director references on projects.
-- Apply after 0001_init.sql when using Postgres.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS project_manager_id uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS project_director_id uuid REFERENCES users(id) ON DELETE SET NULL;

-- Geocon Project Timeline initial migration
-- Apply with: psql "$DATABASE_URL" -f lib/db/migrations/0001_init.sql
-- gen_random_uuid() is built-in on PostgreSQL 13+ (no pgcrypto extension required on Azure).

DO $$ BEGIN
  CREATE TYPE project_status AS ENUM ('New','Completed','InProgress','Missing','Future');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE project_group AS ENUM ('Current','Future','Completed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE subitem_status AS ENUM ('Completed','InProgress','Missing','NotStarted','NA');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE file_parent AS ENUM ('project','subitem');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  initials text NOT NULL,
  phone text,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  token text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  owner_id uuid REFERENCES users(id) ON DELETE SET NULL,
  status project_status NOT NULL DEFAULT 'New',
  "group" project_group NOT NULL DEFAULT 'Current',
  start_date date,
  timeline_start date,
  timeline_end date,
  dir_number text,
  "union" boolean NOT NULL DEFAULT false,
  reporting_systems text,
  cpr_contact text,
  sharepoint_url text,
  office text,
  notes text,
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  last_updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  position integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_projects_group ON projects("group");

CREATE TABLE IF NOT EXISTS subitems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  owner_id uuid REFERENCES users(id) ON DELETE SET NULL,
  status subitem_status NOT NULL DEFAULT 'NotStarted',
  due_date date,
  date_completed date,
  notes text,
  position integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_subitems_project ON subitems(project_id);

CREATE TABLE IF NOT EXISTS files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_type file_parent NOT NULL,
  parent_id uuid NOT NULL,
  blob_path text NOT NULL,
  filename text NOT NULL,
  size integer NOT NULL,
  uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_files_parent ON files(parent_type, parent_id);

CREATE TABLE IF NOT EXISTS notification_prefs (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  mute boolean NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, project_id)
);

CREATE TABLE IF NOT EXISTS activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity(entity_type, entity_id);

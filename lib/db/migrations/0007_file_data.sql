-- Store file bytes directly in PostgreSQL instead of external blob storage.
ALTER TABLE files ADD COLUMN IF NOT EXISTS content_type text;
ALTER TABLE files ADD COLUMN IF NOT EXISTS data bytea NOT NULL DEFAULT '';
ALTER TABLE files ALTER COLUMN blob_path SET DEFAULT '';

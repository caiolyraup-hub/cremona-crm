ALTER TABLE contacts ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS contacts_deleted_at_idx ON contacts (deleted_at)
  WHERE deleted_at IS NULL;

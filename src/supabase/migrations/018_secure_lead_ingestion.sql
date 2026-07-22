-- Secure public lead ingestion for server-to-server external forms.

ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS source text;

ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS external_lead_id text;

ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS whatsapp_opt_in boolean NOT NULL DEFAULT false;

ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS whatsapp_opt_in_at timestamptz;

ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS whatsapp_opt_in_source text;

ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS whatsapp_opt_in_text text;

ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS last_lead_submission_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_contacts_workspace_phone_active
ON contacts(workspace_id, phone)
WHERE deleted_at IS NULL AND phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_workspace_email_active
ON contacts(workspace_id, lower(email))
WHERE deleted_at IS NULL AND email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_workspace_external_lead
ON contacts(workspace_id, external_lead_id)
WHERE deleted_at IS NULL AND external_lead_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS lead_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  key_hash text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  default_tags text[] NOT NULL DEFAULT '{}',
  default_pipeline_stage_id uuid REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  allowed_origins text[] NOT NULL DEFAULT '{}',
  rate_limit_per_minute integer NOT NULL DEFAULT 30,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lead_sources_slug_workspace_unique UNIQUE (workspace_id, slug),
  CONSTRAINT lead_sources_key_hash_unique UNIQUE (key_hash),
  CONSTRAINT lead_sources_rate_limit_positive CHECK (rate_limit_per_minute > 0)
);

CREATE TABLE IF NOT EXISTS lead_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  lead_source_id uuid REFERENCES lead_sources(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  external_lead_id text,
  idempotency_key text,
  payload_hash text NOT NULL,
  status text NOT NULL,
  name text,
  phone text,
  email text,
  source text,
  whatsapp_opt_in boolean NOT NULL DEFAULT false,
  whatsapp_opt_in_at timestamptz,
  whatsapp_opt_in_source text,
  whatsapp_opt_in_text text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  CONSTRAINT lead_submissions_status_check
    CHECK (status IN ('received', 'processed', 'duplicate', 'rejected', 'failed'))
);

CREATE TABLE IF NOT EXISTS lead_rate_limit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_source_id uuid REFERENCES lead_sources(id) ON DELETE CASCADE NOT NULL,
  request_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_sources_workspace
ON lead_sources(workspace_id, active);

CREATE INDEX IF NOT EXISTS idx_lead_sources_slug
ON lead_sources(workspace_id, slug);

CREATE INDEX IF NOT EXISTS idx_lead_submissions_workspace
ON lead_submissions(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_submissions_source
ON lead_submissions(lead_source_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_submissions_contact
ON lead_submissions(contact_id, created_at DESC)
WHERE contact_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lead_submissions_external_lead
ON lead_submissions(lead_source_id, external_lead_id)
WHERE external_lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lead_submissions_idempotency
ON lead_submissions(lead_source_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lead_submissions_payload_hash
ON lead_submissions(lead_source_id, payload_hash);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_submissions_source_payload_hash_unique
ON lead_submissions(lead_source_id, payload_hash);

CREATE INDEX IF NOT EXISTS idx_lead_submissions_status
ON lead_submissions(workspace_id, status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_submissions_source_external_unique
ON lead_submissions(lead_source_id, external_lead_id)
WHERE external_lead_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_submissions_source_idempotency_unique
ON lead_submissions(lead_source_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lead_rate_limit_events_source_created
ON lead_rate_limit_events(lead_source_id, created_at DESC);

ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_rate_limit_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'lead_sources_updated_at'
  ) THEN
    CREATE TRIGGER lead_sources_updated_at
      BEFORE UPDATE ON lead_sources
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lead_sources'
      AND policyname = 'workspace_members_lead_sources'
  ) THEN
    CREATE POLICY "workspace_members_lead_sources"
    ON lead_sources FOR ALL USING (
      workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid()
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lead_submissions'
      AND policyname = 'workspace_members_lead_submissions'
  ) THEN
    CREATE POLICY "workspace_members_lead_submissions"
    ON lead_submissions FOR ALL USING (
      workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid()
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lead_rate_limit_events'
      AND policyname = 'workspace_members_lead_rate_limit_events'
  ) THEN
    CREATE POLICY "workspace_members_lead_rate_limit_events"
    ON lead_rate_limit_events FOR ALL USING (
      lead_source_id IN (
        SELECT ls.id
        FROM lead_sources ls
        JOIN workspace_members wm ON wm.workspace_id = ls.workspace_id
        WHERE wm.user_id = auth.uid()
      )
    );
  END IF;
END $$;

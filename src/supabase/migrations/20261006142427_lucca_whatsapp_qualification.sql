-- Lucca: after-hours WhatsApp qualification with durable, workspace-scoped state.

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS sender_type text;

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS automated_by text;

UPDATE messages
SET sender_type = CASE
  WHEN direction = 'inbound' THEN 'contact'
  ELSE 'unknown'
END
WHERE sender_type IS NULL;

ALTER TABLE messages
ALTER COLUMN sender_type SET DEFAULT 'system';

ALTER TABLE messages
ALTER COLUMN sender_type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'messages_sender_type_check'
  ) THEN
    ALTER TABLE messages
    ADD CONSTRAINT messages_sender_type_check
    CHECK (sender_type IN ('contact', 'human', 'automation', 'system', 'unknown'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_workspace_contact_sender
ON messages(workspace_id, contact_id, sender_type, created_at DESC);

CREATE TABLE IF NOT EXISTS lucca_qualifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  first_message_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  last_processed_message_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  current_step smallint NOT NULL DEFAULT 1,
  first_message_text text,
  initial_received_at timestamptz NOT NULL,
  reception_sent_at timestamptz,
  completed_at timestamptz,
  paused_at timestamptz,
  pause_reason text,
  human_taken_over_at timestamptz,
  human_taken_over_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resumed_at timestamptz,
  resumed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  city text,
  digital_experience text,
  team_size_text text,
  team_size_number integer,
  business_type text,
  raw_responses jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary text,
  origin jsonb NOT NULL DEFAULT '{}'::jsonb,
  origin_evidence text NOT NULL DEFAULT 'unidentified',
  attribution_submission_id uuid REFERENCES lead_submissions(id) ON DELETE SET NULL,
  notification_status text NOT NULL DEFAULT 'pending',
  notification_message_sid text,
  notification_error text,
  notified_at timestamptz,
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  openai_model text,
  openai_response_id text,
  response_sla_ms integer,
  response_sla_breached boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lucca_qualifications_workspace_contact_unique UNIQUE (workspace_id, contact_id),
  CONSTRAINT lucca_qualifications_status_check CHECK (
    status IN ('active', 'qualified', 'awaiting_human', 'human_owned', 'opted_out', 'paused', 'failed')
  ),
  CONSTRAINT lucca_qualifications_step_check CHECK (current_step BETWEEN 1 AND 4),
  CONSTRAINT lucca_qualifications_origin_evidence_check CHECK (
    origin_evidence IN ('twilio_referral', 'lead_submission', 'unidentified')
  ),
  CONSTRAINT lucca_qualifications_notification_status_check CHECK (
    notification_status IN ('pending', 'accepted', 'sent', 'delivered', 'read', 'failed', 'skipped')
  ),
  CONSTRAINT lucca_qualifications_team_size_nonnegative CHECK (
    team_size_number IS NULL OR team_size_number >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_lucca_qualifications_workspace_status
ON lucca_qualifications(workspace_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_lucca_qualifications_contact
ON lucca_qualifications(contact_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_lucca_qualifications_notification_sid
ON lucca_qualifications(notification_message_sid)
WHERE notification_message_sid IS NOT NULL;

CREATE TABLE IF NOT EXISTS lucca_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  qualification_id uuid REFERENCES lucca_qualifications(id) ON DELETE CASCADE NOT NULL,
  message_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  job_type text NOT NULL,
  event_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  locked_at timestamptz,
  locked_by text,
  last_attempt_at timestamptz,
  last_error text,
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  CONSTRAINT lucca_jobs_event_key_unique UNIQUE (event_key),
  CONSTRAINT lucca_jobs_type_check CHECK (job_type IN ('conversation', 'notification')),
  CONSTRAINT lucca_jobs_status_check CHECK (
    status IN ('pending', 'processing', 'done', 'failed', 'cancelled')
  ),
  CONSTRAINT lucca_jobs_attempts_check CHECK (
    attempts >= 0 AND max_attempts > 0 AND attempts <= max_attempts
  )
);

CREATE INDEX IF NOT EXISTS idx_lucca_jobs_pending
ON lucca_jobs(scheduled_for, created_at)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_lucca_jobs_qualification
ON lucca_jobs(qualification_id, job_type, status, created_at);

CREATE INDEX IF NOT EXISTS idx_lucca_jobs_processing_lease
ON lucca_jobs(locked_at)
WHERE status = 'processing';

CREATE UNIQUE INDEX IF NOT EXISTS idx_lucca_jobs_one_processing_per_type
ON lucca_jobs(qualification_id, job_type)
WHERE status = 'processing';

ALTER TABLE lucca_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE lucca_jobs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE lucca_qualifications FROM anon;
REVOKE ALL ON TABLE lucca_jobs FROM anon;
GRANT SELECT, UPDATE ON TABLE lucca_qualifications TO authenticated;
GRANT SELECT ON TABLE lucca_jobs TO authenticated;
GRANT ALL ON TABLE lucca_qualifications TO service_role;
GRANT ALL ON TABLE lucca_jobs TO service_role;

CREATE POLICY "workspace_members_select_lucca_qualifications"
ON lucca_qualifications FOR SELECT
TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "workspace_members_update_lucca_qualifications"
ON lucca_qualifications FOR UPDATE
TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "workspace_members_select_lucca_jobs"
ON lucca_jobs FOR SELECT
TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = (SELECT auth.uid())
  )
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'lucca_qualifications_updated_at'
  ) THEN
    CREATE TRIGGER lucca_qualifications_updated_at
      BEFORE UPDATE ON lucca_qualifications
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

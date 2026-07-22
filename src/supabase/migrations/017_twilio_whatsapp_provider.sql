-- Multi-provider WhatsApp support and Twilio dispatch idempotency.

ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS whatsapp_provider text NOT NULL DEFAULT 'meta_cloud';

ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS twilio_whatsapp_from text;

ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS twilio_content_sid_new_lead text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'workspaces_whatsapp_provider_check'
  ) THEN
    ALTER TABLE workspaces
    ADD CONSTRAINT workspaces_whatsapp_provider_check
    CHECK (whatsapp_provider IN ('meta_cloud', 'twilio'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_workspaces_twilio_whatsapp_from
ON workspaces(twilio_whatsapp_from)
WHERE twilio_whatsapp_from IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_twilio_whatsapp_from_unique
ON workspaces(twilio_whatsapp_from)
WHERE twilio_whatsapp_from IS NOT NULL AND whatsapp_provider = 'twilio';

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'meta_cloud';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'messages_provider_check'
  ) THEN
    ALTER TABLE messages
    ADD CONSTRAINT messages_provider_check
    CHECK (provider IN ('meta_cloud', 'twilio'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_provider_whatsapp_message_id
ON messages(provider, whatsapp_message_id)
WHERE whatsapp_message_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS whatsapp_dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  automation_queue_id uuid REFERENCES automation_queue(id) ON DELETE SET NULL,
  event_key text NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  provider text NOT NULL,
  operation text NOT NULL,
  status text NOT NULL DEFAULT 'prepared',
  provider_message_id text,
  request_fingerprint text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  locked_at timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  delivery_unknown_at timestamptz,
  CONSTRAINT whatsapp_dispatches_provider_check
    CHECK (provider IN ('meta_cloud', 'twilio')),
  CONSTRAINT whatsapp_dispatches_status_check
    CHECK (status IN ('prepared', 'sending', 'accepted', 'failed', 'delivery_unknown'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_dispatches_provider_event_key
ON whatsapp_dispatches(provider, event_key);

CREATE INDEX IF NOT EXISTS idx_whatsapp_dispatches_workspace
ON whatsapp_dispatches(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_dispatches_provider_message_id
ON whatsapp_dispatches(provider, provider_message_id)
WHERE provider_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_dispatches_delivery_unknown
ON whatsapp_dispatches(workspace_id, delivery_unknown_at DESC)
WHERE status = 'delivery_unknown';

CREATE TABLE IF NOT EXISTS whatsapp_message_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  message_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  provider text NOT NULL,
  provider_message_id text NOT NULL,
  status text NOT NULL,
  error_code text,
  error_message text,
  occurred_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT whatsapp_message_events_provider_check
    CHECK (provider IN ('meta_cloud', 'twilio'))
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_message_events_message
ON whatsapp_message_events(message_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_message_events_provider_message
ON whatsapp_message_events(provider, provider_message_id, occurred_at DESC);

ALTER TABLE whatsapp_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_message_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'whatsapp_dispatches'
      AND policyname = 'workspace_members_whatsapp_dispatches'
  ) THEN
    CREATE POLICY "workspace_members_whatsapp_dispatches"
    ON whatsapp_dispatches FOR ALL USING (
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
      AND tablename = 'whatsapp_message_events'
      AND policyname = 'workspace_members_whatsapp_message_events'
  ) THEN
    CREATE POLICY "workspace_members_whatsapp_message_events"
    ON whatsapp_message_events FOR ALL USING (
      workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid()
      )
    );
  END IF;
END $$;

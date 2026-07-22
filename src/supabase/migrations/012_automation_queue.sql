-- Fila de automacoes pendentes (com delay)
CREATE TABLE IF NOT EXISTS automation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  automation_id uuid REFERENCES automations(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer DEFAULT 0,
  max_attempts integer DEFAULT 3,
  error_message text,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- Indice critico para o cron job
CREATE INDEX IF NOT EXISTS idx_automation_queue_scheduled
  ON automation_queue(scheduled_for, status)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_automation_queue_workspace
  ON automation_queue(workspace_id, status);

-- RLS
ALTER TABLE automation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_queue"
ON automation_queue FOR ALL USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid()
  )
);

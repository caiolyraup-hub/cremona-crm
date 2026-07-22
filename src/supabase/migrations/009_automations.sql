-- Tabela principal de automações
CREATE TABLE IF NOT EXISTS automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id)
    ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  trigger_type text NOT NULL,
  trigger_config jsonb NOT NULL DEFAULT '{}',
  action_type text NOT NULL,
  action_config jsonb NOT NULL DEFAULT '{}',
  active boolean DEFAULT true,
  delay_minutes integer DEFAULT 0,
  run_count integer DEFAULT 0,
  last_run_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Log de execuções de automações
CREATE TABLE IF NOT EXISTS automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id)
    ON DELETE CASCADE NOT NULL,
  automation_id uuid REFERENCES automations(id)
    ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES contacts(id)
    ON DELETE SET NULL,
  status text NOT NULL,
  error_message text,
  executed_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_automations_workspace
  ON automations(workspace_id)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_automation_logs_automation
  ON automation_logs(automation_id, executed_at DESC);

CREATE INDEX IF NOT EXISTS idx_automation_logs_contact
  ON automation_logs(contact_id, executed_at DESC);

-- RLS
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_automations"
ON automations FOR ALL USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "workspace_members_automation_logs"
ON automation_logs FOR ALL USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid()
  )
);

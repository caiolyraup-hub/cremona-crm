-- Indices para queries de analytics do WhatsApp

CREATE INDEX IF NOT EXISTS idx_messages_workspace_direction_date
  ON messages(workspace_id, direction, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_workspace_contact_date
  ON messages(workspace_id, contact_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_automation_logs_workspace_date
  ON automation_logs(workspace_id, executed_at DESC);

CREATE INDEX IF NOT EXISTS idx_automation_logs_status_date
  ON automation_logs(automation_id, status, executed_at DESC);

-- Templates WhatsApp aprovados pela Meta, cadastrados por workspace
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id)
    ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  display_name text NOT NULL,
  language text NOT NULL DEFAULT 'pt_BR',
  category text NOT NULL DEFAULT 'UTILITY',
  body_text text NOT NULL,
  variables jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'pending',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_workspace
  ON whatsapp_templates(workspace_id)
  WHERE active = true AND status = 'approved';

ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_templates"
ON whatsapp_templates FOR ALL USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid()
  )
);

-- Adicionar suporte a midia nas automacoes
-- O action_config para send_whatsapp_media:
-- {
--   "media_url": "https://...supabase.co/...",
--   "media_type": "image|document|audio|video",
--   "filename": "proposta.pdf",
--   "caption": "Segue nossa proposta!"
-- }

-- Nao ha mudanca de schema necessaria: action_config e jsonb e ja suporta
-- qualquer estrutura. Esta migration documenta o novo tipo e cria um indice.

COMMENT ON COLUMN automations.action_type IS
'Valores validos: send_whatsapp_text, send_whatsapp_template, send_whatsapp_media, create_task';

CREATE INDEX IF NOT EXISTS
  idx_automations_action_type
  ON automations(workspace_id, action_type)
  WHERE active = true;

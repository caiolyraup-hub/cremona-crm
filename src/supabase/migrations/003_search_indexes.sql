-- Índice para busca full-text por nome (português)
CREATE INDEX IF NOT EXISTS idx_contacts_name
  ON contacts USING gin(to_tsvector('portuguese', name));

-- Índice composto para listagem principal (workspace + created_at DESC, só ativos)
CREATE INDEX IF NOT EXISTS idx_contacts_workspace_created
  ON contacts(workspace_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Índice para filtro por tags (array containment)
CREATE INDEX IF NOT EXISTS idx_contacts_tags
  ON contacts USING gin(tags);

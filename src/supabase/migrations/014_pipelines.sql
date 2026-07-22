-- ===============================================================
-- Migration 014: Suporte a múltiplos pipelines (Opção A)
-- Cada pipeline tem suas próprias stages; contato está em apenas
-- um pipeline por vez (via contacts.pipeline_stage_id existente).
-- ===============================================================

-- 1. Tabela de pipelines
CREATE TABLE IF NOT EXISTS pipelines (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name         text NOT NULL,
  description  text,
  color        text DEFAULT '#378ADD',
  position     integer NOT NULL DEFAULT 1,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pipelines_select" ON pipelines
  FOR SELECT USING (workspace_id IN (SELECT user_workspace_ids()));

CREATE POLICY "pipelines_insert" ON pipelines
  FOR INSERT WITH CHECK (workspace_id IN (SELECT user_workspace_ids()));

CREATE POLICY "pipelines_update" ON pipelines
  FOR UPDATE USING (workspace_id IN (SELECT user_workspace_ids()));

CREATE POLICY "pipelines_delete" ON pipelines
  FOR DELETE USING (workspace_id IN (SELECT user_workspace_ids()));

-- 2. Adiciona pipeline_id em pipeline_stages
ALTER TABLE pipeline_stages
  ADD COLUMN IF NOT EXISTS pipeline_id uuid REFERENCES pipelines(id) ON DELETE CASCADE;

-- 3. Cria pipeline "Principal" para cada workspace que ainda não tem nenhum
INSERT INTO pipelines (workspace_id, name, position, color, created_at)
SELECT id, 'Principal', 1, '#378ADD', now()
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM pipelines p WHERE p.workspace_id = w.id
);

-- 4. Vincula stages existentes ao pipeline principal do workspace
UPDATE pipeline_stages ps
SET pipeline_id = p.id
FROM pipelines p
WHERE ps.workspace_id = p.workspace_id
  AND ps.pipeline_id IS NULL;

-- 5. Índices de performance
CREATE INDEX IF NOT EXISTS idx_pipelines_workspace_id ON pipelines(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline_id ON pipeline_stages(pipeline_id);

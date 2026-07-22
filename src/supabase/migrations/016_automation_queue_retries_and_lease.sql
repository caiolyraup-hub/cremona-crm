-- Lease, retries e recuperacao segura para automation_queue.
-- Migration nao destrutiva.
-- Rollback manual:
--   DROP INDEX IF EXISTS idx_automation_queue_processing_lease;
--   ALTER TABLE automation_queue DROP COLUMN IF EXISTS last_attempt_at;
--   ALTER TABLE automation_queue DROP COLUMN IF EXISTS locked_by;
--   ALTER TABLE automation_queue DROP COLUMN IF EXISTS locked_at;

ALTER TABLE automation_queue
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_by text,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_automation_queue_processing_lease
  ON automation_queue(locked_at)
  WHERE status = 'processing';

COMMENT ON COLUMN automation_queue.locked_at IS
'Timestamp em que o worker adquiriu o lease do job.';

COMMENT ON COLUMN automation_queue.locked_by IS
'Identificador unico do worker que adquiriu o lease do job.';

COMMENT ON COLUMN automation_queue.last_attempt_at IS
'Timestamp da ultima tentativa de execucao do job.';

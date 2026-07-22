-- Idempotencia para automation_queue.
-- Rollback manual:
--   DROP INDEX IF EXISTS automation_queue_event_key_unique;
--   ALTER TABLE automation_queue DROP COLUMN IF EXISTS event_key;

ALTER TABLE automation_queue
  ADD COLUMN IF NOT EXISTS event_key text;

CREATE UNIQUE INDEX IF NOT EXISTS automation_queue_event_key_unique
  ON automation_queue(event_key)
  WHERE event_key IS NOT NULL;

COMMENT ON COLUMN automation_queue.event_key IS
'Chave deterministica do evento logico de automacao. Formatos: contact_created:{contact_id}:{automation_id}, stage_enter:{contact_id}:{stage_id}:{automation_id}, stage_exit:{contact_id}:{stage_id}:{automation_id}.';

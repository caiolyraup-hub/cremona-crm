-- ============================================================
-- Cremona - Agenda interna + Google Calendar one-way sync
-- Migration aditiva e segura para o MVP operacional.
--
-- appointments continua sendo a fonte da verdade. Google Calendar
-- e apenas espelho de saida, com falhas registradas para retry.
-- ============================================================

BEGIN;

-- Origem do agendamento. Neste ciclo, tudo criado pelo painel.
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'panel'
    CHECK (source IN ('panel'));

CREATE INDEX IF NOT EXISTS appointments_source_idx
  ON public.appointments (source);

-- Fila/log de tentativas de sync. Uma falha no Google nunca bloqueia
-- a escrita em appointments; este registro permite reprocessamento.
CREATE TABLE IF NOT EXISTS public.appointment_google_sync_logs (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id    uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  appointment_id  uuid        NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  barber_id       uuid        NULL REFERENCES public.barbers(id) ON DELETE SET NULL,
  operation       text        NOT NULL CHECK (operation IN ('create','update','cancel')),
  status          text        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','failed','succeeded')),
  error_message   text        NULL,
  payload         jsonb       NOT NULL DEFAULT '{}',
  retry_count     integer     NOT NULL DEFAULT 0,
  next_retry_at   timestamptz NULL,
  processed_at    timestamptz NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.appointment_google_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS appointment_google_sync_logs_workspace_id_idx
  ON public.appointment_google_sync_logs (workspace_id);

CREATE INDEX IF NOT EXISTS appointment_google_sync_logs_retry_idx
  ON public.appointment_google_sync_logs (status, next_retry_at);

CREATE POLICY appointment_google_sync_logs_select
  ON public.appointment_google_sync_logs FOR SELECT
  USING (workspace_id IN (SELECT user_workspace_ids()));

CREATE POLICY appointment_google_sync_logs_insert
  ON public.appointment_google_sync_logs FOR INSERT
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids()));

CREATE POLICY appointment_google_sync_logs_update
  ON public.appointment_google_sync_logs FOR UPDATE
  USING (workspace_id IN (SELECT user_workspace_ids()));

COMMIT;

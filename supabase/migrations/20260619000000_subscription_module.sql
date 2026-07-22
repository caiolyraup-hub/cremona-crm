-- ============================================================
-- Cremona — Módulo de Assinaturas (Barbearia Costta)
-- Migration: 20260619000000_subscription_module.sql
-- Padrão de RLS: workspace_id IN (SELECT user_workspace_ids())
-- ============================================================

BEGIN;

-- ============================================================
-- plans
-- ============================================================
CREATE TABLE public.plans (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id      uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name              text        NOT NULL,
  price_cents       integer     NOT NULL,
  billing_cycle     text        NOT NULL CHECK (billing_cycle IN ('monthly','quarterly','annual')),
  usage_limit       integer     NULL,  -- NULL = ilimitado
  included_services jsonb       NOT NULL DEFAULT '[]',
  active            boolean     NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE INDEX plans_workspace_id_idx ON public.plans (workspace_id);

CREATE POLICY plans_select ON public.plans FOR SELECT
  USING (workspace_id IN (SELECT user_workspace_ids()));
CREATE POLICY plans_insert ON public.plans FOR INSERT
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids()));
CREATE POLICY plans_update ON public.plans FOR UPDATE
  USING (workspace_id IN (SELECT user_workspace_ids()));
CREATE POLICY plans_delete ON public.plans FOR DELETE
  USING (workspace_id IN (SELECT user_workspace_ids()));


-- ============================================================
-- subscribers  (1:1 com contacts — um contact vira assinante)
-- ============================================================
CREATE TABLE public.subscribers (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id      uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contact_id        uuid        NOT NULL REFERENCES public.contacts(id) ON DELETE RESTRICT,
  asaas_customer_id text        NULL,
  status            text        NOT NULL DEFAULT 'active'
                                  CHECK (status IN ('active','past_due','paused','canceled')),
  started_at        timestamptz NOT NULL DEFAULT now(),
  canceled_at       timestamptz NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, contact_id)  -- um contact = um assinante por workspace
);

ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
CREATE INDEX subscribers_workspace_id_idx ON public.subscribers (workspace_id);
CREATE INDEX subscribers_contact_id_idx   ON public.subscribers (contact_id);

CREATE POLICY subscribers_select ON public.subscribers FOR SELECT
  USING (workspace_id IN (SELECT user_workspace_ids()));
CREATE POLICY subscribers_insert ON public.subscribers FOR INSERT
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids()));
CREATE POLICY subscribers_update ON public.subscribers FOR UPDATE
  USING (workspace_id IN (SELECT user_workspace_ids()));
CREATE POLICY subscribers_delete ON public.subscribers FOR DELETE
  USING (workspace_id IN (SELECT user_workspace_ids()));


-- ============================================================
-- subscriptions
-- Regra: bloquear agendamento se subscriber.status != 'active'
--        OU (plan.usage_limit IS NOT NULL
--            AND usage_count_current_period >= plan.usage_limit).
-- Regra: virada de ciclo zera usage_count_current_period
--        e recalcula next_due_date.
-- ============================================================
CREATE TABLE public.subscriptions (
  id                         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id               uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  subscriber_id              uuid        NOT NULL REFERENCES public.subscribers(id) ON DELETE RESTRICT,
  plan_id                    uuid        NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  current_period_start       date        NOT NULL,
  current_period_end         date        NOT NULL,
  next_due_date              date        NOT NULL,
  billing_type               text        NOT NULL CHECK (billing_type IN ('PIX','BOLETO','CREDIT_CARD')),
  asaas_subscription_id      text        NULL,
  usage_count_current_period integer     NOT NULL DEFAULT 0,
  created_at                 timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE INDEX subscriptions_workspace_id_idx  ON public.subscriptions (workspace_id);
CREATE INDEX subscriptions_subscriber_id_idx ON public.subscriptions (subscriber_id);
CREATE INDEX subscriptions_plan_id_idx       ON public.subscriptions (plan_id);

CREATE POLICY subscriptions_select ON public.subscriptions FOR SELECT
  USING (workspace_id IN (SELECT user_workspace_ids()));
CREATE POLICY subscriptions_insert ON public.subscriptions FOR INSERT
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids()));
CREATE POLICY subscriptions_update ON public.subscriptions FOR UPDATE
  USING (workspace_id IN (SELECT user_workspace_ids()));
CREATE POLICY subscriptions_delete ON public.subscriptions FOR DELETE
  USING (workspace_id IN (SELECT user_workspace_ids()));


-- ============================================================
-- payments  (espelho das cobranças Asaas)
-- Regra: asaas_payment_id UNIQUE → idempotência do webhook
--        (re-entregar o mesmo evento nunca duplica o registro).
-- Regra: PAYMENT_OVERDUE  → status='overdue',  subscriber.status='past_due'.
--        PAYMENT_CONFIRMED → status='confirmed', subscriber.status='active'.
--        PAYMENT_RECEIVED  → status='received',  subscriber.status='active'.
--        Não existe webhook de assinatura no Asaas — apenas de cobranças.
-- ============================================================
CREATE TABLE public.payments (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id     uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  subscription_id  uuid        NOT NULL REFERENCES public.subscriptions(id) ON DELETE RESTRICT,
  asaas_payment_id text        NOT NULL UNIQUE,  -- idempotência do webhook
  amount_cents     integer     NOT NULL,
  status           text        NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending','confirmed','received','overdue','refunded')),
  billing_type     text        NOT NULL CHECK (billing_type IN ('PIX','BOLETO','CREDIT_CARD')),
  paid_at          timestamptz NULL,
  due_date         date        NOT NULL,
  reference_period date        NULL,
  source           text        NOT NULL DEFAULT 'asaas_webhook'
                                 CHECK (source IN ('asaas_webhook','manual')),
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE INDEX payments_workspace_id_idx    ON public.payments (workspace_id);
CREATE INDEX payments_subscription_id_idx ON public.payments (subscription_id);
-- asaas_payment_id: índice único já criado pelo UNIQUE constraint

CREATE POLICY payments_select ON public.payments FOR SELECT
  USING (workspace_id IN (SELECT user_workspace_ids()));
CREATE POLICY payments_insert ON public.payments FOR INSERT
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids()));
CREATE POLICY payments_update ON public.payments FOR UPDATE
  USING (workspace_id IN (SELECT user_workspace_ids()));
CREATE POLICY payments_delete ON public.payments FOR DELETE
  USING (workspace_id IN (SELECT user_workspace_ids()));


-- ============================================================
-- barbers
-- Regra: google_calendar_id = ID do calendário individual do barbeiro.
--        create/update/cancel de appointment espelha nesse calendário
--        e persiste google_event_id no appointment.
-- ============================================================
CREATE TABLE public.barbers (
  id                 uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id       uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name               text        NOT NULL,
  active             boolean     NOT NULL DEFAULT true,
  google_calendar_id text        NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;
CREATE INDEX barbers_workspace_id_idx ON public.barbers (workspace_id);

CREATE POLICY barbers_select ON public.barbers FOR SELECT
  USING (workspace_id IN (SELECT user_workspace_ids()));
CREATE POLICY barbers_insert ON public.barbers FOR INSERT
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids()));
CREATE POLICY barbers_update ON public.barbers FOR UPDATE
  USING (workspace_id IN (SELECT user_workspace_ids()));
CREATE POLICY barbers_delete ON public.barbers FOR DELETE
  USING (workspace_id IN (SELECT user_workspace_ids()));


-- ============================================================
-- appointments  (agenda + consumo de quota)
-- Regra: bloquear agendamento de assinante se subscriber.status != 'active'
--        OU (plan.usage_limit IS NOT NULL
--            AND subscription.usage_count_current_period >= plan.usage_limit).
-- Regra: ao marcar status='completed' com subscriber_id não-nulo
--        e plan.usage_limit IS NOT NULL:
--        incrementar subscription.usage_count_current_period.
-- Regra: create/update/cancel espelha no Google Calendar do barber
--        e grava google_event_id.
-- ============================================================
CREATE TABLE public.appointments (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id    uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  barber_id       uuid        NOT NULL REFERENCES public.barbers(id) ON DELETE RESTRICT,
  contact_id      uuid        NOT NULL REFERENCES public.contacts(id) ON DELETE RESTRICT,
  subscriber_id   uuid        NULL REFERENCES public.subscribers(id) ON DELETE SET NULL,  -- NULL = avulso
  service         text        NOT NULL,
  starts_at       timestamptz NOT NULL,
  ends_at         timestamptz NOT NULL,
  status          text        NOT NULL DEFAULT 'scheduled'
                                CHECK (status IN ('scheduled','completed','no_show','canceled')),
  google_event_id text        NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE INDEX appointments_workspace_id_idx  ON public.appointments (workspace_id);
CREATE INDEX appointments_barber_starts_idx ON public.appointments (barber_id, starts_at);
CREATE INDEX appointments_contact_id_idx    ON public.appointments (contact_id);
CREATE INDEX appointments_subscriber_id_idx ON public.appointments (subscriber_id);

CREATE POLICY appointments_select ON public.appointments FOR SELECT
  USING (workspace_id IN (SELECT user_workspace_ids()));
CREATE POLICY appointments_insert ON public.appointments FOR INSERT
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids()));
CREATE POLICY appointments_update ON public.appointments FOR UPDATE
  USING (workspace_id IN (SELECT user_workspace_ids()));
CREATE POLICY appointments_delete ON public.appointments FOR DELETE
  USING (workspace_id IN (SELECT user_workspace_ids()));

COMMIT;

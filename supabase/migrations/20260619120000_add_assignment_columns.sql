-- ============================================================
-- Cremona — Migration aditiva: colunas de atribuição por barbeiro
-- 20260619120000_add_assignment_columns.sql
--
-- Não altera RLS existente: as policies de UPDATE/SELECT das tabelas
-- subscribers e subscriptions já protegem todas as colunas via workspace_id.
-- ============================================================

BEGIN;

-- subscribers.owner_barber_id → barbeiro dono da carteira do assinante
ALTER TABLE public.subscribers
  ADD COLUMN owner_barber_id uuid NULL
    REFERENCES public.barbers(id) ON DELETE SET NULL;

-- subscriptions.sold_by_barber_id → barbeiro que fechou a venda
ALTER TABLE public.subscriptions
  ADD COLUMN sold_by_barber_id uuid NULL
    REFERENCES public.barbers(id) ON DELETE SET NULL;

CREATE INDEX subscribers_owner_barber_id_idx
  ON public.subscribers (owner_barber_id);

CREATE INDEX subscriptions_sold_by_barber_id_idx
  ON public.subscriptions (sold_by_barber_id);

COMMIT;

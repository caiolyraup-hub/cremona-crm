-- Migration 007: Stripe billing integration
-- Adds subscription tracking columns to workspaces

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'trial',
  -- Possible values: trial, active, past_due, canceled, unpaid
  ADD COLUMN IF NOT EXISTS subscription_ends_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_workspaces_stripe_customer
  ON workspaces(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

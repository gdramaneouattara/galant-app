-- Auto-renew support columns for store subscriptions (Google Play / App Store)
-- Safe to run multiple times.

ALTER TABLE IF EXISTS public.subscriptions
  ADD COLUMN IF NOT EXISTS external_product_id text;

ALTER TABLE IF EXISTS public.subscriptions
  ADD COLUMN IF NOT EXISTS external_purchase_token text;

ALTER TABLE IF EXISTS public.subscriptions
  ADD COLUMN IF NOT EXISTS external_transaction_id text;

ALTER TABLE IF EXISTS public.subscriptions
  ADD COLUMN IF NOT EXISTS external_original_transaction_id text;

ALTER TABLE IF EXISTS public.subscriptions
  ADD COLUMN IF NOT EXISTS auto_renewing boolean;

ALTER TABLE IF EXISTS public.subscriptions
  ADD COLUMN IF NOT EXISTS last_verified_at timestamptz;

CREATE INDEX IF NOT EXISTS subscriptions_user_status_end_idx
  ON public.subscriptions (user_id, status, current_period_end DESC);


-- Integration account/signal storage

CREATE TABLE IF NOT EXISTS public.connected_accounts (
  account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('whoop')),
  status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'error')),
  external_user_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_connected_accounts_user_provider
  ON public.connected_accounts (user_id, provider);

ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'connected_accounts' AND policyname = 'Users can CRUD own connected_accounts'
  ) THEN
    CREATE POLICY "Users can CRUD own connected_accounts" ON public.connected_accounts
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.connected_signals (
  signal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('whoop')),
  signal_date DATE NOT NULL,
  recovery_score NUMERIC,
  strain_score NUMERIC,
  sleep_hours NUMERIC,
  resting_hr NUMERIC,
  hrv NUMERIC,
  raw_payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_connected_signals_user_provider_date
  ON public.connected_signals (user_id, provider, signal_date);

ALTER TABLE public.connected_signals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'connected_signals' AND policyname = 'Users can CRUD own connected_signals'
  ) THEN
    CREATE POLICY "Users can CRUD own connected_signals" ON public.connected_signals
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'connected_accounts_updated_at') THEN
    CREATE TRIGGER connected_accounts_updated_at BEFORE UPDATE ON public.connected_accounts
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'connected_signals_updated_at') THEN
    CREATE TRIGGER connected_signals_updated_at BEFORE UPDATE ON public.connected_signals
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

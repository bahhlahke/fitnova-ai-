-- Product telemetry events

CREATE TABLE IF NOT EXISTS public.product_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  event_props JSONB NOT NULL DEFAULT '{}',
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_events_user_created
  ON public.product_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_events_name_created
  ON public.product_events (event_name, created_at DESC);

ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'product_events' AND policyname = 'Users can insert own product_events'
  ) THEN
    CREATE POLICY "Users can insert own product_events" ON public.product_events
      FOR INSERT WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'product_events' AND policyname = 'Users can read own product_events'
  ) THEN
    CREATE POLICY "Users can read own product_events" ON public.product_events
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

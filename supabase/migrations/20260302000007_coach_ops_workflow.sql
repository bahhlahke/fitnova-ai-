-- Coach operations workflow foundation (assignment, SLA, threaded messages, admin visibility)

ALTER TABLE public.coach_escalations
  ADD COLUMN IF NOT EXISTS assigned_coach_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.coach_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_admins ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_admins' AND policyname = 'Users can read own coach_admins membership'
  ) THEN
    CREATE POLICY "Users can read own coach_admins membership" ON public.coach_admins
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.coach_escalation_messages (
  escalation_message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escalation_id UUID NOT NULL REFERENCES public.coach_escalations(escalation_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'coach', 'system', 'sms')),
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'sms', 'email')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coach_escalation_messages_escalation_created
  ON public.coach_escalation_messages (escalation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_coach_escalation_messages_user_created
  ON public.coach_escalation_messages (user_id, created_at DESC);

ALTER TABLE public.coach_escalation_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_escalation_messages' AND policyname = 'Users can read own escalation messages'
  ) THEN
    CREATE POLICY "Users can read own escalation messages" ON public.coach_escalation_messages
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_escalation_messages' AND policyname = 'Users can insert own escalation messages'
  ) THEN
    CREATE POLICY "Users can insert own escalation messages" ON public.coach_escalation_messages
      FOR INSERT WITH CHECK (
        auth.uid() = user_id
        AND (
          sender_type = 'user'
          OR sender_type = 'sms'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_escalation_messages' AND policyname = 'Coach admins can manage escalation messages'
  ) THEN
    CREATE POLICY "Coach admins can manage escalation messages" ON public.coach_escalation_messages
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.coach_admins a
          WHERE a.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.coach_admins a
          WHERE a.user_id = auth.uid()
        )
      );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.coach_escalation_events (
  escalation_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escalation_id UUID NOT NULL REFERENCES public.coach_escalations(escalation_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'coach', 'system', 'sms')),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'assigned', 'message', 'status_changed', 'resolved', 'sla_updated')),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coach_escalation_events_escalation_created
  ON public.coach_escalation_events (escalation_id, created_at DESC);

ALTER TABLE public.coach_escalation_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_escalation_events' AND policyname = 'Users can read own escalation events'
  ) THEN
    CREATE POLICY "Users can read own escalation events" ON public.coach_escalation_events
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_escalation_events' AND policyname = 'Coach admins can manage escalation events'
  ) THEN
    CREATE POLICY "Coach admins can manage escalation events" ON public.coach_escalation_events
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.coach_admins a
          WHERE a.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.coach_admins a
          WHERE a.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_escalations' AND policyname = 'Coach admins can manage escalations'
  ) THEN
    CREATE POLICY "Coach admins can manage escalations" ON public.coach_escalations
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.coach_admins a
          WHERE a.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.coach_admins a
          WHERE a.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'coach_escalation_messages_updated_at') THEN
    CREATE TRIGGER coach_escalation_messages_updated_at BEFORE UPDATE ON public.coach_escalation_messages
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'coach_escalation_events_updated_at') THEN
    CREATE TRIGGER coach_escalation_events_updated_at BEFORE UPDATE ON public.coach_escalation_events
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

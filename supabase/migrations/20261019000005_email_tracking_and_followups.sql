-- =====================================================================
-- PHASE 05 — EMAIL REPLIES AND FOLLOW-UPS MIGRATION
-- =====================================================================

-- 1. EMAIL LOGS TABLE (Manual and integrated outbound & inbound emails)
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message_content TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reply_received BOOLEAN NOT NULL DEFAULT FALSE,
  reply_at TIMESTAMPTZ,
  reply_content TEXT,
  reply_category TEXT,
  next_follow_up_date DATE,
  notes TEXT,
  thread_id TEXT,
  message_id TEXT,
  is_inbound BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. FOLLOW-UPS TABLE (Scheduled calls, tasks, emails, meetings)
CREATE TABLE IF NOT EXISTS public.follow_ups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  due_date DATE NOT NULL,
  due_time TIME,
  type TEXT NOT NULL DEFAULT 'call', -- 'email', 'call', 'meeting', 'task'
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  status TEXT NOT NULL DEFAULT 'upcoming', -- 'due_today', 'overdue', 'upcoming', 'completed', 'cancelled'
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  rescheduled_from DATE,
  rescheduled_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. EMAIL INTEGRATIONS CONFIG (Gmail API / Microsoft Graph OAuth connections)
CREATE TABLE IF NOT EXISTS public.email_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'gmail' or 'microsoft_graph'
  status TEXT NOT NULL DEFAULT 'disconnected', -- 'connected', 'disconnected', 'error'
  connected_email TEXT,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  last_sync_at TIMESTAMPTZ,
  error_message TEXT,
  webhook_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- 4. INBOUND EMAIL BUFFER (Unmatched inbound messages pending lead association)
CREATE TABLE IF NOT EXISTS public.inbound_email_buffer (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id TEXT NOT NULL UNIQUE,
  thread_id TEXT,
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  matched_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  is_ambiguous BOOLEAN NOT NULL DEFAULT FALSE,
  is_processed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. EXTEND COMPANY SETTINGS WITH CONFIGURABLE THRESHOLDS
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS uncontacted_threshold_days INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS no_response_threshold_days INTEGER NOT NULL DEFAULT 5;

-- 6. INDEXES FOR HIGH-PERFORMANCE QUERYING
CREATE INDEX IF NOT EXISTS idx_email_logs_lead ON public.email_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sender ON public.email_logs(sender_user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_thread ON public.email_logs(thread_id);

CREATE INDEX IF NOT EXISTS idx_follow_ups_lead ON public.follow_ups(lead_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_assignee ON public.follow_ups(assigned_to);
CREATE INDEX IF NOT EXISTS idx_follow_ups_due_date ON public.follow_ups(due_date);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON public.follow_ups(status);

-- 7. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbound_email_buffer ENABLE ROW LEVEL SECURITY;

-- Email Logs RLS: Employees can view email conversations ONLY on accessible leads
CREATE POLICY "View emails on accessible leads" ON public.email_logs
  FOR SELECT TO authenticated USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = email_logs.lead_id
      AND (l.assigned_to = auth.uid() OR l.created_by = auth.uid() OR l.assigned_to IS NULL)
    )
  );

CREATE POLICY "Insert emails on accessible leads" ON public.email_logs
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = sender_user_id AND (
      public.is_admin() OR
      EXISTS (
        SELECT 1 FROM public.leads l
        WHERE l.id = lead_id
        AND (l.assigned_to = auth.uid() OR l.created_by = auth.uid() OR l.assigned_to IS NULL)
      )
    )
  );

-- Follow-Ups RLS: Employees manage follow-ups on authorized leads
CREATE POLICY "View follow-ups on accessible leads" ON public.follow_ups
  FOR SELECT TO authenticated USING (
    public.is_admin() OR assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = follow_ups.lead_id
      AND (l.assigned_to = auth.uid() OR l.created_by = auth.uid() OR l.assigned_to IS NULL)
    )
  );

CREATE POLICY "Manage follow-ups on accessible leads" ON public.follow_ups
  FOR ALL TO authenticated USING (
    public.is_admin() OR assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = follow_ups.lead_id
      AND (l.assigned_to = auth.uid() OR l.created_by = auth.uid() OR l.assigned_to IS NULL)
    )
  );

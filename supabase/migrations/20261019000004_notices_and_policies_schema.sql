-- =====================================================================
-- PHASE 03 — IMPORTANT NOTICES AND COMPANY POLICIES MIGRATION
-- =====================================================================

-- 1. EXTEND ANNOUNCEMENTS / NOTICES TABLE
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS requires_acknowledgement BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2. CREATE NOTICE READS TABLE (Per-user read tracking)
CREATE TABLE IF NOT EXISTS public.notice_reads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notice_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(notice_id, user_id)
);

-- 3. CREATE NOTICE ACKNOWLEDGEMENTS TABLE (Per-user acknowledgment tracking)
CREATE TABLE IF NOT EXISTS public.notice_acknowledgements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notice_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(notice_id, user_id)
);

-- 4. EXTEND POLICIES TABLE WITH PUBLICATION STATUS
ALTER TABLE public.policies
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published';

-- 5. CREATE POLICY VERSIONS ARCHIVE TABLE (Preserves prior versions and changelog)
CREATE TABLE IF NOT EXISTS public.policy_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  effective_date DATE NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  change_summary TEXT
);

-- 6. EXTEND POLICY ACKNOWLEDGMENTS TABLE WITH VERSION COLUMN
ALTER TABLE public.policy_acknowledgments
  ADD COLUMN IF NOT EXISTS version TEXT NOT NULL DEFAULT '1.0';

-- Add unique constraint on policy_id, user_id, and version
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'policy_ack_version_user_unique'
  ) THEN
    ALTER TABLE public.policy_acknowledgments
      DROP CONSTRAINT IF EXISTS policy_acknowledgments_policy_id_user_id_key;
    ALTER TABLE public.policy_acknowledgments
      ADD CONSTRAINT policy_ack_version_user_unique UNIQUE (policy_id, user_id, version);
  END IF;
END $$;

-- 7. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_notice_reads_notice ON public.notice_reads(notice_id);
CREATE INDEX IF NOT EXISTS idx_notice_reads_user ON public.notice_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_notice_ack_notice ON public.notice_acknowledgements(notice_id);
CREATE INDEX IF NOT EXISTS idx_notice_ack_user ON public.notice_acknowledgements(user_id);
CREATE INDEX IF NOT EXISTS idx_policy_versions_policy ON public.policy_versions(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_ack_version ON public.policy_acknowledgments(policy_id, version);

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.notice_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notice_acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_versions ENABLE ROW LEVEL SECURITY;

-- Notice reads policies
CREATE POLICY "Users view own notice reads or admins view all" ON public.notice_reads
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can mark notices as read" ON public.notice_reads
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Notice acknowledgements policies
CREATE POLICY "Users view own notice acks or admins view all" ON public.notice_acknowledgements
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can acknowledge notices" ON public.notice_acknowledgements
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Policy versions policies
CREATE POLICY "All authenticated users view published policy versions" ON public.policy_versions
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Only admins manage policy versions" ON public.policy_versions
  FOR ALL TO authenticated USING (public.is_admin());

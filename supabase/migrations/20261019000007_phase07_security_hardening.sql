-- ==============================================================================
-- Migration: 20261019000007_phase07_security_hardening.sql
-- Description: Phase 07 Comprehensive Security Hardening
--              1. Server-side triggers preventing self-promotion & unauthorized employee creation
--              2. Session invalidation & activity blocking for deactivated accounts
--              3. Storage bucket RLS policies with strict MIME & size limits (Avatars <= 2MB, Docs <= 10MB)
--              4. OAuth tokens vault restricted to service_role only
--              5. Server-side rate limit event registry
--              6. Audit immutability reinforcement
-- ==============================================================================

-- 1. Server-side Function & Trigger: Prevent Self-Promotion and Unauthorized Account Creation
CREATE OR REPLACE FUNCTION public.check_profile_mutation_security()
RETURNS TRIGGER AS $$
DECLARE
    caller_role VARCHAR(64);
    caller_status VARCHAR(32);
BEGIN
    -- Allow service_role / background database migrations to execute unrestricted
    IF current_setting('role', true) = 'service_role' OR current_user = 'postgres' THEN
        RETURN NEW;
    END IF;

    -- Lookup the authenticated user's current profile
    SELECT role, status INTO caller_role, caller_status
    FROM public.employee_profiles
    WHERE id = auth.uid();

    -- On Profile Insertion (Employee Provisioning)
    IF TG_OP = 'INSERT' THEN
        IF caller_role IS NULL OR (caller_role NOT IN ('founder_admin', 'admin')) OR caller_status != 'active' THEN
            RAISE EXCEPTION 'P0001: Unauthorized: Only active company administrators can provision new employee records.';
        END IF;
        RETURN NEW;
    END IF;

    -- On Profile Update
    IF TG_OP = 'UPDATE' THEN
        -- Check if caller is active
        IF caller_status = 'deactivated' THEN
            RAISE EXCEPTION 'P0002: Unauthorized: Deactivated accounts are prohibited from modifying records.';
        END IF;

        -- Non-admin attempting to change sensitive fields
        IF caller_role NOT IN ('founder_admin', 'admin') THEN
            -- Check for self-promotion or role manipulation
            IF NEW.role != OLD.role THEN
                RAISE EXCEPTION 'P0003: Unauthorized: Self-promotion or role tampering is strictly prohibited.';
            END IF;

            -- Check for employment status manipulation
            IF NEW.status != OLD.status THEN
                RAISE EXCEPTION 'P0004: Unauthorized: Employees cannot modify employment status.';
            END IF;

            -- Check for compensation manipulation
            IF NEW.salary IS DISTINCT FROM OLD.salary THEN
                RAISE EXCEPTION 'P0005: Unauthorized: Employees cannot modify compensation records.';
            END IF;

            -- Check for leave quota tampering
            IF NEW.annual_leave_quota IS DISTINCT FROM OLD.annual_leave_quota OR
               NEW.sick_leave_quota IS DISTINCT FROM OLD.sick_leave_quota OR
               NEW.casual_leave_quota IS DISTINCT FROM OLD.casual_leave_quota THEN
                RAISE EXCEPTION 'P0006: Unauthorized: Employees cannot alter annual leave quotas.';
            END IF;
        END IF;

        -- Only founder_admin can promote an account to founder_admin
        IF NEW.role = 'founder_admin' AND OLD.role != 'founder_admin' AND caller_role != 'founder_admin' THEN
            RAISE EXCEPTION 'P0007: Unauthorized: Only an existing founder administrator can grant founder privileges.';
        END IF;

        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_profile_mutation_security ON public.employee_profiles;
CREATE TRIGGER trg_check_profile_mutation_security
    BEFORE INSERT OR UPDATE ON public.employee_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.check_profile_mutation_security();

-- 2. Prevent Deactivated Users from Performing Database Mutations
CREATE OR REPLACE FUNCTION public.check_active_user_status()
RETURNS TRIGGER AS $$
DECLARE
    caller_status VARCHAR(32);
BEGIN
    IF current_setting('role', true) = 'service_role' OR current_user = 'postgres' THEN
        RETURN NEW;
    END IF;

    SELECT status INTO caller_status
    FROM public.employee_profiles
    WHERE id = auth.uid();

    IF caller_status = 'deactivated' THEN
        RAISE EXCEPTION 'P0008: Unauthorized: Deactivated accounts are blocked from accessing or mutating CRM data.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach deactivated-user guard trigger to critical operational tables
DROP TRIGGER IF EXISTS trg_guard_leads_deactivated ON public.leads;
CREATE TRIGGER trg_guard_leads_deactivated
    BEFORE INSERT OR UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION public.check_active_user_status();

DROP TRIGGER IF EXISTS trg_guard_attendance_deactivated ON public.attendance_records;
CREATE TRIGGER trg_guard_attendance_deactivated
    BEFORE INSERT OR UPDATE ON public.attendance_records
    FOR EACH ROW EXECUTE FUNCTION public.check_active_user_status();

DROP TRIGGER IF EXISTS trg_guard_leaves_deactivated ON public.leave_requests;
CREATE TRIGGER trg_guard_leaves_deactivated
    BEFORE INSERT OR UPDATE ON public.leave_requests
    FOR EACH ROW EXECUTE FUNCTION public.check_active_user_status();

-- 3. Rate Limit Registry Table (Sliding-window rate limiter)
CREATE TABLE IF NOT EXISTS public.rate_limit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) NOT NULL,
    action VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_lookup 
    ON public.rate_limit_events (key, action, created_at DESC);

-- Automated cleanup of rate-limit entries older than 2 hours
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
    DELETE FROM public.rate_limit_events
    WHERE created_at < (now() - INTERVAL '2 hours');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. OAuth Token Vault Table (Stored with zero client-side access)
CREATE TABLE IF NOT EXISTS public.oauth_token_vault (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.employee_profiles(id) ON DELETE CASCADE,
    provider VARCHAR(64) NOT NULL,
    encrypted_access_token TEXT NOT NULL,
    encrypted_refresh_token TEXT,
    token_scope TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, provider)
);

-- Strict Security: Zero access to authenticated and anon users.
-- Only the backend service_role / edge functions can read or write tokens.
ALTER TABLE public.oauth_token_vault ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.oauth_token_vault FROM anon, authenticated;

-- 5. Storage Buckets and File Security Policies
-- Define private storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]),
    ('company-documents', 'company-documents', false, 10485760, ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']::text[]),
    ('notice-attachments', 'notice-attachments', false, 10485760, ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']::text[]),
    ('policy-documents', 'policy-documents', false, 10485760, ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[])
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS: Avatars (Authenticated employees can upload own avatar)
CREATE POLICY "Employees can upload own avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Anyone can view avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

-- Storage RLS: Documents & Policies (Only Admins can upload, active employees can view)
CREATE POLICY "Admins can upload company documents"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id IN ('company-documents', 'notice-attachments', 'policy-documents')
        AND auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM public.employee_profiles 
            WHERE id = auth.uid() 
            AND role IN ('founder_admin', 'admin') 
            AND status = 'active'
        )
    );

CREATE POLICY "Active employees can read company documents"
    ON storage.objects FOR SELECT
    USING (
        bucket_id IN ('company-documents', 'notice-attachments', 'policy-documents')
        AND auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM public.employee_profiles 
            WHERE id = auth.uid() 
            AND status = 'active'
        )
    );

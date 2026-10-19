-- =====================================================================
-- MIGRATION: 20261019000003_hr_attendance_leave_schema.sql
-- Complete HR Management: Employee Profiles, Attendance, Leaves, Holidays, and Settings
-- =====================================================================

-- 1. UPDATE ENUM TYPES
ALTER TYPE attendance_status ADD VALUE IF NOT EXISTS 'missing_checkout';
ALTER TYPE leave_status ADD VALUE IF NOT EXISTS 'cancelled';

-- 2. ENRICH PROFILES / EMPLOYEE_PROFILES TABLE
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS employee_id TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS reporting_manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS work_location TEXT NOT NULL DEFAULT 'Headquarters';

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_employee_id ON public.profiles(employee_id);

-- Optional table alias view for standard enterprise naming
CREATE OR REPLACE VIEW public.employee_profiles AS
  SELECT * FROM public.profiles;

-- 3. ENRICH ATTENDANCE / ATTENDANCE_RECORDS TABLE
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS is_late BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_early_departure BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS correction_reason TEXT,
  ADD COLUMN IF NOT EXISTS corrected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS corrected_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON public.attendance(user_id, date);

-- Optional table alias view for standard enterprise naming
CREATE OR REPLACE VIEW public.attendance_records AS
  SELECT * FROM public.attendance;

-- 4. ENRICH LEAVES / LEAVE_REQUESTS TABLE
ALTER TABLE public.leaves
  ADD COLUMN IF NOT EXISTS duration_type TEXT NOT NULL DEFAULT 'full_day' CHECK (duration_type IN ('full_day', 'half_day')),
  ADD COLUMN IF NOT EXISTS half_day_period TEXT CHECK (half_day_period IN ('first_half', 'second_half') OR half_day_period IS NULL),
  ADD COLUMN IF NOT EXISTS attachment_url TEXT;

CREATE INDEX IF NOT EXISTS idx_leaves_user_dates ON public.leaves(user_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leaves_status ON public.leaves(status);

-- Optional table alias view for standard enterprise naming
CREATE OR REPLACE VIEW public.leave_requests AS
  SELECT * FROM public.leaves;

-- 5. COMPANY SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.company_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL DEFAULT 'Vingo Technologies Inc.',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  work_start_time TIME NOT NULL DEFAULT '09:00:00',
  work_end_time TIME NOT NULL DEFAULT '18:00:00',
  late_threshold_minutes INTEGER NOT NULL DEFAULT 15,
  half_day_hours NUMERIC NOT NULL DEFAULT 4.5,
  standard_work_hours NUMERIC NOT NULL DEFAULT 8.0,
  weekly_offs TEXT[] NOT NULL DEFAULT ARRAY['Sunday', 'Saturday'],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial default settings if empty
INSERT INTO public.company_settings (id, company_name, timezone)
SELECT '00000000-0000-0000-0000-000000000001', 'Vingo Technologies Inc.', 'Asia/Kolkata'
WHERE NOT EXISTS (SELECT 1 FROM public.company_settings);

-- 6. EXTEND HOLIDAYS WITH ARCHIVING
ALTER TABLE public.company_holidays
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

-- 7. ATOMIC LEAVE APPROVAL TRANSACTION FUNCTION
-- Validates that the reviewer is an admin and CANNOT approve their own leave request!
CREATE OR REPLACE FUNCTION public.process_leave_review(
  p_leave_id UUID,
  p_decision leave_status,
  p_remarks TEXT,
  p_reviewer_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_leave RECORD;
  v_reviewer RECORD;
BEGIN
  -- 1. Fetch leave record
  SELECT * INTO v_leave FROM public.leaves WHERE id = p_leave_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leave request not found.';
  END IF;

  -- 2. Fetch reviewer profile
  SELECT * INTO v_reviewer FROM public.profiles WHERE id = p_reviewer_id;
  IF NOT FOUND OR (v_reviewer.role NOT IN ('founder_admin', 'admin')) THEN
    RAISE EXCEPTION 'Unauthorized: Only an authorized administrator can review leave requests.';
  END IF;

  -- 3. Prevent self-approval
  IF v_leave.user_id = p_reviewer_id THEN
    RAISE EXCEPTION 'Security Violation: Employees and administrators cannot approve or reject their own leave requests.';
  END IF;

  -- 4. Apply status update
  UPDATE public.leaves
  SET
    status = p_decision,
    admin_remarks = p_remarks,
    reviewed_by = p_reviewer_id,
    reviewed_at = NOW()
  WHERE id = p_leave_id;

  -- 5. Deduct quota if approved
  IF p_decision = 'approved' AND v_leave.status != 'approved' THEN
    IF v_leave.leave_type = 'annual' THEN
      UPDATE public.profiles
      SET annual_leave_quota = GREATEST(0, annual_leave_quota - v_leave.days_count)
      WHERE id = v_leave.user_id;
    ELSIF v_leave.leave_type = 'sick' THEN
      UPDATE public.profiles
      SET sick_leave_quota = GREATEST(0, sick_leave_quota - v_leave.days_count)
      WHERE id = v_leave.user_id;
    ELSIF v_leave.leave_type = 'casual' THEN
      UPDATE public.profiles
      SET casual_leave_quota = GREATEST(0, casual_leave_quota - v_leave.days_count)
      WHERE id = v_leave.user_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'leave_id', p_leave_id,
    'status', p_decision
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- MIGRATION: 20261019000002_roles_and_deactivation.sql
-- Adds founder_admin role, deactivated employee status, and strict RLS guards.
-- =====================================================================

-- 1. ADD ENUM VALUES
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'founder_admin';
ALTER TYPE employee_status ADD VALUE IF NOT EXISTS 'deactivated';

-- 2. UPDATED HELPER FUNCTIONS FOR SECURITY ENFORCEMENT

-- Checks if the authenticated user is an active Founder/Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND (role = 'founder_admin' OR role = 'admin')
      AND status NOT IN ('deactivated', 'inactive')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Checks if the user is an active (non-deactivated) company member
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND status NOT IN ('deactivated', 'inactive')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. PROFILE SELF-MODIFICATION & ROLE IMMUTABILITY
-- Prevents users from updating their own role, status, or salary.
CREATE OR REPLACE FUNCTION public.check_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If not an admin, ensure user cannot tamper with role, status, salary, or quotas
  IF NOT public.is_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Access Denied: You cannot modify your own or other user roles.';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Access Denied: You cannot change account activation status.';
    END IF;
    IF NEW.salary IS DISTINCT FROM OLD.salary THEN
      RAISE EXCEPTION 'Access Denied: You cannot modify salary details.';
    END IF;
    IF NEW.annual_leave_quota IS DISTINCT FROM OLD.annual_leave_quota 
       OR NEW.sick_leave_quota IS DISTINCT FROM OLD.sick_leave_quota
       OR NEW.casual_leave_quota IS DISTINCT FROM OLD.casual_leave_quota THEN
      RAISE EXCEPTION 'Access Denied: You cannot adjust leave quotas.';
    END IF;
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_protect_profile_updates ON public.profiles;
CREATE TRIGGER tr_protect_profile_updates
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_profile_update();

-- 4. UPDATE RLS TO BLOCK DEACTIVATED ACCOUNTS
DROP POLICY IF EXISTS "Public profiles viewable by company members" ON public.profiles;
CREATE POLICY "Public profiles viewable by company members" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_active_user());

DROP POLICY IF EXISTS "Employees can view own attendance" ON public.attendance;
CREATE POLICY "Employees can view own attendance" ON public.attendance
  FOR SELECT TO authenticated USING (public.is_active_user() AND (auth.uid() = user_id OR public.is_admin()));

DROP POLICY IF EXISTS "Employees view own leaves or admin views all" ON public.leaves;
CREATE POLICY "Employees view own leaves or admin views all" ON public.leaves
  FOR SELECT TO authenticated USING (public.is_active_user() AND (auth.uid() = user_id OR public.is_admin()));

DROP POLICY IF EXISTS "Admins view all leads, employees view assigned" ON public.leads;
CREATE POLICY "Admins view all leads, employees view assigned" ON public.leads
  FOR SELECT TO authenticated USING (
    public.is_active_user() AND (public.is_admin() OR assigned_to = auth.uid() OR assigned_to IS NULL)
  );

-- =====================================================================
-- VINGO ENTERPRISE CRM & WORKFORCE MANAGEMENT - SUPABASE POSTGRESQL SCHEMA
-- Migration: 20261019000000_init_crm_schema.sql
-- =====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CUSTOM TYPES
CREATE TYPE user_role AS ENUM ('admin', 'employee');
CREATE TYPE employee_status AS ENUM ('active', 'on_leave', 'inactive');
CREATE TYPE attendance_status AS ENUM ('present', 'late', 'half_day', 'absent', 'on_leave');
CREATE TYPE leave_type AS ENUM ('annual', 'sick', 'casual', 'emergency');
CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE lead_stage AS ENUM ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost');
CREATE TYPE lead_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE activity_type AS ENUM ('reply', 'note', 'call', 'email', 'meeting', 'stage_change');

-- 3. PROFILES TABLE (Mirrors auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'employee',
  title TEXT NOT NULL,
  department TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  status employee_status NOT NULL DEFAULT 'active',
  join_date DATE NOT NULL DEFAULT CURRENT_DATE,
  salary NUMERIC DEFAULT 0,
  annual_leave_quota INTEGER NOT NULL DEFAULT 18,
  sick_leave_quota INTEGER NOT NULL DEFAULT 10,
  casual_leave_quota INTEGER NOT NULL DEFAULT 8,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  clock_in TIME,
  clock_out TIME,
  total_hours NUMERIC DEFAULT 0.0,
  status attendance_status NOT NULL DEFAULT 'present',
  notes TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 5. LEAVES TABLE
CREATE TABLE IF NOT EXISTS public.leaves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  leave_type leave_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  status leave_status NOT NULL DEFAULT 'pending',
  admin_remarks TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. SALES LEADS TABLE
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  value NUMERIC NOT NULL DEFAULT 0.0,
  currency TEXT NOT NULL DEFAULT 'USD',
  stage lead_stage NOT NULL DEFAULT 'new',
  priority lead_priority NOT NULL DEFAULT 'medium',
  source TEXT NOT NULL DEFAULT 'website',
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  expected_close_date DATE,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. LEAD ACTIVITIES & REPLIES
CREATE TABLE IF NOT EXISTS public.lead_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type activity_type NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  follow_up_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. ANNOUNCEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'normal',
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  target_department TEXT NOT NULL DEFAULT 'all',
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at DATE
);

-- 9. COMPANY POLICIES TABLE
CREATE TABLE IF NOT EXISTS public.policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  summary TEXT,
  content TEXT NOT NULL,
  file_url TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. POLICY ACKNOWLEDGMENTS TABLE
CREATE TABLE IF NOT EXISTS public.policy_acknowledgments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(policy_id, user_id)
);

-- 11. COMPANY HOLIDAYS TABLE
CREATE TABLE IF NOT EXISTS public.company_holidays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  date DATE NOT NULL UNIQUE,
  description TEXT,
  is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_holidays ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is an Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles Policies
CREATE POLICY "Public profiles viewable by company members" ON public.profiles
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Users can update own basic profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL TO authenticated USING (public.is_admin());

-- Attendance Policies
CREATE POLICY "Employees can view own attendance" ON public.attendance
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Employees can insert own clock in" ON public.attendance
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Employees can update own clock out" ON public.attendance
  FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- Leaves Policies
CREATE POLICY "Employees view own leaves or admin views all" ON public.leaves
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Employees can apply for leave" ON public.leaves
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can review leaves" ON public.leaves
  FOR UPDATE TO authenticated USING (public.is_admin());

-- Leads Policies
CREATE POLICY "Admins view all leads, employees view assigned" ON public.leads
  FOR SELECT TO authenticated USING (public.is_admin() OR assigned_to = auth.uid() OR assigned_to IS NULL);

CREATE POLICY "Employees and admins can insert leads" ON public.leads
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and assigned employees can update leads" ON public.leads
  FOR UPDATE TO authenticated USING (public.is_admin() OR assigned_to = auth.uid());

CREATE POLICY "Admins can delete leads" ON public.leads
  FOR DELETE TO authenticated USING (public.is_admin());

-- Lead Activities Policies
CREATE POLICY "View activities on accessible leads" ON public.lead_activities
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.leads l 
      WHERE l.id = lead_activities.lead_id 
      AND (public.is_admin() OR l.assigned_to = auth.uid() OR l.assigned_to IS NULL)
    )
  );

CREATE POLICY "Insert activity on accessible leads" ON public.lead_activities
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id AND (
      public.is_admin() OR 
      EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND (l.assigned_to = auth.uid() OR l.assigned_to IS NULL))
    )
  );

-- Announcements Policies
CREATE POLICY "All authenticated users view announcements" ON public.announcements
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Only admins manage announcements" ON public.announcements
  FOR ALL TO authenticated USING (public.is_admin());

-- Policies Policies
CREATE POLICY "All authenticated users view policies" ON public.policies
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Only admins manage policies" ON public.policies
  FOR ALL TO authenticated USING (public.is_admin());

-- Policy Acknowledgments Policies
CREATE POLICY "Users view own acknowledgments, admins view all" ON public.policy_acknowledgments
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can sign policy" ON public.policy_acknowledgments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Company Holidays Policies
CREATE POLICY "All authenticated users view holidays" ON public.company_holidays
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Only admins manage holidays" ON public.company_holidays
  FOR ALL TO authenticated USING (public.is_admin());

-- =====================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER ON AUTH.USERS SIGNUP
-- =====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, title, department)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'employee'),
    COALESCE(NEW.raw_user_meta_data->>'title', 'Associate'),
    COALESCE(NEW.raw_user_meta_data->>'department', 'Operations')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

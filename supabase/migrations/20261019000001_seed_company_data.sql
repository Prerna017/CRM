-- =====================================================================
-- VINGO ENTERPRISE CRM - INITIAL SEED DATA
-- Migration: 20261019000001_seed_company_data.sql
-- =====================================================================

-- 1. SEED COMPANY HOLIDAYS
INSERT INTO public.company_holidays (title, date, description, is_mandatory) VALUES
  ('New Year''s Day', '2026-01-01', 'Official holiday welcoming 2026', TRUE),
  ('Martin Luther King Jr. Day', '2026-01-19', 'Celebrating civil rights icon', TRUE),
  ('Presidents'' Day', '2026-02-16', 'Federal holiday', TRUE),
  ('Memorial Day', '2026-05-25', 'Honoring military service members', TRUE),
  ('Independence Day', '2026-07-04', 'National holiday', TRUE),
  ('Labor Day', '2026-09-07', 'Celebrating workers and workforce', TRUE),
  ('Thanksgiving Day', '2026-11-26', 'National harvest festival', TRUE),
  ('Day After Thanksgiving', '2026-11-27', 'Extended company weekend', TRUE),
  ('Christmas Day', '2026-12-25', 'Winter celebrations', TRUE)
ON CONFLICT (date) DO NOTHING;

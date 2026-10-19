export type UserRole = 'founder_admin' | 'admin' | 'employee';
export type EmployeeStatus = 'active' | 'on_leave' | 'inactive' | 'deactivated';
export type AttendanceStatus = 'present' | 'late' | 'half_day' | 'absent' | 'on_leave' | 'missing_checkout';
export type LeaveType = 'annual' | 'sick' | 'casual' | 'emergency';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type LeaveDurationType = 'full_day' | 'half_day';
export type HalfDayPeriod = 'first_half' | 'second_half';
export type LeadStage = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';
export type LeadPriority = 'low' | 'medium' | 'high' | 'urgent';
export type LeadSource = 'website' | 'referral' | 'linkedin' | 'cold_outreach' | 'inbound' | 'partner';
export type ActivityType = 'reply' | 'note' | 'call' | 'email' | 'meeting' | 'stage_change';

export interface UserProfile {
  id: string;
  employee_id: string; // e.g. "EMP-001"
  name: string; // Full name
  email: string; // Official email
  role: UserRole;
  title: string; // Designation
  department: string;
  phone?: string; // Contact number
  emergency_contact_name?: string; // Emergency contact person
  emergency_contact_phone?: string; // Emergency contact phone
  avatar_url?: string; // Profile photo
  status: EmployeeStatus;
  join_date: string; // Date of joining
  reporting_manager_id?: string | null;
  reporting_manager?: UserProfile | null;
  work_location: string; // Work location (e.g. "Headquarters", "Remote")
  salary?: number;
  annual_leave_quota: number;
  sick_leave_quota: number;
  casual_leave_quota: number;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  user_id: string;
  date: string;
  clock_in?: string | null;
  clock_out?: string | null;
  total_hours: number;
  status: AttendanceStatus;
  is_late: boolean;
  is_early_departure: boolean;
  notes?: string | null;
  correction_reason?: string | null;
  corrected_by?: string | null;
  corrected_at?: string | null;
  ip_address?: string | null;
  created_at: string;
  profile?: UserProfile;
  corrector?: UserProfile;
}

export interface LeaveRecord {
  id: string;
  user_id: string;
  leave_type: LeaveType;
  duration_type: LeaveDurationType;
  half_day_period?: HalfDayPeriod | null;
  start_date: string;
  end_date: string;
  days_count?: number;
  reason: string;
  attachment_url?: string | null;
  status: LeaveStatus;
  admin_remarks?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  profile?: UserProfile;
  reviewer?: UserProfile;
}

export interface CompanyHoliday {
  id: string;
  title: string;
  date: string;
  description?: string;
  is_mandatory: boolean;
  is_archived?: boolean;
  created_at: string;
}

export interface CompanySettings {
  id: string;
  company_name: string;
  timezone: string;
  work_start_time: string;
  work_end_time: string;
  late_threshold_minutes: number;
  half_day_hours: number;
  standard_work_hours: number;
  weekly_offs: string[]; // e.g. ['Saturday', 'Sunday']
  updated_at: string;
}

export interface Lead {
  id: string;
  title: string;
  company: string;
  contact_name: string;
  contact_email?: string;
  contact_phone?: string;
  value: number;
  currency: string;
  stage: LeadStage;
  priority: LeadPriority;
  source: LeadSource;
  assigned_to?: string | null;
  expected_close_date?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  assignee?: UserProfile;
  creator?: UserProfile;
  activities_count?: number;
  last_activity_at?: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  user_id: string;
  activity_type: ActivityType;
  title?: string;
  content: string;
  follow_up_date?: string | null;
  created_at: string;
  user?: UserProfile;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  priority: 'low' | 'normal' | 'high' | 'urgent' | 'important';
  is_pinned: boolean;
  target_department: string;
  created_by: string;
  created_at: string;
  expires_at?: string | null;
  creator?: UserProfile;
  author?: UserProfile;
}

export interface Policy {
  id: string;
  title: string;
  category: string;
  version: string;
  effective_date: string;
  summary?: string;
  content: string;
  file_url?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator?: UserProfile;
  acknowledged_count?: number;
  my_acknowledged_at?: string | null;
}

export interface PolicyAcknowledgment {
  id: string;
  policy_id: string;
  user_id: string;
  acknowledged_at: string;
  user?: UserProfile;
}

export interface DashboardStats {
  employees: {
    total: number;
    active: number;
    on_leave: number;
  };
  attendanceToday: {
    clockedIn: number;
    lateArrivals: number;
    clockedOut: number;
    totalActiveEmployees: number;
  };
  pipeline: {
    totalLeads: number;
    pipelineValue: number;
    wonRevenue: number;
    wonCount: number;
    activeDealsCount: number;
    stageBreakdown: { stage: LeadStage; count: number; total_value: number }[];
  };
  pendingLeavesCount: number;
}

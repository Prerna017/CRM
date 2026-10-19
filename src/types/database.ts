export type UserRole = 'admin' | 'employee';
export type EmployeeStatus = 'active' | 'on_leave' | 'inactive';
export type AttendanceStatus = 'present' | 'late' | 'half_day' | 'absent' | 'on_leave';
export type LeaveType = 'annual' | 'sick' | 'casual' | 'emergency';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';
export type LeadStage = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';
export type LeadPriority = 'low' | 'medium' | 'high' | 'urgent';
export type LeadSource = 'website' | 'referral' | 'linkedin' | 'cold_outreach' | 'inbound' | 'partner';
export type ActivityType = 'reply' | 'note' | 'call' | 'email' | 'meeting' | 'stage_change';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  title: string;
  department: string;
  phone?: string;
  avatar_url?: string;
  status: EmployeeStatus;
  join_date: string;
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
  notes?: string | null;
  ip_address?: string | null;
  created_at: string;
  profile?: UserProfile;
}

export interface LeaveRecord {
  id: string;
  user_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  days_count: number;
  reason: string;
  status: LeaveStatus;
  admin_remarks?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  profile?: UserProfile;
  reviewer?: UserProfile;
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
  category: 'general' | 'urgent' | 'celebration' | 'policy' | 'event';
  priority: 'normal' | 'important' | 'urgent';
  is_pinned: boolean;
  target_department: string;
  created_by: string;
  created_at: string;
  expires_at?: string | null;
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

export interface CompanyHoliday {
  id: string;
  title: string;
  date: string;
  description?: string;
  is_mandatory: boolean;
  created_at: string;
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

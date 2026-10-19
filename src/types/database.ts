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
  is_missing_checkout?: boolean;
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
  uncontacted_threshold_days?: number;
  no_response_threshold_days?: number;
  updated_at: string;
}

export interface Lead {
  id: string;
  title: string;
  company: string;
  company_name?: string;
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
  last_contact_at?: string;
  is_no_response?: boolean;
  days_since_last_contact?: number;
  has_pending_followup?: boolean;
  pending_followup_date?: string | null;
  is_dead?: boolean;
  is_locked?: boolean;
  locked_by?: string | null;
  locked_at?: string | null;
  claimed_by?: string | null;
  claimed_at?: string | null;
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

// Phase 05: Email Activity & Reply Tracking
export type EmailReplyCategory =
  | 'Interested'
  | 'Not Interested'
  | 'Follow-up Later'
  | 'Asked for Pricing'
  | 'Meeting Requested'
  | 'Out of Office'
  | 'No Response'
  | 'Unsubscribe Request'
  | 'Other';

export interface EmailLog {
  id: string;
  lead_id: string;
  sender_user_id: string;
  recipient_email: string;
  subject: string;
  message_content: string;
  sent_at: string;
  reply_received: boolean;
  reply_at?: string | null;
  reply_content?: string | null;
  reply_category?: EmailReplyCategory | null;
  next_follow_up_date?: string | null;
  notes?: string | null;
  thread_id?: string | null;
  message_id?: string | null;
  is_inbound?: boolean;
  created_at: string;
  updated_at?: string;
  sender?: UserProfile;
  lead?: Lead;
}

// Phase 05: Follow-ups Tracking
export type FollowUpStatus = 'due_today' | 'overdue' | 'upcoming' | 'completed' | 'cancelled';
export type FollowUpType = 'email' | 'call' | 'meeting' | 'task';

export interface FollowUp {
  id: string;
  lead_id: string;
  assigned_to: string; // user_id
  created_by: string; // user_id
  title: string;
  notes?: string | null;
  completion_notes?: string | null;
  due_date: string; // ISO date string YYYY-MM-DD
  due_time?: string | null; // e.g. "14:00"
  type: FollowUpType;
  priority: LeadPriority;
  status: FollowUpStatus;
  completed_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  rescheduled_from?: string | null;
  rescheduled_reason?: string | null;
  created_at: string;
  updated_at: string;
  lead?: Lead;
  assignee?: UserProfile;
}

// Phase 05: Email Integration (Gmail API & Microsoft Graph)
export type EmailProvider = 'gmail' | 'microsoft_graph';
export type IntegrationStatus = 'connected' | 'disconnected' | 'error';

export interface EmailIntegrationConfig {
  id: string;
  user_id: string;
  provider: EmailProvider;
  status: IntegrationStatus;
  connected_email: string | null;
  scopes: string[];
  last_sync_at: string | null;
  error_message: string | null;
  webhook_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface InboundEmailBuffer {
  id: string;
  message_id: string;
  thread_id?: string | null;
  sender_email: string;
  sender_name?: string;
  recipient_email: string;
  subject: string;
  body: string;
  received_at: string;
  matched_lead_id?: string | null;
  is_ambiguous?: boolean;
  is_processed: boolean;
}

export type NoticePriority = 'normal' | 'important' | 'urgent' | 'low' | 'high';
export type PublicationStatus = 'published' | 'draft' | 'archived';

export interface Announcement {
  id: string;
  title: string;
  content: string; // also aliased as message
  message?: string;
  category: string;
  priority: NoticePriority;
  status: PublicationStatus;
  published_at: string;
  is_pinned?: boolean;
  target_department?: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
  expires_at?: string | null;
  attachment_url?: string | null;
  requires_acknowledgement?: boolean;
  creator?: UserProfile;
  author?: UserProfile;
  is_read?: boolean;
  read_at?: string | null;
  is_acknowledged?: boolean;
  acknowledged_at?: string | null;
  read_count?: number;
  acknowledged_count?: number;
  total_employees_count?: number;
}

export type Notice = Announcement;

export interface NoticeRead {
  id: string;
  notice_id: string;
  user_id: string;
  read_at: string;
  user?: UserProfile;
}

export interface NoticeAcknowledgement {
  id: string;
  notice_id: string;
  user_id: string;
  acknowledged_at: string;
  user?: UserProfile;
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
  attachment_url?: string | null;
  status: PublicationStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator?: UserProfile;
  author?: UserProfile;
  acknowledged_count?: number;
  my_acknowledged_at?: string | null;
  is_acknowledged?: boolean;
  versions?: PolicyVersion[];
}

export interface PolicyVersion {
  id: string;
  policy_id: string;
  version: string;
  title: string;
  category: string;
  summary?: string;
  content: string;
  effective_date: string;
  archived_at: string;
  created_by: string;
  change_summary?: string | null;
  creator?: UserProfile;
  acknowledged_count?: number;
}

export interface PolicyAcknowledgment {
  id: string;
  policy_id: string;
  version: string;
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

// Phase 06: Notifications, Audit Logs, and Comprehensive Reports
export type NotificationType =
  | 'lead_assigned'
  | 'dead_lead_claimed'
  | 'dead_lead_unlocked'
  | 'followup_due'
  | 'reply_recorded'
  | 'leave_reviewed'
  | 'leave_applied'
  | 'notice_published'
  | 'policy_updated'
  | 'attendance_exception'
  | 'admin_override'
  | 'general';

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  link: string;
  is_read: boolean;
  read_at?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
  user?: UserProfile;
}

export type AuditAction =
  | 'employee_created'
  | 'employee_deactivated'
  | 'role_changed'
  | 'attendance_regularized'
  | 'attendance_clock_in'
  | 'attendance_clock_out'
  | 'leave_applied'
  | 'leave_approved'
  | 'leave_rejected'
  | 'leave_cancelled'
  | 'lead_created'
  | 'lead_assigned'
  | 'lead_status_changed'
  | 'lead_claimed'
  | 'lead_unlocked'
  | 'admin_lock_override'
  | 'email_logged'
  | 'reply_recorded'
  | 'policy_published'
  | 'policy_updated'
  | 'notice_published'
  | 'notice_scheduled'
  | 'notice_archived'
  | 'settings_updated';

export type AuditTargetType =
  | 'employee'
  | 'attendance'
  | 'leave'
  | 'lead'
  | 'email'
  | 'policy'
  | 'notice'
  | 'settings';

export interface AuditLogEntry {
  id: string;
  actor_id?: string | null;
  actor_name: string;
  actor_email: string;
  actor_role: string;
  action: AuditAction;
  target_type: AuditTargetType;
  target_id: string;
  target_name: string;
  before_state?: Record<string, any> | null;
  after_state?: Record<string, any> | null;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface ComprehensiveReportMetrics {
  workforce: {
    totalActive: number;
    totalInactive: number;
    totalDepartments: number;
    departmentDistribution: { name: string; count: number }[];
  };
  attendance: {
    todayTotalExpected: number;
    clockedIn: number;
    clockedOut: number;
    lateArrivals: number;
    missingCheckouts: number;
    onLeave: number;
    absent: number;
    attendanceRatePercent: number;
    avgWorkingHours: number;
  };
  leaves: {
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    approvalRatePercent: number;
    totalDaysTaken: number;
    typeBreakdown: { type: string; days: number; count: number }[];
  };
  pipeline: {
    totalLeads: number;
    activeLeads: number;
    deadLeads: number;
    lockedLeads: number;
    wonLeads: number;
    lostLeads: number;
    totalPipelineValue: number;
    wonRevenue: number;
    avgWonDealValue: number;
    conversionRatePercent: number;
    stageDistribution: { stage: string; count: number; value: number }[];
  };
  followups: {
    dueTodayCount: number;
    overdueCount: number;
    upcomingCount: number;
    completedCount: number;
    cancelledCount: number;
  };
  repPerformance: {
    repId: string;
    repName: string;
    repEmail: string;
    assignedLeadsCount: number;
    wonLeadsCount: number;
    wonRevenue: number;
    activitiesCount: number;
    conversionRatePercent: number;
  }[];
}


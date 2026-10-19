import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  UserProfile,
  UserRole,
  AttendanceRecord,
  LeaveRecord,
  Lead,
  LeadActivity,
  Announcement,
  Notice,
  NoticePriority,
  PublicationStatus,
  NoticeRead,
  NoticeAcknowledgement,
  Policy,
  PolicyVersion,
  PolicyAcknowledgment,
  CompanyHoliday,
  CompanySettings,
  DashboardStats,
  LeadStage,
  AttendanceStatus
} from '../types/database';
import {
  INITIAL_PROFILES,
  INITIAL_LEADS,
  INITIAL_LEAD_ACTIVITIES,
  INITIAL_ATTENDANCE,
  INITIAL_LEAVES,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_NOTICE_READS,
  INITIAL_NOTICE_ACKS,
  INITIAL_POLICIES,
  INITIAL_POLICY_VERSIONS,
  INITIAL_POLICY_ACKS,
  INITIAL_HOLIDAYS,
  INITIAL_SETTINGS
} from './mockData';

// Storage Keys for reactive offline/demo persistence
const STORAGE_PREFIX = 'vingo_crm_';
const getStorageItem = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const setStorageItem = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (err) {
    console.error('Failed to save to localStorage', err);
  }
};

// In-memory or LocalStorage-backed reactive repository
class LocalCrmStore {
  private profiles: UserProfile[];
  private leads: Lead[];
  private activities: LeadActivity[];
  private attendance: AttendanceRecord[];
  private leaves: LeaveRecord[];
  private announcements: Announcement[];
  private noticeReads: NoticeRead[];
  private noticeAcknowledgements: NoticeAcknowledgement[];
  private policies: Policy[];
  private policyVersions: PolicyVersion[];
  private policyAcknowledgements: PolicyAcknowledgment[];
  private holidays: CompanyHoliday[];
  private settings: CompanySettings;

  constructor() {
    this.profiles = getStorageItem('profiles', INITIAL_PROFILES);
    this.leads = getStorageItem('leads', INITIAL_LEADS);
    this.activities = getStorageItem('activities', INITIAL_LEAD_ACTIVITIES);
    this.attendance = getStorageItem('attendance', INITIAL_ATTENDANCE);
    this.leaves = getStorageItem('leaves', INITIAL_LEAVES);
    this.announcements = getStorageItem('announcements', INITIAL_ANNOUNCEMENTS);
    this.noticeReads = getStorageItem('notice_reads', INITIAL_NOTICE_READS);
    this.noticeAcknowledgements = getStorageItem('notice_acknowledgements', INITIAL_NOTICE_ACKS);
    this.policies = getStorageItem('policies', INITIAL_POLICIES);
    this.policyVersions = getStorageItem('policy_versions', INITIAL_POLICY_VERSIONS);
    this.policyAcknowledgements = getStorageItem('policy_acknowledgments', INITIAL_POLICY_ACKS);
    this.holidays = getStorageItem('holidays', INITIAL_HOLIDAYS);
    this.settings = getStorageItem('settings', INITIAL_SETTINGS);
  }

  private persist() {
    setStorageItem('profiles', this.profiles);
    setStorageItem('leads', this.leads);
    setStorageItem('activities', this.activities);
    setStorageItem('attendance', this.attendance);
    setStorageItem('leaves', this.leaves);
    setStorageItem('announcements', this.announcements);
    setStorageItem('notice_reads', this.noticeReads);
    setStorageItem('notice_acknowledgements', this.noticeAcknowledgements);
    setStorageItem('policies', this.policies);
    setStorageItem('policy_versions', this.policyVersions);
    setStorageItem('policy_acknowledgments', this.policyAcknowledgements);
    setStorageItem('holidays', this.holidays);
    setStorageItem('settings', this.settings);
  }

  resetState() {
    this.profiles = JSON.parse(JSON.stringify(INITIAL_PROFILES));
    this.leads = JSON.parse(JSON.stringify(INITIAL_LEADS));
    this.activities = JSON.parse(JSON.stringify(INITIAL_LEAD_ACTIVITIES));
    this.attendance = JSON.parse(JSON.stringify(INITIAL_ATTENDANCE));
    this.leaves = JSON.parse(JSON.stringify(INITIAL_LEAVES));
    this.announcements = JSON.parse(JSON.stringify(INITIAL_ANNOUNCEMENTS));
    this.noticeReads = JSON.parse(JSON.stringify(INITIAL_NOTICE_READS));
    this.noticeAcknowledgements = JSON.parse(JSON.stringify(INITIAL_NOTICE_ACKS));
    this.policies = JSON.parse(JSON.stringify(INITIAL_POLICIES));
    this.policyVersions = JSON.parse(JSON.stringify(INITIAL_POLICY_VERSIONS));
    this.policyAcknowledgements = JSON.parse(JSON.stringify(INITIAL_POLICY_ACKS));
    this.holidays = JSON.parse(JSON.stringify(INITIAL_HOLIDAYS));
    this.settings = JSON.parse(JSON.stringify(INITIAL_SETTINGS));
    this.persist();
  }

  // --- Profiles / Employees ---
  async getEmployees(requestingUserId?: string): Promise<UserProfile[]> {
    let isCallerAdmin = false;
    if (requestingUserId) {
      const caller = this.profiles.find((p) => p.id === requestingUserId);
      isCallerAdmin = caller?.role === 'founder_admin' || caller?.role === 'admin';
    }

    return this.profiles.map((p) => {
      const manager = p.reporting_manager_id ? this.profiles.find((m) => m.id === p.reporting_manager_id) : null;
      const fullProfile: UserProfile = {
        ...p,
        reporting_manager: manager ? { ...manager } : null
      };

      // Mask sensitive personal details for peers
      if (requestingUserId && !isCallerAdmin && p.id !== requestingUserId) {
        return {
          ...fullProfile,
          salary: undefined,
          emergency_contact_name: undefined,
          emergency_contact_phone: undefined
        };
      }
      return fullProfile;
    });
  }

  async getEmployeeById(id: string, requestingUserId?: string): Promise<UserProfile | null> {
    const p = this.profiles.find((pr) => pr.id === id);
    if (!p) return null;

    const manager = p.reporting_manager_id ? this.profiles.find((m) => m.id === p.reporting_manager_id) : null;
    const fullProfile: UserProfile = {
      ...p,
      reporting_manager: manager ? { ...manager } : null
    };

    if (requestingUserId) {
      const caller = this.profiles.find((pr) => pr.id === requestingUserId);
      const isCallerAdmin = caller?.role === 'founder_admin' || caller?.role === 'admin';
      if (!isCallerAdmin && p.id !== requestingUserId) {
        return {
          ...fullProfile,
          salary: undefined,
          emergency_contact_name: undefined,
          emergency_contact_phone: undefined
        };
      }
    }
    return fullProfile;
  }

  async createEmployee(data: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>): Promise<UserProfile> {
    const newEmp: UserProfile = {
      ...data,
      id: 'user-' + Date.now().toString(36),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.profiles.push(newEmp);
    this.persist();
    return newEmp;
  }

  async updateEmployee(id: string, data: Partial<UserProfile>): Promise<UserProfile> {
    const idx = this.profiles.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Employee not found');
    this.profiles[idx] = {
      ...this.profiles[idx],
      ...data,
      updated_at: new Date().toISOString()
    };
    this.persist();
    return this.profiles[idx];
  }

  async deleteEmployee(id: string): Promise<void> {
    const idx = this.profiles.findIndex((p) => p.id === id);
    if (idx !== -1) {
      this.profiles[idx].status = 'inactive';
      this.persist();
    }
  }

  async provisionEmployee(
    requestingUserId: string,
    data: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>
  ): Promise<UserProfile> {
    const caller = this.profiles.find((p) => p.id === requestingUserId);
    if (!caller || (caller.role !== 'founder_admin' && caller.role !== 'admin') || caller.status === 'deactivated') {
      throw new Error('Unauthorized: Only an authorized administrator can provision employee accounts.');
    }
    return this.createEmployee(data);
  }

  async assignRole(
    requestingUserId: string,
    targetUserId: string,
    newRole: UserRole
  ): Promise<UserProfile> {
    const caller = this.profiles.find((p) => p.id === requestingUserId);
    if (!caller || (caller.role !== 'founder_admin' && caller.role !== 'admin') || caller.status === 'deactivated') {
      throw new Error('Unauthorized: Only an authorized administrator can assign user roles.');
    }
    const target = this.profiles.find((p) => p.id === targetUserId);
    if (!target) throw new Error('Employee not found');
    if (caller.id === targetUserId && caller.role !== 'founder_admin' && newRole === 'founder_admin') {
      throw new Error('Unauthorized: Only an existing founder administrator can grant founder privileges.');
    }
    return this.updateEmployee(targetUserId, { role: newRole });
  }

  async deactivateEmployee(
    requestingUserId: string,
    targetUserId: string
  ): Promise<UserProfile> {
    const caller = this.profiles.find((p) => p.id === requestingUserId);
    if (!caller || (caller.role !== 'founder_admin' && caller.role !== 'admin') || caller.status === 'deactivated') {
      throw new Error('Unauthorized: Only an authorized administrator can deactivate users.');
    }
    const target = this.profiles.find((p) => p.id === targetUserId);
    if (!target) throw new Error('Employee not found');
    if (target.role === 'founder_admin') {
      throw new Error('Protected Account: The Founder / Head Admin account cannot be deactivated.');
    }
    return this.updateEmployee(targetUserId, { status: 'deactivated' });
  }

  async updateProfile(
    requestingUserId: string,
    targetUserId: string,
    updates: Partial<UserProfile>
  ): Promise<UserProfile> {
    const caller = this.profiles.find((p) => p.id === requestingUserId);
    if (!caller || caller.status === 'deactivated') {
      throw new Error('Unauthorized or account deactivated.');
    }
    const isCallerAdmin = caller.role === 'founder_admin' || caller.role === 'admin';
    if (!isCallerAdmin) {
      if (requestingUserId !== targetUserId) {
        throw new Error('Unauthorized: You can only update your own profile.');
      }
      const prohibitedFields: (keyof UserProfile)[] = [
        'role',
        'status',
        'salary',
        'employee_id',
        'department',
        'title',
        'join_date',
        'reporting_manager_id',
        'work_location',
        'annual_leave_quota',
        'sick_leave_quota',
        'casual_leave_quota'
      ];
      for (const field of prohibitedFields) {
        if (updates[field] !== undefined) {
          throw new Error(`Unauthorized: Employees cannot change their own role, status, salary, or quotas (${String(field)}).`);
        }
      }
    }
    return this.updateEmployee(targetUserId, updates);
  }

  // --- Attendance ---
  private applyMissingCheckoutDerivation() {
    const today = new Date().toISOString().split('T')[0];
    for (const record of this.attendance) {
      if (record.date < today && record.clock_in && !record.clock_out && record.status !== 'missing_checkout') {
        record.status = 'missing_checkout';
      }
    }
  }

  async getTodayAttendance(userId: string): Promise<{ myRecord: AttendanceRecord | null; allToday: AttendanceRecord[] }> {
    this.applyMissingCheckoutDerivation();
    const today = new Date().toISOString().split('T')[0];
    const myRecord = this.attendance.find((a) => a.user_id === userId && a.date === today) || null;

    const allToday = this.profiles
      .filter((p) => p.status === 'active')
      .map((p) => {
        const rec = this.attendance.find((a) => a.user_id === p.id && a.date === today);
        if (rec) {
          return { ...rec, profile: p };
        }
        // Check if employee is on approved leave today
        const hasApprovedLeave = this.leaves.some(
          (l) => l.user_id === p.id && l.status === 'approved' && l.start_date <= today && l.end_date >= today
        );
        return {
          id: 'temp-' + p.id,
          user_id: p.id,
          date: today,
          clock_in: null,
          clock_out: null,
          total_hours: 0,
          status: (hasApprovedLeave ? 'on_leave' : 'absent') as AttendanceStatus,
          is_late: false,
          is_early_departure: false,
          created_at: today,
          profile: p
        };
      });
    return { myRecord, allToday };
  }

  async clockIn(userId: string, notes?: string): Promise<AttendanceRecord> {
    const today = new Date().toISOString().split('T')[0];
    const existingIdx = this.attendance.findIndex((a) => a.user_id === userId && a.date === today);
    if (existingIdx !== -1 && this.attendance[existingIdx].clock_in) {
      throw new Error('Duplicate Check-in Error: You have already clocked in today.');
    }

    const now = new Date();
    const timeNow = now.toTimeString().split(' ')[0]; // HH:MM:SS
    const [h, m, s] = timeNow.split(':').map(Number);
    const currentTotalMin = h * 60 + m + (s || 0) / 60;

    // Derived against configured company settings
    const [startH, startM] = (this.settings.work_start_time || '09:00:00').split(':').map(Number);
    const startTotalMin = startH * 60 + startM;
    const lateGraceThresholdMin = startTotalMin + (this.settings.late_threshold_minutes ?? 15);
    const isLate = currentTotalMin > lateGraceThresholdMin;
    const status: AttendanceStatus = isLate ? 'late' : 'present';

    const newRecord: AttendanceRecord = {
      id: 'att-' + Date.now().toString(36),
      user_id: userId,
      date: today,
      clock_in: timeNow,
      clock_out: null,
      total_hours: 0,
      status,
      is_late: isLate,
      is_early_departure: false,
      notes: notes || null,
      created_at: new Date().toISOString(),
      profile: this.profiles.find((p) => p.id === userId)
    };

    if (existingIdx !== -1) {
      this.attendance[existingIdx] = newRecord;
    } else {
      this.attendance.unshift(newRecord);
    }
    this.persist();
    return newRecord;
  }

  async clockOut(userId: string, notes?: string): Promise<AttendanceRecord> {
    const today = new Date().toISOString().split('T')[0];
    const idx = this.attendance.findIndex((a) => a.user_id === userId && a.date === today);
    if (idx === -1 || !this.attendance[idx].clock_in) {
      throw new Error('Invalid Check-out: You have not clocked in today yet.');
    }
    if (this.attendance[idx].clock_out) {
      throw new Error('Invalid Check-out: You have already clocked out today.');
    }

    const timeNow = new Date().toTimeString().split(' ')[0];
    const [inH, inM, inS] = this.attendance[idx].clock_in!.split(':').map(Number);
    const [outH, outM, outS] = timeNow.split(':').map(Number);
    const diffMinutes = (outH * 60 + outM + (outS || 0) / 60) - (inH * 60 + inM + (inS || 0) / 60);
    const totalHours = Math.max(0, +(diffMinutes / 60).toFixed(2));

    // Early departure check against company settings
    const [endH, endM] = (this.settings.work_end_time || '18:00:00').split(':').map(Number);
    const expectedEndMin = endH * 60 + endM;
    const outTotalMin = outH * 60 + outM;
    const isEarlyDeparture = outTotalMin < expectedEndMin;

    let derivedStatus = this.attendance[idx].status;
    if (totalHours < (this.settings.half_day_hours || 4.5)) {
      derivedStatus = 'half_day';
    }

    this.attendance[idx] = {
      ...this.attendance[idx],
      clock_out: timeNow,
      total_hours: totalHours,
      status: derivedStatus,
      is_early_departure: isEarlyDeparture,
      notes: notes || this.attendance[idx].notes
    };
    this.persist();
    return this.attendance[idx];
  }

  async getMyAttendanceHistory(userId: string): Promise<AttendanceRecord[]> {
    this.applyMissingCheckoutDerivation();
    return this.attendance.filter((a) => a.user_id === userId);
  }

  async getAdminAttendance(): Promise<AttendanceRecord[]> {
    this.applyMissingCheckoutDerivation();
    return this.attendance.map((a) => ({
      ...a,
      profile: this.profiles.find((p) => p.id === a.user_id),
      corrector: a.corrected_by ? this.profiles.find((p) => p.id === a.corrected_by) : undefined
    }));
  }

  async regularizeAttendance(
    requestingUserIdOrRecord: string | (Partial<AttendanceRecord> & { user_id: string; date: string }),
    recordMaybe?: {
      user_id: string;
      date: string;
      clock_in?: string;
      clock_out?: string;
      total_hours?: number;
      status?: AttendanceStatus;
      correction_reason?: string;
    }
  ): Promise<AttendanceRecord> {
    let requestingUserId: string;
    let record: {
      user_id: string;
      date: string;
      clock_in?: string | null;
      clock_out?: string | null;
      total_hours?: number;
      status?: AttendanceStatus;
      correction_reason?: string | null;
    };

    if (typeof requestingUserIdOrRecord === 'string') {
      requestingUserId = requestingUserIdOrRecord;
      record = recordMaybe!;
    } else {
      requestingUserId = 'user-founder-001';
      record = requestingUserIdOrRecord;
    }

    const caller = this.profiles.find((p) => p.id === requestingUserId);
    if (!caller || (caller.role !== 'founder_admin' && caller.role !== 'admin') || caller.status === 'deactivated') {
      throw new Error('Unauthorized: Only an authorized administrator can regularize attendance records.');
    }
    if (record.correction_reason !== undefined && record.correction_reason !== null && !record.correction_reason.trim()) {
      throw new Error('A valid correction reason is required for attendance regularization audit.');
    }
    const reason = record.correction_reason && record.correction_reason.trim()
      ? record.correction_reason.trim()
      : 'Administrative attendance regularization';

    let calculatedHours = record.total_hours;
    if (calculatedHours === undefined && record.clock_in && record.clock_out) {
      const [inH, inM] = record.clock_in.split(':').map(Number);
      const [outH, outM] = record.clock_out.split(':').map(Number);
      const diffMin = (outH * 60 + outM) - (inH * 60 + inM);
      calculatedHours = Math.max(0, +(diffMin / 60).toFixed(2));
    }

    const idx = this.attendance.findIndex((a) => a.user_id === record.user_id && a.date === record.date);
    if (idx !== -1) {
      this.attendance[idx] = {
        ...this.attendance[idx],
        clock_in: record.clock_in || this.attendance[idx].clock_in,
        clock_out: record.clock_out || this.attendance[idx].clock_out,
        total_hours: calculatedHours !== undefined ? calculatedHours : this.attendance[idx].total_hours,
        status: record.status || this.attendance[idx].status,
        correction_reason: reason,
        corrected_by: requestingUserId,
        corrected_at: new Date().toISOString()
      };
      this.persist();
      return this.attendance[idx];
    } else {
      const newRec: AttendanceRecord = {
        id: 'att-' + Date.now().toString(36),
        user_id: record.user_id,
        date: record.date,
        clock_in: record.clock_in || '09:00:00',
        clock_out: record.clock_out || '18:00:00',
        total_hours: calculatedHours !== undefined ? calculatedHours : 8.0,
        status: record.status || 'present',
        is_late: false,
        is_early_departure: false,
        notes: 'Regularized via Admin Override',
        correction_reason: reason,
        corrected_by: requestingUserId,
        corrected_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        profile: this.profiles.find((p) => p.id === record.user_id)
      };
      this.attendance.unshift(newRec);
      this.persist();
      return newRec;
    }
  }

  // --- Leaves ---
  async getMyLeaves(userId: string): Promise<LeaveRecord[]> {
    return this.leaves
      .filter((l) => l.user_id === userId)
      .map((l) => ({
        ...l,
        reviewer: this.profiles.find((p) => p.id === l.reviewed_by)
      }));
  }

  async getAllLeaves(): Promise<LeaveRecord[]> {
    return this.leaves.map((l) => ({
      ...l,
      profile: this.profiles.find((p) => p.id === l.user_id),
      reviewer: this.profiles.find((p) => p.id === l.reviewed_by)
    }));
  }

  async applyLeave(data: Omit<LeaveRecord, 'id' | 'status' | 'created_at'>): Promise<LeaveRecord> {
    if (data.start_date > data.end_date) {
      throw new Error('Invalid Dates: Start date cannot be after end date.');
    }

    // Check for duplicate / overlapping pending or approved leave requests
    const overlapping = this.leaves.find(
      (l) =>
        l.user_id === data.user_id &&
        (l.status === 'pending' || l.status === 'approved') &&
        !(data.end_date < l.start_date || data.start_date > l.end_date)
    );
    if (overlapping) {
      throw new Error(
        `Leave Overlap Conflict: You already have a ${overlapping.status} leave request from ${overlapping.start_date} to ${overlapping.end_date}.`
      );
    }

    let calculatedDays = data.days_count;
    if (!calculatedDays) {
      if (data.duration_type === 'half_day') {
        calculatedDays = 0.5;
      } else {
        const start = new Date(data.start_date);
        const end = new Date(data.end_date);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        calculatedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      }
    }

    const newLeave: LeaveRecord = {
      ...data,
      id: 'leave-' + Date.now().toString(36),
      days_count: calculatedDays,
      status: 'pending',
      created_at: new Date().toISOString(),
      profile: this.profiles.find((p) => p.id === data.user_id)
    };
    this.leaves.unshift(newLeave);
    this.persist();
    return newLeave;
  }

  async reviewLeave(
    leaveId: string,
    status: 'approved' | 'rejected',
    remarks: string,
    reviewerId: string
  ): Promise<LeaveRecord> {
    const idx = this.leaves.findIndex((l) => l.id === leaveId);
    if (idx === -1) throw new Error('Leave record not found');
    const leave = this.leaves[idx];

    // CRITICAL SECURITY RULE: Employees and administrators cannot approve their own leave requests
    if (leave.user_id === reviewerId) {
      throw new Error('Security Violation: Employees and administrators cannot approve or reject their own leave requests.');
    }

    const reviewer = this.profiles.find((p) => p.id === reviewerId);
    if (!reviewer || (reviewer.role !== 'founder_admin' && reviewer.role !== 'admin') || reviewer.status === 'deactivated') {
      throw new Error('Unauthorized: Only an authorized administrator can review leave requests.');
    }

    // Deduct leave quotas on approval
    if (status === 'approved' && leave.status !== 'approved') {
      const empIdx = this.profiles.findIndex((p) => p.id === leave.user_id);
      if (empIdx !== -1) {
        const emp = this.profiles[empIdx];
        const leaveDays = leave.days_count || 1;
        if (leave.leave_type === 'annual') {
          emp.annual_leave_quota = Math.max(0, +(emp.annual_leave_quota - leaveDays).toFixed(1));
        } else if (leave.leave_type === 'sick') {
          emp.sick_leave_quota = Math.max(0, +(emp.sick_leave_quota - leaveDays).toFixed(1));
        } else if (leave.leave_type === 'casual') {
          emp.casual_leave_quota = Math.max(0, +(emp.casual_leave_quota - leaveDays).toFixed(1));
        }
      }
    }

    this.leaves[idx] = {
      ...this.leaves[idx],
      status,
      admin_remarks: remarks || null,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString()
    };
    this.persist();
    return this.leaves[idx];
  }

  async cancelLeave(leaveId: string, requestingUserId: string): Promise<LeaveRecord> {
    const idx = this.leaves.findIndex((l) => l.id === leaveId);
    if (idx === -1) throw new Error('Leave record not found');
    const leave = this.leaves[idx];

    const caller = this.profiles.find((p) => p.id === requestingUserId);
    const isAdmin = caller?.role === 'founder_admin' || caller?.role === 'admin';
    if (leave.user_id !== requestingUserId && !isAdmin) {
      throw new Error('Unauthorized: You can only cancel your own leave requests.');
    }

    // Refund quota if previously approved
    if (leave.status === 'approved') {
      const empIdx = this.profiles.findIndex((p) => p.id === leave.user_id);
      if (empIdx !== -1) {
        const emp = this.profiles[empIdx];
        const leaveDays = leave.days_count || 1;
        if (leave.leave_type === 'annual') {
          emp.annual_leave_quota += leaveDays;
        } else if (leave.leave_type === 'sick') {
          emp.sick_leave_quota += leaveDays;
        } else if (leave.leave_type === 'casual') {
          emp.casual_leave_quota += leaveDays;
        }
      }
    }

    this.leaves[idx].status = 'cancelled';
    this.persist();
    return this.leaves[idx];
  }

  // --- Company Settings ---
  async getSettings(): Promise<CompanySettings> {
    return { ...this.settings };
  }

  async updateSettings(requestingUserId: string, updates: Partial<CompanySettings>): Promise<CompanySettings> {
    const caller = this.profiles.find((p) => p.id === requestingUserId);
    if (!caller || (caller.role !== 'founder_admin' && caller.role !== 'admin') || caller.status === 'deactivated') {
      throw new Error('Unauthorized: Only an administrator can update company settings.');
    }
    this.settings = {
      ...this.settings,
      ...updates,
      updated_at: new Date().toISOString()
    };
    this.persist();
    return this.settings;
  }

  // --- Leads Pipeline ---
  async getLeads(): Promise<Lead[]> {
    return this.leads.map((l) => ({
      ...l,
      assignee: this.profiles.find((p) => p.id === l.assigned_to),
      creator: this.profiles.find((p) => p.id === l.created_by),
      activities_count: this.activities.filter((a) => a.lead_id === l.id).length,
      last_activity_at: this.activities.filter((a) => a.lead_id === l.id)[0]?.created_at
    }));
  }

  async getLeadById(id: string): Promise<{ lead: Lead; activities: LeadActivity[] } | null> {
    const lead = this.leads.find((l) => l.id === id);
    if (!lead) return null;
    const activities = this.activities
      .filter((a) => a.lead_id === id)
      .map((a) => ({
        ...a,
        user: this.profiles.find((p) => p.id === a.user_id)
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return {
      lead: {
        ...lead,
        assignee: this.profiles.find((p) => p.id === lead.assigned_to),
        creator: this.profiles.find((p) => p.id === lead.created_by)
      },
      activities
    };
  }

  async createLead(data: Omit<Lead, 'id' | 'created_at' | 'updated_at'>): Promise<Lead> {
    const newLead: Lead = {
      ...data,
      id: 'lead-' + Date.now().toString(36),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.leads.unshift(newLead);
    this.activities.unshift({
      id: 'act-' + Date.now().toString(36),
      lead_id: newLead.id,
      user_id: data.created_by || 'user-founder-001',
      activity_type: 'stage_change',
      title: 'Lead Created',
      content: `Lead created in '${data.stage.toUpperCase()}' stage with estimated value of $${data.value.toLocaleString()}.`,
      created_at: new Date().toISOString()
    });
    this.persist();
    return newLead;
  }

  async updateLead(id: string, data: Partial<Lead>): Promise<Lead> {
    const idx = this.leads.findIndex((l) => l.id === id);
    if (idx === -1) throw new Error('Lead not found');
    this.leads[idx] = {
      ...this.leads[idx],
      ...data,
      updated_at: new Date().toISOString()
    };
    this.persist();
    return this.leads[idx];
  }

  async updateLeadStage(id: string, stage: LeadStage, userId: string): Promise<Lead> {
    const idx = this.leads.findIndex((l) => l.id === id);
    if (idx === -1) throw new Error('Lead not found');
    const oldStage = this.leads[idx].stage;
    this.leads[idx].stage = stage;
    this.leads[idx].updated_at = new Date().toISOString();

    this.activities.unshift({
      id: 'act-' + Date.now().toString(36),
      lead_id: id,
      user_id: userId,
      activity_type: 'stage_change',
      title: 'Stage Transitioned',
      content: `Lead moved from '${oldStage.toUpperCase()}' to '${stage.toUpperCase()}'.`,
      created_at: new Date().toISOString()
    });

    this.persist();
    return this.leads[idx];
  }

  async deleteLead(id: string): Promise<void> {
    this.leads = this.leads.filter((l) => l.id !== id);
    this.activities = this.activities.filter((a) => a.lead_id !== id);
    this.persist();
  }

  async addLeadActivity(data: Omit<LeadActivity, 'id' | 'created_at'>): Promise<LeadActivity> {
    const newAct: LeadActivity = {
      ...data,
      id: 'act-' + Date.now().toString(36),
      created_at: new Date().toISOString(),
      user: this.profiles.find((p) => p.id === data.user_id)
    };
    this.activities.unshift(newAct);
    // Touch lead updated_at
    const lIdx = this.leads.findIndex((l) => l.id === data.lead_id);
    if (lIdx !== -1) {
      this.leads[lIdx].updated_at = new Date().toISOString();
    }
    this.persist();
    return newAct;
  }

  // --- Announcements / Important Notices ---
  async getNotices(
    requestingUserId?: string,
    options?: { status?: PublicationStatus | 'all'; category?: string; priority?: NoticePriority | 'all'; search?: string }
  ): Promise<Announcement[]> {
    let isCallerAdmin = false;
    if (requestingUserId) {
      const caller = this.profiles.find((p) => p.id === requestingUserId);
      isCallerAdmin = caller?.role === 'founder_admin' || caller?.role === 'admin';
    }

    const now = new Date();
    const activeEmployees = this.profiles.filter((p) => p.status === 'active' && p.role === 'employee');

    let list = this.announcements.filter((n) => {
      // Access Control Rule: Ordinary employees cannot view drafts or scheduled future notices or archived notices
      if (!isCallerAdmin) {
        if (n.status === 'draft') return false;
        if (n.status === 'archived') return false;
        // Schedule check: If published_at is in the future, ordinary employees cannot see it yet
        if (new Date(n.published_at) > now) return false;
      }
      return true;
    });

    if (options?.status && options.status !== 'all') {
      list = list.filter((n) => n.status === options.status);
    }
    if (options?.category && options.category !== 'all') {
      list = list.filter((n) => n.category.toLowerCase() === options.category?.toLowerCase());
    }
    if (options?.priority && options.priority !== 'all') {
      list = list.filter((n) => n.priority.toLowerCase() === options.priority?.toLowerCase());
    }
    if (options?.search) {
      const q = options.search.toLowerCase();
      list = list.filter((n) => n.title.toLowerCase().includes(q) || (n.content || n.message || '').toLowerCase().includes(q));
    }

    return list.map((a) => {
      const author = this.profiles.find((p) => p.id === a.created_by);
      const readObj = requestingUserId ? this.noticeReads.find((r) => r.notice_id === a.id && r.user_id === requestingUserId) : null;
      const ackObj = requestingUserId ? this.noticeAcknowledgements.find((ack) => ack.notice_id === a.id && ack.user_id === requestingUserId) : null;
      const totalReads = this.noticeReads.filter((r) => r.notice_id === a.id).length;
      const totalAcks = this.noticeAcknowledgements.filter((ack) => ack.notice_id === a.id).length;

      return {
        ...a,
        message: a.message || a.content,
        content: a.content || a.message || '',
        author: author ? { ...author } : undefined,
        creator: author ? { ...author } : undefined,
        is_read: Boolean(readObj),
        read_at: readObj?.read_at || null,
        is_acknowledged: Boolean(ackObj),
        acknowledged_at: ackObj?.acknowledged_at || null,
        read_count: totalReads,
        acknowledged_count: totalAcks,
        total_employees_count: activeEmployees.length
      };
    });
  }

  async getAnnouncements(requestingUserId?: string): Promise<Announcement[]> {
    return this.getNotices(requestingUserId);
  }

  async createAnnouncement(
    data: Omit<Announcement, 'id' | 'created_at' | 'updated_at'>,
    requestingUserId?: string
  ): Promise<Announcement> {
    if (requestingUserId) {
      const caller = this.profiles.find((p) => p.id === requestingUserId);
      if (!caller || (caller.role !== 'founder_admin' && caller.role !== 'admin') || caller.status === 'deactivated') {
        throw new Error('Unauthorized: Only an authorized administrator can publish or schedule notices.');
      }
    }

    const now = new Date().toISOString();
    const newNotice: Announcement = {
      ...data,
      id: 'ann-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      content: data.content || data.message || '',
      message: data.message || data.content || '',
      status: data.status || 'published',
      priority: data.priority || 'normal',
      published_at: data.published_at || now,
      created_at: now,
      updated_at: now,
      expires_at: data.expires_at || null,
      attachment_url: data.attachment_url || null,
      requires_acknowledgement: Boolean(data.requires_acknowledgement),
      is_pinned: Boolean(data.is_pinned),
      target_department: data.target_department || 'all',
      author: this.profiles.find((p) => p.id === data.created_by)
    };

    this.announcements.unshift(newNotice);
    this.persist();
    return newNotice;
  }

  async updateNotice(
    id: string,
    updates: Partial<Announcement>,
    requestingUserId?: string
  ): Promise<Announcement> {
    if (requestingUserId) {
      const caller = this.profiles.find((p) => p.id === requestingUserId);
      if (!caller || (caller.role !== 'founder_admin' && caller.role !== 'admin') || caller.status === 'deactivated') {
        throw new Error('Unauthorized: Only an authorized administrator can edit notices.');
      }
    }

    const idx = this.announcements.findIndex((n) => n.id === id);
    if (idx === -1) throw new Error('Notice not found');

    const updated: Announcement = {
      ...this.announcements[idx],
      ...updates,
      content: updates.content || updates.message || this.announcements[idx].content,
      message: updates.message || updates.content || this.announcements[idx].message,
      updated_at: new Date().toISOString()
    };

    this.announcements[idx] = updated;
    this.persist();
    return updated;
  }

  async archiveNotice(id: string, requestingUserId?: string): Promise<Announcement> {
    if (requestingUserId) {
      const caller = this.profiles.find((p) => p.id === requestingUserId);
      if (!caller || (caller.role !== 'founder_admin' && caller.role !== 'admin') || caller.status === 'deactivated') {
        throw new Error('Unauthorized: Only an authorized administrator can archive notices.');
      }
    }

    const idx = this.announcements.findIndex((n) => n.id === id);
    if (idx === -1) throw new Error('Notice not found');

    this.announcements[idx].status = 'archived';
    this.announcements[idx].updated_at = new Date().toISOString();
    this.persist();
    return this.announcements[idx];
  }

  async scheduleNotice(id: string, publishedAt: string, requestingUserId?: string): Promise<Announcement> {
    return this.updateNotice(id, { published_at: publishedAt, status: 'published' }, requestingUserId);
  }

  async markNoticeAsRead(noticeId: string, userId: string): Promise<NoticeRead> {
    const existing = this.noticeReads.find((r) => r.notice_id === noticeId && r.user_id === userId);
    if (existing) return existing;

    const newRead: NoticeRead = {
      id: 'nread-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      notice_id: noticeId,
      user_id: userId,
      read_at: new Date().toISOString(),
      user: this.profiles.find((p) => p.id === userId)
    };
    this.noticeReads.push(newRead);
    this.persist();
    return newRead;
  }

  async acknowledgeNotice(noticeId: string, userId: string): Promise<NoticeAcknowledgement> {
    // Also record read receipt automatically
    await this.markNoticeAsRead(noticeId, userId);

    const existing = this.noticeAcknowledgements.find((a) => a.notice_id === noticeId && a.user_id === userId);
    if (existing) return existing;

    const newAck: NoticeAcknowledgement = {
      id: 'nack-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      notice_id: noticeId,
      user_id: userId,
      acknowledged_at: new Date().toISOString(),
      user: this.profiles.find((p) => p.id === userId)
    };
    this.noticeAcknowledgements.push(newAck);
    this.persist();
    return newAck;
  }

  async getNoticeAudit(noticeId: string, requestingUserId?: string) {
    if (requestingUserId) {
      const caller = this.profiles.find((p) => p.id === requestingUserId);
      if (!caller || (caller.role !== 'founder_admin' && caller.role !== 'admin')) {
        throw new Error('Unauthorized: Only administrators can view notice read and acknowledgment receipts.');
      }
    }

    const notice = this.announcements.find((n) => n.id === noticeId);
    if (!notice) throw new Error('Notice not found');

    const activeEmployees = this.profiles.filter((p) => p.status === 'active' && p.role === 'employee');
    const reads = this.noticeReads
      .filter((r) => r.notice_id === noticeId)
      .map((r) => ({
        user: this.profiles.find((p) => p.id === r.user_id)!,
        read_at: r.read_at
      }))
      .filter((r) => r.user);

    const acks = this.noticeAcknowledgements
      .filter((a) => a.notice_id === noticeId)
      .map((a) => ({
        user: this.profiles.find((p) => p.id === a.user_id)!,
        acknowledged_at: a.acknowledged_at
      }))
      .filter((a) => a.user);

    const readUserIds = new Set(reads.map((r) => r.user.id));
    const ackUserIds = new Set(acks.map((a) => a.user.id));

    const pendingEmployees = activeEmployees.filter(
      (e) => !ackUserIds.has(e.id) && (!readUserIds.has(e.id) || notice.requires_acknowledgement)
    );

    const totalEligible = activeEmployees.length;
    const readRate = totalEligible > 0 ? Math.round((reads.length / totalEligible) * 100) : 100;
    const ackRate = totalEligible > 0 ? Math.round((acks.length / totalEligible) * 100) : 100;

    return {
      notice,
      reads,
      acknowledgements: acks,
      pendingEmployees,
      readRate,
      ackRate,
      totalEligible
    };
  }

  async togglePinAnnouncement(id: string): Promise<boolean> {
    const idx = this.announcements.findIndex((a) => a.id === id);
    if (idx !== -1) {
      this.announcements[idx].is_pinned = !this.announcements[idx].is_pinned;
      this.persist();
      return this.announcements[idx].is_pinned;
    }
    return false;
  }

  async deleteAnnouncement(id: string, requestingUserId?: string): Promise<void> {
    if (requestingUserId) {
      const caller = this.profiles.find((p) => p.id === requestingUserId);
      if (!caller || (caller.role !== 'founder_admin' && caller.role !== 'admin')) {
        throw new Error('Unauthorized: Only administrators can delete notices.');
      }
    }
    this.announcements = this.announcements.filter((a) => a.id !== id);
    this.noticeReads = this.noticeReads.filter((r) => r.notice_id !== id);
    this.noticeAcknowledgements = this.noticeAcknowledgements.filter((a) => a.notice_id !== id);
    this.persist();
  }

  // --- Company Policies ---
  async getPolicies(
    requestingUserId?: string,
    options?: { status?: PublicationStatus | 'all'; category?: string; search?: string }
  ): Promise<Policy[]> {
    let isCallerAdmin = false;
    if (requestingUserId) {
      const caller = this.profiles.find((p) => p.id === requestingUserId);
      isCallerAdmin = caller?.role === 'founder_admin' || caller?.role === 'admin';
    }

    let list = this.policies.filter((p) => {
      // Access Control: Drafts and archived policies are not visible to ordinary employees.
      if (!isCallerAdmin) {
        if (p.status === 'draft') return false;
        if (p.status === 'archived') return false;
      }
      return true;
    });

    if (options?.status && options.status !== 'all') {
      list = list.filter((p) => p.status === options.status);
    }
    if (options?.category && options.category !== 'all') {
      list = list.filter((p) => p.category.toLowerCase() === options.category?.toLowerCase());
    }
    if (options?.search) {
      const q = options.search.toLowerCase();
      list = list.filter((p) => p.title.toLowerCase().includes(q) || (p.summary || '').toLowerCase().includes(q));
    }

    return list.map((p) => {
      // Acknowledgement must match this specific policy AND its current active version
      const myAck = requestingUserId
        ? this.policyAcknowledgements.find(
            (ack) => ack.policy_id === p.id && ack.version === p.version && ack.user_id === requestingUserId
          )
        : null;

      const currentVersionAcks = this.policyAcknowledgements.filter(
        (ack) => ack.policy_id === p.id && ack.version === p.version
      ).length;

      const versions = this.policyVersions.filter((v) => v.policy_id === p.id);

      return {
        ...p,
        creator: this.profiles.find((pr) => pr.id === p.created_by),
        author: this.profiles.find((pr) => pr.id === p.created_by),
        acknowledged_count: currentVersionAcks,
        my_acknowledged_at: myAck?.acknowledged_at || null,
        is_acknowledged: Boolean(myAck),
        versions
      };
    });
  }

  async getPolicyById(policyId: string, requestingUserId?: string): Promise<Policy | null> {
    const policies = await this.getPolicies(requestingUserId, { status: 'all' });
    const match = policies.find((p) => p.id === policyId);
    return match || null;
  }

  async createPolicy(
    data: Omit<Policy, 'id' | 'created_at' | 'updated_at'>,
    requestingUserId?: string
  ): Promise<Policy> {
    // Access Control: Only authorized administrators can publish or revise official company-wide policies.
    if (requestingUserId) {
      const caller = this.profiles.find((p) => p.id === requestingUserId);
      if (!caller || (caller.role !== 'founder_admin' && caller.role !== 'admin') || caller.status === 'deactivated') {
        throw new Error('Unauthorized: Only authorized administrators can publish or revise official company-wide policies.');
      }
    }

    const now = new Date().toISOString();
    const newPol: Policy = {
      ...data,
      id: 'pol-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      version: data.version || '1.0',
      status: data.status || 'published',
      effective_date: data.effective_date || now.split('T')[0],
      created_at: now,
      updated_at: now
    };

    this.policies.push(newPol);
    this.persist();
    return newPol;
  }

  async updatePolicy(
    id: string,
    updates: Partial<Policy> & { change_summary?: string },
    requestingUserId?: string
  ): Promise<Policy> {
    // Access Control: Only authorized administrators can publish or revise official company-wide policies.
    if (requestingUserId) {
      const caller = this.profiles.find((p) => p.id === requestingUserId);
      if (!caller || (caller.role !== 'founder_admin' && caller.role !== 'admin') || caller.status === 'deactivated') {
        throw new Error('Unauthorized: Only authorized administrators can publish or revise official company-wide policies.');
      }
    }

    const idx = this.policies.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Policy not found');

    const current = this.policies[idx];

    // Versioning & Preservation Rule:
    // If the version number is changing/bumped, preserve the previous version and its history!
    const isVersionBump = updates.version && updates.version !== current.version;
    if (isVersionBump) {
      const snapshot: PolicyVersion = {
        id: 'pver-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
        policy_id: current.id,
        version: current.version,
        title: current.title,
        category: current.category,
        summary: current.summary,
        content: current.content,
        effective_date: current.effective_date,
        archived_at: new Date().toISOString(),
        created_by: requestingUserId || current.created_by,
        change_summary: updates.change_summary || `Revised to version ${updates.version}`,
        acknowledged_count: this.policyAcknowledgements.filter(
          (a) => a.policy_id === current.id && a.version === current.version
        ).length
      };
      this.policyVersions.push(snapshot);
    }

    const updatedPol: Policy = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString()
    };

    this.policies[idx] = updatedPol;
    this.persist();
    return updatedPol;
  }

  async archivePolicy(id: string, requestingUserId?: string): Promise<Policy> {
    if (requestingUserId) {
      const caller = this.profiles.find((p) => p.id === requestingUserId);
      if (!caller || (caller.role !== 'founder_admin' && caller.role !== 'admin') || caller.status === 'deactivated') {
        throw new Error('Unauthorized: Only authorized administrators can archive official company policies.');
      }
    }

    const idx = this.policies.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Policy not found');

    this.policies[idx].status = 'archived';
    this.policies[idx].updated_at = new Date().toISOString();
    this.persist();
    return this.policies[idx];
  }

  async getArchivedPolicies(requestingUserId?: string): Promise<Policy[]> {
    return this.getPolicies(requestingUserId, { status: 'archived' });
  }

  async acknowledgePolicy(
    policyId: string,
    versionOrUserId: string,
    maybeUserId?: string
  ): Promise<PolicyAcknowledgment> {
    let version: string;
    let userId: string;

    if (maybeUserId) {
      version = versionOrUserId;
      userId = maybeUserId;
    } else {
      userId = versionOrUserId;
      const pol = this.policies.find((p) => p.id === policyId);
      version = pol?.version || '1.0';
    }

    const existing = this.policyAcknowledgements.find(
      (ack) => ack.policy_id === policyId && ack.version === version && ack.user_id === userId
    );
    if (existing) return existing;

    const newAck: PolicyAcknowledgment = {
      id: 'pack-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      policy_id: policyId,
      version: version,
      user_id: userId,
      acknowledged_at: new Date().toISOString(),
      user: this.profiles.find((p) => p.id === userId)
    };

    this.policyAcknowledgements.push(newAck);
    this.persist();
    return newAck;
  }

  async getPolicyVersions(policyId: string): Promise<PolicyVersion[]> {
    return this.policyVersions
      .filter((v) => v.policy_id === policyId)
      .map((v) => ({
        ...v,
        creator: this.profiles.find((p) => p.id === v.created_by),
        acknowledged_count: this.policyAcknowledgements.filter(
          (a) => a.policy_id === policyId && a.version === v.version
        ).length
      }));
  }

  async getPolicyCompliance(
    policyId: string,
    version?: string
  ): Promise<{
    rate: number;
    version: string;
    totalEligible: number;
    signedCount: number;
    employees: { profile: UserProfile; acknowledged_at: string | null; version: string }[];
  }> {
    const policy = this.policies.find((p) => p.id === policyId);
    const targetVersion = version || policy?.version || '1.0';

    const activeEmployees = this.profiles.filter((p) => p.status === 'active' && p.role === 'employee');
    const employees = activeEmployees.map((p) => {
      const ack = this.policyAcknowledgements.find(
        (a) => a.policy_id === policyId && a.version === targetVersion && a.user_id === p.id
      );
      return {
        profile: p,
        acknowledged_at: ack?.acknowledged_at || null,
        version: targetVersion
      };
    });

    const signedCount = employees.filter((e) => e.acknowledged_at).length;
    const rate = employees.length > 0 ? Math.round((signedCount / employees.length) * 100) : 100;

    return {
      rate,
      version: targetVersion,
      totalEligible: employees.length,
      signedCount,
      employees
    };
  }

  async deletePolicy(id: string, requestingUserId?: string): Promise<void> {
    if (requestingUserId) {
      const caller = this.profiles.find((p) => p.id === requestingUserId);
      if (!caller || (caller.role !== 'founder_admin' && caller.role !== 'admin')) {
        throw new Error('Unauthorized: Only administrators can delete company policies.');
      }
    }
    this.policies = this.policies.filter((p) => p.id !== id);
    this.policyVersions = this.policyVersions.filter((v) => v.policy_id !== id);
    this.policyAcknowledgements = this.policyAcknowledgements.filter((a) => a.policy_id !== id);
    this.persist();
  }

  // --- Holidays ---
  async getHolidays(includeArchived: boolean = false): Promise<CompanyHoliday[]> {
    return [...this.holidays]
      .filter((h) => includeArchived || !h.is_archived)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  async addHoliday(data: Omit<CompanyHoliday, 'id' | 'created_at'>, requestingUserId?: string): Promise<CompanyHoliday> {
    if (requestingUserId) {
      const caller = this.profiles.find((p) => p.id === requestingUserId);
      if (!caller || (caller.role !== 'founder_admin' && caller.role !== 'admin') || caller.status === 'deactivated') {
        throw new Error('Unauthorized: Only an administrator can add company holidays.');
      }
    }
    const newHol: CompanyHoliday = {
      ...data,
      id: 'hol-' + Date.now().toString(36),
      is_archived: data.is_archived || false,
      created_at: new Date().toISOString()
    };
    this.holidays.push(newHol);
    this.persist();
    return newHol;
  }

  async updateHoliday(id: string, updates: Partial<CompanyHoliday>, requestingUserId?: string): Promise<CompanyHoliday> {
    if (requestingUserId) {
      const caller = this.profiles.find((p) => p.id === requestingUserId);
      if (!caller || (caller.role !== 'founder_admin' && caller.role !== 'admin') || caller.status === 'deactivated') {
        throw new Error('Unauthorized: Only an administrator can update company holidays.');
      }
    }
    const idx = this.holidays.findIndex((h) => h.id === id);
    if (idx === -1) throw new Error('Holiday not found');
    this.holidays[idx] = {
      ...this.holidays[idx],
      ...updates
    };
    this.persist();
    return this.holidays[idx];
  }

  async archiveHoliday(id: string, requestingUserId?: string): Promise<void> {
    if (requestingUserId) {
      const caller = this.profiles.find((p) => p.id === requestingUserId);
      if (!caller || (caller.role !== 'founder_admin' && caller.role !== 'admin') || caller.status === 'deactivated') {
        throw new Error('Unauthorized: Only an administrator can archive company holidays.');
      }
    }
    const idx = this.holidays.findIndex((h) => h.id === id);
    if (idx !== -1) {
      this.holidays[idx].is_archived = true;
      this.persist();
    }
  }

  async deleteHoliday(id: string, requestingUserId?: string): Promise<void> {
    if (requestingUserId) {
      const caller = this.profiles.find((p) => p.id === requestingUserId);
      if (!caller || (caller.role !== 'founder_admin' && caller.role !== 'admin') || caller.status === 'deactivated') {
        throw new Error('Unauthorized: Only an administrator can delete company holidays.');
      }
    }
    this.holidays = this.holidays.filter((h) => h.id !== id);
    this.persist();
  }

  // --- CSV Export ---
  exportAttendanceCsv(records?: AttendanceRecord[]): string {
    const list = records || this.attendance;
    const headers = [
      'Date',
      'Employee ID',
      'Employee Name',
      'Department',
      'Clock In',
      'Clock Out',
      'Total Hours',
      'Status',
      'Late Arrival',
      'Early Departure',
      'Notes',
      'Correction Reason',
      'Corrected By'
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = list.map((r) => {
      const emp = r.profile || this.profiles.find((p) => p.id === r.user_id);
      const corrector = r.corrected_by ? this.profiles.find((p) => p.id === r.corrected_by) : null;
      return [
        escapeCsv(r.date),
        escapeCsv(emp?.employee_id || r.user_id),
        escapeCsv(emp?.name || 'Unknown'),
        escapeCsv(emp?.department || 'N/A'),
        escapeCsv(r.clock_in || '--'),
        escapeCsv(r.clock_out || '--'),
        escapeCsv(r.total_hours?.toFixed(2) ?? '0.00'),
        escapeCsv(r.status.toUpperCase()),
        escapeCsv(r.is_late ? 'YES' : 'NO'),
        escapeCsv(r.is_early_departure ? 'YES' : 'NO'),
        escapeCsv(r.notes || ''),
        escapeCsv(r.correction_reason || ''),
        escapeCsv(corrector?.name || r.corrected_by || '')
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\r\n');
  }

  // --- Dashboard Stats ---
  async getDashboardStats(): Promise<DashboardStats> {
    const today = new Date().toISOString().split('T')[0];
    const totalEmp = this.profiles.filter((p) => p.role === 'employee');
    const activeEmp = totalEmp.filter((p) => p.status === 'active');
    const onLeaveEmp = totalEmp.filter((p) => p.status === 'on_leave');

    const todayAtt = this.attendance.filter((a) => a.date === today);
    const clockedIn = todayAtt.filter((a) => a.clock_in).length;
    const late = todayAtt.filter((a) => a.status === 'late').length;
    const clockedOut = todayAtt.filter((a) => a.clock_out).length;

    const pipelineVal = this.leads.reduce((acc, l) => acc + (l.value || 0), 0);
    const wonDeals = this.leads.filter((l) => l.stage === 'won');
    const wonRev = wonDeals.reduce((acc, l) => acc + (l.value || 0), 0);
    const activeDeals = this.leads.filter((l) => !['won', 'lost'].includes(l.stage)).length;

    const stages: LeadStage[] = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];
    const stageBreakdown = stages.map((st) => {
      const match = this.leads.filter((l) => l.stage === st);
      return {
        stage: st,
        count: match.length,
        total_value: match.reduce((sum, l) => sum + (l.value || 0), 0)
      };
    });

    const pendingLeaves = this.leaves.filter((l) => l.status === 'pending').length;

    return {
      employees: {
        total: totalEmp.length,
        active: activeEmp.length,
        on_leave: onLeaveEmp.length
      },
      attendanceToday: {
        clockedIn,
        lateArrivals: late,
        clockedOut,
        totalActiveEmployees: activeEmp.length
      },
      pipeline: {
        totalLeads: this.leads.length,
        pipelineValue: pipelineVal,
        wonRevenue: wonRev,
        wonCount: wonDeals.length,
        activeDealsCount: activeDeals,
        stageBreakdown
      },
      pendingLeavesCount: pendingLeaves
    };
  }
}

export const localCrmStore = new LocalCrmStore();

// Live Supabase Client Service (used when VITE_SUPABASE_URL and KEY are configured)
export const crmService = {
  // Profiles
  async getEmployees(requestingUserId?: string): Promise<UserProfile[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('profiles').select('*').order('name');
      if (error) throw error;
      let profiles = data || [];
      if (requestingUserId) {
        const caller = profiles.find((p) => p.id === requestingUserId);
        const isCallerAdmin = caller?.role === 'founder_admin' || caller?.role === 'admin';
        if (!isCallerAdmin) {
          profiles = profiles.map((p) => (p.id !== requestingUserId ? {
            ...p,
            salary: undefined,
            emergency_contact_name: undefined,
            emergency_contact_phone: undefined
          } : p));
        }
      }
      return profiles;
    }
    return localCrmStore.getEmployees(requestingUserId);
  },

  async getEmployeeById(id: string, requestingUserId?: string): Promise<UserProfile | null> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (error) return null;
      if (requestingUserId && data) {
        const { data: caller } = await supabase.from('profiles').select('*').eq('id', requestingUserId).single();
        const isCallerAdmin = caller?.role === 'founder_admin' || caller?.role === 'admin';
        if (!isCallerAdmin && data.id !== requestingUserId) {
          return {
            ...data,
            salary: undefined,
            emergency_contact_name: undefined,
            emergency_contact_phone: undefined
          };
        }
      }
      return data;
    }
    return localCrmStore.getEmployeeById(id, requestingUserId);
  },

  async createEmployee(emp: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>): Promise<UserProfile> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('profiles').insert(emp).select().single();
      if (error) throw error;
      return data;
    }
    return localCrmStore.createEmployee(emp);
  },

  async updateEmployee(id: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('profiles').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }
    return localCrmStore.updateEmployee(id, updates);
  },

  async deleteEmployee(id: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('profiles').update({ status: 'inactive' }).eq('id', id);
      if (error) throw error;
      return;
    }
    return localCrmStore.deleteEmployee(id);
  },

  async provisionEmployee(
    requestingUserId: string,
    emp: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>
  ): Promise<UserProfile> {
    if (isSupabaseConfigured) {
      const caller = await this.getEmployeeById(requestingUserId);
      if (!caller || (caller.role !== 'founder_admin' && caller.role !== 'admin') || caller.status === 'deactivated') {
        throw new Error('Unauthorized: Only an authorized administrator can provision employee accounts.');
      }
      return this.createEmployee(emp);
    }
    return localCrmStore.provisionEmployee(requestingUserId, emp);
  },

  async assignRole(requestingUserId: string, targetUserId: string, newRole: UserRole): Promise<UserProfile> {
    if (isSupabaseConfigured) {
      const caller = await this.getEmployeeById(requestingUserId);
      if (!caller || (caller.role !== 'founder_admin' && caller.role !== 'admin') || caller.status === 'deactivated') {
        throw new Error('Unauthorized: Only an authorized administrator can assign user roles.');
      }
      return this.updateEmployee(targetUserId, { role: newRole });
    }
    return localCrmStore.assignRole(requestingUserId, targetUserId, newRole);
  },

  async deactivateEmployee(requestingUserId: string, targetUserId: string): Promise<UserProfile> {
    if (isSupabaseConfigured) {
      const caller = await this.getEmployeeById(requestingUserId);
      if (!caller || (caller.role !== 'founder_admin' && caller.role !== 'admin') || caller.status === 'deactivated') {
        throw new Error('Unauthorized: Only an authorized administrator can deactivate users.');
      }
      return this.updateEmployee(targetUserId, { status: 'deactivated' });
    }
    return localCrmStore.deactivateEmployee(requestingUserId, targetUserId);
  },

  async updateProfile(requestingUserId: string, targetUserId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    if (isSupabaseConfigured) {
      const caller = await this.getEmployeeById(requestingUserId);
      if (!caller || caller.status === 'deactivated') {
        throw new Error('Unauthorized or account deactivated.');
      }
      const isCallerAdmin = caller.role === 'founder_admin' || caller.role === 'admin';
      if (!isCallerAdmin) {
        if (requestingUserId !== targetUserId) {
          throw new Error('Unauthorized: You can only update your own profile.');
        }
        const prohibitedFields: (keyof UserProfile)[] = [
          'role',
          'status',
          'salary',
          'employee_id',
          'department',
          'title',
          'join_date',
          'reporting_manager_id',
          'work_location',
          'annual_leave_quota',
          'sick_leave_quota',
          'casual_leave_quota'
        ];
        for (const field of prohibitedFields) {
          if (updates[field] !== undefined) {
            throw new Error(`Unauthorized: Employees cannot change their own role, status, salary, or quotas (${String(field)}).`);
          }
        }
      }
      return this.updateEmployee(targetUserId, updates);
    }
    return localCrmStore.updateProfile(requestingUserId, targetUserId, updates);
  },

  // Attendance
  async getTodayAttendance(userId: string) {
    if (isSupabaseConfigured) {
      const today = new Date().toISOString().split('T')[0];
      const { data: myRecord } = await supabase.from('attendance').select('*').eq('user_id', userId).eq('date', today).single();
      const { data: allToday } = await supabase.from('attendance').select('*, profile:profiles(*)').eq('date', today);
      return { myRecord: myRecord || null, allToday: allToday || [] };
    }
    return localCrmStore.getTodayAttendance(userId);
  },

  async clockIn(userId: string, notes?: string): Promise<AttendanceRecord> {
    if (isSupabaseConfigured) {
      const today = new Date().toISOString().split('T')[0];
      const existing = await supabase.from('attendance').select('id, clock_in').eq('user_id', userId).eq('date', today).single();
      if (existing.data?.clock_in) {
        throw new Error('Duplicate Check-in Error: You have already clocked in today.');
      }
      const timeNow = new Date().toTimeString().split(' ')[0];
      const [h, m] = timeNow.split(':').map(Number);
      const isLate = h > 9 || (h === 9 && m > 15);
      const { data, error } = await supabase.from('attendance').insert({
        user_id: userId,
        date: today,
        clock_in: timeNow,
        status: isLate ? 'late' : 'present',
        is_late: isLate,
        notes
      }).select().single();
      if (error) throw error;
      return data;
    }
    return localCrmStore.clockIn(userId, notes);
  },

  async clockOut(userId: string, notes?: string): Promise<AttendanceRecord> {
    if (isSupabaseConfigured) {
      const today = new Date().toISOString().split('T')[0];
      const { data: existing } = await supabase.from('attendance').select('*').eq('user_id', userId).eq('date', today).single();
      if (!existing || !existing.clock_in) {
        throw new Error('Invalid Check-out: You have not clocked in today yet.');
      }
      if (existing.clock_out) {
        throw new Error('Invalid Check-out: You have already clocked out today.');
      }
      const timeNow = new Date().toTimeString().split(' ')[0];
      const { data, error } = await supabase.from('attendance').update({
        clock_out: timeNow,
        notes
      }).eq('user_id', userId).eq('date', today).select().single();
      if (error) throw error;
      return data;
    }
    return localCrmStore.clockOut(userId, notes);
  },

  async getMyAttendanceHistory(userId: string): Promise<AttendanceRecord[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('attendance').select('*').eq('user_id', userId).order('date', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return localCrmStore.getMyAttendanceHistory(userId);
  },

  async getAdminAttendance(): Promise<AttendanceRecord[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('attendance').select('*, profile:profiles(*)').order('date', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return localCrmStore.getAdminAttendance();
  },

  async regularizeAttendance(
    requestingUserIdOrRecord: string | (Partial<AttendanceRecord> & { user_id: string; date: string }),
    recordMaybe?: {
      user_id: string;
      date: string;
      clock_in?: string;
      clock_out?: string;
      total_hours?: number;
      status?: AttendanceStatus;
      correction_reason?: string;
    }
  ): Promise<AttendanceRecord> {
    return localCrmStore.regularizeAttendance(requestingUserIdOrRecord as any, recordMaybe);
  },

  exportAttendanceCsv(records?: AttendanceRecord[]): string {
    return localCrmStore.exportAttendanceCsv(records);
  },

  // Leaves
  async getMyLeaves(userId: string): Promise<LeaveRecord[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('leaves').select('*, reviewer:profiles!reviewed_by(*)').eq('user_id', userId).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return localCrmStore.getMyLeaves(userId);
  },

  async getAllLeaves(): Promise<LeaveRecord[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('leaves').select('*, profile:profiles!user_id(*), reviewer:profiles!reviewed_by(*)').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return localCrmStore.getAllLeaves();
  },

  async applyLeave(data: Omit<LeaveRecord, 'id' | 'status' | 'created_at'>): Promise<LeaveRecord> {
    if (isSupabaseConfigured) {
      const { data: created, error } = await supabase.from('leaves').insert(data).select().single();
      if (error) throw error;
      return created;
    }
    return localCrmStore.applyLeave(data);
  },

  async reviewLeave(leaveId: string, status: 'approved' | 'rejected', remarks: string, reviewerId: string): Promise<LeaveRecord> {
    if (isSupabaseConfigured) {
      const { data: leave } = await supabase.from('leaves').select('*').eq('id', leaveId).single();
      if (leave && leave.user_id === reviewerId) {
        throw new Error('Security Violation: Employees and administrators cannot approve or reject their own leave requests.');
      }
      const { data, error } = await supabase.from('leaves').update({
        status,
        admin_remarks: remarks,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString()
      }).eq('id', leaveId).select().single();
      if (error) throw error;
      return data;
    }
    return localCrmStore.reviewLeave(leaveId, status, remarks, reviewerId);
  },

  async cancelLeave(leaveId: string, requestingUserId: string): Promise<LeaveRecord> {
    return localCrmStore.cancelLeave(leaveId, requestingUserId);
  },

  // Company Settings
  async getSettings(): Promise<CompanySettings> {
    return localCrmStore.getSettings();
  },

  async updateSettings(requestingUserId: string, updates: Partial<CompanySettings>): Promise<CompanySettings> {
    return localCrmStore.updateSettings(requestingUserId, updates);
  },

  // Leads
  async getLeads(): Promise<Lead[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('leads').select('*, assignee:profiles!assigned_to(*), creator:profiles!created_by(*)').order('updated_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return localCrmStore.getLeads();
  },

  async getLeadById(id: string) {
    if (isSupabaseConfigured) {
      const { data: lead } = await supabase.from('leads').select('*, assignee:profiles!assigned_to(*), creator:profiles!created_by(*)').eq('id', id).single();
      const { data: activities } = await supabase.from('lead_activities').select('*, user:profiles(*)').eq('lead_id', id).order('created_at', { ascending: false });
      return lead ? { lead, activities: activities || [] } : null;
    }
    return localCrmStore.getLeadById(id);
  },

  async createLead(lead: Omit<Lead, 'id' | 'created_at' | 'updated_at'>): Promise<Lead> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('leads').insert(lead).select().single();
      if (error) throw error;
      return data;
    }
    return localCrmStore.createLead(lead);
  },

  async updateLead(id: string, updates: Partial<Lead>): Promise<Lead> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('leads').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }
    return localCrmStore.updateLead(id, updates);
  },

  async updateLeadStage(id: string, stage: LeadStage, userId: string): Promise<Lead> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('leads').update({ stage, updated_at: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw error;
      await supabase.from('lead_activities').insert({
        lead_id: id,
        user_id: userId,
        activity_type: 'stage_change',
        title: 'Stage Transitioned',
        content: `Lead moved to '${stage.toUpperCase()}'.`
      });
      return data;
    }
    return localCrmStore.updateLeadStage(id, stage, userId);
  },

  async deleteLead(id: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    return localCrmStore.deleteLead(id);
  },

  async addLeadActivity(act: Omit<LeadActivity, 'id' | 'created_at'>): Promise<LeadActivity> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('lead_activities').insert(act).select().single();
      if (error) throw error;
      return data;
    }
    return localCrmStore.addLeadActivity(act);
  },

  // Announcements & Important Notices
  async getNotices(
    requestingUserId?: string,
    options?: { status?: PublicationStatus | 'all'; category?: string; priority?: NoticePriority | 'all'; search?: string }
  ): Promise<Announcement[]> {
    return localCrmStore.getNotices(requestingUserId, options);
  },

  async getAnnouncements(requestingUserId?: string): Promise<Announcement[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('announcements').select('*, author:profiles!created_by(*)').order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return localCrmStore.getNotices(requestingUserId);
  },

  async createAnnouncement(
    ann: Omit<Announcement, 'id' | 'created_at' | 'updated_at'>,
    requestingUserId?: string
  ): Promise<Announcement> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('announcements').insert(ann).select().single();
      if (error) throw error;
      return data;
    }
    return localCrmStore.createAnnouncement(ann, requestingUserId);
  },

  async createNotice(
    ann: Omit<Announcement, 'id' | 'created_at' | 'updated_at'>,
    requestingUserId?: string
  ): Promise<Announcement> {
    return this.createAnnouncement(ann, requestingUserId);
  },

  async updateNotice(
    id: string,
    updates: Partial<Announcement>,
    requestingUserId?: string
  ): Promise<Announcement> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('announcements').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }
    return localCrmStore.updateNotice(id, updates, requestingUserId);
  },

  async archiveNotice(id: string, requestingUserId?: string): Promise<Announcement> {
    return localCrmStore.archiveNotice(id, requestingUserId);
  },

  async scheduleNotice(id: string, publishedAt: string, requestingUserId?: string): Promise<Announcement> {
    return localCrmStore.scheduleNotice(id, publishedAt, requestingUserId);
  },

  async markNoticeAsRead(noticeId: string, userId: string): Promise<NoticeRead> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('notice_reads').upsert({ notice_id: noticeId, user_id: userId }).select().single();
      if (error) throw error;
      return data;
    }
    return localCrmStore.markNoticeAsRead(noticeId, userId);
  },

  async acknowledgeNotice(noticeId: string, userId: string): Promise<NoticeAcknowledgement> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('notice_acknowledgements').upsert({ notice_id: noticeId, user_id: userId }).select().single();
      if (error) throw error;
      return data;
    }
    return localCrmStore.acknowledgeNotice(noticeId, userId);
  },

  async getNoticeAudit(noticeId: string, requestingUserId?: string) {
    return localCrmStore.getNoticeAudit(noticeId, requestingUserId);
  },

  async togglePinAnnouncement(id: string): Promise<boolean> {
    return localCrmStore.togglePinAnnouncement(id);
  },

  async deleteAnnouncement(id: string, requestingUserId?: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    return localCrmStore.deleteAnnouncement(id, requestingUserId);
  },

  // Company Policies
  async getPolicies(
    requestingUserId?: string,
    options?: { status?: PublicationStatus | 'all'; category?: string; search?: string }
  ): Promise<Policy[]> {
    return localCrmStore.getPolicies(requestingUserId, options);
  },

  async getPolicyById(policyId: string, requestingUserId?: string): Promise<Policy | null> {
    return localCrmStore.getPolicyById(policyId, requestingUserId);
  },

  async acknowledgePolicy(
    policyId: string,
    versionOrUserId: string,
    maybeUserId?: string
  ): Promise<PolicyAcknowledgment> {
    return localCrmStore.acknowledgePolicy(policyId, versionOrUserId, maybeUserId);
  },

  async getPolicyCompliance(policyId: string, version?: string) {
    return localCrmStore.getPolicyCompliance(policyId, version);
  },

  async getPolicyVersions(policyId: string): Promise<PolicyVersion[]> {
    return localCrmStore.getPolicyVersions(policyId);
  },

  async getArchivedPolicies(requestingUserId?: string): Promise<Policy[]> {
    return localCrmStore.getArchivedPolicies(requestingUserId);
  },

  async createPolicy(
    pol: Omit<Policy, 'id' | 'created_at' | 'updated_at'>,
    requestingUserId?: string
  ): Promise<Policy> {
    return localCrmStore.createPolicy(pol, requestingUserId);
  },

  async updatePolicy(
    id: string,
    updates: Partial<Policy> & { change_summary?: string },
    requestingUserId?: string
  ): Promise<Policy> {
    return localCrmStore.updatePolicy(id, updates, requestingUserId);
  },

  async archivePolicy(id: string, requestingUserId?: string): Promise<Policy> {
    return localCrmStore.archivePolicy(id, requestingUserId);
  },

  async deletePolicy(id: string, requestingUserId?: string): Promise<void> {
    return localCrmStore.deletePolicy(id, requestingUserId);
  },

  // Holidays
  async getHolidays(includeArchived: boolean = false): Promise<CompanyHoliday[]> {
    if (isSupabaseConfigured) {
      let query = supabase.from('company_holidays').select('*').order('date', { ascending: true });
      if (!includeArchived) {
        query = query.eq('is_archived', false);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
    return localCrmStore.getHolidays(includeArchived);
  },

  async addHoliday(hol: Omit<CompanyHoliday, 'id' | 'created_at'>, requestingUserId?: string): Promise<CompanyHoliday> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('company_holidays').insert(hol).select().single();
      if (error) throw error;
      return data;
    }
    return localCrmStore.addHoliday(hol, requestingUserId);
  },

  async updateHoliday(id: string, updates: Partial<CompanyHoliday>, requestingUserId?: string): Promise<CompanyHoliday> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('company_holidays').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }
    return localCrmStore.updateHoliday(id, updates, requestingUserId);
  },

  async archiveHoliday(id: string, requestingUserId?: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('company_holidays').update({ is_archived: true }).eq('id', id);
      if (error) throw error;
      return;
    }
    return localCrmStore.archiveHoliday(id, requestingUserId);
  },

  async deleteHoliday(id: string, requestingUserId?: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('company_holidays').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    return localCrmStore.deleteHoliday(id, requestingUserId);
  },

  // Dashboard Stats
  async getDashboardStats(): Promise<DashboardStats> {
    return localCrmStore.getDashboardStats();
  },

  resetState(): void {
    localCrmStore.resetState();
  }
};

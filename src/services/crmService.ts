import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  UserProfile,
  AttendanceRecord,
  LeaveRecord,
  Lead,
  LeadActivity,
  Announcement,
  Policy,
  CompanyHoliday,
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
  INITIAL_POLICIES,
  INITIAL_HOLIDAYS
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
  private policies: Policy[];
  private acknowledgments: { policy_id: string; user_id: string; acknowledged_at: string }[];
  private holidays: CompanyHoliday[];

  constructor() {
    this.profiles = getStorageItem('profiles', INITIAL_PROFILES);
    this.leads = getStorageItem('leads', INITIAL_LEADS);
    this.activities = getStorageItem('activities', INITIAL_LEAD_ACTIVITIES);
    this.attendance = getStorageItem('attendance', INITIAL_ATTENDANCE);
    this.leaves = getStorageItem('leaves', INITIAL_LEAVES);
    this.announcements = getStorageItem('announcements', INITIAL_ANNOUNCEMENTS);
    this.policies = getStorageItem('policies', INITIAL_POLICIES);
    this.acknowledgments = getStorageItem('acknowledgments', [
      { policy_id: 'pol-001', user_id: 'user-founder-001', acknowledged_at: '2026-09-01T10:00:00Z' },
      { policy_id: 'pol-001', user_id: 'user-sales-002', acknowledged_at: '2026-09-02T11:15:00Z' },
      { policy_id: 'pol-002', user_id: 'user-founder-001', acknowledged_at: '2026-09-01T10:00:00Z' },
      { policy_id: 'pol-002', user_id: 'user-sales-002', acknowledged_at: '2026-09-02T11:15:00Z' },
    ]);
    this.holidays = getStorageItem('holidays', INITIAL_HOLIDAYS);
  }

  private persist() {
    setStorageItem('profiles', this.profiles);
    setStorageItem('leads', this.leads);
    setStorageItem('activities', this.activities);
    setStorageItem('attendance', this.attendance);
    setStorageItem('leaves', this.leaves);
    setStorageItem('announcements', this.announcements);
    setStorageItem('policies', this.policies);
    setStorageItem('acknowledgments', this.acknowledgments);
    setStorageItem('holidays', this.holidays);
  }

  // --- Profiles / Employees ---
  async getEmployees(): Promise<UserProfile[]> {
    return [...this.profiles];
  }

  async getEmployeeById(id: string): Promise<UserProfile | null> {
    return this.profiles.find((p) => p.id === id) || null;
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

  // --- Attendance ---
  async getTodayAttendance(userId: string): Promise<{ myRecord: AttendanceRecord | null; allToday: AttendanceRecord[] }> {
    const today = new Date().toISOString().split('T')[0];
    const myRecord = this.attendance.find((a) => a.user_id === userId && a.date === today) || null;
    const allToday = this.profiles
      .filter((p) => p.status === 'active')
      .map((p) => {
        const rec = this.attendance.find((a) => a.user_id === p.id && a.date === today);
        return rec ? { ...rec, profile: p } : ({
          id: 'temp-' + p.id,
          user_id: p.id,
          date: today,
          clock_in: null,
          clock_out: null,
          total_hours: 0,
          status: 'absent' as AttendanceStatus,
          created_at: today,
          profile: p
        });
      });
    return { myRecord, allToday };
  }

  async clockIn(userId: string, notes?: string): Promise<AttendanceRecord> {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const timeNow = now.toTimeString().split(' ')[0]; // HH:MM:SS
    const [h, m] = timeNow.split(':').map(Number);
    const isLate = h > 9 || (h === 9 && m > 30);
    const status: AttendanceStatus = isLate ? 'late' : 'present';

    const existingIdx = this.attendance.findIndex((a) => a.user_id === userId && a.date === today);
    if (existingIdx !== -1 && this.attendance[existingIdx].clock_in) {
      throw new Error('You have already clocked in today.');
    }

    const newRecord: AttendanceRecord = {
      id: 'att-' + Date.now().toString(36),
      user_id: userId,
      date: today,
      clock_in: timeNow,
      clock_out: null,
      total_hours: 0,
      status,
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
      throw new Error('You have not clocked in today yet.');
    }

    const timeNow = new Date().toTimeString().split(' ')[0];
    const [inH, inM, inS] = this.attendance[idx].clock_in!.split(':').map(Number);
    const [outH, outM, outS] = timeNow.split(':').map(Number);
    const diffMinutes = (outH * 60 + outM + outS / 60) - (inH * 60 + inM + inS / 60);
    const totalHours = Math.max(0, +(diffMinutes / 60).toFixed(2));

    this.attendance[idx] = {
      ...this.attendance[idx],
      clock_out: timeNow,
      total_hours: totalHours || 4.5,
      notes: notes || this.attendance[idx].notes
    };
    this.persist();
    return this.attendance[idx];
  }

  async getMyAttendanceHistory(userId: string): Promise<AttendanceRecord[]> {
    return this.attendance.filter((a) => a.user_id === userId);
  }

  async getAdminAttendance(): Promise<AttendanceRecord[]> {
    return this.attendance.map((a) => ({
      ...a,
      profile: this.profiles.find((p) => p.id === a.user_id)
    }));
  }

  async regularizeAttendance(record: Partial<AttendanceRecord> & { user_id: string; date: string }): Promise<AttendanceRecord> {
    const idx = this.attendance.findIndex((a) => a.user_id === record.user_id && a.date === record.date);
    if (idx !== -1) {
      this.attendance[idx] = {
        ...this.attendance[idx],
        ...record,
        total_hours: record.total_hours || (record.clock_in && record.clock_out ? 8 : 0)
      };
      this.persist();
      return this.attendance[idx];
    } else {
      const newRec: AttendanceRecord = {
        id: 'att-' + Date.now().toString(36),
        user_id: record.user_id,
        date: record.date,
        clock_in: record.clock_in || '09:00:00',
        clock_out: record.clock_out || '17:30:00',
        total_hours: record.total_hours || 8.5,
        status: record.status || 'present',
        notes: record.notes || 'Regularized by Founder',
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
    const newLeave: LeaveRecord = {
      ...data,
      id: 'leave-' + Date.now().toString(36),
      status: 'pending',
      created_at: new Date().toISOString(),
      profile: this.profiles.find((p) => p.id === data.user_id)
    };
    this.leaves.unshift(newLeave);
    this.persist();
    return newLeave;
  }

  async reviewLeave(leaveId: string, status: 'approved' | 'rejected', remarks: string, reviewerId: string): Promise<LeaveRecord> {
    const idx = this.leaves.findIndex((l) => l.id === leaveId);
    if (idx === -1) throw new Error('Leave record not found');
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

  // --- Announcements ---
  async getAnnouncements(): Promise<Announcement[]> {
    return this.announcements.map((a) => ({
      ...a,
      author: this.profiles.find((p) => p.id === a.created_by)
    }));
  }

  async createAnnouncement(data: Omit<Announcement, 'id' | 'created_at'>): Promise<Announcement> {
    const newAnn: Announcement = {
      ...data,
      id: 'ann-' + Date.now().toString(36),
      created_at: new Date().toISOString(),
      author: this.profiles.find((p) => p.id === data.created_by)
    };
    this.announcements.unshift(newAnn);
    this.persist();
    return newAnn;
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

  async deleteAnnouncement(id: string): Promise<void> {
    this.announcements = this.announcements.filter((a) => a.id !== id);
    this.persist();
  }

  // --- Policies ---
  async getPolicies(userId: string): Promise<Policy[]> {
    return this.policies.map((p) => {
      const myAck = this.acknowledgments.find((ack) => ack.policy_id === p.id && ack.user_id === userId);
      const totalAck = this.acknowledgments.filter((ack) => ack.policy_id === p.id).length;
      return {
        ...p,
        creator: this.profiles.find((pr) => pr.id === p.created_by),
        acknowledged_count: totalAck,
        my_acknowledged_at: myAck?.acknowledged_at || null
      };
    });
  }

  async acknowledgePolicy(policyId: string, userId: string): Promise<void> {
    const exists = this.acknowledgments.some((ack) => ack.policy_id === policyId && ack.user_id === userId);
    if (!exists) {
      this.acknowledgments.push({
        policy_id: policyId,
        user_id: userId,
        acknowledged_at: new Date().toISOString()
      });
      this.persist();
    }
  }

  async getPolicyCompliance(policyId: string): Promise<{ rate: number; employees: { profile: UserProfile; acknowledged_at: string | null }[] }> {
    const employees = this.profiles.filter((p) => p.status === 'active').map((p) => {
      const ack = this.acknowledgments.find((a) => a.policy_id === policyId && a.user_id === p.id);
      return {
        profile: p,
        acknowledged_at: ack?.acknowledged_at || null
      };
    });
    const signedCount = employees.filter((e) => e.acknowledged_at).length;
    const rate = employees.length > 0 ? Math.round((signedCount / employees.length) * 100) : 100;
    return { rate, employees };
  }

  async createPolicy(data: Omit<Policy, 'id' | 'created_at' | 'updated_at'>): Promise<Policy> {
    const newPol: Policy = {
      ...data,
      id: 'pol-' + Date.now().toString(36),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.policies.push(newPol);
    this.persist();
    return newPol;
  }

  async updatePolicy(id: string, data: Partial<Policy>): Promise<Policy> {
    const idx = this.policies.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Policy not found');
    this.policies[idx] = {
      ...this.policies[idx],
      ...data,
      updated_at: new Date().toISOString()
    };
    this.persist();
    return this.policies[idx];
  }

  async deletePolicy(id: string): Promise<void> {
    this.policies = this.policies.filter((p) => p.id !== id);
    this.acknowledgments = this.acknowledgments.filter((a) => a.policy_id !== id);
    this.persist();
  }

  // --- Holidays ---
  async getHolidays(): Promise<CompanyHoliday[]> {
    return [...this.holidays].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  async addHoliday(data: Omit<CompanyHoliday, 'id' | 'created_at'>): Promise<CompanyHoliday> {
    const newHol: CompanyHoliday = {
      ...data,
      id: 'hol-' + Date.now().toString(36),
      created_at: new Date().toISOString()
    };
    this.holidays.push(newHol);
    this.persist();
    return newHol;
  }

  async deleteHoliday(id: string): Promise<void> {
    this.holidays = this.holidays.filter((h) => h.id !== id);
    this.persist();
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
  async getEmployees(): Promise<UserProfile[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('profiles').select('*').order('name');
      if (error) throw error;
      return data || [];
    }
    return localCrmStore.getEmployees();
  },

  async getEmployeeById(id: string): Promise<UserProfile | null> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (error) return null;
      return data;
    }
    return localCrmStore.getEmployeeById(id);
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
      const timeNow = new Date().toTimeString().split(' ')[0];
      const [h, m] = timeNow.split(':').map(Number);
      const isLate = h > 9 || (h === 9 && m > 30);
      const { data, error } = await supabase.from('attendance').insert({
        user_id: userId,
        date: today,
        clock_in: timeNow,
        status: isLate ? 'late' : 'present',
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

  async regularizeAttendance(rec: Partial<AttendanceRecord> & { user_id: string; date: string }): Promise<AttendanceRecord> {
    return localCrmStore.regularizeAttendance(rec);
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

  // Announcements
  async getAnnouncements(): Promise<Announcement[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('announcements').select('*, author:profiles!created_by(*)').order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return localCrmStore.getAnnouncements();
  },

  async createAnnouncement(ann: Omit<Announcement, 'id' | 'created_at'>): Promise<Announcement> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('announcements').insert(ann).select().single();
      if (error) throw error;
      return data;
    }
    return localCrmStore.createAnnouncement(ann);
  },

  async togglePinAnnouncement(id: string): Promise<boolean> {
    return localCrmStore.togglePinAnnouncement(id);
  },

  async deleteAnnouncement(id: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    return localCrmStore.deleteAnnouncement(id);
  },

  // Policies
  async getPolicies(userId: string): Promise<Policy[]> {
    return localCrmStore.getPolicies(userId);
  },

  async acknowledgePolicy(policyId: string, userId: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('policy_acknowledgments').insert({ policy_id: policyId, user_id: userId });
      if (error) throw error;
      return;
    }
    return localCrmStore.acknowledgePolicy(policyId, userId);
  },

  async getPolicyCompliance(policyId: string) {
    return localCrmStore.getPolicyCompliance(policyId);
  },

  async createPolicy(pol: Omit<Policy, 'id' | 'created_at' | 'updated_at'>): Promise<Policy> {
    return localCrmStore.createPolicy(pol);
  },

  async updatePolicy(id: string, updates: Partial<Policy>): Promise<Policy> {
    return localCrmStore.updatePolicy(id, updates);
  },

  async deletePolicy(id: string): Promise<void> {
    return localCrmStore.deletePolicy(id);
  },

  // Holidays
  async getHolidays(): Promise<CompanyHoliday[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('company_holidays').select('*').order('date', { ascending: true });
      if (error) throw error;
      return data || [];
    }
    return localCrmStore.getHolidays();
  },

  async addHoliday(hol: Omit<CompanyHoliday, 'id' | 'created_at'>): Promise<CompanyHoliday> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('company_holidays').insert(hol).select().single();
      if (error) throw error;
      return data;
    }
    return localCrmStore.addHoliday(hol);
  },

  async deleteHoliday(id: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('company_holidays').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    return localCrmStore.deleteHoliday(id);
  },

  // Dashboard Stats
  async getDashboardStats(): Promise<DashboardStats> {
    return localCrmStore.getDashboardStats();
  }
};

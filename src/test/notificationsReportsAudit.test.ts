import { describe, it, expect, beforeEach } from 'vitest';
import { crmService } from '../services/crmService';
import { AppNotification, AuditLogEntry, UserRole } from '../types/database';

describe('PHASE 06: Notifications, Reports, and Audit Logs Verification Suite', () => {
  const founderId = 'user-founder-001'; // Prerna Sharma (founder_admin)
  const salesRepId = 'user-sales-002'; // Alex Morgan (employee)
  const engId = 'user-eng-003'; // Devin Taylor / Sarah Chen (employee)

  beforeEach(() => {
    localStorage.clear();
    crmService.resetState();
  });

  // =========================================================================
  // TEST CRITERION 1: Notifications survive refresh and login
  // =========================================================================
  describe('Test Criterion 1: Notification Persistence and Session Survival', () => {
    it('persists created notifications across storage reads and page reloads', async () => {
      // Create a persistent notification for sales rep
      const notif = await crmService.createNotification({
        user_id: salesRepId,
        title: 'New Lead Opportunity Assigned',
        message: 'Founder Prerna Sharma assigned Acme Global ($50,000) to your pipeline.',
        type: 'lead_assigned',
        link: '/leads',
        metadata: { lead_id: 'lead-test-01', value: 50000 }
      });

      expect(notif.id).toBeDefined();
      expect(notif.is_read).toBe(false);

      // Verify immediate fetch
      const initialFetch = await crmService.getNotifications(salesRepId);
      expect(initialFetch.some((n) => n.id === notif.id)).toBe(true);

      // Verify unread count
      const count = await crmService.getUnreadNotificationCount(salesRepId);
      expect(count).toBeGreaterThan(0);

      // Simulate browser refresh/re-instantiation by reading from raw storage
      const storedJson = localStorage.getItem('vingo_crm_notifications');
      expect(storedJson).not.toBeNull();
      const storedArray: AppNotification[] = JSON.parse(storedJson!);
      const persistedNotif = storedArray.find((n) => n.id === notif.id);
      expect(persistedNotif).toBeDefined();
      expect(persistedNotif?.title).toBe('New Lead Opportunity Assigned');
      expect(persistedNotif?.is_read).toBe(false);

      // Mark notification as read
      const updated = await crmService.markNotificationAsRead(notif.id, salesRepId);
      expect(updated.is_read).toBe(true);
      expect(updated.read_at).toBeDefined();

      // Verify read status persists across subsequent queries
      const refetched = await crmService.getNotifications(salesRepId);
      const matched = refetched.find((n) => n.id === notif.id);
      expect(matched?.is_read).toBe(true);
      expect(matched?.read_at).not.toBeNull();
    });

    it('successfully marks all notifications as read in bulk', async () => {
      // Create multiple unread notifications
      await crmService.createNotification({
        user_id: salesRepId,
        title: 'Follow-up Due: Acme Call',
        message: 'Due at 14:00',
        type: 'followup_due',
        link: '/leads/followups'
      });
      await crmService.createNotification({
        user_id: salesRepId,
        title: 'New Policy: Security Handbook',
        message: 'Please review v2.0',
        type: 'policy_updated',
        link: '/policies'
      });

      const unreadBefore = await crmService.getUnreadNotificationCount(salesRepId);
      expect(unreadBefore).toBeGreaterThanOrEqual(2);

      const bulkResult = await crmService.markAllNotificationsAsRead(salesRepId);
      expect(bulkResult.count).toBeGreaterThanOrEqual(2);

      const unreadAfter = await crmService.getUnreadNotificationCount(salesRepId);
      expect(unreadAfter).toBe(0);
    });
  });

  // =========================================================================
  // TEST CRITERION 2: Users cannot read other users' private notifications
  // =========================================================================
  describe('Test Criterion 2: Multi-Tenant and Per-User Notification Isolation', () => {
    it('strictly isolates notifications to the recipient and blocks cross-employee leakage', async () => {
      // Create private notification for founder (e.g. executive confidential attendance anomaly)
      const founderNotif = await crmService.createNotification({
        user_id: founderId,
        title: 'Confidential Executive Attendance Exception',
        message: 'Sensitive timesheet discrepancy identified for department head.',
        type: 'attendance_exception',
        link: '/attendance'
      });

      // Create private notification for sales rep
      const salesNotif = await crmService.createNotification({
        user_id: salesRepId,
        title: 'Sales Commission Statement Ready',
        message: 'Your Q3 commission breakdown is available.',
        type: 'general',
        link: '/profile'
      });

      // Sales rep fetches their notifications
      const salesRepFeed = await crmService.getNotifications(salesRepId);

      // Sales rep should see their own notification
      expect(salesRepFeed.some((n) => n.id === salesNotif.id)).toBe(true);

      // Sales rep MUST NOT see the founder's confidential notification
      expect(salesRepFeed.some((n) => n.id === founderNotif.id)).toBe(false);
      expect(salesRepFeed.every((n) => n.user_id === salesRepId)).toBe(true);

      // Founder fetches their notifications
      const founderFeed = await crmService.getNotifications(founderId);
      expect(founderFeed.some((n) => n.id === founderNotif.id)).toBe(true);
      expect(founderFeed.some((n) => n.id === salesNotif.id)).toBe(false);
    });

    it('prevents an employee from marking another user\'s notification as read', async () => {
      const founderNotif = await crmService.createNotification({
        user_id: founderId,
        title: 'Founder Security Alert',
        message: 'Admin access request',
        type: 'admin_override',
        link: '/settings'
      });

      // Sales rep attempts to mark founder's notification as read
      await expect(
        crmService.markNotificationAsRead(founderNotif.id, salesRepId)
      ).rejects.toThrow(/access denied/i);
    });
  });

  // =========================================================================
  // TEST CRITERION 3: Dashboard figures match database records exactly
  // =========================================================================
  describe('Test Criterion 3: Comprehensive Report and Dashboard Metrics Veracity', () => {
    it('accurately computes workforce, attendance, leave, and pipeline metrics from database records', async () => {
      const report = await crmService.getComprehensiveReport(founderId);

      // 1. Workforce verification
      const allEmployees = await crmService.getEmployees(founderId);
      const activeCount = allEmployees.filter((e) => e.status === 'active').length;
      const inactiveCount = allEmployees.filter((e) => e.status === 'deactivated' || e.status === 'inactive').length;
      expect(report.workforce.totalActive).toBe(activeCount);
      expect(report.workforce.totalInactive).toBe(inactiveCount);

      // 2. Attendance verification
      expect(report.attendance.todayTotalExpected).toBe(activeCount);
      expect(report.attendance.clockedIn).toBeLessThanOrEqual(activeCount);
      expect(report.attendance.attendanceRatePercent).toBe(
        activeCount > 0 ? Math.round((report.attendance.clockedIn / activeCount) * 100) : 100
      );

      // 3. Leave statistics verification
      const allLeaves = await crmService.getAllLeaves();
      const pendingLeaves = allLeaves.filter((l) => l.status === 'pending');
      const approvedLeaves = allLeaves.filter((l) => l.status === 'approved');
      const rejectedLeaves = allLeaves.filter((l) => l.status === 'rejected');
      expect(report.leaves.pendingCount).toBe(pendingLeaves.length);
      expect(report.leaves.approvedCount).toBe(approvedLeaves.length);
      expect(report.leaves.rejectedCount).toBe(rejectedLeaves.length);

      const resolved = approvedLeaves.length + rejectedLeaves.length;
      const expectedApprovalRate = resolved > 0 ? Math.round((approvedLeaves.length / resolved) * 100) : 100;
      expect(report.leaves.approvalRatePercent).toBe(expectedApprovalRate);

      // 4. Pipeline & Lead Conversion verification
      const allLeads = await crmService.getLeads(founderId);
      expect(report.pipeline.totalLeads).toBe(allLeads.length);

      const deadLeadsCount = allLeads.filter((l) => l.is_dead).length;
      const lockedLeadsCount = allLeads.filter((l) => l.is_locked).length;
      expect(report.pipeline.deadLeads).toBe(deadLeadsCount);
      expect(report.pipeline.lockedLeads).toBe(lockedLeadsCount);

      const wonLeads = allLeads.filter((l) => l.stage === 'won');
      const lostLeads = allLeads.filter((l) => l.stage === 'lost');
      const expectedWonRevenue = wonLeads.reduce((sum, l) => sum + (l.value || 0), 0);
      expect(report.pipeline.wonRevenue).toBe(expectedWonRevenue);

      const closed = wonLeads.length + lostLeads.length;
      const expectedConversionRate = closed > 0 ? Math.round((wonLeads.length / closed) * 100) : 0;
      expect(report.pipeline.conversionRatePercent).toBe(expectedConversionRate);

      // 5. Follow-ups verification
      const allFollowUps = await crmService.getFollowUps(founderId);
      const completedCount = allFollowUps.filter((f) => f.status === 'completed').length;
      expect(report.followups.completedCount).toBe(completedCount);

      // 6. Sales Rep Activity & Conversion Leaderboard verification
      for (const rep of report.repPerformance) {
        const repAssigned = allLeads.filter((l) => l.assigned_to === rep.repId);
        const repWon = repAssigned.filter((l) => l.stage === 'won');
        expect(rep.assignedLeadsCount).toBe(repAssigned.length);
        expect(rep.wonLeadsCount).toBe(repWon.length);
        const expectedRepConversion = repAssigned.length > 0 ? Math.round((repWon.length / repAssigned.length) * 100) : 0;
        expect(rep.conversionRatePercent).toBe(expectedRepConversion);
      }
    });
  });

  // =========================================================================
  // TEST CRITERION 4: Audit entries are created for sensitive operations
  // =========================================================================
  describe('Test Criterion 4: Immutable Audit Trail for Sensitive Actions', () => {
    it('creates immutable audit logs upon employee provisioning, role assignment, and deactivation', async () => {
      // 1. Employee Provisioning
      const newEmp = await crmService.provisionEmployee(founderId, {
        employee_id: 'EMP-999',
        name: 'Jordan Belfort',
        email: 'jordan@vingo.com',
        role: 'employee',
        department: 'Sales',
        title: 'Inside Sales Specialist',
        status: 'active',
        join_date: '2026-10-19',
        work_location: 'Headquarters - San Francisco',
        annual_leave_quota: 18,
        sick_leave_quota: 10,
        casual_leave_quota: 8
      });

      const auditLogsAfterCreation = await crmService.getAuditLogs(founderId, { action: 'employee_created' });
      const createLog = auditLogsAfterCreation.find((l) => l.target_id === newEmp.id);
      expect(createLog).toBeDefined();
      expect(createLog?.action).toBe('employee_created');
      expect(createLog?.actor_id).toBe(founderId);

      // 2. Role Change
      await crmService.assignRole(founderId, newEmp.id, 'admin');
      const auditLogsAfterRoleChange = await crmService.getAuditLogs(founderId, { action: 'role_changed' });
      const roleLog = auditLogsAfterRoleChange.find((l) => l.target_id === newEmp.id);
      expect(roleLog).toBeDefined();
      expect(roleLog?.before_state?.role).toBe('employee');
      expect(roleLog?.after_state?.role).toBe('admin');

      // 3. Employee Deactivation
      await crmService.deactivateEmployee(founderId, newEmp.id);
      const auditLogsAfterDeactivation = await crmService.getAuditLogs(founderId, { action: 'employee_deactivated' });
      const deactLog = auditLogsAfterDeactivation.find((l) => l.target_id === newEmp.id);
      expect(deactLog).toBeDefined();
      expect(deactLog?.after_state?.status).toBe('deactivated');
    });

    it('creates audit entries and alerts when a dead lead is claimed and locked', async () => {
      // Find a dead lead
      const deadLead = (await crmService.getLeads(founderId)).find((l) => l.is_dead && !l.is_locked);
      expect(deadLead).toBeDefined();

      // Representative claims the dead lead
      const claimed = await crmService.claimDeadLead(deadLead!.id, salesRepId);
      expect(claimed.is_locked).toBe(true);
      expect(claimed.locked_by).toBe(salesRepId);
      expect(claimed.assigned_to).toBe(salesRepId);

      // Verify audit log entry
      const auditLogs = await crmService.getAuditLogs(founderId, { action: 'lead_claimed' });
      const claimLog = auditLogs.find((l) => l.target_id === deadLead!.id);
      expect(claimLog).toBeDefined();
      expect(claimLog?.actor_id).toBe(salesRepId);

      // Verify notification generated for administrator
      const founderNotifs = await crmService.getNotifications(founderId, { type: 'dead_lead_claimed' });
      expect(founderNotifs.length).toBeGreaterThan(0);
    });

    it('creates an admin_lock_override audit log when an administrator overrides an exclusivity lock', async () => {
      // Find a locked lead
      const lockedLead = (await crmService.getLeads(founderId)).find((l) => l.is_locked);
      expect(lockedLead).toBeDefined();

      const previousLocker = lockedLead!.locked_by;

      // Administrator overrides and releases lock
      const unlocked = await crmService.unlockDeadLead(lockedLead!.id, founderId);
      expect(unlocked.is_locked).toBe(false);
      expect(unlocked.locked_by).toBeNull();

      // Verify audit log records admin override
      const auditLogs = await crmService.getAuditLogs(founderId, { action: 'admin_lock_override' });
      const overrideLog = auditLogs.find((l) => l.target_id === lockedLead!.id);
      expect(overrideLog).toBeDefined();
      expect(overrideLog?.actor_id).toBe(founderId);

      // If locked by representative, representative should receive notification of admin override
      if (previousLocker && previousLocker !== founderId) {
        const lockerNotifs = await crmService.getNotifications(previousLocker, { type: 'dead_lead_unlocked' });
        expect(lockerNotifs.length).toBeGreaterThan(0);
      }
    });

    it('creates audit entries and notifications for leave decisions and attendance corrections', async () => {
      // 1. Leave Decision
      const newLeave = await crmService.applyLeave({
        user_id: salesRepId,
        leave_type: 'casual',
        start_date: '2026-11-10',
        end_date: '2026-11-11',
        days_count: 2,
        reason: 'Personal family matter',
        duration_type: 'full_day'
      });

      // Review and approve leave as founder
      await crmService.reviewLeave(newLeave.id, 'approved', 'Approved by executive', founderId);

      const leaveAudit = await crmService.getAuditLogs(founderId, { action: 'leave_approved' });
      expect(leaveAudit.some((l) => l.target_id === newLeave.id)).toBe(true);

      const applicantNotifs = await crmService.getNotifications(salesRepId, { type: 'leave_reviewed' });
      expect(applicantNotifs.some((n) => n.metadata?.leave_id === newLeave.id)).toBe(true);

      // 2. Attendance Regularization
      const regularized = await crmService.regularizeAttendance(founderId, {
        user_id: salesRepId,
        date: '2026-10-18',
        clock_in: '09:00:00',
        clock_out: '18:00:00',
        total_hours: 9.0,
        status: 'present',
        correction_reason: 'RFID badge scanner server glitch'
      });

      const attAudit = await crmService.getAuditLogs(founderId, { action: 'attendance_regularized' });
      expect(attAudit.some((l) => l.target_id === regularized.id)).toBe(true);
    });
  });

  // =========================================================================
  // TEST CRITERION 5: Realtime updates do not bypass access policies
  // =========================================================================
  describe('Test Criterion 5: Security Access Policies for Audit and Activity Visibility', () => {
    it('restricts ordinary employees from viewing confidential peer audit entries', async () => {
      // As founder, perform administrative action on employee B (engId)
      const empB = await crmService.provisionEmployee(founderId, {
        employee_id: 'EMP-998',
        name: 'Secret R&D Researcher',
        email: 'secret@vingo.com',
        role: 'employee',
        department: 'Engineering',
        title: 'Cryptographic Lead',
        status: 'active',
        join_date: '2026-10-19',
        work_location: 'Remote - Zurich',
        annual_leave_quota: 18,
        sick_leave_quota: 10,
        casual_leave_quota: 8
      });

      // Sales rep queries audit logs
      const salesRepAuditView = await crmService.getAuditLogs(salesRepId);

      // Sales rep should NOT see employee B's creation record where sales rep is neither actor nor target
      const leakedLog = salesRepAuditView.find((l) => l.target_id === empB.id);
      expect(leakedLog).toBeUndefined();

      // However, founder should see it
      const founderAuditView = await crmService.getAuditLogs(founderId);
      expect(founderAuditView.some((l) => l.target_id === empB.id)).toBe(true);
    });

    it('ensures employees only see audit entries involving themselves as actor or target', async () => {
      const salesRepAuditView = await crmService.getAuditLogs(salesRepId);
      for (const log of salesRepAuditView) {
        const isActor = log.actor_id === salesRepId;
        const isTarget = log.target_id === salesRepId;
        expect(isActor || isTarget).toBe(true);
      }
    });
  });
});

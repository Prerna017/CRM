import { describe, it, expect, beforeEach } from 'vitest';
import { crmService } from '../services/crmService';
import { Announcement, Policy, PolicyVersion } from '../types/database';

describe('PHASE 03: Important Notices and Company Policies Verification Suite', () => {
  const adminId = 'user-founder-001'; // Prerna Sharma (founder_admin)
  const employeeId = 'user-sales-002'; // Alex Morgan (employee)
  const secondEmployeeId = 'user-eng-003'; // Sarah Jenkins (employee)

  beforeEach(() => {
    localStorage.clear();
    crmService.resetState();
  });

  // =========================================================================
  // TEST CRITERION 1: Draft notices are not visible to ordinary employees
  // =========================================================================
  describe('Test Criterion 1: Draft Notices & Scheduling Visibility Restrictions', () => {
    it('strictly hides draft notices from ordinary employees', async () => {
      // Create a draft notice as admin
      const draftNotice = await crmService.createNotice(
        {
          title: 'Secret Executive Compensation Adjustments',
          content: 'Confidential draft notes regarding end-of-year executive compensation pools.',
          category: 'compliance',
          priority: 'urgent',
          status: 'draft',
          published_at: new Date().toISOString(),
          requires_acknowledgement: false,
          created_by: adminId,
          target_department: 'all'
        },
        adminId
      );

      expect(draftNotice.status).toBe('draft');

      // Ordinary employee fetches notices
      const employeeNotices = await crmService.getNotices(employeeId);
      const foundInEmployeeList = employeeNotices.some((n) => n.id === draftNotice.id);
      expect(foundInEmployeeList).toBe(false);

      // Verify no draft notices exist in the employee's feed whatsoever
      const anyDraftsForEmployee = employeeNotices.some((n) => n.status === 'draft');
      expect(anyDraftsForEmployee).toBe(false);

      // Also verify via getAnnouncements wrapper
      const employeeAnnouncements = await crmService.getAnnouncements(employeeId);
      expect(employeeAnnouncements.some((n) => n.id === draftNotice.id)).toBe(false);
    });

    it('allows authorized administrators to view and manage draft notices', async () => {
      // Admin should be able to view draft notices
      const adminDrafts = await crmService.getNotices(adminId, { status: 'draft' });
      expect(adminDrafts.length).toBeGreaterThan(0);
      expect(adminDrafts.every((n) => n.status === 'draft')).toBe(true);
    });

    it('hides scheduled future notices from ordinary employees until publication date', async () => {
      // Future scheduled notice (e.g. 10 days from now)
      const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
      const scheduledNotice = await crmService.createNotice(
        {
          title: 'Upcoming Office Closure Announcement',
          content: 'The headquarters will be closed next week for electrical maintenance.',
          category: 'general',
          priority: 'normal',
          status: 'published',
          published_at: futureDate,
          requires_acknowledgement: false,
          created_by: adminId,
          target_department: 'all'
        },
        adminId
      );

      // Ordinary employee cannot see future scheduled notices
      const employeeNotices = await crmService.getNotices(employeeId);
      expect(employeeNotices.some((n) => n.id === scheduledNotice.id)).toBe(false);

      // Admin can see it in all notices or scheduled view
      const adminNotices = await crmService.getNotices(adminId);
      expect(adminNotices.some((n) => n.id === scheduledNotice.id)).toBe(true);
    });
  });

  // =========================================================================
  // TEST CRITERION 2: Archived policies are handled according to retention rules
  // =========================================================================
  describe('Test Criterion 2: Archived Policies & Statutory Retention Rules', () => {
    it('omits archived policies from the ordinary employee active handbook', async () => {
      const activeEmployeePolicies = await crmService.getPolicies(employeeId);
      expect(activeEmployeePolicies.length).toBeGreaterThan(0);

      // Verify no archived policies appear in employee active policy view
      const hasArchived = activeEmployeePolicies.some((p) => p.status === 'archived');
      expect(hasArchived).toBe(false);

      // Pre-seeded archived policy 'pol-archived-001' must not be in active feed
      expect(activeEmployeePolicies.some((p) => p.id === 'pol-archived-001')).toBe(false);
    });

    it('preserves archived policies in the retention repository with audit metadata', async () => {
      // Query archived policies via dedicated retention method
      const archivedPolicies = await crmService.getArchivedPolicies(adminId);
      expect(archivedPolicies.length).toBeGreaterThan(0);

      const legacyPolicy = archivedPolicies.find((p) => p.id === 'pol-archived-001');
      expect(legacyPolicy).toBeDefined();
      expect(legacyPolicy?.status).toBe('archived');
      expect(legacyPolicy?.effective_date).toBeDefined();
      expect(legacyPolicy?.updated_at).toBeDefined();
      expect(legacyPolicy?.version).toBe('1.0');
    });

    it('allows administrators to archive an active policy under compliance rules', async () => {
      // Create a policy
      const testPolicy = await crmService.createPolicy(
        {
          title: 'Interim Travel Expenses Protocol',
          category: 'Employee conduct',
          version: '1.0',
          effective_date: '2026-05-01',
          content: 'Interim guidelines for local travel reimbursements.',
          status: 'published',
          created_by: adminId
        },
        adminId
      );

      // Verify it is initially active for employee
      let empPolicies = await crmService.getPolicies(employeeId);
      expect(empPolicies.some((p) => p.id === testPolicy.id)).toBe(true);

      // Admin archives the policy
      const archived = await crmService.archivePolicy(testPolicy.id, adminId);
      expect(archived.status).toBe('archived');

      // Employee active feed no longer contains it
      empPolicies = await crmService.getPolicies(employeeId);
      expect(empPolicies.some((p) => p.id === testPolicy.id)).toBe(false);

      // Still retrievable in statutory archive for audit compliance
      const retentionList = await crmService.getArchivedPolicies(adminId);
      expect(retentionList.some((p) => p.id === testPolicy.id)).toBe(true);
    });
  });

  // =========================================================================
  // TEST CRITERION 3: Read receipts and acknowledgements persist
  // =========================================================================
  describe('Test Criterion 3: Read Receipts and Acknowledgements Persistence', () => {
    it('persists notice read receipts per user with exact timestamp', async () => {
      const noticeId = 'ann-003'; // Sales Team Incentive notice

      // Initial check: employee has not read notice ann-003
      let notices = await crmService.getNotices(secondEmployeeId);
      let targetNotice = notices.find((n) => n.id === noticeId);
      expect(targetNotice?.is_read).toBe(false);
      expect(targetNotice?.read_at).toBeNull();

      // Employee marks as read
      const readRecord = await crmService.markNoticeAsRead(noticeId, secondEmployeeId);
      expect(readRecord.notice_id).toBe(noticeId);
      expect(readRecord.user_id).toBe(secondEmployeeId);
      expect(readRecord.read_at).toBeDefined();

      // Refetch notices for this employee
      notices = await crmService.getNotices(secondEmployeeId);
      targetNotice = notices.find((n) => n.id === noticeId);
      expect(targetNotice?.is_read).toBe(true);
      expect(targetNotice?.read_at).toBe(readRecord.read_at);
    });

    it('persists notice mandatory sign-off acknowledgements and updates admin audit rates', async () => {
      const noticeId = 'ann-002'; // Health Insurance notice (requires_acknowledgement: true)

      // Employee acknowledges notice
      const ackRecord = await crmService.acknowledgeNotice(noticeId, secondEmployeeId);
      expect(ackRecord.notice_id).toBe(noticeId);
      expect(ackRecord.user_id).toBe(secondEmployeeId);
      expect(ackRecord.acknowledged_at).toBeDefined();

      // Verify employee feed reflects verified acknowledgement
      const employeeNotices = await crmService.getNotices(secondEmployeeId);
      const notice = employeeNotices.find((n) => n.id === noticeId);
      expect(notice?.is_acknowledged).toBe(true);
      expect(notice?.acknowledged_at).toBe(ackRecord.acknowledged_at);
      // Acknowledging notice also confirms read receipt
      expect(notice?.is_read).toBe(true);

      // Verify Administrator audit receipts view
      const audit = await crmService.getNoticeAudit(noticeId, adminId);
      expect(audit).toBeDefined();
      expect(audit.notice.id).toBe(noticeId);
      expect(audit.acknowledgements.some((a) => a.user.id === secondEmployeeId)).toBe(true);
      expect(audit.reads.some((r) => r.user.id === secondEmployeeId)).toBe(true);
      expect(audit.ackRate).toBeGreaterThan(0);
      expect(audit.readRate).toBeGreaterThan(0);
    });

    it('prevents non-administrators from inspecting company-wide audit receipts', async () => {
      const noticeId = 'ann-002';
      await expect(
        crmService.getNoticeAudit(noticeId, employeeId)
      ).rejects.toThrow(/Unauthorized/i);
    });
  });

  // =========================================================================
  // TEST CRITERION 4: Employees cannot modify official policy content
  // =========================================================================
  describe('Test Criterion 4: Strict Access Control on Official Policies', () => {
    it('prevents an employee from creating a company policy', async () => {
      await expect(
        crmService.createPolicy(
          {
            title: 'Malicious Unauthorized Policy',
            category: 'Attendance',
            version: '1.0',
            effective_date: '2026-10-19',
            content: 'Fake policy created by ordinary employee.',
            status: 'published',
            created_by: employeeId
          },
          employeeId
        )
      ).rejects.toThrow(/Unauthorized: Only authorized administrators can publish or revise official company-wide policies/i);
    });

    it('prevents an employee from modifying or updating official policy content', async () => {
      const policyId = 'pol-001'; // Code of Ethics

      await expect(
        crmService.updatePolicy(
          policyId,
          {
            content: 'Tampered policy content overriding code of conduct.'
          },
          employeeId
        )
      ).rejects.toThrow(/Unauthorized: Only authorized administrators can publish or revise official company-wide policies/i);
    });

    it('prevents an employee from archiving official company policies', async () => {
      const policyId = 'pol-001';

      await expect(
        crmService.archivePolicy(policyId, employeeId)
      ).rejects.toThrow(/Unauthorized: Only authorized administrators can archive/i);
    });

    it('prevents an employee from deleting company policies', async () => {
      const policyId = 'pol-001';

      await expect(
        crmService.deletePolicy(policyId, employeeId)
      ).rejects.toThrow(/Unauthorized: Only administrators can delete company policies/i);
    });
  });

  // =========================================================================
  // TEST CRITERION 5: Policy versioning, preservation and versioned acks
  // =========================================================================
  describe('Test Criterion 5: Policy Versioning & Historical Acknowledgement Preservation', () => {
    it('preserves the prior version and its historical sign-offs when an admin bumps the version', async () => {
      const policyId = 'pol-001'; // Starts at v2.1 in seed data

      // Pre-condition: Alex Morgan (user-sales-002) has signed v2.1
      let policies = await crmService.getPolicies(employeeId);
      let pol = policies.find((p) => p.id === policyId);
      expect(pol?.version).toBe('2.1');
      expect(pol?.is_acknowledged).toBe(true);

      // Admin updates and bumps policy to version 2.2 with a changelog note
      const changelog = 'Added section 5 on AI code generation ethics and customer confidentiality.';
      const updatedPolicy = await crmService.updatePolicy(
        policyId,
        {
          version: '2.2',
          content: 'Updated Code of Conduct v2.2 with AI guidelines...',
          summary: 'Updated ethical standards for 2026.',
          change_summary: changelog
        },
        adminId
      );

      expect(updatedPolicy.version).toBe('2.2');

      // Check version history: prior version 2.1 MUST be preserved in policy_versions
      const history = await crmService.getPolicyVersions(policyId);
      const version21Snapshot = history.find((v) => v.version === '2.1');
      expect(version21Snapshot).toBeDefined();
      expect(version21Snapshot?.change_summary).toBe(changelog);
      expect(version21Snapshot?.acknowledged_count).toBeGreaterThan(0);

      // Key compliance requirement: Employee's acknowledgement for v2.2 must be required
      // because they haven't signed the new version 2.2 yet!
      policies = await crmService.getPolicies(employeeId);
      pol = policies.find((p) => p.id === policyId);
      expect(pol?.version).toBe('2.2');
      expect(pol?.is_acknowledged).toBe(false);
      expect(pol?.my_acknowledged_at).toBeNull();

      // Employee signs the new version 2.2
      const newAck = await crmService.acknowledgePolicy(policyId, '2.2', employeeId);
      expect(newAck.version).toBe('2.2');
      expect(newAck.user_id).toBe(employeeId);

      // Now employee is acknowledged for version 2.2
      policies = await crmService.getPolicies(employeeId);
      pol = policies.find((p) => p.id === policyId);
      expect(pol?.is_acknowledged).toBe(true);
      expect(pol?.my_acknowledged_at).toBe(newAck.acknowledged_at);

      // Check admin compliance: version 2.2 compliance tracks correctly
      const compliance = await crmService.getPolicyCompliance(policyId, '2.2');
      expect(compliance.version).toBe('2.2');
      expect(compliance.employees.find((e) => e.profile.id === employeeId)?.acknowledged_at).toBeDefined();
    });
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { crmService } from '../services/crmService';
import { UserProfile, AttendanceRecord, LeaveRecord } from '../types/database';

describe('PHASE 02: Employee HR Management, Attendance and Leave Verification Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    crmService.resetState();
  });

  // TEST CRITERION 1: Employees cannot read another employee's private HR records
  describe('Test Criterion 1: Sensitive HR Record Privacy & Access Controls', () => {
    it('masks sensitive salary and emergency contact details when an employee views peer records', async () => {
      const employeeCallerId = 'user-sales-002'; // Regular employee: Alex Morgan (Sales)
      const targetPeerId = 'user-eng-003'; // Peer: Sarah Jenkins (Engineering)

      const peerProfile = await crmService.getEmployeeById(targetPeerId, employeeCallerId);
      expect(peerProfile).not.toBeNull();
      expect(peerProfile?.name).toBe('Sarah Jenkins');
      expect(peerProfile?.department).toBe('Engineering');
      expect(peerProfile?.title).toBe('Lead Full Stack Architect');

      // Sensitive fields MUST be undefined/masked for peers
      expect(peerProfile?.salary).toBeUndefined();
      expect(peerProfile?.emergency_contact_name).toBeUndefined();
      expect(peerProfile?.emergency_contact_phone).toBeUndefined();

      // Employee can view their OWN profile with full details
      const ownProfile = await crmService.getEmployeeById(employeeCallerId, employeeCallerId);
      expect(ownProfile).not.toBeNull();
      expect(ownProfile?.salary).toBeDefined();
      expect(ownProfile?.emergency_contact_name).toBeDefined();
      expect(ownProfile?.emergency_contact_phone).toBeDefined();
    });

    it('masks sensitive fields across the directory list when requested by an employee', async () => {
      const employeeCallerId = 'user-sales-002';
      const allEmployees = await crmService.getEmployees(employeeCallerId);

      expect(allEmployees.length).toBeGreaterThan(0);
      const peerEmployees = allEmployees.filter((e) => e.id !== employeeCallerId);

      for (const peer of peerEmployees) {
        expect(peer.salary).toBeUndefined();
        expect(peer.emergency_contact_name).toBeUndefined();
        expect(peer.emergency_contact_phone).toBeUndefined();
      }
    });

    it('allows authorized administrators to view complete sensitive details for all employees', async () => {
      const adminCallerId = 'user-founder-001'; // Founder / Admin: Prerna Sharma
      const targetEmpId = 'user-eng-003';

      const empProfile = await crmService.getEmployeeById(targetEmpId, adminCallerId);
      expect(empProfile).not.toBeNull();
      expect(empProfile?.salary).toBeDefined();
      expect(typeof empProfile?.salary).toBe('number');
      expect(empProfile?.emergency_contact_name).toBeDefined();
      expect(empProfile?.emergency_contact_phone).toBeDefined();
    });
  });

  // TEST CRITERION 2: Employees cannot approve their own leave requests
  describe('Test Criterion 2: Leave Self-Approval Prohibition', () => {
    it('strictly denies regular employees from approving their own leave requests', async () => {
      const empId = 'user-sales-002';

      const leave = await crmService.applyLeave({
        user_id: empId,
        leave_type: 'annual',
        duration_type: 'full_day',
        start_date: '2026-11-20',
        end_date: '2026-11-22',
        reason: 'Family holiday trip'
      });

      expect(leave.status).toBe('pending');

      // Employee attempts self-approval
      await expect(
        crmService.reviewLeave(leave.id, 'approved', 'Approved by self', empId)
      ).rejects.toThrow(/Security Violation: Employees and administrators cannot approve or reject their own leave requests/);
    });

    it('strictly denies administrators from approving their own leave requests', async () => {
      const adminId = 'user-founder-001'; // Admin / Founder

      const adminLeave = await crmService.applyLeave({
        user_id: adminId,
        leave_type: 'annual',
        duration_type: 'full_day',
        start_date: '2026-12-24',
        end_date: '2026-12-28',
        reason: 'Winter holiday recess'
      });

      // Admin attempts self-approval
      await expect(
        crmService.reviewLeave(adminLeave.id, 'approved', 'Self approving', adminId)
      ).rejects.toThrow(/Security Violation: Employees and administrators cannot approve or reject their own leave requests/);
    });

    it('allows an authorized independent administrator to approve another employee leave request', async () => {
      const empId = 'user-ops-005';
      const adminReviewerId = 'user-founder-001';

      const leave = await crmService.applyLeave({
        user_id: empId,
        leave_type: 'casual',
        duration_type: 'half_day',
        half_day_period: 'first_half',
        start_date: '2026-11-15',
        end_date: '2026-11-15',
        reason: 'Morning personal appointment'
      });

      const reviewed = await crmService.reviewLeave(leave.id, 'approved', 'Approved. Coverage arranged.', adminReviewerId);
      expect(reviewed.status).toBe('approved');
      expect(reviewed.reviewed_by).toBe(adminReviewerId);
      expect(reviewed.admin_remarks).toBe('Approved. Coverage arranged.');
    });
  });

  // TEST CRITERION 3: Leave decisions persist after refresh
  describe('Test Criterion 3: Persistence and Safe Ledger Logic', () => {
    it('persists approved leave decision and deducts quota from employee ledger', async () => {
      const empId = 'user-ops-005'; // Elena Rostova
      const adminReviewerId = 'user-founder-001';

      const initialProfile = await crmService.getEmployeeById(empId, adminReviewerId);
      const startingAnnualQuota = initialProfile?.annual_leave_quota || 18;

      // Apply for 2 days leave
      const leave = await crmService.applyLeave({
        user_id: empId,
        leave_type: 'annual',
        duration_type: 'full_day',
        start_date: '2026-11-02',
        end_date: '2026-11-03',
        days_count: 2,
        reason: 'Personal conference'
      });

      // Admin approves
      await crmService.reviewLeave(leave.id, 'approved', 'Authorized for professional development', adminReviewerId);

      // Verify decision persistence
      const leavesList = await crmService.getAllLeaves();
      const updatedLeave = leavesList.find((l) => l.id === leave.id);
      expect(updatedLeave).toBeDefined();
      expect(updatedLeave?.status).toBe('approved');
      expect(updatedLeave?.reviewed_by).toBe(adminReviewerId);
      expect(updatedLeave?.admin_remarks).toBe('Authorized for professional development');

      // Verify quota deduction (2 days deducted from annual quota)
      const updatedProfile = await crmService.getEmployeeById(empId, adminReviewerId);
      expect(updatedProfile?.annual_leave_quota).toBe(startingAnnualQuota - 2);
    });

    it('restores employee quota when an approved leave is cancelled', async () => {
      const empId = 'user-ops-005';
      const adminReviewerId = 'user-founder-001';

      const initialProfile = await crmService.getEmployeeById(empId, adminReviewerId);
      const startingQuota = initialProfile?.annual_leave_quota || 18;

      const leave = await crmService.applyLeave({
        user_id: empId,
        leave_type: 'annual',
        duration_type: 'full_day',
        start_date: '2026-12-01',
        end_date: '2026-12-03',
        days_count: 3,
        reason: 'Vacation'
      });

      await crmService.reviewLeave(leave.id, 'approved', 'Approved', adminReviewerId);
      const afterApproval = await crmService.getEmployeeById(empId, adminReviewerId);
      expect(afterApproval?.annual_leave_quota).toBe(startingQuota - 3);

      // Cancel the leave
      await crmService.cancelLeave(leave.id, empId);
      const afterCancel = await crmService.getEmployeeById(empId, adminReviewerId);
      expect(afterCancel?.annual_leave_quota).toBe(startingQuota);
    });
  });

  // TEST CRITERION 4: Attendance records cannot be fabricated by modifying client requests
  describe('Test Criterion 4: Attendance Security & Prevention of Fraudulent Requests', () => {
    it('prevents duplicate check-in on the same calendar day', async () => {
      // user-ops-005 is NOT clocked in initially today
      const empId = 'user-ops-005';

      // First clock in succeeds
      const clockInRecord = await crmService.clockIn(empId, 'Morning start');
      expect(clockInRecord.clock_in).toBeDefined();

      // Second clock in on the same day MUST be rejected
      await expect(
        crmService.clockIn(empId, 'Duplicate clock in attempt')
      ).rejects.toThrow(/Duplicate Check-in Error: You have already clocked in today/);
    });

    it('prevents check-out without prior clock-in or duplicate check-out', async () => {
      const empId = 'user-ops-005';

      // Attempting to clock out without clocking in first
      await expect(
        crmService.clockOut(empId)
      ).rejects.toThrow(/Invalid Check-out: You have not clocked in today yet/);

      // Now clock in properly
      await crmService.clockIn(empId);

      // First clock out succeeds
      const outRecord = await crmService.clockOut(empId, 'Completed sprint tasks');
      expect(outRecord.clock_out).toBeDefined();

      // Second clock out MUST be rejected
      await expect(
        crmService.clockOut(empId)
      ).rejects.toThrow(/Invalid Check-out: You have already clocked out today/);
    });

    it('prohibits non-administrator employees from regularizing attendance records', async () => {
      const nonAdminId = 'user-sales-002';
      const targetDate = new Date().toISOString().split('T')[0];

      await expect(
        crmService.regularizeAttendance(nonAdminId, {
          user_id: nonAdminId,
          date: targetDate,
          clock_in: '09:00:00',
          clock_out: '18:00:00',
          correction_reason: 'Fabricated adjustment attempt'
        })
      ).rejects.toThrow(/Unauthorized: Only an authorized administrator can regularize attendance records/);
    });

    it('requires a mandatory audit reason when an administrator regularizes attendance', async () => {
      const adminId = 'user-founder-001';
      const targetDate = '2026-10-15';

      await expect(
        crmService.regularizeAttendance(adminId, {
          user_id: 'user-sales-002',
          date: targetDate,
          clock_in: '09:00:00',
          clock_out: '18:00:00',
          correction_reason: '' // Empty reason
        })
      ).rejects.toThrow(/A valid correction reason is required for attendance regularization audit/);
    });
  });

  // TEST CRITERION 5: Duplicate or overlapping records handled according to company rules
  describe('Test Criterion 5: Overlapping Records and Business Rules Enforcement', () => {
    it('rejects overlapping leave requests for an employee', async () => {
      const empId = 'user-eng-003';

      // Initial leave request for Nov 10 - Nov 15
      await crmService.applyLeave({
        user_id: empId,
        leave_type: 'annual',
        duration_type: 'full_day',
        start_date: '2026-11-10',
        end_date: '2026-11-15',
        reason: 'Vacation leave'
      });

      // Overlapping request Nov 12 - Nov 18 MUST be rejected
      await expect(
        crmService.applyLeave({
          user_id: empId,
          leave_type: 'sick',
          duration_type: 'full_day',
          start_date: '2026-11-12',
          end_date: '2026-11-18',
          reason: 'Overlapping request'
        })
      ).rejects.toThrow(/Leave Overlap Conflict: You already have a pending leave request from 2026-11-10 to 2026-11-15/);
    });

    it('rejects leave applications with invalid date ordering', async () => {
      await expect(
        crmService.applyLeave({
          user_id: 'user-sales-002',
          leave_type: 'annual',
          duration_type: 'full_day',
          start_date: '2026-11-20',
          end_date: '2026-11-10', // End date before start date
          reason: 'Invalid chronology'
        })
      ).rejects.toThrow(/Invalid Dates: Start date cannot be after end date/);
    });

    it('accurately exports attendance records to standard CSV format', () => {
      const csv = crmService.exportAttendanceCsv();
      expect(typeof csv).toBe('string');
      expect(csv).toContain('Date,Employee ID,Employee Name,Department,Clock In,Clock Out,Total Hours,Status,Late Arrival,Early Departure,Notes,Correction Reason,Corrected By');
      expect(csv.split('\r\n').length).toBeGreaterThan(1);
    });

    it('allows administrators to configure company holidays and manage archive status', async () => {
      const adminId = 'user-founder-001';

      // Add a holiday
      const holiday = await crmService.addHoliday({
        title: 'Vingo Innovation Day',
        date: '2026-10-31',
        description: 'Company-wide hackathon and paid observance',
        is_mandatory: true
      }, adminId);

      expect(holiday.title).toBe('Vingo Innovation Day');

      // Archive the holiday
      await crmService.archiveHoliday(holiday.id, adminId);
      const activeHolidays = await crmService.getHolidays(false);
      expect(activeHolidays.some((h) => h.id === holiday.id)).toBe(false);

      const allHolidaysIncludingArchived = await crmService.getHolidays(true);
      expect(allHolidaysIncludingArchived.some((h) => h.id === holiday.id && h.is_archived)).toBe(true);
    });
  });
});

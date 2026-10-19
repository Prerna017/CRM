import { describe, it, expect, beforeEach } from 'vitest';
import { crmService } from '../services/crmService';
import { rateLimiter } from '../lib/rateLimiter';
import { validateFile } from '../lib/fileValidation';
import {
  sanitizeAuditPayload,
  maskEmail,
  maskPhone,
  timingSafeEqual,
  evaluatePasswordComplexity
} from '../lib/security';
import {
  EmployeeProvisionSchema,
  ProfileUpdateSchema,
  LeaveApplicationSchema,
  LeadSchema,
  sanitizeString
} from '../lib/validationSchemas';
import { UserProfile, Lead } from '../types/database';

describe('PHASE 07: Comprehensive Security, Testing & Workflow Verification', () => {
  beforeEach(async () => {
    localStorage.clear();
    crmService.resetState();
  });

  // --------------------------------------------------------------------------
  // Workflow 1: Founder creates an employee account
  // --------------------------------------------------------------------------
  it('1. Founder successfully provisions a new employee account with audit logging', async () => {
    const founder = (await crmService.getEmployees()).find((p) => p.role === 'founder_admin')!;
    expect(founder).toBeDefined();

    const newEmpData: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'> = {
      employee_id: 'EMP-9901',
      name: 'Jordan Taylor',
      email: 'jordan.taylor@vingo.internal',
      role: 'employee',
      department: 'Enterprise Sales',
      title: 'Strategic Account Executive',
      join_date: '2026-10-19',
      work_location: 'Headquarters',
      status: 'active',
      salary: 115000,
      emergency_contact_name: 'Pat Taylor',
      emergency_contact_phone: '+1 555-0991',
      annual_leave_quota: 20,
      sick_leave_quota: 10,
      casual_leave_quota: 5,
    };

    // Validate with Zod schema
    const validated = EmployeeProvisionSchema.parse(newEmpData);
    expect(validated.name).toBe('Jordan Taylor');

    const created = await crmService.provisionEmployee(founder.id, newEmpData);
    expect(created.id).toBeDefined();
    expect(created.email).toBe('jordan.taylor@vingo.internal');

    // Verify audit log record
    const auditLogs = await crmService.getAuditLogs(founder.id, { action: 'employee_created' });
    const log = auditLogs.find((l) => l.target_id === created.id);
    expect(log).toBeDefined();
    expect(log?.actor_id).toBe(founder.id);
    expect(log?.actor_role).toBe('founder_admin');
  });

  // --------------------------------------------------------------------------
  // Workflow 2: Employee logs in and views their permitted information (with masking)
  // --------------------------------------------------------------------------
  it('2. Employee views own full profile, but peer views have sensitive compensation/emergency details masked', async () => {
    const employees = await crmService.getEmployees();
    const repAlex = employees.find((p) => p.email === 'alex@vingo.com')!;
    const repSarah = employees.find((p) => p.email === 'sarah@vingo.com')!;

    // Alex viewing own profile: full details accessible
    const alexOwnProfile = await crmService.getEmployeeById(repAlex.id, repAlex.id);
    expect(alexOwnProfile?.salary).toBeDefined();
    expect(alexOwnProfile?.emergency_contact_phone).toBeDefined();

    // Sarah viewing Alex's profile: sensitive fields are strictly masked
    const alexAsSeenBySarah = await crmService.getEmployeeById(repAlex.id, repSarah.id);
    expect(alexAsSeenBySarah?.salary).toBeUndefined();
    expect(alexAsSeenBySarah?.emergency_contact_name).toBeUndefined();
    expect(alexAsSeenBySarah?.emergency_contact_phone).toBeUndefined();

    // Sarah cannot edit prohibited fields on own profile
    await expect(
      crmService.updateProfile(repSarah.id, repSarah.id, { role: 'founder_admin' } as any)
    ).rejects.toThrow(/Unauthorized/);
  });

  // --------------------------------------------------------------------------
  // Workflow 3: Employee checks in and checks out
  // --------------------------------------------------------------------------
  it('3. Employee checks in and checks out, updating working hours and status', async () => {
    const rep = (await crmService.getEmployees()).find((p) => p.email === 'rahul@vingo.com')!;

    // Clock in
    const checkInRecord = await crmService.clockIn(rep.id, 'Standard morning check-in');
    expect(checkInRecord.user_id).toBe(rep.id);
    expect(checkInRecord.clock_in).toBeDefined();
    expect(checkInRecord.clock_out).toBeNull();
    expect(['present', 'late']).toContain(checkInRecord.status);

    // Duplicate check-in is rejected
    await expect(crmService.clockIn(rep.id)).rejects.toThrow(/Duplicate Check-in Error/);

    // Clock out
    const checkOutRecord = await crmService.clockOut(rep.id, 'Shift concluded');
    expect(checkOutRecord.clock_out).toBeDefined();
    expect(checkOutRecord.total_hours).toBeGreaterThanOrEqual(0);

    // Duplicate check-out is rejected
    await expect(crmService.clockOut(rep.id)).rejects.toThrow(/already clocked out/);
  });

  // --------------------------------------------------------------------------
  // Workflow 4 & 5: Employee applies for leave, Founder approves or rejects
  // --------------------------------------------------------------------------
  it('4 & 5. Employee applies for leave; Founder reviews and approves; self-approval is rejected', async () => {
    const founder = (await crmService.getEmployees()).find((p) => p.role === 'founder_admin')!;
    const rep = (await crmService.getEmployees()).find((p) => p.email === 'alex@vingo.com')!;
    const initialAnnualQuota = rep.annual_leave_quota;

    // Apply for leave with Zod validation
    const leaveInput = {
      leave_type: 'annual' as const,
      start_date: '2026-11-10',
      end_date: '2026-11-12',
      reason: 'Family annual vacation trip',
    };
    LeaveApplicationSchema.parse(leaveInput);

    const leave = await crmService.applyLeave({
      user_id: rep.id,
      leave_type: 'annual',
      start_date: '2026-11-10',
      end_date: '2026-11-12',
      reason: 'Family annual vacation trip',
      duration_type: 'full_day',
    });

    expect(leave.status).toBe('pending');
    expect(leave.days_count).toBe(3);

    // Security check: Employee cannot approve own leave
    await expect(
      crmService.reviewLeave(leave.id, 'approved', 'Self approval test', rep.id)
    ).rejects.toThrow(/cannot approve or reject their own leave/);

    // Founder approves leave
    const reviewed = await crmService.reviewLeave(leave.id, 'approved', 'Approved by leadership', founder.id);
    expect(reviewed.status).toBe('approved');
    expect(reviewed.reviewed_by).toBe(founder.id);

    // Verify leave quota was decremented accurately
    const updatedRep = await crmService.getEmployeeById(rep.id);
    expect(updatedRep?.annual_leave_quota).toBe(initialAnnualQuota - 3);

    // Verify audit entry created
    const leaveAudits = await crmService.getAuditLogs(founder.id, { action: 'leave_approved' });
    expect(leaveAudits.some((l) => l.target_id === leave.id)).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Workflow 6: Holiday and attendance views update correctly
  // --------------------------------------------------------------------------
  it('6. Holiday calendar and attendance views accurately reflect approved leaves and holidays', async () => {
    const holidays = await crmService.getHolidays();
    expect(holidays.length).toBeGreaterThan(0);
    expect(holidays.some((h) => h.is_mandatory)).toBe(true);

    const employees = await crmService.getEmployees();
    const rep = employees.find((p) => p.email === 'elena@vingo.com')!;
    const today = new Date().toISOString().split('T')[0];

    // Apply & approve leave for today
    const todayLeave = await crmService.applyLeave({
      user_id: rep.id,
      leave_type: 'sick',
      start_date: today,
      end_date: today,
      reason: 'Medical appointment',
      duration_type: 'full_day',
    });
    const founder = employees.find((p) => p.role === 'founder_admin')!;
    await crmService.reviewLeave(todayLeave.id, 'approved', 'Approved medical leave', founder.id);

    // Attendance view reflects on_leave status
    const attendance = await crmService.getTodayAttendance(rep.id);
    const repToday = attendance.allToday.find((a) => a.user_id === rep.id);
    expect(repToday?.status).toBe('on_leave');
  });

  // --------------------------------------------------------------------------
  // Workflow 7 & 8: Founder publishes notice & policy; Employee acknowledges policy
  // --------------------------------------------------------------------------
  it('7 & 8. Founder publishes notice and policy; employee reads notice and acknowledges policy version', async () => {
    const founder = (await crmService.getEmployees()).find((p) => p.role === 'founder_admin')!;
    const rep = (await crmService.getEmployees()).find((p) => p.email === 'alex@vingo.com')!;

    // 1. Publish Notice
    const notice = await crmService.createAnnouncement({
      title: 'Q4 Global Security Directive',
      message: 'All personnel must enforce 2FA and review client data protection policies.',
      content: 'All personnel must enforce 2FA and review client data protection policies.',
      category: 'Security',
      priority: 'urgent',
      created_by: founder.id,
      requires_acknowledgement: true,
      status: 'published',
      published_at: new Date().toISOString(),
    });
    expect(notice.id).toBeDefined();

    // Employee acknowledges notice
    const noticeAck = await crmService.acknowledgeNotice(notice.id, rep.id);
    expect(noticeAck).toBeDefined();

    // 2. Publish Policy
    const policy = await crmService.createPolicy({
      title: 'Data Protection and CRM Exclusivity Policy 2026',
      category: 'Data security',
      content: 'Standards regarding customer PII protection and lead lock ownership rules.',
      created_by: founder.id,
      version: '1.0',
      status: 'published',
      effective_date: '2026-10-19',
    });
    expect(policy.id).toBeDefined();

    // Employee acknowledges policy version 1.0
    const ack = await crmService.acknowledgePolicy(policy.id, '1.0', rep.id);
    expect(ack.policy_id).toBe(policy.id);
    expect(ack.version).toBe('1.0');
    expect(ack.user_id).toBe(rep.id);

    // Audit logs verify both publications
    const policyAudits = await crmService.getAuditLogs(founder.id, { action: 'policy_published' });
    expect(policyAudits.some((l) => l.target_id === policy.id)).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Workflows 9, 10, 11, 12: Dead lead claiming, exclusivity lock rejection, unlock, and re-claim
  // --------------------------------------------------------------------------
  it('9 to 12. Dead lead claiming workflow: Rep 1 claims (locks), Rep 2 rejected, Rep 1 unlocks, Rep 2 claims', async () => {
    const employees = await crmService.getEmployees();
    const rep1 = employees.find((p) => p.email === 'alex@vingo.com')!;
    const rep2 = employees.find((p) => p.email === 'sarah@vingo.com')!;

    // Create a dormant dead lead
    const deadLead = await crmService.createLead({
      title: 'Stagnant Enterprise Pipeline',
      company: 'Dormant Logistics Corp',
      value: 65000,
      currency: 'USD',
      stage: 'lost',
      contact_name: 'David Vance',
      contact_email: 'david@dormantlogistics.internal',
      source: 'inbound',
      priority: 'medium',
      is_dead: true,
      is_locked: false,
      locked_by: null,
      claimed_by: null,
      created_by: rep1.id,
    });
    expect(deadLead.is_dead).toBe(true);
    expect(deadLead.is_locked).toBe(false);

    // Step 9: Rep 1 claims the dead lead
    const claimedByRep1 = await crmService.claimDeadLead(deadLead.id, rep1.id);
    expect(claimedByRep1.is_dead).toBe(false);
    expect(claimedByRep1.is_locked).toBe(true);
    expect(claimedByRep1.locked_by).toBe(rep1.id);
    expect(claimedByRep1.assigned_to).toBe(rep1.id);

    // Step 10: Rep 2 attempts to claim the locked lead and is REJECTED
    await expect(crmService.claimDeadLead(deadLead.id, rep2.id)).rejects.toThrow(
      /Lead is currently locked by another sales representative/
    );

    // Step 11: Rep 1 unlocks the lead (relinquishes exclusivity lock)
    const unlockedLead = await crmService.unlockDeadLead(deadLead.id, rep1.id);
    expect(unlockedLead.is_locked).toBe(false);
    expect(unlockedLead.locked_by).toBeNull();

    // Mark as dead again to simulate rep releasing it back to pool
    await crmService.updateLeadStage(deadLead.id, 'lost', rep1.id);
    await crmService.updateLead(deadLead.id, { is_dead: true });

    // Step 12: Rep 2 successfully claims the now-available lead
    const claimedByRep2 = await crmService.claimDeadLead(deadLead.id, rep2.id);
    expect(claimedByRep2.is_locked).toBe(true);
    expect(claimedByRep2.locked_by).toBe(rep2.id);
    expect(claimedByRep2.assigned_to).toBe(rep2.id);
  });

  // --------------------------------------------------------------------------
  // Workflow 13: Employees record replies and schedule follow-ups
  // --------------------------------------------------------------------------
  it('13. Representative records email reply, auto-advances stage, and schedules follow-up task', async () => {
    const rep = (await crmService.getEmployees()).find((p) => p.email === 'alex@vingo.com')!;

    // Create lead and outbound email log
    const lead = await crmService.createLead({
      title: 'Cloud Optimization Opportunity',
      company: 'Zenith Retail Corp',
      value: 80000,
      currency: 'USD',
      stage: 'new',
      contact_name: 'Rachel Zane',
      contact_email: 'rachel@zenithretail.internal',
      source: 'cold_outreach',
      priority: 'high',
      assigned_to: rep.id,
      created_by: rep.id,
    });

    const emailLog = await crmService.createEmailLog({
      lead_id: lead.id,
      recipient_email: 'rachel@zenithretail.internal',
      subject: 'Introductory Enterprise Consultation',
      message_content: 'Hello Rachel, reaching out regarding infrastructure modernization.',
      sent_at: new Date().toISOString(),
      reply_received: false,
    }, rep.id);

    // Record incoming reply
    const followUpDate = '2026-10-25T14:00:00Z';
    const updatedLog = await crmService.recordEmailReply(
      emailLog.id,
      {
        reply_content: 'We are very interested. Could we schedule a demo call on Monday?',
        reply_category: 'Meeting Requested',
        next_follow_up_date: followUpDate,
        notes: 'Prospect confirmed budget approval.',
      },
      rep.id
    );

    expect(updatedLog.reply_received).toBe(true);
    expect(updatedLog.reply_category).toBe('Meeting Requested');

    // Lead stage auto-advanced from new to contacted
    const updatedLead = (await crmService.getLeadById(lead.id))?.lead;
    expect(updatedLead?.stage).toBe('contacted');

    // Follow-up was auto-scheduled
    const followUps = await crmService.getFollowUps(rep.id);
    const createdFollowUp = followUps.find((f) => f.lead_id === lead.id);
    expect(createdFollowUp).toBeDefined();
    expect(createdFollowUp?.due_date).toBe(followUpDate);
  });

  // --------------------------------------------------------------------------
  // Workflow 14: Notifications and audit logs update accurately
  // --------------------------------------------------------------------------
  it('14. Notifications and audit logs reflect system activities and maintain user isolation', async () => {
    const employees = await crmService.getEmployees();
    const founder = employees.find((p) => p.role === 'founder_admin')!;
    const repAlex = employees.find((p) => p.email === 'alex@vingo.com')!;
    const repSarah = employees.find((p) => p.email === 'sarah@vingo.com')!;

    // Send private notification to Alex
    await crmService.createNotification({
      user_id: repAlex.id,
      title: 'Confidential Commission Report',
      message: 'Your quarterly performance bonus has been disbursed.',
      type: 'followup_due',
      link: '/reports',
    });

    // Alex can read own notification
    const alexNotifications = await crmService.getNotifications(repAlex.id);
    expect(alexNotifications.some((n) => n.title.includes('Confidential Commission'))).toBe(true);

    // Sarah CANNOT see Alex's private notification
    const sarahNotifications = await crmService.getNotifications(repSarah.id);
    expect(sarahNotifications.some((n) => n.title.includes('Confidential Commission'))).toBe(false);

    // Audit log records exist
    const allAudits = await crmService.getAuditLogs(founder.id);
    expect(allAudits.length).toBeGreaterThan(0);
  });

  // --------------------------------------------------------------------------
  // Workflow 15: Unauthorized users attempt direct API & database operations
  // --------------------------------------------------------------------------
  it('15. Security defenses reject self-promotion, peer data modification, deactivated access, and rate limit abuse', async () => {
    const employees = await crmService.getEmployees();
    const rep = employees.find((p) => p.email === 'alex@vingo.com')!;
    const targetPeer = employees.find((p) => p.email === 'sarah@vingo.com')!;

    // A. Unauthorized role self-promotion is blocked
    await expect(
      crmService.assignRole(rep.id, rep.id, 'founder_admin')
    ).rejects.toThrow(/Unauthorized: Only an authorized administrator/);

    // B. Non-admin attempting to create an employee account is blocked
    await expect(
      crmService.provisionEmployee(rep.id, {
        employee_id: 'HACK-01',
        name: 'Injected User',
        email: 'hacker@vingo.internal',
        role: 'admin',
        department: 'IT',
        title: 'Unauthorized Admin',
        join_date: '2026-10-19',
        work_location: 'Remote',
        status: 'active',
        annual_leave_quota: 30,
        sick_leave_quota: 10,
        casual_leave_quota: 5,
      })
    ).rejects.toThrow(/Unauthorized: Only an authorized administrator/);

    // C. Non-admin attempting to regularize attendance is blocked
    await expect(
      crmService.regularizeAttendance(rep.id, {
        user_id: rep.id,
        date: '2026-10-18',
        clock_in: '09:00:00',
        clock_out: '18:00:00',
        correction_reason: 'I want extra hours',
      })
    ).rejects.toThrow(/Unauthorized: Only an authorized administrator/);

    // D. Deactivated account is completely blocked from operations
    const deactivatedEmp = employees.find((p) => p.status === 'deactivated');
    if (deactivatedEmp) {
      await expect(
        crmService.clockIn(deactivatedEmp.id)
      ).rejects.toThrow(/Unauthorized: Deactivated account/);

      await expect(
        crmService.applyLeave({
          user_id: deactivatedEmp.id,
          leave_type: 'casual',
          start_date: '2026-11-01',
          end_date: '2026-11-02',
          reason: 'Test after deactivation',
          duration_type: 'full_day',
        })
      ).rejects.toThrow(/Unauthorized: Deactivated account/);
    }

    // E. Rate Limiter blocks abusive dead-lead claims
    rateLimiter.resetLimit(`crm:claim:${rep.id}`);
    for (let i = 0; i < 10; i++) {
      rateLimiter.recordLeadClaim(rep.id);
    }
    const rateCheck = rateLimiter.checkLeadClaim(rep.id);
    expect(rateCheck.allowed).toBe(false);
    expect(rateCheck.retryAfterSeconds).toBeGreaterThan(0);

    // F. Malicious file validation rejects executable upload
    const exeResult = validateFile(
      { name: 'trojan_payload.exe', size: 1024, type: 'application/x-msdownload' },
      'document'
    );
    expect(exeResult.valid).toBe(false);
    expect(exeResult.error).toContain('prohibited');

    // G. Oversized avatar file rejected (> 2MB)
    const bigAvatar = validateFile(
      { name: 'massive_photo.png', size: 5 * 1024 * 1024, type: 'image/png' },
      'avatar'
    );
    expect(bigAvatar.valid).toBe(false);
    expect(bigAvatar.error).toContain('exceeds maximum');

    // H. Audit log sanitizer redacts passwords, tokens, and masks emails/phones
    const sanitized = sanitizeAuditPayload({
      user_email: 'confidential.client@enterprise.com',
      contact_phone: '+1 555-8833',
      password: 'SuperSecretPassword123!',
      access_token: 'bearer_token_xyz',
      salary: 150000,
    });
    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.access_token).toBe('[REDACTED]');
    expect(sanitized.user_email).toMatch(/^c\*+t@enterprise\.com$/);
    expect(sanitized.contact_phone).toContain('****33');

    // I. Timing-safe string comparison
    expect(timingSafeEqual('correct_hash', 'correct_hash')).toBe(true);
    expect(timingSafeEqual('correct_hash', 'wrong_hash123')).toBe(false);

    // J. Password complexity evaluator
    const weakPass = evaluatePasswordComplexity('weak');
    expect(weakPass.valid).toBe(false);
    const strongPass = evaluatePasswordComplexity('VingoStrong#2026!');
    expect(strongPass.valid).toBe(true);
  });
});

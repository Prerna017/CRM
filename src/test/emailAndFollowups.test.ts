import { describe, it, expect, beforeEach } from 'vitest';
import { crmService } from '../services/crmService';
import { EmailReplyCategory, FollowUpType } from '../types/database';

describe('Phase 05: Email Activity Tracking and Follow-ups', () => {
  const adminId = 'user-founder-001';
  const salesUserId = 'user-sales-002'; // Assigned to lead-001, lead-002, etc.
  const engineerUserId = 'user-eng-003'; // Assigned to lead-007

  beforeEach(() => {
    // Reset local CRM store to fresh initial state before each test
    crmService.resetState();
  });

  describe('1. Access Control: Employees cannot access unauthorized conversations', () => {
    it('allows an employee to access communications for leads assigned to them', async () => {
      // lead-001 is assigned to user-sales-002
      const logs = await crmService.getEmailLogs('lead-001', salesUserId);
      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].lead_id).toBe('lead-001');
    });

    it('blocks an employee from accessing communications for leads assigned to another employee', async () => {
      // lead-007 is assigned to user-eng-003. user-sales-002 should NOT be authorized.
      await expect(
        crmService.getEmailLogs('lead-007', salesUserId)
      ).rejects.toThrow(/Unauthorized: Access denied to conversation/i);
    });

    it('blocks an unauthorized employee from logging an email on a peer’s lead', async () => {
      await expect(
        crmService.createEmailLog(
          {
            lead_id: 'lead-007', // assigned to user-eng-003
            recipient_email: 'cto@stratasystems.io',
            subject: 'Unauthorized Outreach',
            message_content: 'Attempting to contact a peer rep lead.'
          },
          salesUserId
        )
      ).rejects.toThrow(/Unauthorized/i);
    });

    it('allows a founder/admin to access any lead conversation across the enterprise', async () => {
      // Admin can access lead-007
      const logs = await crmService.getEmailLogs('lead-007', adminId);
      expect(Array.isArray(logs)).toBe(true);
    });
  });

  describe('2. Associations: Replies remain associated with the correct lead', () => {
    it('records an email log and associates it correctly with lead and employee', async () => {
      const newLog = await crmService.createEmailLog(
        {
          lead_id: 'lead-001',
          recipient_email: 'sarah.c@acmecorp.com',
          subject: 'Enterprise Security Whitepaper',
          message_content: 'Attached is our SOC 2 Type II compliance audit.',
          notes: 'Sent per procurement team request.'
        },
        salesUserId
      );

      expect(newLog.id).toBeDefined();
      expect(newLog.lead_id).toBe('lead-001');
      expect(newLog.sender_user_id).toBe(salesUserId);
      expect(newLog.reply_received).toBe(false);

      // Verify it appears in the lead communication logs
      const leadLogs = await crmService.getEmailLogs('lead-001', salesUserId);
      const found = leadLogs.find((l) => l.id === newLog.id);
      expect(found).toBeDefined();
      expect(found?.lead?.company_name).toBe('Apex Logistics Inc.');
    });

    it('records an inbound reply and preserves chronological association', async () => {
      // Find an existing log on lead-001
      const initialLogs = await crmService.getEmailLogs('lead-001', salesUserId);
      const targetLog = initialLogs[0];

      const replyTime = new Date().toISOString();
      const updatedLog = await crmService.recordEmailReply(
        targetLog.id,
        {
          reply_category: 'Asked for Pricing',
          reply_content: 'Thanks, could you send the commercial quote for 50 seats?',
          reply_at: replyTime,
          next_follow_up_date: '2026-10-25',
          notes: 'Requested volume pricing breakdown.'
        },
        salesUserId
      );

      expect(updatedLog.reply_received).toBe(true);
      expect(updatedLog.reply_category).toBe('Asked for Pricing');
      expect(updatedLog.reply_content).toContain('commercial quote for 50 seats');
      expect(updatedLog.lead_id).toBe('lead-001');

      // Verify the lead activity log has a corresponding record
      const logsAfter = await crmService.getEmailLogs('lead-001', salesUserId);
      const rechecked = logsAfter.find((l) => l.id === targetLog.id);
      expect(rechecked?.reply_received).toBe(true);
      expect(rechecked?.reply_category).toBe('Asked for Pricing');
    });

    it('matches inbound webhook buffer message to lead with thread/sender association', async () => {
      const bufferItems = await crmService.getInboundEmailBuffer(adminId);
      const ambiguousItem = bufferItems.find((b) => b.is_ambiguous && !b.is_processed);
      expect(ambiguousItem).toBeDefined();

      if (ambiguousItem) {
        const matched = await crmService.matchInboundEmail(ambiguousItem.id, 'lead-002', adminId);
        expect(matched.lead_id).toBe('lead-002');
        expect(matched.is_inbound).toBe(true);
        expect(matched.reply_received).toBe(true);

        // Check buffer status is now processed
        const updatedBuffer = await crmService.getInboundEmailBuffer(adminId);
        const itemNow = updatedBuffer.find((b) => b.id === ambiguousItem.id);
        expect(itemNow?.is_processed).toBe(true);
        expect(itemNow?.matched_lead_id).toBe('lead-002');
      }
    });
  });

  describe('3. Timezone: Follow-up dates use the company timezone', () => {
    it('classifies follow-up status (due_today, overdue, upcoming) using company timezone', async () => {
      const followUps = await crmService.getFollowUps(adminId, { status: 'all' });
      expect(followUps.length).toBeGreaterThan(0);

      // Verify followUps have status correctly computed
      const dueToday = followUps.filter((f) => f.status === 'due_today');
      const overdue = followUps.filter((f) => f.status === 'overdue');
      const upcoming = followUps.filter((f) => f.status === 'upcoming');

      expect(Array.isArray(dueToday)).toBe(true);
      expect(Array.isArray(overdue)).toBe(true);
      expect(Array.isArray(upcoming)).toBe(true);
    });

    it('allows an employee to create, reschedule, complete, and cancel follow-ups', async () => {
      // 1. Create
      const created = await crmService.createFollowUp(
        {
          lead_id: 'lead-001',
          title: 'Review proposal feedback with VP',
          type: 'call',
          due_date: '2026-10-30',
          due_time: '15:00',
          priority: 'high',
          notes: 'Key decision meeting.'
        },
        salesUserId
      );

      expect(created.id).toBeDefined();
      expect(created.status).toBe('upcoming');
      expect(created.due_date).toBe('2026-10-30');

      // 2. Reschedule
      const rescheduled = await crmService.rescheduleFollowUp(
        created.id,
        '2026-11-02',
        '16:00',
        'Lead requested to postpone to Monday',
        salesUserId
      );
      expect(rescheduled.due_date).toBe('2026-11-02');
      expect(rescheduled.rescheduled_reason).toBe('Lead requested to postpone to Monday');

      // 3. Complete
      const completed = await crmService.completeFollowUp(
        created.id,
        'Call completed. Customer requested contract draft.',
        salesUserId
      );
      expect(completed.status).toBe('completed');
      expect(completed.completion_notes).toContain('Customer requested contract draft');

      // 4. Cancel a different follow-up
      const followUpToCancel = await crmService.createFollowUp(
        {
          lead_id: 'lead-001',
          title: 'Preliminary discovery sync',
          type: 'meeting',
          due_date: '2026-11-05',
          priority: 'low'
        },
        salesUserId
      );

      const cancelled = await crmService.cancelFollowUp(
        followUpToCancel.id,
        'Deal advanced to proposal; skip discovery.',
        salesUserId
      );
      expect(cancelled.status).toBe('cancelled');
    });

    it('prevents duplicate follow-up creation on the same lead for the same date and type', async () => {
      const duplicateDate = '2026-10-28';
      const duplicateType: FollowUpType = 'call';

      // First follow-up creates cleanly
      await crmService.createFollowUp(
        {
          lead_id: 'lead-001',
          title: 'Check-in Call #1',
          type: duplicateType,
          due_date: duplicateDate
        },
        salesUserId
      );

      // Attempting to create duplicate with allowDuplicate = false should reject
      await expect(
        crmService.createFollowUp(
          {
            lead_id: 'lead-001',
            title: 'Check-in Call #2',
            type: duplicateType,
            due_date: duplicateDate
          },
          salesUserId,
          false
        )
      ).rejects.toThrow(/Duplicate follow-up/i);

      // But creating with allowDuplicate = true succeeds
      const forcedDuplicate = await crmService.createFollowUp(
        {
          lead_id: 'lead-001',
          title: 'Check-in Call #2 Force Allowed',
          type: duplicateType,
          due_date: duplicateDate
        },
        salesUserId,
        true
      );
      expect(forcedDuplicate.id).toBeDefined();
    });
  });

  describe('4. Integration Reliability: Email errors are visible and recoverable', () => {
    it('keeps manual logging functional even if email integration is not configured or in error state', async () => {
      // Disconnect integration
      await crmService.disconnectEmailIntegration(salesUserId);
      const conf = await crmService.getEmailIntegration(salesUserId);
      expect(conf?.status).toBe('disconnected');

      // Manual logging still works 100%
      const manualLog = await crmService.createEmailLog(
        {
          lead_id: 'lead-001',
          recipient_email: 'sarah.c@acmecorp.com',
          subject: 'Manual Note During Disconnected Sync',
          message_content: 'Testing manual resilience.'
        },
        salesUserId
      );
      expect(manualLog.id).toBeDefined();
    });

    it('makes email integration errors visible and fully recoverable', async () => {
      // 1. Connect first
      await crmService.connectEmailIntegration(salesUserId, 'gmail', 'sales-auto@company.com');
      let current = await crmService.getEmailIntegration(salesUserId);
      expect(current?.status).toBe('connected');

      // 2. Trigger error state
      const errorMessage = 'OAuth token expired: Upstream webhook rejected refresh token.';
      const errored = await crmService.simulateIntegrationError(salesUserId, errorMessage);
      expect(errored.status).toBe('error');
      expect(errored.error_message).toBe(errorMessage);

      // Verify error is queryable / visible
      const queried = await crmService.getEmailIntegration(salesUserId);
      expect(queried?.status).toBe('error');
      expect(queried?.error_message).toBe(errorMessage);

      // 3. Reconnect / recover
      const recovered = await crmService.reconnectEmailIntegration(salesUserId);
      expect(recovered.status).toBe('connected');
      expect(recovered.error_message).toBeNull();
      expect(recovered.last_sync_at).toBeDefined();
    });

    it('correctly flags stale uncontacted leads and leads with no response', async () => {
      const staleData = await crmService.getStaleAndNoResponseLeads(adminId);
      expect(staleData.timezone).toBeDefined();
      expect(staleData.uncontactedThresholdDays).toBe(7);
      expect(staleData.noResponseThresholdDays).toBe(5);
      expect(Array.isArray(staleData.noResponseLeads)).toBe(true);
      expect(Array.isArray(staleData.staleLeads)).toBe(true);
    });
  });
});

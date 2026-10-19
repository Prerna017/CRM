import { describe, it, expect, beforeEach } from 'vitest';
import { crmService, localCrmStore } from '../services/crmService';

describe('Vingo CRM Service Unit Tests', () => {
  it('retrieves pre-seeded employees list for company', async () => {
    const emps = await crmService.getEmployees();
    expect(emps.length).toBeGreaterThanOrEqual(5);
    const founder = emps.find((e) => e.role === 'admin');
    expect(founder).toBeDefined();
    expect(founder?.name).toContain('Prerna Sharma');
  });

  it('retrieves sales leads pipeline', async () => {
    const leads = await crmService.getLeads();
    expect(leads.length).toBeGreaterThanOrEqual(6);
    const hasWonDeal = leads.some((l) => l.stage === 'won');
    expect(hasWonDeal).toBe(true);
  });

  it('creates and transitions a new sales lead stage', async () => {
    const newLead = await crmService.createLead({
      title: 'Enterprise ERP Modernization',
      company: 'Test Corp Global',
      contact_name: 'Test Contact',
      value: 50000,
      currency: 'USD',
      stage: 'new',
      priority: 'high',
      source: 'website',
      assigned_to: 'user-sales-002',
      created_by: 'user-founder-001'
    });

    expect(newLead.id).toBeDefined();
    expect(newLead.stage).toBe('new');

    const updated = await crmService.updateLeadStage(newLead.id, 'won', 'user-sales-002');
    expect(updated.stage).toBe('won');
  });

  it('allows clock-in and clock-out for daily attendance', async () => {
    const today = new Date().toISOString().split('T')[0];
    const emps = await crmService.getEmployees();
    const testEmp = emps[emps.length - 1]; // Operations lead

    const reg = await crmService.regularizeAttendance({
      user_id: testEmp.id,
      date: today,
      clock_in: '09:00:00',
      clock_out: '17:30:00',
      status: 'present',
      total_hours: 8.5
    });

    expect(reg.clock_in).toBe('09:00:00');
    expect(reg.total_hours).toBe(8.5);
  });

  it('manages leave applications and review approval workflow', async () => {
    const app = await crmService.applyLeave({
      user_id: 'user-sales-002',
      leave_type: 'casual',
      start_date: '2026-12-01',
      end_date: '2026-12-02',
      days_count: 2,
      reason: 'Personal family event'
    });

    expect(app.status).toBe('pending');

    const reviewed = await crmService.reviewLeave(app.id, 'approved', 'Approved by Founder', 'user-founder-001');
    expect(reviewed.status).toBe('approved');
    expect(reviewed.admin_remarks).toBe('Approved by Founder');
  });

  it('computes accurate dashboard KPIs', async () => {
    const stats = await crmService.getDashboardStats();
    expect(stats.employees.total).toBeGreaterThanOrEqual(4);
    expect(stats.pipeline.pipelineValue).toBeGreaterThan(0);
    expect(stats.pipeline.stageBreakdown.length).toBe(6);
  });
});

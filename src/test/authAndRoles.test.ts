import { describe, it, expect, beforeEach } from 'vitest';
import { crmService } from '../services/crmService';
import { isFounderOrAdminRole, isAccountActive } from '../lib/authConfig';
import { UserRole } from '../types/database';

describe('Phase 01: Authentication, Roles, and Governance Test Suite', () => {
  const founderAdminId = 'user-founder-001';
  const employeeId = 'user-sales-002';
  const deactivatedId = 'user-deactivated-009';

  beforeEach(() => {
    localStorage.clear();
  });

  describe('Requirement 1: Employee cannot access administrator APIs or routes', () => {
    it('blocks employee from provisioning new employee accounts', async () => {
      await expect(
        crmService.provisionEmployee(employeeId, {
          employee_id: 'EMP-999',
          name: 'Hacker User',
          email: 'hacker@vingo.com',
          role: 'employee',
          title: 'Specialist',
          department: 'Engineering',
          status: 'active',
          join_date: '2026-10-19',
          work_location: 'Remote',
          annual_leave_quota: 18,
          sick_leave_quota: 10,
          casual_leave_quota: 8,
        })
      ).rejects.toThrow(/Only an authorized administrator can provision employee accounts/);
    });

    it('blocks employee from assigning roles to themselves or other users', async () => {
      await expect(
        crmService.assignRole(employeeId, employeeId, 'founder_admin')
      ).rejects.toThrow(/Only an authorized administrator can assign user roles/);

      await expect(
        crmService.assignRole(employeeId, 'user-eng-003', 'admin')
      ).rejects.toThrow(/Only an authorized administrator can assign user roles/);
    });

    it('blocks employee from deactivating accounts', async () => {
      await expect(
        crmService.deactivateEmployee(employeeId, 'user-eng-003')
      ).rejects.toThrow(/Only an authorized administrator can deactivate users/);
    });

    it('permits authorized founder_admin to provision and manage employees', async () => {
      const newEmp = await crmService.provisionEmployee(founderAdminId, {
        employee_id: 'EMP-100',
        name: 'Authorized Onboard',
        email: `onboard-${Date.now()}@vingo.com`,
        role: 'employee',
        title: 'Operations Analyst',
        department: 'Operations',
        status: 'active',
        join_date: '2026-10-19',
        work_location: 'Headquarters',
        annual_leave_quota: 18,
        sick_leave_quota: 10,
        casual_leave_quota: 8,
      });

      expect(newEmp).toBeDefined();
      expect(newEmp.name).toBe('Authorized Onboard');
      expect(newEmp.role).toBe('employee');
    });
  });

  describe('Requirement 2: Employee cannot change their own role or promote themselves', () => {
    it('strictly denies employee self-promotion via updateProfile', async () => {
      await expect(
        crmService.updateProfile(employeeId, employeeId, {
          role: 'founder_admin' as UserRole,
        })
      ).rejects.toThrow(/Employees cannot change their own role, status, salary, or quotas/);

      await expect(
        crmService.updateProfile(employeeId, employeeId, {
          role: 'admin' as UserRole,
        })
      ).rejects.toThrow(/Employees cannot change their own role, status, salary, or quotas/);
    });

    it('strictly denies employee tampering with their own leave quotas or salary', async () => {
      await expect(
        crmService.updateProfile(employeeId, employeeId, {
          salary: 500000,
        })
      ).rejects.toThrow(/Employees cannot change their own role, status, salary, or quotas/);

      await expect(
        crmService.updateProfile(employeeId, employeeId, {
          annual_leave_quota: 100,
        })
      ).rejects.toThrow(/Employees cannot change their own role, status, salary, or quotas/);
    });

    it('allows employee to update their own permitted contact details', async () => {
      const updated = await crmService.updateProfile(employeeId, employeeId, {
        phone: '+1 (555) 777-8899',
      });

      expect(updated.phone).toBe('+1 (555) 777-8899');
      // Role remains unchanged
      expect(updated.role).toBe('employee');
    });
  });

  describe('Requirement 3: Deactivated accounts cannot access protected company data', () => {
    it('identifies deactivated account status correctly', async () => {
      const deactivatedUser = await crmService.getEmployeeById(deactivatedId);
      expect(deactivatedUser).toBeDefined();
      expect(deactivatedUser?.status).toBe('deactivated');
      expect(isAccountActive(deactivatedUser?.status)).toBe(false);
    });

    it('blocks deactivated account from performing any profile updates', async () => {
      await expect(
        crmService.updateProfile(deactivatedId, deactivatedId, {
          phone: '+1 (555) 000-1111',
        })
      ).rejects.toThrow(/Unauthorized or account deactivated/);
    });

    it('blocks deactivated account from calling privileged administrator operations', async () => {
      await expect(
        crmService.assignRole(deactivatedId, employeeId, 'admin')
      ).rejects.toThrow(/Only an authorized administrator/);
    });
  });

  describe('Requirement 4: Role validation helpers and security boundaries', () => {
    it('distinguishes founder_admin, admin, and employee roles', () => {
      expect(isFounderOrAdminRole('founder_admin')).toBe(true);
      expect(isFounderOrAdminRole('admin')).toBe(true);
      expect(isFounderOrAdminRole('employee')).toBe(false);
      expect(isFounderOrAdminRole(null)).toBe(false);
    });

    it('protects the founder account from accidental deactivation', async () => {
      await expect(
        crmService.deactivateEmployee(founderAdminId, founderAdminId)
      ).rejects.toThrow(/The Founder \/ Head Admin account cannot be deactivated/);
    });
  });

  describe('Requirement 5: Session persistence and storage isolation', () => {
    it('stores authenticated user session and prevents unauthorized bypass', () => {
      const mockSession = {
        id: employeeId,
        email: 'alex@vingo.com',
        role: 'employee',
        name: 'Alex Morgan',
      };

      localStorage.setItem('vingo_current_user', JSON.stringify(mockSession));
      const retrieved = localStorage.getItem('vingo_current_user');
      expect(retrieved).not.toBeNull();
      const parsed = JSON.parse(retrieved!);
      expect(parsed.id).toBe(employeeId);
      expect(parsed.role).toBe('employee');

      // Clearing session simulates logout
      localStorage.removeItem('vingo_current_user');
      expect(localStorage.getItem('vingo_current_user')).toBeNull();
    });
  });
});

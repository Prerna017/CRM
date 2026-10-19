import { UserRole, EmployeeStatus } from '@/types/database';

/**
 * Global Authentication & Role Governance Configurations
 */

// Configurable founder email via environment variable without exposing credentials
export const getFounderEmail = (): string => {
  return (import.meta.env.VITE_FOUNDER_EMAIL || 'founder@vingo.com').trim().toLowerCase();
};

export const isFounderOrAdminRole = (role?: UserRole | string | null): boolean => {
  return role === 'founder_admin' || role === 'admin';
};

export const isEmployeeRole = (role?: UserRole | string | null): boolean => {
  return role === 'employee';
};

export const isAccountActive = (status?: EmployeeStatus | string | null): boolean => {
  return status !== 'deactivated' && status !== 'inactive';
};

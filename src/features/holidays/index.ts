/**
 * Feature: Company Holidays Calendar
 * Scope: Official holiday schedule, countdown, and working days calculations.
 */
export interface Holiday {
  id: string;
  name: string;
  date: string;
  description?: string;
  is_optional?: boolean;
}

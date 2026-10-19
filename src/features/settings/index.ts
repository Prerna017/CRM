/**
 * Feature: Company & Account Settings
 * Scope: Company preferences, working days configuration, quota policies, integrations.
 */
export interface CompanySettings {
  companyName: string;
  defaultTimezone: string;
  standardWorkHoursPerDay: number;
  fiscalYearStartMonth: number;
}

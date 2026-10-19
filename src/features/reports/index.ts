/**
 * Feature: Executive Reports & Analytics
 * Scope: Attendance summaries, leave distribution, sales velocity and conversion reports.
 */
export interface ReportSummary {
  period: string;
  totalWorkHours: number;
  averageAttendanceRate: number;
  dealsWonCount: number;
  totalRevenueWon: number;
}

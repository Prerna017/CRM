/**
 * Feature: Executive & Employee Dashboard
 * Scope: Metrics aggregation, quick actions, today attendance stats, pipeline snapshot.
 */
export interface DashboardMetrics {
  totalEmployees: number;
  presentToday: number;
  pendingLeaves: number;
  activeLeads: number;
  pipelineValue: number;
}

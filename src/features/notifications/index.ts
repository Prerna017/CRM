/**
 * Feature: Real-time In-App & Edge Notifications
 * Scope: System alerts, leave approval alerts, lead activity broadcasts.
 */
export interface SystemNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  created_at: string;
}

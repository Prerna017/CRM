/**
 * Feature: Email & Communications Integration
 * Scope: Outbound email delivery, webhook ingestion, notification triggers.
 */
export interface EmailPayload {
  to: string | string[];
  subject: string;
  htmlContent: string;
  replyTo?: string;
  metadata?: Record<string, unknown>;
}

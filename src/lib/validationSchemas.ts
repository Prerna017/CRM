import { z } from 'zod';

/**
 * XSS and Injection Input Sanitization
 * Strips script tags, HTML tags, and dangerous executable script schemes.
 */
export function sanitizeString(input: string): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '')
    .trim();
}

/**
 * Common string transformer with sanitization
 */
const safeText = (min = 1, max = 1000) =>
  z.string()
    .min(min, `Minimum ${min} character required`)
    .max(max, `Maximum length is ${max} characters`)
    .transform(sanitizeString);

const safeEmail = z.string()
  .email('Invalid email address format')
  .max(255)
  .transform((v) => sanitizeString(v).toLowerCase());

/**
 * 1. Employee Provisioning Schema
 */
export const EmployeeProvisionSchema = z.object({
  employee_id: safeText(3, 30),
  name: safeText(2, 100),
  email: safeEmail,
  role: z.enum(['founder_admin', 'admin', 'manager', 'employee']),
  department: safeText(2, 60),
  title: safeText(2, 100),
  phone: z.string().max(30).optional().transform((v) => (v ? sanitizeString(v) : undefined)),
  salary: z.number().min(0, 'Salary must be a non-negative number').optional(),
  join_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Join date must be in YYYY-MM-DD format'),
  work_location: z.enum(['Headquarters', 'Remote', 'Regional Office', 'Hybrid']),
  status: z.enum(['active', 'inactive', 'on_leave', 'deactivated']).default('active'),
  reporting_manager_id: z.string().nullable().optional(),
  emergency_contact_name: z.string().max(100).optional().transform((v) => (v ? sanitizeString(v) : undefined)),
  emergency_contact_phone: z.string().max(30).optional().transform((v) => (v ? sanitizeString(v) : undefined)),
  annual_leave_quota: z.number().min(0).max(60).default(20),
  sick_leave_quota: z.number().min(0).max(30).default(10),
  casual_leave_quota: z.number().min(0).max(20).default(5),
});

/**
 * 2. Profile Update Schema (User self-edit permitted fields)
 */
export const ProfileUpdateSchema = z.object({
  name: safeText(2, 100).optional(),
  phone: z.string().max(30).optional().transform((v) => (v ? sanitizeString(v) : undefined)),
  emergency_contact_name: z.string().max(100).optional().transform((v) => (v ? sanitizeString(v) : undefined)),
  emergency_contact_phone: z.string().max(30).optional().transform((v) => (v ? sanitizeString(v) : undefined)),
  avatar_url: z.string().url('Invalid avatar URL').optional().or(z.literal('')),
});

/**
 * 3. Lead Creation & Update Schema
 */
export const LeadSchema = z.object({
  title: safeText(2, 150),
  company: safeText(2, 150),
  value: z.number().min(0, 'Deal value cannot be negative').max(100_000_000, 'Deal value exceeds limit'),
  stage: z.enum(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']),
  contact_name: safeText(2, 100),
  contact_email: safeEmail,
  contact_phone: z.string().max(30).optional().transform((v) => (v ? sanitizeString(v) : undefined)),
  source: safeText(2, 80),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  notes: z.string().max(5000).optional().transform((v) => (v ? sanitizeString(v) : undefined)),
  assigned_to: z.string().nullable().optional(),
  next_follow_up: z.string().optional(),
});

/**
 * 4. Leave Application Schema
 */
export const LeaveApplicationSchema = z.object({
  leave_type: z.enum(['annual', 'sick', 'casual', 'unpaid']),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format'),
  reason: safeText(5, 500),
}).refine(
  (data) => data.start_date <= data.end_date,
  { message: 'End date cannot be earlier than start date', path: ['end_date'] }
);

/**
 * 5. Attendance Regularization Schema
 */
export const AttendanceRegularizationSchema = z.object({
  record_id: z.string().min(1, 'Record ID is required'),
  reason: safeText(10, 300),
  corrected_check_in: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format must be HH:MM').optional(),
  corrected_check_out: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format must be HH:MM').optional(),
});

/**
 * 6. Email Log Schema
 */
export const EmailLogSchema = z.object({
  lead_id: z.string().min(1, 'Lead ID is required'),
  recipient_email: safeEmail,
  subject: safeText(1, 200),
  body: safeText(1, 10000),
  reply_category: z.enum([
    'Interested',
    'Not Interested',
    'Follow-up Later',
    'Asked for Pricing',
    'Meeting Requested',
    'Out of Office',
    'No Response',
    'Unsubscribe Request',
    'Other'
  ]).optional(),
  next_follow_up_date: z.string().optional(),
  notes: z.string().max(1000).optional().transform((v) => (v ? sanitizeString(v) : undefined)),
});

/**
 * 7. Policy Creation Schema
 */
export const PolicyCreationSchema = z.object({
  title: safeText(3, 200),
  category: z.enum([
    'Attendance',
    'Leave and holidays',
    'Working hours',
    'Work from home',
    'Employee conduct',
    'Confidentiality',
    'CRM and lead ownership',
    'Communication',
    'Data security',
    'General'
  ]),
  content: safeText(10, 50000),
  requires_acknowledgment: z.boolean().default(true),
  effective_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD'),
  version_notes: z.string().max(500).optional().transform((v) => (v ? sanitizeString(v) : undefined)),
});

/**
 * 8. Notice Creation Schema
 */
export const NoticeCreationSchema = z.object({
  title: safeText(3, 200),
  message: safeText(5, 10000),
  category: safeText(2, 60),
  priority: z.enum(['normal', 'important', 'urgent']).default('normal'),
  requires_acknowledgement: z.boolean().default(false),
  expiry_date: z.string().optional(),
});

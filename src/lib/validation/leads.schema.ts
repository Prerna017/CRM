import { z } from "zod";

export const leadStageEnum = z.enum([
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
  "lost",
]);

export const leadPriorityEnum = z.enum(["low", "medium", "high", "urgent"]);

export const leadSourceEnum = z.enum([
  "website",
  "referral",
  "linkedin",
  "cold_outreach",
  "inbound",
  "partner",
]);

export const leadCreateSchema = z.object({
  title: z.string().min(3, "Lead title must be at least 3 characters"),
  company: z.string().min(2, "Company name is required"),
  contact_name: z.string().min(2, "Contact person name is required"),
  contact_email: z.string().email("Invalid email format").optional().or(z.literal("")),
  contact_phone: z.string().min(6, "Phone number is invalid").optional().or(z.literal("")),
  value: z.number().min(0, "Deal value cannot be negative").default(0),
  currency: z.string().default("USD"),
  stage: leadStageEnum.default("new"),
  priority: leadPriorityEnum.default("medium"),
  source: leadSourceEnum.default("website"),
  assigned_to: z.string().uuid("Invalid assignee ID").optional().nullable(),
  expected_close_date: z.string().optional().nullable(),
  notes: z.string().optional(),
});

export type LeadCreateFormData = z.infer<typeof leadCreateSchema>;

export const leadActivitySchema = z.object({
  lead_id: z.string().uuid("Invalid lead ID"),
  activity_type: z.enum(["reply", "note", "call", "email", "meeting", "stage_change"]),
  title: z.string().optional(),
  content: z.string().min(1, "Activity message or note cannot be empty"),
  follow_up_date: z.string().optional().nullable(),
});

export type LeadActivityFormData = z.infer<typeof leadActivitySchema>;

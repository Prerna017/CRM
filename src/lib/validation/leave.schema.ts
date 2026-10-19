import { z } from "zod";

export const leaveTypeEnum = z.enum(["annual", "sick", "casual", "emergency"]);
export const leaveStatusEnum = z.enum(["pending", "approved", "rejected"]);

export const leaveRequestSchema = z.object({
  leave_type: leaveTypeEnum,
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  days_count: z.number().min(0.5, "Days count must be at least 0.5"),
  reason: z.string().min(5, "Please provide a clear reason for your leave request"),
});

export type LeaveRequestFormData = z.infer<typeof leaveRequestSchema>;

export const leaveReviewSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  admin_remarks: z.string().optional(),
});

export type LeaveReviewFormData = z.infer<typeof leaveReviewSchema>;

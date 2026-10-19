import { z } from "zod";

export const attendanceStatusEnum = z.enum([
  "present",
  "late",
  "half_day",
  "absent",
  "on_leave",
]);

export const attendanceAdjustmentSchema = z.object({
  user_id: z.string().uuid("Invalid user ID"),
  date: z.string().min(1, "Date is required"),
  clock_in: z.string().optional().nullable(),
  clock_out: z.string().optional().nullable(),
  total_hours: z.number().min(0).max(24).default(0),
  status: attendanceStatusEnum.default("present"),
  notes: z.string().optional().nullable(),
});

export type AttendanceAdjustmentFormData = z.infer<
  typeof attendanceAdjustmentSchema
>;

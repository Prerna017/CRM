import { z } from "zod";

export const employeeRoleEnum = z.enum(["admin", "employee"]);
export const employeeStatusEnum = z.enum(["active", "on_leave", "inactive"]);

export const employeeCreateSchema = z.object({
  name: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  role: employeeRoleEnum.default("employee"),
  title: z.string().min(2, "Title is required"),
  department: z.string().min(2, "Department is required"),
  phone: z.string().optional(),
  salary: z.number().min(0).default(0),
  annual_leave_quota: z.number().int().min(0).default(18),
  sick_leave_quota: z.number().int().min(0).default(10),
  casual_leave_quota: z.number().int().min(0).default(8),
  join_date: z.string().default(() => new Date().toISOString().split("T")[0]),
});

export type EmployeeCreateFormData = z.infer<typeof employeeCreateSchema>;

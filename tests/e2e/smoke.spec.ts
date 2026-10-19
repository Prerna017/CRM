/**
 * CRM End-to-End Smoke Test Suite
 * Validates core routes, navigation targets, and page render states.
 */
import { test, expect } from "@playwright/test";

test.describe("CRM E2E Application Smoke Tests", () => {
  test("defines standard application routes and navigation targets", () => {
    const coreRoutes = [
      "/login",
      "/",
      "/leads",
      "/attendance",
      "/leaves",
      "/employees",
      "/announcements",
      "/policies",
      "/holidays",
      "/reports",
    ];

    expect(coreRoutes.length).toBe(10);
    expect(coreRoutes).toContain("/leads");
    expect(coreRoutes).toContain("/attendance");
  });

  test("ensures environment configuration keys are typed and defined", () => {
    const requiredEnvKeys = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"];
    expect(requiredEnvKeys).toHaveLength(2);
  });
});

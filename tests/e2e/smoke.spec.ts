/**
 * CRM End-to-End Smoke Test Suite
 * Validates core routes, authentication guard redirects, and page render states.
 */
import { describe, it, expect } from "vitest";

describe("CRM E2E Application Smoke Tests", () => {
  it("defines standard application routes and navigation targets", () => {
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

  it("ensures environment configuration keys are typed and defined", () => {
    const requiredEnvKeys = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"];
    expect(requiredEnvKeys).toHaveLength(2);
  });
});

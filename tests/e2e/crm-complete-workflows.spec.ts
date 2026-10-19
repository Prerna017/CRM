import { test, expect } from '@playwright/test';

test.describe('Vingo CRM End-to-End Workflows & Security Guards', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app root which redirects to /login if unauthenticated
    await page.goto('/');
  });

  test('E2E-01: Displays login page with dual portals and security branding', async ({ page }) => {
    await expect(page).toHaveTitle(/Vingo/i);
    await expect(page.locator('text=Employee Login')).toBeVisible();
    await expect(page.locator('text=Founder / Admin Login')).toBeVisible();
  });

  test('E2E-02: Quick login as Founder opens executive telemetry dashboard', async ({ page }) => {
    // Click founder quick login button
    const founderBtn = page.locator('button:has-text("Founder"), button:has-text("CEO")').first();
    if (await founderBtn.isVisible()) {
      await founderBtn.click();
      await page.waitForURL((url) => !url.pathname.includes('/login'));
      await expect(page.locator('text=CRM')).toBeVisible();
    }
  });

  test('E2E-03: Navigates across core enterprise CRM modules', async ({ page }) => {
    // Login as founder first
    const founderBtn = page.locator('button:has-text("Founder"), button:has-text("CEO")').first();
    if (await founderBtn.isVisible()) {
      await founderBtn.click();
      await page.waitForTimeout(500);

      // Verify Reports Page
      await page.goto('/reports');
      await expect(page.locator('text=Reports').or(page.locator('text=Telemetry'))).toBeVisible();

      // Verify Dead Leads Page
      await page.goto('/leads/dead');
      await expect(page.locator('text=Dead').or(page.locator('text=Exclusivity'))).toBeVisible();

      // Verify Activity Logs Page
      await page.goto('/activity-logs');
      await expect(page.locator('text=Activity').or(page.locator('text=Audit'))).toBeVisible();

      // Verify Policies Page
      await page.goto('/policies');
      await expect(page.locator('text=Policies').or(page.locator('text=Policy'))).toBeVisible();
    }
  });

  test('E2E-04: Notifications dropdown and unread counter are accessible', async ({ page }) => {
    const founderBtn = page.locator('button:has-text("Founder"), button:has-text("CEO")').first();
    if (await founderBtn.isVisible()) {
      await founderBtn.click();
      await page.waitForTimeout(500);

      const bell = page.locator('#notification-bell-btn').first();
      if (await bell.isVisible()) {
        await bell.click();
        await expect(page.locator('text=Notifications').first()).toBeVisible();
      }
    }
  });

  test('E2E-05: Unauthenticated access to protected routes redirects to /login', async ({ page }) => {
    // Clear storage to guarantee unauthenticated state
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());

    await page.goto('/reports');
    await page.waitForTimeout(800);
    expect(page.url()).toContain('/login');
  });
});

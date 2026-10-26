import { test, expect } from '@playwright/test';

test.describe('BitePass — Pure Agent-First Escrow & Doorstep Flow', () => {
  test('executes end-to-end 1-tap PayPal escrow authorization and doorstep proximity settlement', async ({
    page,
  }) => {
    // 1. Load BitePass application
    await page.goto('/');

    // 2. Check title & BitePass branding
    await expect(page).toHaveTitle(/BitePass — Autonomous Culinary Agent/i);
    await expect(page.locator('text=BitePass').first()).toBeVisible();

    // 3. Verify Agent Cognitive stream is active
    await expect(
      page.locator('text=BitePass Culinary Agent')
    ).toBeVisible();

    // 4. Verify Food Recommendation card for Jack's Cafe Turkey Avocado Club
    const itemTitle = page.locator('text=Turkey Avocado Club').first();
    await expect(itemTitle).toBeVisible();

    // 5. Click Hero 1-Tap PayPal Escrow Button
    const paypalButton = page.locator('#paypal-one-tap-button');
    await expect(paypalButton).toBeVisible();
    await paypalButton.click();

    // 6. Verify transition to Active Escrow Ticket
    await expect(
      page.locator("text=Jack's Cafe is Assembling")
    ).toBeVisible();
    await expect(
      page.locator('text=Escrow Authorized')
    ).toBeVisible();

    // 7. Simulate Doorstep Arrival (< 50m)
    const arriveButton = page.locator(
      'button:has-text("Simulate Arrival at Doorstep")'
    );
    await expect(arriveButton).toBeVisible();
    await arriveButton.click();

    // 8. Verify transition to Doorstep Pass
    await expect(
      page.locator('text=Captured via PayPal Escrow')
    ).toBeVisible();
    await expect(page.locator('text=Doorstep Arrival Verified')).toBeVisible();

    // 9. Switch to Kitchen Queue Tab to verify AG Grid live row
    const queueTab = page.locator('button:has-text("Kitchen Queue")');
    await queueTab.click();

    await expect(
      page.locator('text=Merchant Kitchen Operations')
    ).toBeVisible();
    await expect(
      page.locator('text=CAPTURED / SETTLED').first()
    ).toBeVisible();
  });
});

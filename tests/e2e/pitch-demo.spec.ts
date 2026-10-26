import { test, expect } from '@playwright/test';

test.use({
  viewport: { width: 390, height: 844 }, // Mobile viewport (iPhone standard)
  launchOptions: {
    slowMo: 600, // Smooth pace for clear visual demonstration
  },
  video: {
    mode: 'on',
    size: { width: 390, height: 844 },
  },
});

test.describe('BitePass — Step-by-Step Feature Pitch Walkthrough', () => {
  test('demonstrates end-to-end autonomous culinary concierge flow with mobile onboarding and floating badges', async ({
    page,
  }) => {
    test.setTimeout(75000);

    // 1. Initial Load & Proactive Culinary Recommendation
    await page.goto('http://localhost:3000');
    await expect(page.locator('text=BitePass').first()).toBeVisible();
    await page.waitForTimeout(1000);

    // 2. Showcase Mobile Onboarding Guide Walkthrough
    const guideTrigger = page.locator('button:has-text("How it works")');
    if (await guideTrigger.isVisible()) {
      await guideTrigger.click();
      await page.waitForTimeout(1200);

      // Step 1: Autonomous AI
      await expect(page.locator('text=Proactive, Not Reactive')).toBeVisible();
      await page.waitForTimeout(1000);

      // Step 2: Floating Photo Scenario Badges
      const nextBtn = page.locator('button:has-text("Next")');
      await nextBtn.click();
      await expect(page.locator('text=Floating Photo Scenario Badges')).toBeVisible();
      await page.waitForTimeout(1000);

      // Step 3: 2-Phase PayPal Escrow
      await nextBtn.click();
      await expect(page.locator('text=2-Phase PayPal Escrow')).toBeVisible();
      await page.waitForTimeout(1000);

      // Step 4: Doorstep Geofence Auto-Pay
      await nextBtn.click();
      await expect(page.locator('text=Doorstep Geofence Auto-Pay')).toBeVisible();
      await page.waitForTimeout(1000);

      // Complete guide and return to food card
      const startBtn = page.locator('button:has-text("Start Experience")');
      await startBtn.click();
      await page.waitForTimeout(1000);
    }

    // 3. Demonstrate Floating Photo Scenario Badges (Docked on the dish picture)
    // Toggle Vegan Badge
    const veganBadge = page.locator('button[aria-label="Vegan"]');
    if (await veganBadge.isVisible()) {
      await veganBadge.click();
      await page.waitForTimeout(1500);
      await expect(page.locator('text=Kale Quinoa Power Bowl').first()).toBeVisible();

      // Return to Lunch via 12:15 PM Lunch Badge
      const lunchBadge = page.locator('button[aria-label="12:15 PM Lunch"]');
      await lunchBadge.click();
      await page.waitForTimeout(1500);
      await expect(page.locator('text=Turkey Avocado Club').first()).toBeVisible();
    }

    // 4. Demonstrate 3-Second Tweak (Side Selection)
    const saladTweak = page.locator('button:has-text("Arugula Citrus Side Salad")');
    if (await saladTweak.isVisible()) {
      await saladTweak.click();
      await page.waitForTimeout(1200);
      await expect(page.locator('#paypal-one-tap-button:has-text("$16.00")')).toBeVisible();
    }

    // 5. Demonstrate Phase 1: 1-Tap PayPal Escrow Authorization
    const paypalButton = page.locator('#paypal-one-tap-button');
    await expect(paypalButton).toBeVisible();
    await paypalButton.click();
    await page.waitForTimeout(1500);

    // 6. Active Escrow Preparation Ticket
    await expect(page.locator('text=Escrow Authorized')).toBeVisible();
    await expect(page.locator("text=Jack's Cafe is Assembling")).toBeVisible();
    await expect(page.locator('text=Assigned Bay')).toBeVisible();
    await expect(page.locator('text=Countdown')).toBeVisible();
    await page.waitForTimeout(2000);

    // 7. Demonstrate Phase 2: Contactless Doorstep Proximity Capture (<50m)
    const arriveButton = page.locator('button:has-text("Simulate Arrival at Doorstep")');
    await expect(arriveButton).toBeVisible();
    await arriveButton.click();
    await page.waitForTimeout(2000);

    // 8. Doorstep Contactless Pass with QR Code
    await expect(page.locator('text=Doorstep Arrival Verified')).toBeVisible();
    await expect(page.locator('text=Captured via PayPal Escrow')).toBeVisible();
    await expect(page.locator('text=FASTPASS')).toBeVisible();
    await page.waitForTimeout(2000);

    // 9. Demonstrate AG Grid Live Kitchen Observability
    const queueTab = page.locator('button:has-text("Kitchen Queue")');
    await queueTab.click();
    await page.waitForTimeout(2000);
    await expect(page.locator('text=Merchant Kitchen Operations')).toBeVisible();
    await expect(page.locator('text=CAPTURED / SETTLED').first()).toBeVisible();
    await page.waitForTimeout(2000);

    // 10. Back to Lunch & Reset
    const backButton = page.locator('button:has-text("Back to Lunch")');
    await backButton.click();
    await page.waitForTimeout(1500);
  });
});

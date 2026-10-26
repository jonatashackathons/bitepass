import { test, expect } from '@playwright/test';

test.use({
  viewport: { width: 390, height: 844 }, // iPhone 14/15/16 standard mobile viewport
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});

test.describe('BitePass — Mobile Viewport (390px × 844px) Test Suite', () => {
  test('verifies mobile-first layout, glanceable UX, and above-the-fold 1-tap checkout', async ({
    page,
  }) => {
    // 1. Load app on mobile viewport
    await page.goto('http://localhost:3000');

    // 2. Check mobile brand & compact navbar
    await expect(page.locator('text=BitePass').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lunch', exact: true })).toBeVisible();
    await expect(page.locator('button:has-text("Kitchen Queue")')).toBeVisible();

    // 3. Verify 1-line agent status is glanceable
    await expect(page.locator('text=BitePass Culinary Agent')).toBeVisible();
    await expect(page.getByText('Argon', { exact: true })).toBeVisible();

    // 4. Verify Food Recommendation card is visible
    const dishTitle = page.locator('text=Turkey Avocado Club').first();
    await expect(dishTitle).toBeVisible();
    await expect(page.locator('text=$14.50').first()).toBeVisible();

    // 5. CRITICAL MOBILE CHECK: 1-Tap PayPal button must be visible ABOVE THE FOLD
    const paypalButton = page.locator('#paypal-one-tap-button');
    await expect(paypalButton).toBeVisible();
    
    // Check that button bounding box fits inside the 844px mobile screen height without scrolling
    const box = await paypalButton.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.y + box.height).toBeLessThan(844); // Fully visible above the fold!
    }

    // 6. Test Mobile Scenario Chips (floating circular badges on photo)
    const veganChip = page.locator('button:has-text("Vegan")');
    await expect(veganChip).toBeVisible();
    await veganChip.click();
    await expect(page.locator('text=Kale Quinoa Power Bowl').first()).toBeVisible();

    const lunchChip = page.locator('button:has-text("12:15 PM Lunch")');
    await expect(lunchChip).toBeVisible();
    await lunchChip.click();
    await expect(page.locator('text=Turkey Avocado Club').first()).toBeVisible();

    // 7. Test Mobile Side Selection Pill (+$1.50)
    const sidePill = page.locator('button:has-text("Arugula Citrus Side Salad")');
    if (await sidePill.isVisible()) {
      await sidePill.click();
      await expect(page.locator('#paypal-one-tap-button:has-text("$16.00")')).toBeVisible();
    }

    // 8. Phase 1: Tap PayPal Escrow Hold Button
    await paypalButton.click();

    // 9. Verify transition to Mobile Active Escrow Ticket
    await expect(page.locator('text=Escrow Authorized')).toBeVisible();
    await expect(page.locator("text=Jack's Cafe is Assembling")).toBeVisible();
    await expect(page.locator('text=Assigned Bay')).toBeVisible();
    await expect(page.locator('text=Countdown')).toBeVisible();
    await expect(page.locator('text=Doorstep Geofence')).toBeVisible();

    // 10. Phase 2: Simulate Doorstep Arrival (<50m)
    const arriveButton = page.locator('button:has-text("Simulate Arrival at Doorstep")');
    await expect(arriveButton).toBeVisible();
    await arriveButton.click();

    // 11. Verify transition to Mobile Doorstep Contactless Pass
    await expect(page.locator('text=Doorstep Arrival Verified')).toBeVisible();
    await expect(page.locator('text=Captured via PayPal Escrow')).toBeVisible();
    await expect(page.locator('text=FASTPASS')).toBeVisible();

    // 12. Verify Mobile Kitchen Operations View (AG Grid)
    const queueTab = page.locator('button:has-text("Kitchen Queue")');
    await queueTab.click();
    await expect(page.locator('text=Merchant Kitchen Operations')).toBeVisible();
    await expect(page.locator('text=CAPTURED / SETTLED').first()).toBeVisible();

    // 13. Return to Lunch
    const backButton = page.locator('button:has-text("Back to Lunch")');
    await backButton.click();
    await expect(page.locator('text=Doorstep Arrival Verified')).toBeVisible();
  });

  test('verifies floating photo badges hover/tap sliding animation and mobile onboarding guide', async ({
    page,
  }) => {
    await page.goto('http://localhost:3000');

    // 1. Verify floating circular badges docked on the dish photo
    const lunchBadge = page.locator('button[aria-label="12:15 PM Lunch"]');
    const doorstepBadge = page.locator('button[aria-label="Doorstep (<50m)"]');
    const veganBadge = page.locator('button[aria-label="Vegan"]');
    const lateBadge = page.locator('button[aria-label="Late (<30m)"]');

    await expect(lunchBadge).toBeVisible();
    await expect(doorstepBadge).toBeVisible();
    await expect(veganBadge).toBeVisible();
    await expect(lateBadge).toBeVisible();

    // 2. Test sliding tooltip interaction on hover
    await veganBadge.hover();
    await expect(page.locator('text=Vegan').first()).toBeVisible();

    // 3. Test Mobile Onboarding Guide Modal
    const guideButton = page.locator('button[aria-label="Open Mobile Onboarding Guide"]');
    await expect(guideButton).toBeVisible();
    await guideButton.click();

    // 4. Verify Onboarding Guide content
    await expect(page.locator('text=Proactive, Not Reactive')).toBeVisible();
    await expect(page.locator('text=Step 1 of 4')).toBeVisible();

    // Step 2: Floating Photo Scenario Badges
    const nextButton = page.locator('button:has-text("Next")');
    await nextButton.click();
    await expect(page.locator('text=Floating Photo Scenario Badges')).toBeVisible();
    await expect(page.locator('text=Step 2 of 4')).toBeVisible();

    // Step 3: 2-Phase PayPal Escrow
    await nextButton.click();
    await expect(page.locator('text=2-Phase PayPal Escrow')).toBeVisible();
    await expect(page.locator('text=Step 3 of 4')).toBeVisible();

    // Step 4: Doorstep Geofence Auto-Pay
    await nextButton.click();
    await expect(page.locator('text=Doorstep Geofence Auto-Pay')).toBeVisible();
    await expect(page.locator('text=Step 4 of 4')).toBeVisible();

    // Close guide
    const finishButton = page.locator('button:has-text("Start Experience")');
    await finishButton.click();
    await expect(page.locator('text=Proactive, Not Reactive')).not.toBeVisible();
  });
});

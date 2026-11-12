import { test, expect } from '@playwright/test';

test.use({
  viewport: { width: 390, height: 844 },
});

test('captures fresh screenshots with redesigned logo', async ({ page }) => {
  await page.goto('/?scenario=lunch');
  await expect(page.locator('text=BitePass').first()).toBeVisible();

  const resetBtn = page.locator('button:has-text("Reset Simulation")');
  if (await resetBtn.isVisible()) {
    await resetBtn.click();
    await page.waitForTimeout(600);
  }

  // State 1: Proactive Recommendation Card with new logo in Navbar
  await page.screenshot({
    path: 'demo/screenshot_01_proactive_recommendation.png',
    fullPage: false,
  });

  // State 2: Escrow Hold
  const paypalButton = page.locator('#paypal-one-tap-button');
  await expect(paypalButton).toBeVisible();
  await paypalButton.click();
  await page.waitForTimeout(1500);

  await page.screenshot({
    path: 'demo/screenshot_02_escrow_hold_ticket.png',
    fullPage: false,
  });

  // State 3: Doorstep Pass
  const arriveButton = page.locator('button:has-text("Simulate Arrival at Doorstep")');
  if (await arriveButton.isVisible()) {
    await arriveButton.click();
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: 'demo/screenshot_03_doorstep_fastpass.png',
      fullPage: false,
    });
  }
});

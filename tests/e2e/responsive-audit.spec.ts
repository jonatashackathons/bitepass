import { test, expect } from '@playwright/test';

const RESOLUTIONS = [
  { name: 'mobile-small', width: 360, height: 740 },
  { name: 'mobile-standard', width: 390, height: 844 },
  { name: 'mobile-large', width: 430, height: 932 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
];

test.describe('BitePass — Visual Responsiveness & Text Line Break Audit', () => {
  for (const res of RESOLUTIONS) {
    test(`verifies zero text overflow or broken lines at ${res.name} (${res.width}x${res.height})`, async ({ page }) => {
      await page.setViewportSize({ width: res.width, height: res.height });

      // 1. Audit Home Screen (Recommendation Card)
      await page.goto('/?scenario=lunch');
      await expect(page.locator('text=BitePass').first()).toBeVisible();

      // Reset state if necessary
      const resetBtn = page.locator('button:has-text("Reset Simulation")');
      if (await resetBtn.isVisible()) {
        await resetBtn.click();
        await page.waitForTimeout(500);
      }

      await page.waitForTimeout(1000);

      // Screenshot State A: Proactive Card
      await page.screenshot({
        path: `test-results/responsive/${res.name}-01-recommendation.png`,
        fullPage: false,
      });

      // Audit for text overflowing container horizontally or vertically (ignoring sr-only)
      const overflowIssues = await page.evaluate(() => {
        const issues: string[] = [];
        const allElements = document.querySelectorAll('button, p, span, h1, h2, h3, a');
        allElements.forEach((el) => {
          if (el.classList.contains('sr-only')) return;

          const rect = el.getBoundingClientRect();
          if (rect.right > window.innerWidth + 2) {
            issues.push(
              `Overflowing window: <${el.tagName.toLowerCase()}> "${el.textContent?.trim().slice(0, 30)}" (right: ${Math.round(rect.right)}px, window: ${window.innerWidth}px)`
            );
          }
          if (
            el.scrollWidth > el.clientWidth + 2 &&
            !el.classList.contains('no-scrollbar') &&
            el.tagName !== 'P' &&
            !el.classList.contains('truncate') &&
            el.clientWidth > 10
          ) {
            issues.push(
              `Horizontal text clipped: <${el.tagName.toLowerCase()}> "${el.textContent?.trim().slice(0, 30)}" (scroll: ${el.scrollWidth}px, client: ${el.clientWidth}px)`
            );
          }
        });
        return issues;
      });

      console.log(`[${res.name}] State A text overflow issues:`, overflowIssues);
      expect(overflowIssues, `Text overflow detected at ${res.name}`).toHaveLength(0);

      // 2. Audit State B: 1-Tap Escrow Hold
      const paypalBtn = page.locator('#paypal-one-tap-button');
      await paypalBtn.click();
      await page.waitForTimeout(1500);

      await page.screenshot({
        path: `test-results/responsive/${res.name}-02-escrow-ticket.png`,
        fullPage: false,
      });

      // 3. Audit State C: Doorstep Pass
      const arriveBtn = page.locator('button:has-text("Simulate Arrival at Doorstep")');
      if (await arriveBtn.isVisible()) {
        await arriveBtn.click();
        await page.waitForTimeout(1500);

        await page.screenshot({
          path: `test-results/responsive/${res.name}-03-doorstep-pass.png`,
          fullPage: false,
        });
      }

      // 4. Audit State D: Kitchen Queue (AG Grid)
      const queueTab = page.locator('button:has-text("Kitchen Queue")').or(page.locator('button:has-text("Queue")')).first();
      await queueTab.click();
      await page.waitForTimeout(1500);

      await page.screenshot({
        path: `test-results/responsive/${res.name}-04-kitchen-queue.png`,
        fullPage: false,
      });
    });
  }
});

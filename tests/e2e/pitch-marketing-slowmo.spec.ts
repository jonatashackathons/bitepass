import { test, expect } from '@playwright/test';

test.use({
  viewport: { width: 390, height: 844 },
  launchOptions: {
    slowMo: 550, // Smooth slow-motion pacing
  },
  video: {
    mode: 'on',
    size: { width: 390, height: 844 },
  },
});

test.describe('BitePass — Slow-Motion Marketing Walkthrough with Business Chyrons', () => {
  test('records slow-motion marketing demonstration with human business explanations', async ({ page }) => {
    test.setTimeout(75000);

    // Business Chyron HUD overlay
    const setBusinessHud = async (
      stepBadge: string,
      businessTitle: string,
      businessExplanation: string,
      accentColor: string
    ) => {
      await page.evaluate(
        ({ stepBadge, businessTitle, businessExplanation, accentColor }) => {
          let hud = document.getElementById('marketing-business-hud');
          if (!hud) {
            hud = document.createElement('div');
            hud.id = 'marketing-business-hud';
            hud.style.position = 'fixed';
            hud.style.top = '10px';
            hud.style.left = '10px';
            hud.style.right = '10px';
            hud.style.zIndex = '999999';
            hud.style.padding = '10px 14px';
            hud.style.borderRadius = '14px';
            hud.style.backdropFilter = 'blur(20px)';
            hud.style.setProperty('-webkit-backdrop-filter', 'blur(20px)');
            hud.style.boxShadow = '0 12px 36px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.1)';
            hud.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            hud.style.display = 'flex';
            hud.style.flexDirection = 'column';
            hud.style.gap = '3px';
            hud.style.pointerEvents = 'none';
            hud.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
            document.body.appendChild(hud);
          }

          hud.style.background = 'rgba(10, 15, 29, 0.92)';
          hud.style.border = `1.5px solid ${accentColor}`;
          hud.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
              <span style="background: ${accentColor}; color: #ffffff; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 9999px; letter-spacing: 0.06em; text-transform: uppercase;">
                ${stepBadge}
              </span>
              <span style="color: rgba(255, 255, 255, 0.7); font-size: 10px; font-weight: 600; letter-spacing: 0.02em;">
                BitePass · Autonomous Commerce
              </span>
            </div>
            <div style="color: #ffffff; font-size: 13px; font-weight: 700; letter-spacing: -0.01em; line-height: 1.25;">
              ${businessTitle}
            </div>
            <div style="color: #cbd5e1; font-size: 10.5px; font-weight: 450; line-height: 1.35;">
              ${businessExplanation}
            </div>
          `;
        },
        { stepBadge, businessTitle, businessExplanation, accentColor }
      );
    };

    // =========================================================================
    // STEP 1: Autonomous Ambient Intent (Business: Proactive Suggestion)
    // =========================================================================
    await page.goto('/?scenario=lunch');
    await expect(page.locator('text=BitePass').first()).toBeVisible();

    const resetSimulationBtn = page.locator('button:has-text("Reset Simulation")');
    if (await resetSimulationBtn.isVisible()) {
      await resetSimulationBtn.click();
      await page.waitForTimeout(1000);
    }

    // High quality screenshot of the recommendation card before HUD
    await page.screenshot({
      path: 'demo/screenshot_01_proactive_recommendation.png',
      fullPage: false,
    });

    await setBusinessHud(
      'STEP 01/05 · PROACTIVE AI',
      'Autonomous Ambient Lunch Suggestion',
      'AI detects a 35-min calendar break & reserves lunch before you get hungry. No browsing 50-item menus.',
      '#6366F1'
    );
    await page.waitForTimeout(4000);

    // =========================================================================
    // STEP 2: 3-Second Tactile Customization (Business: Zero Choice Overload)
    // =========================================================================
    await setBusinessHud(
      'STEP 02/05 · 1-TAP TWEAK',
      '3-Second Dietary Customization',
      'Swap sides in one tap. Instant price and nutrition recalculation with zero multi-step forms.',
      '#F59E0B'
    );
    const saladTweak = page.locator('button:has-text("Arugula Citrus Side Salad")');
    if (await saladTweak.isVisible()) {
      await saladTweak.click();
      await page.waitForTimeout(2500);
      await expect(page.locator('#paypal-one-tap-button:has-text("$16.00")')).toBeVisible();
    }
    await page.waitForTimeout(2500);

    // =========================================================================
    // STEP 3: Phase 1 PayPal Escrow Hold (Business: Zero Financial Risk)
    // =========================================================================
    await setBusinessHud(
      'STEP 03/05 · PAYPAL ESCROW',
      'Phase 1: Zero-Risk Pre-Authorization Hold',
      '$0 charged upfront. Kitchen begins fresh prep with guaranteed hold; customer pays only on arrival.',
      '#0070BA'
    );
    const paypalButton = page.locator('#paypal-one-tap-button');
    await expect(paypalButton).toBeVisible();
    await paypalButton.click();
    await page.waitForTimeout(3000);

    await expect(page.locator('text=Escrow Authorized')).toBeVisible();
    await expect(page.locator("text=Jack's Cafe is Assembling")).toBeVisible();

    // High quality screenshot of the active escrow ticket
    await page.screenshot({
      path: 'demo/screenshot_02_escrow_hold_ticket.png',
      fullPage: false,
    });

    await page.waitForTimeout(4000);

    // =========================================================================
    // STEP 4: Contactless Doorstep Capture (Business: Frictionless Walk-in)
    // =========================================================================
    await setBusinessHud(
      'STEP 04/05 · DOORSTEP PASS',
      'Phase 2: Contactless Arrival Capture (<50m)',
      'Crossing 50m cafe threshold triggers auto-capture. FASTPASS unlocks Cubby #D for 0-second grab-and-go.',
      '#10B981'
    );
    const arriveButton = page.locator('button:has-text("Simulate Arrival at Doorstep")');
    await expect(arriveButton).toBeVisible();
    await arriveButton.click();
    await page.waitForTimeout(3000);

    await expect(page.locator('text=Doorstep Arrival Verified')).toBeVisible();
    await expect(page.getByText('FASTPASS', { exact: true })).toBeVisible();

    // High quality screenshot of the FASTPASS Doorstep Arrival
    await page.screenshot({
      path: 'demo/screenshot_03_doorstep_fastpass.png',
      fullPage: false,
    });

    await page.waitForTimeout(4000);

    // =========================================================================
    // STEP 5: AG Grid Real-Time KDS Telemetry (Business: Operational Efficiency)
    // =========================================================================
    await setBusinessHud(
      'STEP 05/05 · KITCHEN OPS',
      'AG Grid Live Kitchen Telemetry',
      'Enterprise merchant KDS with station leasing, real-time ticket progression, and zero cashier overhead.',
      '#0EA5E9'
    );
    const queueTab = page
      .locator('button:has-text("View Kitchen Operations")')
      .or(page.locator('button:has-text("Kitchen Queue")'))
      .or(page.locator('button:has-text("Queue")'))
      .first();
    await queueTab.click();
    await page.waitForTimeout(3000);
    await expect(page.locator('text=Merchant Kitchen Operations')).toBeVisible();

    // High quality screenshot of AG Grid Merchant Operations
    await page.screenshot({
      path: 'demo/screenshot_04_kitchen_operations_aggrid.png',
      fullPage: false,
    });

    await page.waitForTimeout(4500);
  });
});

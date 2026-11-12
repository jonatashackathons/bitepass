import { test, expect } from '@playwright/test';

test.use({
  viewport: { width: 390, height: 844 }, // Mobile iPhone standard
  launchOptions: {
    slowMo: 450, // Pacing calibrated for exactly ~30 seconds duration
  },
  video: {
    mode: 'on',
    size: { width: 390, height: 844 },
  },
});

test.describe('BitePass — 30-Second Video Demonstration with Clear Step Labels', () => {
  test('delivers razor-sharp 30s pitch demonstration with on-screen step chyrons', async ({ page }) => {
    test.setTimeout(45000);

    // Helper to render high-contrast glassmorphic on-screen step labels in video frames
    const setStepLabel = async (
      stepNum: string,
      title: string,
      subtitle: string,
      color: string
    ) => {
      await page.evaluate(
        ({ stepNum, title, subtitle, color }) => {
          let hud = document.getElementById('demo-step-hud');
          if (!hud) {
            hud = document.createElement('div');
            hud.id = 'demo-step-hud';
            hud.style.position = 'fixed';
            hud.style.top = '12px';
            hud.style.left = '12px';
            hud.style.right = '12px';
            hud.style.zIndex = '999999';
            hud.style.padding = '8px 12px';
            hud.style.borderRadius = '12px';
            hud.style.backdropFilter = 'blur(16px)';
            hud.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.35)';
            hud.style.fontFamily = 'system-ui, -apple-system, sans-serif';
            hud.style.display = 'flex';
            hud.style.flexDirection = 'column';
            hud.style.gap = '2px';
            hud.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
            hud.style.pointerEvents = 'none';
            document.body.appendChild(hud);
          }

          hud.style.background = 'rgba(15, 23, 42, 0.88)';
          hud.style.border = `1.5px solid ${color}`;
          hud.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="background: ${color}; color: #ffffff; font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 9999px; letter-spacing: 0.05em; text-transform: uppercase;">
                ${stepNum}
              </span>
              <span style="color: rgba(255, 255, 255, 0.6); font-size: 10px; font-weight: 600; letter-spacing: 0.02em;">
                BitePass · Autonomous Micro-Commerce
              </span>
            </div>
            <div style="color: #ffffff; font-size: 12px; font-weight: 700; margin-top: 2px; letter-spacing: -0.01em;">
              ${title}
            </div>
            <div style="color: #94a3b8; font-size: 10px; font-weight: 500;">
              ${subtitle}
            </div>
          `;
        },
        { stepNum, title, subtitle, color }
      );
    };

    // =========================================================================
    // STEP 1: Autonomous Ambient Intent (00:00 - 00:05)
    // =========================================================================
    await page.goto('/?scenario=lunch');
    await expect(page.locator('text=BitePass').first()).toBeVisible();

    // Ensure clean state if a previous simulation left an active ticket
    const resetSimulationBtn = page.locator('button:has-text("Reset Simulation")');
    if (await resetSimulationBtn.isVisible()) {
      await resetSimulationBtn.click();
      await page.waitForTimeout(800);
    }

    await setStepLabel(
      'STEP 01/05',
      'Autonomous Ambient Proposal',
      'Gemini 4 Argon: 35m Gap · 180m Distance · Omnivore Profile',
      '#6366F1'
    );
    await page.waitForTimeout(2200);

    // =========================================================================
    // STEP 2: 3-Second Tactile Customization (00:05 - 00:10)
    // =========================================================================
    await setStepLabel(
      'STEP 02/05',
      '3-Second Tactile Customization',
      'Instant Recalculation: Side Salad +$1.50 · Dynamic Subtotal $16.00',
      '#D97706'
    );
    const saladTweak = page.locator('button:has-text("Arugula Citrus Side Salad")');
    if (await saladTweak.isVisible()) {
      await saladTweak.click();
      await page.waitForTimeout(1600);
      await expect(page.locator('#paypal-one-tap-button:has-text("$16.00")')).toBeVisible();
    }
    await page.waitForTimeout(1000);

    // =========================================================================
    // STEP 3: Phase 1 PayPal Escrow Hold (00:10 - 00:17)
    // =========================================================================
    await setStepLabel(
      'STEP 03/05',
      'Phase 1: PayPal Escrow Pre-Authorization',
      'PayPal Orders v2 (intent: "AUTHORIZE") · $0 Deducted · Cubby #D Locked',
      '#0070BA'
    );
    const paypalButton = page.locator('#paypal-one-tap-button');
    await expect(paypalButton).toBeVisible();
    await paypalButton.click();
    await page.waitForTimeout(1800);

    // Confirm Active Escrow Ticket
    await expect(page.locator('text=Escrow Authorized')).toBeVisible();
    await expect(page.locator("text=Jack's Cafe is Assembling")).toBeVisible();
    await page.waitForTimeout(2500);

    // =========================================================================
    // STEP 4: Doorstep Geofence Auto-Capture (00:17 - 00:23)
    // =========================================================================
    await setStepLabel(
      'STEP 04/05',
      'Phase 2: Contactless Doorstep Capture (<50m)',
      'PayPal Auth Capture · FASTPASS QR Code Unlocked · Zero Line',
      '#10B981'
    );
    const arriveButton = page.locator('button:has-text("Simulate Arrival at Doorstep")');
    await expect(arriveButton).toBeVisible();
    await arriveButton.click();
    await page.waitForTimeout(2200);

    await expect(page.locator('text=Doorstep Arrival Verified')).toBeVisible();
    await expect(page.getByText('FASTPASS', { exact: true })).toBeVisible();
    await page.waitForTimeout(1800);

    // =========================================================================
    // STEP 5: AG Grid Real-Time KDS Telemetry (00:23 - 00:30)
    // =========================================================================
    await setStepLabel(
      'STEP 05/05',
      'AG Grid Live Kitchen Operations',
      'ag-grid-react v33 (Quartz) · Live Ticket Transition: CAPTURED / SETTLED',
      '#0EA5E9'
    );
    const queueTab = page
      .locator('button:has-text("View Kitchen Operations")')
      .or(page.locator('button:has-text("Kitchen Queue")'))
      .or(page.locator('button:has-text("Queue")'))
      .first();
    await queueTab.click();
    await page.waitForTimeout(2000);
    await expect(page.locator('text=Merchant Kitchen Operations')).toBeVisible();
    await page.waitForTimeout(2500);
  });
});


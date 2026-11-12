import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function generateAssets() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // 1. Render Icon to 1024x1024 PNG
  console.log('Rendering demo/icon.png...');
  await page.setViewportSize({ width: 1024, height: 1024 });
  const svgPath = path.resolve('demo/icon.svg');
  await page.goto(`file://${svgPath}`);
  await page.screenshot({
    path: 'demo/icon.png',
    omitBackground: true,
  });
  console.log('demo/icon.png rendered successfully.');

  // Render Terracotta Icon
  const svgTerracottaPath = path.resolve('demo/icon_flat_terracotta.svg');
  await page.goto(`file://${svgTerracottaPath}`);
  await page.screenshot({
    path: 'demo/icon_flat_terracotta.png',
    omitBackground: false,
  });
  console.log('demo/icon_flat_terracotta.png rendered successfully.');

  // 2. Read screenshots for embedding in composite thumbnail
  const screen1Base64 = fs.readFileSync('demo/screenshot_01_proactive_recommendation.png').toString('base64');
  const screen3Base64 = fs.readFileSync('demo/screenshot_03_doorstep_fastpass.png').toString('base64');
  const iconBase64 = fs.readFileSync('demo/icon.png').toString('base64');

  // 3. Render 1920x1080 YC-Polished Marketing Hero Thumbnail
  console.log('Rendering YC-reviewed demo/thumbnail.png (1920x1080)...');
  const thumbPage = await browser.newPage();
  await thumbPage.setViewportSize({ width: 1920, height: 1080 });

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: 1920px;
        height: 1080px;
        background: radial-gradient(circle at 68% 28%, #FFFFFF 0%, #FAF9F5 42%, #F4F1EA 80%, #E8E4DA 100%);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        color: #1C1917;
        overflow: hidden;
        display: flex;
        position: relative;
        -webkit-font-smoothing: antialiased;
      }

      /* Subtle Warm Culinary Grid & Atmospheric Light */
      .bg-grid {
        position: absolute;
        inset: 0;
        background-image: 
          linear-gradient(to right, rgba(191, 62, 33, 0.035) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(191, 62, 33, 0.035) 1px, transparent 1px);
        background-size: 52px 52px;
        mask-image: radial-gradient(circle at 55% 50%, black 55%, transparent 90%);
      }

      .glow-orb-terracotta {
        position: absolute;
        top: -120px;
        left: 200px;
        width: 700px;
        height: 700px;
        background: radial-gradient(circle, rgba(191, 62, 33, 0.10) 0%, transparent 68%);
        filter: blur(85px);
      }

      .glow-orb-amber {
        position: absolute;
        bottom: -100px;
        right: 150px;
        width: 800px;
        height: 800px;
        background: radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, rgba(4, 120, 87, 0.07) 50%, transparent 70%);
        filter: blur(95px);
      }

      /* Content Columns */
      .left-col {
        width: 53.5%;
        height: 100%;
        padding: 80px 50px 70px 90px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        z-index: 10;
      }

      .right-col {
        width: 46.5%;
        height: 100%;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
      }

      /* Header & Branding Row */
      .brand-row {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .brand-icon {
        width: 68px;
        height: 68px;
        border-radius: 17px;
        box-shadow: 0 8px 24px -4px rgba(191, 62, 33, 0.22), 0 0 0 1px #EAE7DF;
      }

      .brand-name {
        font-size: 38px;
        font-weight: 800;
        letter-spacing: -0.035em;
        color: #1C1917;
        line-height: 1;
      }

      .brand-name span {
        color: #BF3E21;
      }

      .tagline-pill {
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: #BF3E21;
        padding: 5px 12px;
        border-radius: 9999px;
        background: rgba(191, 62, 33, 0.08);
        border: 1.5px solid rgba(191, 62, 33, 0.25);
      }

      /* Hackathon & Track Eyebrow Pill */
      .eyebrow-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 7px 15px;
        border-radius: 9999px;
        background: #FFFFFF;
        border: 1.5px solid #EAE7DF;
        box-shadow: 0 2px 8px rgba(28, 25, 23, 0.04);
        color: #57534E;
        font-size: 12.5px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        margin-top: 22px;
        width: fit-content;
      }

      .eyebrow-badge strong {
        color: #BF3E21;
      }

      /* Hero Headlines (YC-Grade Typography) */
      .headline {
        font-size: 64px;
        font-weight: 900;
        line-height: 1.05;
        letter-spacing: -0.04em;
        margin-top: 16px;
        color: #1C1917;
      }

      .headline-accent {
        background: linear-gradient(135deg, #BF3E21 0%, #D97706 70%, #E05A38 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .subtitle {
        font-size: 19.5px;
        line-height: 1.5;
        color: #57534E;
        margin-top: 16px;
        max-width: 660px;
        font-weight: 450;
      }

      .subtitle strong {
        color: #1C1917;
        font-weight: 700;
      }

      /* Value Proposition Cards (High-Contrast White Porcelain) */
      .feature-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 14px;
        margin-top: 28px;
        max-width: 720px;
      }

      .feature-card {
        background: #FFFFFF;
        border: 1.5px solid #EAE7DF;
        border-radius: 18px;
        padding: 16px 18px;
        box-shadow: 0 10px 25px -8px rgba(28, 25, 23, 0.07);
        transition: transform 0.2s ease;
      }

      .feature-val {
        font-size: 24px;
        font-weight: 900;
        letter-spacing: -0.03em;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .feature-lbl {
        font-size: 12.5px;
        color: #78716C;
        margin-top: 4px;
        font-weight: 600;
        line-height: 1.3;
      }

      /* Sponsors / Enterprise Tech Footer */
      .sponsors-row {
        display: flex;
        align-items: center;
        gap: 28px;
        padding-top: 22px;
        border-top: 1.5px solid #EAE7DF;
      }

      .sponsor-pill {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        color: #44403C;
        font-weight: 700;
      }

      .sponsor-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
      }

      /* Mobile Device Mockup Frames */
      .phone-mockup-main {
        position: absolute;
        width: 412px;
        height: 874px;
        border-radius: 48px;
        background: #FFFFFF;
        border: 4px solid #D6D3D1;
        box-shadow: 
          0 35px 80px -15px rgba(28, 25, 23, 0.25),
          0 12px 32px -6px rgba(191, 62, 33, 0.12);
        overflow: hidden;
        transform: rotate(-3.5deg) translateY(12px);
        z-index: 20;
      }

      .phone-mockup-main img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .phone-mockup-secondary {
        position: absolute;
        width: 382px;
        height: 814px;
        border-radius: 44px;
        background: #FFFFFF;
        border: 3.5px solid #E7E5E4;
        box-shadow: 
          0 28px 65px -15px rgba(28, 25, 23, 0.18),
          0 10px 28px -6px rgba(4, 120, 87, 0.14);
        overflow: hidden;
        transform: rotate(6.5deg) translate(145px, 42px);
        z-index: 15;
        opacity: 0.95;
      }

      .phone-mockup-secondary img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      /* Floating Verified Badge (Artisan Emerald Seal) */
      .floating-tag {
        position: absolute;
        bottom: 84px;
        right: 165px;
        z-index: 30;
        background: #FFFFFF;
        border: 1.5px solid #047857;
        padding: 13px 20px;
        border-radius: 20px;
        box-shadow: 0 18px 40px -8px rgba(4, 120, 87, 0.28);
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .verified-check {
        width: 32px;
        height: 32px;
        background: #047857;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 900;
        color: white;
        font-size: 18px;
      }
    </style>
  </head>
  <body>
    <div class="bg-grid"></div>
    <div class="glow-orb-terracotta"></div>
    <div class="glow-orb-amber"></div>

    <!-- Left Column: Copy & Value Proposition -->
    <div class="left-col">
      <div>
        <!-- Brand Header Row -->
        <div class="brand-row">
          <img class="brand-icon" src="data:image/png;base64,${iconBase64}" alt="Icon" />
          <div style="display: flex; align-items: center; gap: 14px;">
            <div class="brand-name">Bite<span>Pass</span></div>
            <div class="tagline-pill">THE CULINARY FAST PASS</div>
          </div>
        </div>

        <!-- Track Eyebrow -->
        <div class="eyebrow-badge">
          ⚡ <strong>PayPal AI Agent Track</strong> &middot; AG Grid Observability Track
        </div>

        <!-- Hero Headline -->
        <h1 class="headline">
          Zero Lines.<br />
          Zero Menus.<br />
          <span class="headline-accent">The Culinary Fast Pass.</span>
        </h1>

        <!-- High-Converting Subtitle -->
        <p class="subtitle">
          BitePass monitors calendar gaps, checks kitchen prep schedules, and serves a <strong>1-tap lunch pass</strong> before you get hungry. <strong>Auto-settles within 50m of the cafe.</strong> Fresh hot food ready at the exact second you arrive.
        </p>

        <!-- Feature Metric Cards (3 Proof Points) -->
        <div class="feature-grid">
          <div class="feature-card">
            <div class="feature-val" style="color: #BF3E21;">35 Min</div>
            <div class="feature-lbl">Calendar Gap Proactively Detected</div>
          </div>
          <div class="feature-card">
            <div class="feature-val" style="color: #047857;">$0.00</div>
            <div class="feature-lbl">Risk-Free Escrow Pre-Auth Hold</div>
          </div>
          <div class="feature-card">
            <div class="feature-val" style="color: #D97706;">&lt; 50m</div>
            <div class="feature-lbl">Doorstep Contactless Auto-Capture</div>
          </div>
        </div>
      </div>

      <!-- Partner / Sponsor Verification Bar -->
      <div class="sponsors-row">
        <div class="sponsor-pill">
          <span class="sponsor-dot" style="background: #0070BA; box-shadow: 0 0 8px #0070BA;"></span>
          PayPal Orders v2 Auth
        </div>
        <div class="sponsor-pill">
          <span class="sponsor-dot" style="background: #BF3E21; box-shadow: 0 0 8px #BF3E21;"></span>
          Gemini 4 Argon
        </div>
        <div class="sponsor-pill">
          <span class="sponsor-dot" style="background: #047857; box-shadow: 0 0 8px #047857;"></span>
          AG Grid React v33
        </div>
      </div>
    </div>

    <!-- Right Column: Interactive Phone Mockups -->
    <div class="right-col">
      <!-- Background Phone: Contactless FASTPASS QR Arrival -->
      <div class="phone-mockup-secondary">
        <img src="data:image/png;base64,${screen3Base64}" alt="FASTPASS" />
      </div>

      <!-- Foreground Phone: Proactive Culinary Recommendation -->
      <div class="phone-mockup-main">
        <img src="data:image/png;base64,${screen1Base64}" alt="Proactive Recommendation" />
      </div>

      <!-- Floating Verified Badge (Artisan Emerald Seal) -->
      <div class="floating-tag">
        <div class="verified-check">✓</div>
        <div>
          <div style="font-size: 14px; font-weight: 800; color: #1C1917;">Contactless Proximity Settled</div>
          <div style="font-size: 11px; color: #57534E; font-weight: 600;">FASTPASS Cubby #D Unlocked &middot; &lt;50m</div>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;

  await thumbPage.setContent(html, { waitUntil: 'load' });
  await thumbPage.screenshot({
    path: 'demo/thumbnail.png',
  });
  console.log('demo/thumbnail.png rendered successfully.');

  // Standalone best in-app screen
  fs.copyFileSync('demo/screenshot_01_proactive_recommendation.png', 'demo/thumbnail_app_best.png');
  console.log('demo/thumbnail_app_best.png saved.');

  await browser.close();
}

generateAssets().catch((err) => {
  console.error('Error generating assets:', err);
  process.exit(1);
});

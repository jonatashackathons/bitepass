import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function generateVideoThumbnail() {
  const browser = await chromium.launch();
  const thumbPage = await browser.newPage();
  await thumbPage.setViewportSize({ width: 1920, height: 1080 });

  const screen1Base64 = fs.readFileSync('demo/screenshot_01_proactive_recommendation.png').toString('base64');
  const screen3Base64 = fs.readFileSync('demo/screenshot_03_doorstep_fastpass.png').toString('base64');
  const iconBase64 = fs.readFileSync('demo/icon.png').toString('base64');

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
        background: radial-gradient(circle at 65% 30%, #FFFFFF 0%, #FAF9F5 40%, #F4F1EA 78%, #E7E3D8 100%);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        color: #1C1917;
        overflow: hidden;
        display: flex;
        position: relative;
        -webkit-font-smoothing: antialiased;
      }

      /* Subtle Warm Culinary Grid */
      .bg-grid {
        position: absolute;
        inset: 0;
        background-image: 
          linear-gradient(to right, rgba(191, 62, 33, 0.04) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(191, 62, 33, 0.04) 1px, transparent 1px);
        background-size: 52px 52px;
        mask-image: radial-gradient(circle at 55% 50%, black 60%, transparent 92%);
      }

      .glow-terracotta {
        position: absolute;
        top: -100px;
        left: 200px;
        width: 750px;
        height: 750px;
        background: radial-gradient(circle, rgba(191, 62, 33, 0.12) 0%, transparent 70%);
        filter: blur(90px);
      }

      .glow-emerald {
        position: absolute;
        bottom: -80px;
        right: 180px;
        width: 800px;
        height: 800px;
        background: radial-gradient(circle, rgba(4, 120, 87, 0.10) 0%, rgba(245, 158, 11, 0.08) 50%, transparent 70%);
        filter: blur(100px);
      }

      /* Layout */
      .left-col {
        width: 53%;
        height: 100%;
        padding: 85px 50px 75px 95px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        z-index: 10;
      }

      .right-col {
        width: 47%;
        height: 100%;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
      }

      /* Brand Header */
      .brand-row {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .brand-icon {
        width: 72px;
        height: 72px;
        border-radius: 18px;
        box-shadow: 0 8px 24px -4px rgba(191, 62, 33, 0.22), 0 0 0 1px #EAE7DF;
      }

      .brand-name {
        font-size: 40px;
        font-weight: 800;
        letter-spacing: -0.035em;
        color: #1C1917;
        line-height: 1;
      }

      .brand-name span {
        color: #BF3E21;
      }

      .tagline-pill {
        font-size: 11.5px;
        font-weight: 800;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: #BF3E21;
        padding: 5px 14px;
        border-radius: 9999px;
        background: rgba(191, 62, 33, 0.08);
        border: 1.5px solid rgba(191, 62, 33, 0.28);
      }

      /* YC Investor Eyebrow */
      .yc-eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 8px 18px;
        border-radius: 9999px;
        background: #FFFFFF;
        border: 1.5px solid #EAE7DF;
        box-shadow: 0 4px 12px rgba(28, 25, 23, 0.05);
        color: #44403C;
        font-size: 13.5px;
        font-weight: 800;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        margin-top: 24px;
        width: fit-content;
      }

      .yc-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #FB923C;
        box-shadow: 0 0 8px #FB923C;
      }

      /* Headline (Giant, High CTR) */
      .headline {
        font-size: 68px;
        font-weight: 900;
        line-height: 1.04;
        letter-spacing: -0.04em;
        margin-top: 18px;
        color: #1C1917;
      }

      .headline-accent {
        background: linear-gradient(135deg, #BF3E21 0%, #D97706 65%, #E05A38 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .subtitle {
        font-size: 21px;
        line-height: 1.48;
        color: #57534E;
        margin-top: 18px;
        max-width: 660px;
        font-weight: 450;
      }

      .subtitle strong {
        color: #1C1917;
        font-weight: 700;
      }

      /* 3 Proof-Point Metric Cards */
      .feature-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 14px;
        margin-top: 30px;
        max-width: 720px;
      }

      .feature-card {
        background: #FFFFFF;
        border: 1.5px solid #EAE7DF;
        border-radius: 18px;
        padding: 16px 18px;
        box-shadow: 0 10px 25px -8px rgba(28, 25, 23, 0.07);
      }

      .feature-val {
        font-size: 26px;
        font-weight: 900;
        letter-spacing: -0.03em;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .feature-lbl {
        font-size: 13px;
        color: #78716C;
        margin-top: 4px;
        font-weight: 600;
        line-height: 1.25;
      }

      /* Video Watch Time Pill */
      .play-badge {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 10px 20px;
        border-radius: 9999px;
        background: #1C1917;
        color: #FFFFFF;
        font-size: 14px;
        font-weight: 800;
        letter-spacing: 0.02em;
        margin-top: 26px;
        width: fit-content;
        box-shadow: 0 10px 25px rgba(28, 25, 23, 0.25);
      }

      .play-triangle {
        width: 0;
        height: 0;
        border-top: 6px solid transparent;
        border-bottom: 6px solid transparent;
        border-left: 10px solid #FFFFFF;
      }

      /* Sponsors Footer */
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
        font-size: 14.5px;
        color: #44403C;
        font-weight: 700;
      }

      .sponsor-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
      }

      /* Right Mockup Phone Devices */
      .phone-mockup-main {
        position: absolute;
        width: 416px;
        height: 882px;
        border-radius: 48px;
        background: #FFFFFF;
        border: 4px solid #D6D3D1;
        box-shadow: 
          0 35px 85px -15px rgba(28, 25, 23, 0.28),
          0 12px 32px -6px rgba(191, 62, 33, 0.14);
        overflow: hidden;
        transform: rotate(-3.5deg) translateY(10px);
        z-index: 20;
      }

      .phone-mockup-main img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .phone-mockup-secondary {
        position: absolute;
        width: 386px;
        height: 820px;
        border-radius: 44px;
        background: #FFFFFF;
        border: 3.5px solid #E7E5E4;
        box-shadow: 
          0 28px 65px -15px rgba(28, 25, 23, 0.18),
          0 10px 28px -6px rgba(4, 120, 87, 0.15);
        overflow: hidden;
        transform: rotate(6.5deg) translate(145px, 40px);
        z-index: 15;
        opacity: 0.95;
      }

      .phone-mockup-secondary img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      /* Floating Emerald Arrival Seal */
      .floating-tag {
        position: absolute;
        bottom: 84px;
        right: 160px;
        z-index: 30;
        background: #FFFFFF;
        border: 1.5px solid #047857;
        padding: 14px 22px;
        border-radius: 20px;
        box-shadow: 0 18px 40px -8px rgba(4, 120, 87, 0.32);
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .verified-check {
        width: 34px;
        height: 34px;
        background: #047857;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 900;
        color: white;
        font-size: 19px;
      }
    </style>
  </head>
  <body>
    <div class="bg-grid"></div>
    <div class="glow-terracotta"></div>
    <div class="glow-emerald"></div>

    <!-- Left Column: High-Impact YC Pitch Hook -->
    <div class="left-col">
      <div>
        <div class="brand-row">
          <img class="brand-icon" src="data:image/png;base64,${iconBase64}" alt="Icon" />
          <div style="display: flex; align-items: center; gap: 14px;">
            <div class="brand-name">Bite<span>Pass</span></div>
            <div class="tagline-pill">THE CULINARY FAST PASS</div>
          </div>
        </div>

        <div class="yc-eyebrow">
          <span class="yc-dot"></span>
          YC Investor Pitch &middot; 35s Walkthrough
        </div>

        <h1 class="headline">
          Zero Lines.<br />
          Zero Menus.<br />
          <span class="headline-accent">The Culinary Fast Pass.</span>
        </h1>

        <p class="subtitle">
          Autonomous micro-commerce that detects calendar gaps, models kitchen prep time, and auto-settles via <strong>PayPal 2-Phase Escrow within 50m of the cafe</strong>. Fresh hot lunch ready at the doorstep.
        </p>

        <!-- Proof Points -->
        <div class="feature-grid">
          <div class="feature-card">
            <div class="feature-val" style="color: #BF3E21;">35 Min</div>
            <div class="feature-lbl">Calendar Gap Detected</div>
          </div>
          <div class="feature-card">
            <div class="feature-val" style="color: #047857;">$0.00</div>
            <div class="feature-lbl">Risk-Free Escrow Hold</div>
          </div>
          <div class="feature-card">
            <div class="feature-val" style="color: #D97706;">&lt; 50m</div>
            <div class="feature-lbl">Doorstep Auto-Capture</div>
          </div>
        </div>

        <div class="play-badge">
          <span class="play-triangle"></span>
          WATCH DEMO &middot; 0:36
        </div>
      </div>

      <!-- Sponsor Badges -->
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
      <!-- Background Phone: FASTPASS QR Arrival -->
      <div class="phone-mockup-secondary">
        <img src="data:image/png;base64,${screen3Base64}" alt="FASTPASS" />
      </div>

      <!-- Foreground Phone: Proactive Culinary Recommendation -->
      <div class="phone-mockup-main">
        <img src="data:image/png;base64,${screen1Base64}" alt="Proactive Recommendation" />
      </div>

      <!-- Floating Doorstep Verified Badge -->
      <div class="floating-tag">
        <div class="verified-check">✓</div>
        <div>
          <div style="font-size: 14.5px; font-weight: 800; color: #1C1917;">Contactless Proximity Settled</div>
          <div style="font-size: 11px; color: #57534E; font-weight: 600;">FASTPASS Cubby #D Unlocked &middot; &lt;50m</div>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;

  await thumbPage.setContent(html, { waitUntil: 'load' });
  await thumbPage.screenshot({
    path: 'demo/video_thumbnail_yc.png',
  });
  console.log('demo/video_thumbnail_yc.png rendered successfully.');

  // Also update demo/thumbnail.png with this highest standard
  fs.copyFileSync('demo/video_thumbnail_yc.png', 'demo/thumbnail.png');
  console.log('demo/thumbnail.png updated with YC video thumbnail standard.');

  await browser.close();
}

generateVideoThumbnail().catch((err) => {
  console.error('Error generating video thumbnail:', err);
  process.exit(1);
});


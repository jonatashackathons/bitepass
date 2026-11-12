import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function generateYoutubeThumbnails() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 720 });

  const appFrame1Base64 = fs.readFileSync('demo/frames_analysis/app_frame1.png').toString('base64');
  const appHeroBase64 = fs.readFileSync('demo/thumbnail_app_best.png').toString('base64');
  const scenarioFrame1Base64 = fs.readFileSync('demo/frames_analysis/scenario_frame1.png').toString('base64');
  const scenarioFrame2Base64 = fs.readFileSync('demo/frames_analysis/scenario_frame2.png').toString('base64');
  const iconBase64 = fs.readFileSync('demo/icon.png').toString('base64');

  // =========================================================================
  // THUMBNAIL 1 (SHORTS - 9:16 Vertical 1080x1920): demo/thumbnail_video_app.png
  // Optimized for YouTube Shorts feed & mobile display
  // =========================================================================
  await page.setViewportSize({ width: 1080, height: 1920 });

  const htmlShorts = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: 1080px;
        height: 1920px;
        background: radial-gradient(circle at 50% 18%, #FFFFFF 0%, #FAF9F5 35%, #F4F1EA 70%, #E8E4DA 100%);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        color: #1C1917;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        padding: 130px 60px 110px 60px;
        position: relative;
        -webkit-font-smoothing: antialiased;
      }
      .bg-grid {
        position: absolute;
        inset: 0;
        background-image: 
          linear-gradient(to right, rgba(191, 62, 33, 0.04) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(191, 62, 33, 0.04) 1px, transparent 1px);
        background-size: 48px 48px;
      }
      .top-section {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        z-index: 10;
      }
      .brand-row {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 24px;
      }
      .brand-icon {
        width: 68px;
        height: 68px;
        border-radius: 18px;
        box-shadow: 0 10px 24px rgba(191, 62, 33, 0.25);
      }
      .brand-text {
        font-size: 42px;
        font-weight: 800;
        letter-spacing: -0.03em;
      }
      .brand-text span { color: #BF3E21; }
      .pill {
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: #BF3E21;
        background: rgba(191, 62, 33, 0.08);
        border: 2px solid rgba(191, 62, 33, 0.25);
        padding: 6px 16px;
        border-radius: 9999px;
      }
      .headline {
        font-size: 74px;
        font-weight: 900;
        line-height: 1.05;
        letter-spacing: -0.04em;
        margin-bottom: 20px;
      }
      .headline-accent {
        background: linear-gradient(135deg, #BF3E21 0%, #D97706 70%, #E05A38 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .sub {
        font-size: 26px;
        line-height: 1.35;
        color: #57534E;
        max-width: 860px;
        font-weight: 500;
      }
      .sub strong {
        color: #1C1917;
        font-weight: 800;
      }
      .center-section {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        z-index: 10;
        margin: 20px 0;
      }
      .phone-container {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .phone-frame {
        width: 440px;
        height: 780px;
        border-radius: 52px;
        border: 5px solid #D6D3D1;
        box-shadow: 0 35px 80px -15px rgba(28, 25, 23, 0.32), 0 15px 40px -5px rgba(191, 62, 33, 0.2);
        overflow: hidden;
        background: #FFFFFF;
        transform: rotate(1.5deg);
      }
      .phone-frame img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .floating-tag-top {
        position: absolute;
        top: 40px;
        right: -35px;
        background: #FFFFFF;
        border: 2px solid #0070BA;
        border-radius: 20px;
        padding: 14px 22px;
        box-shadow: 0 16px 36px rgba(0, 112, 186, 0.25);
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 19px;
        font-weight: 800;
        color: #0070BA;
        z-index: 25;
        transform: rotate(-3deg);
      }
      .floating-tag-bottom {
        position: absolute;
        bottom: 50px;
        left: -35px;
        background: #047857;
        border-radius: 20px;
        padding: 14px 22px;
        box-shadow: 0 16px 36px rgba(4, 120, 87, 0.3);
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 19px;
        font-weight: 800;
        color: #FFFFFF;
        z-index: 25;
        transform: rotate(3deg);
      }
      .bottom-section {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 24px;
        z-index: 10;
      }
      .metrics-row {
        display: flex;
        gap: 18px;
        width: 100%;
        max-width: 920px;
      }
      .metric-card {
        flex: 1;
        background: #FFFFFF;
        border: 2px solid #EAE7DF;
        border-radius: 20px;
        padding: 18px 14px;
        text-align: center;
        box-shadow: 0 8px 20px rgba(28, 25, 23, 0.05);
      }
      .metric-val {
        font-size: 34px;
        font-weight: 900;
        color: #BF3E21;
        line-height: 1.1;
      }
      .metric-lbl {
        font-size: 14px;
        color: #78716C;
        font-weight: 700;
        margin-top: 4px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .value-props {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 28px;
        padding-top: 24px;
        border-top: 2px solid #EAE7DF;
        font-size: 20px;
        font-weight: 800;
        color: #44403C;
        width: 100%;
      }
      .value-props span {
        display: flex;
        align-items: center;
        gap: 8px;
      }
    </style>
  </head>
  <body>
    <div class="bg-grid"></div>

    <div class="top-section">
      <div class="brand-row">
        <img class="brand-icon" src="data:image/png;base64,${iconBase64}" />
        <div class="brand-text">Bite<span>Pass</span></div>
        <div class="pill">THE CULINARY FAST PASS</div>
      </div>
      <h1 class="headline">
        The 1-Tap Lunch<br />
        <span class="headline-accent">That Orders Itself.</span>
      </h1>
      <p class="sub">
        Spots 35m calendar gaps. <strong>$0 charged</strong> until you arrive. Fresh artisan meal waiting in a heated pickup cubby.
      </p>
    </div>

    <div class="center-section">
      <div class="phone-container">
        <div class="phone-frame">
          <img src="data:image/png;base64,${appHeroBase64}" />
        </div>
        <div class="floating-tag-top">
          <span>⚡</span> $0 Charged Until Arrival
        </div>
        <div class="floating-tag-bottom">
          <span>✓</span> 0-Second Line Wait
        </div>
      </div>
    </div>

    <div class="bottom-section">
      <div class="metrics-row">
        <div class="metric-card">
          <div class="metric-val">35 Min</div>
          <div class="metric-lbl">Lunch Window Found</div>
        </div>
        <div class="metric-card">
          <div class="metric-val" style="color: #047857;">$0.00</div>
          <div class="metric-lbl">Charged Before Arrival</div>
        </div>
        <div class="metric-card">
          <div class="metric-val" style="color: #D97706;">&lt; 50m</div>
          <div class="metric-lbl">Grab &amp; Go Pickup</div>
        </div>
      </div>

      <div class="value-props">
        <span>✓ 0-Second Wait</span>
        <span>✓ $0 Markup</span>
        <span>✓ Grab &amp; Go</span>
      </div>
    </div>
  </body>
  </html>
  `;

  await page.setContent(htmlShorts, { waitUntil: 'load' });
  await page.screenshot({ path: 'demo/thumbnail_video_app.png' });
  console.log('demo/thumbnail_video_app.png (Shorts 1080x1920) rendered.');

  // Also render a 16:9 landscape version as backup: demo/thumbnail_video_app_16x9.png
  await page.setViewportSize({ width: 1280, height: 720 });
  const html1 = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: 1280px;
        height: 720px;
        background: radial-gradient(circle at 70% 30%, #FFFFFF 0%, #FAF9F5 45%, #F4F1EA 80%, #E8E4DA 100%);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        color: #1C1917;
        overflow: hidden;
        display: flex;
        position: relative;
        -webkit-font-smoothing: antialiased;
      }
      .bg-grid {
        position: absolute;
        inset: 0;
        background-image: 
          linear-gradient(to right, rgba(191, 62, 33, 0.04) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(191, 62, 33, 0.04) 1px, transparent 1px);
        background-size: 40px 40px;
      }
      .left-col {
        width: 58%;
        height: 100%;
        padding: 55px 40px 50px 65px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        z-index: 10;
      }
      .right-col {
        width: 42%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        z-index: 10;
      }
      .badge-row {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .brand-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        box-shadow: 0 6px 16px rgba(191, 62, 33, 0.2);
      }
      .brand-text {
        font-size: 26px;
        font-weight: 800;
        letter-spacing: -0.03em;
      }
      .brand-text span { color: #BF3E21; }
      .pill {
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: #BF3E21;
        background: rgba(191, 62, 33, 0.08);
        border: 1.5px solid rgba(191, 62, 33, 0.25);
        padding: 4px 10px;
        border-radius: 9999px;
      }
      .headline {
        font-size: 54px;
        font-weight: 900;
        line-height: 1.05;
        letter-spacing: -0.04em;
        margin-top: 14px;
      }
      .headline-accent {
        background: linear-gradient(135deg, #BF3E21 0%, #D97706 70%, #E05A38 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .sub {
        font-size: 16px;
        line-height: 1.45;
        color: #57534E;
        margin-top: 12px;
        max-width: 580px;
        font-weight: 500;
      }
      .metrics-row {
        display: flex;
        gap: 12px;
        margin-top: 20px;
      }
      .metric-card {
        background: #FFFFFF;
        border: 1.5px solid #EAE7DF;
        border-radius: 14px;
        padding: 12px 14px;
        box-shadow: 0 6px 16px -4px rgba(28, 25, 23, 0.06);
      }
      .metric-val {
        font-size: 18px;
        font-weight: 900;
        color: #BF3E21;
      }
      .metric-lbl {
        font-size: 11px;
        color: #78716C;
        font-weight: 600;
      }
      .value-props {
        display: flex;
        align-items: center;
        gap: 24px;
        padding-top: 18px;
        border-top: 1.5px solid #EAE7DF;
        font-size: 13.5px;
        font-weight: 700;
        color: #44403C;
      }
      .value-props span {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .phone-frame {
        width: 320px;
        height: 600px;
        border-radius: 40px;
        border: 3.5px solid #D6D3D1;
        box-shadow: 0 25px 60px -10px rgba(28, 25, 23, 0.28), 0 10px 25px -4px rgba(191, 62, 33, 0.15);
        overflow: hidden;
        background: #FFFFFF;
        transform: rotate(2.5deg);
      }
      .phone-frame img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .floating-tag {
        position: absolute;
        bottom: 55px;
        left: 30px;
        background: #FFFFFF;
        border: 1.5px solid #0070BA;
        border-radius: 16px;
        padding: 10px 16px;
        box-shadow: 0 12px 28px rgba(0, 112, 186, 0.2);
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        font-weight: 800;
        color: #0070BA;
        z-index: 25;
      }
    </style>
  </head>
  <body>
    <div class="bg-grid"></div>
    <div class="left-col">
      <div>
        <div class="badge-row">
          <img class="brand-icon" src="data:image/png;base64,${iconBase64}" />
          <div class="brand-text">Bite<span>Pass</span></div>
          <div class="pill">THE CULINARY FAST PASS</div>
        </div>
        <h1 class="headline">
          The 1-Tap Lunch<br />
          <span class="headline-accent">That Orders Itself.</span>
        </h1>
        <p class="sub">
          Detects 35m calendar gaps. $0 charged upfront until you arrive. Fresh artisan meal waiting in a heated cubby the second you walk in.
        </p>
        <div class="metrics-row">
          <div class="metric-card">
            <div class="metric-val">35 Min</div>
            <div class="metric-lbl">Lunch Window Found</div>
          </div>
          <div class="metric-card">
            <div class="metric-val" style="color: #047857;">$0.00</div>
            <div class="metric-lbl">Charged Before Arrival</div>
          </div>
          <div class="metric-card">
            <div class="metric-val" style="color: #D97706;">&lt; 50m</div>
            <div class="metric-lbl">Contactless Pickup</div>
          </div>
        </div>
      </div>
      <div class="value-props">
        <span>✓ 0-Second Line Wait</span>
        <span>✓ $0 Delivery Markup</span>
        <span>✓ Grab &amp; Go Pickup</span>
      </div>
    </div>
    <div class="right-col">
      <div class="phone-frame">
        <img src="data:image/png;base64,${appFrame1Base64}" />
      </div>
      <div class="floating-tag">
        <span>⚡</span> $0 Charged Until Arrival
      </div>
    </div>
  </body>
  </html>
  `;

  await page.setContent(html1, { waitUntil: 'load' });
  await page.screenshot({ path: 'demo/thumbnail_video_app_16x9.png' });
  console.log('demo/thumbnail_video_app_16x9.png rendered.');

  // =========================================================================
  // THUMBNAIL 2: bitepass_scenario.mp4 (Jack's Cafe Line vs Fast Pass)
  // =========================================================================
  const html2 = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: 1280px;
        height: 720px;
        background: #090D16;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        color: #FFFFFF;
        overflow: hidden;
        display: flex;
        position: relative;
        -webkit-font-smoothing: antialiased;
      }
      .bg-image {
        position: absolute;
        inset: 0;
        opacity: 0.42;
        filter: brightness(0.85) contrast(1.15);
      }
      .bg-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .overlay-gradient {
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, rgba(9, 13, 22, 0.95) 0%, rgba(9, 13, 22, 0.85) 45%, rgba(9, 13, 22, 0.4) 100%);
      }
      .left-col {
        width: 60%;
        height: 100%;
        padding: 55px 40px 50px 65px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        z-index: 10;
      }
      .right-col {
        width: 40%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        z-index: 10;
      }
      .badge-row {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .brand-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
      }
      .brand-text {
        font-size: 26px;
        font-weight: 800;
        color: #FFFFFF;
        letter-spacing: -0.03em;
      }
      .brand-text span { color: #E05A38; }
      .pill-red {
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #FFFFFF;
        background: #BF3E21;
        padding: 4px 12px;
        border-radius: 9999px;
      }
      .headline {
        font-size: 56px;
        font-weight: 900;
        line-height: 1.05;
        letter-spacing: -0.04em;
        margin-top: 14px;
      }
      .headline-accent {
        background: linear-gradient(135deg, #F59E0B 0%, #E05A38 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .sub {
        font-size: 16.5px;
        line-height: 1.45;
        color: #CBD5E1;
        margin-top: 12px;
        max-width: 580px;
      }
      .sub strong { color: #FFFFFF; }
      .cards-row {
        display: flex;
        gap: 12px;
        margin-top: 20px;
      }
      .card {
        background: rgba(15, 23, 42, 0.75);
        border: 1.5px solid rgba(255, 255, 255, 0.15);
        border-radius: 14px;
        padding: 12px 14px;
        backdrop-filter: blur(12px);
      }
      .card-val {
        font-size: 18px;
        font-weight: 900;
        color: #34D399;
      }
      .card-lbl {
        font-size: 11px;
        color: #94A3B8;
        font-weight: 600;
      }
      .value-props {
        display: flex;
        align-items: center;
        gap: 20px;
        padding-top: 18px;
        border-top: 1.5px solid rgba(255, 255, 255, 0.12);
        font-size: 13px;
        font-weight: 700;
        color: #CBD5E1;
      }
      .phone-handheld {
        width: 320px;
        height: 560px;
        border-radius: 36px;
        border: 3.5px solid rgba(255, 255, 255, 0.25);
        box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(16, 185, 129, 0.25);
        overflow: hidden;
        background: #000000;
        transform: rotate(-3deg);
      }
      .phone-handheld img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .verified-badge {
        position: absolute;
        bottom: 55px;
        right: 40px;
        background: rgba(10, 15, 29, 0.92);
        border: 1.5px solid #10B981;
        border-radius: 16px;
        padding: 10px 16px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        font-weight: 800;
        color: #FFFFFF;
        box-shadow: 0 10px 30px rgba(0,0,0,0.6);
        z-index: 25;
      }
    </style>
  </head>
  <body>
    <div class="bg-image">
      <img src="data:image/png;base64,${scenarioFrame2Base64}" />
    </div>
    <div class="overlay-gradient"></div>

    <div class="left-col">
      <div>
        <div class="badge-row">
          <img class="brand-icon" src="data:image/png;base64,${iconBase64}" />
          <div class="brand-text">Bite<span>Pass</span></div>
          <div class="pill-red">SKIP THE LINE</div>
        </div>

        <h1 class="headline">
          20 People in Line.<br />
          <span class="headline-accent">0 Seconds for You.</span>
        </h1>

        <p class="sub">
          Diners lose 25 minutes standing outside <strong>Jack's Cafe</strong>. BitePass auto-captures within <strong>50m</strong> and unlocks heated <strong>Pickup Cubby #D</strong>.
        </p>

        <div class="cards-row">
          <div class="card">
            <div class="card-val" style="color: #F87171;">25 Mins</div>
            <div class="card-lbl">Traditional Line Wait</div>
          </div>
          <div class="card">
            <div class="card-val" style="color: #34D399;">0 Sec</div>
            <div class="card-lbl">BitePass Doorstep Pickup</div>
          </div>
          <div class="card">
            <div class="card-val" style="color: #60A5FA;">&lt; 50m</div>
            <div class="card-lbl">Contactless Settlement</div>
          </div>
        </div>
      </div>

      <div class="value-props">
        <span>✓ 1-Tap Fast Pass</span>
        <span>✓ 0 Seconds in Line</span>
        <span>✓ Heated Cubby Unlock</span>
      </div>
    </div>

    <div class="right-col">
      <div class="phone-handheld">
        <img src="data:image/png;base64,${scenarioFrame1Base64}" />
      </div>
      <div class="verified-badge">
        <span style="color: #10B981;">✓</span> Doorstep Verified (<50m)
      </div>
    </div>
  </body>
  </html>
  `;

  await page.setContent(html2, { waitUntil: 'load' });
  await page.screenshot({ path: 'demo/thumbnail_video_scenario.png' });
  console.log('demo/thumbnail_video_scenario.png rendered.');

  await browser.close();
}

generateYoutubeThumbnails().catch((err) => {
  console.error('Error generating thumbnails:', err);
  process.exit(1);
});


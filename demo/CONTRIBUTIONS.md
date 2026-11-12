# 🛠️ BitePass — Creator Contributions & Design Portfolio

> A comprehensive summary of the architecture, product strategy, UI/UX design systems, financial state machines, and engineering deliverables created for **BitePass**.

---

## 🎨 1. Product Strategy & UX/UI System Design

### A. Autonomous Ambient Micro-Commerce UX (Mobile-First)
* **Conceived & Designed the Ambient Intent Paradigm:** Replaced the legacy "search $\to$ browse $\to$ cart $\to$ form-fill" funnel with a single-tap proactive push card triggered by calendar gaps and proximity.
* **Glassmorphic Culinary Design Language:** Designed an ultra-modern dark-mode design system utilizing `backdrop-blur-md bg-zinc-900/80`, high-contrast emerald/amber telemetry accents, and WCAG 2.1 AA accessible typography.
* **Floating Photo Scenario Badges:** Designed a space-saving micro-interaction that docks circular scenario shortcuts (`12:15 PM Lunch`, `Doorstep <50m`, `Vegan Swap`, `Late Crunch`) directly on the right edge of the hero food photo with hover/tap slide-out pills, keeping the 1-tap checkout strictly **above the fold**.
* **3-Second Tactile Customization Drawer:** Designed a minimalist 2-chip modification drawer that allows instant side swapping without menu cognitive overload, dynamically updating subtotals and nutritional data in real time.
* **Contactless FASTPASS QR Card:** Crafted the doorstep arrival experience with an illuminated emerald status badge, real-time Haversine distance badge, and scannable QR ticket for 0-second cubby handoffs.
* **Interactive Mobile Onboarding Walkthrough:** Authored and implemented the 4-step interactive onboarding modal (`MobileOnboardingGuide.tsx`) with illustrated slides explaining ambient monitoring, floating badges, escrow holds, and contactless pickup.

---

## 💳 2. Financial Architecture & PayPal 2-Phase Escrow

### A. 2-Phase Escrow State Machine Design
* **Phase 1 Pre-Authorization (`intent: "AUTHORIZE"`):** Designed the pre-auth checkout pipeline that leases a merchant station and holds funds in escrow without charging the diner during prep.
* **90-Second Grace Window & Spoilage Shield:** Engineered consumer-friendly financial guardrails:
  * Cancel within 0–90 seconds (`AUTHORIZED_QUEUED`): Immediate `$0.00` void with zero penalty.
  * Post-Fire cancellation (`KITCHEN_FIRED`): Implements a `$5.00` partial capture for merchant COGS recovery while returning the remainder to the consumer.
* **Phase 2 Contactless Doorstep Capture:** Designed automated payment settlement triggered strictly when the consumer crosses the `<50m` cafe threshold, verified via server-side Haversine kinematics.
* **Crash-Safe 3-Phase Settlement:** Engineered transactional safety transitioning from `CAPTURING` $\to$ PayPal API $\to$ `CAPTURED` to eliminate double-charges during network blips.
* **Zero Financial Hallucination Engine (`lib/pricing.ts`):** Enforced integer-cents arithmetic with basis-point municipal tax computation and strict tip matrices (`$0 | $1 | $2 | Custom`), ensuring AI never hallucinates prices or totals.

---

## 🍳 3. Merchant Kitchen Display System (KDS) & AG Grid

### A. Enterprise Kitchen Telemetry
* **AG Grid React v33 Quartz Integration:** Designed the high-density merchant dashboard (`/merchant`) with zero bundle leak to consumer mobile routes (`0 B` overhead).
* **Gloved Operator UX:** Designed high-visibility touch-target actions (`Accept & Fire`, `Ready -> Station`, `Settle & Unlock`, `Clear Bay`, `+5m Delay`, `86 Item`) calibrated for fast-paced commercial kitchens.
* **Live Bay Capacity Counter:** Engineered visual capacity tracking to prevent kitchen station overselling and auto-route orders into grab-and-go cubbies.
* **Server-Sent Events (SSE) Real-Time Transport:** Architected the scoped SSE stream (`/api/events`) with 15-second heartbeats and snapshot healing for live multi-terminal synchronization.

---

## 💻 4. Interactive Simulation & Evaluation Console

### A. Dual-Screen Judge Console (`/demo`)
* **Split-View Canvas:** Designed an all-in-one evaluation harness featuring a photorealistic iPhone hardware mockup on the left and an interactive control room with live AG Grid telemetry on the right.
* **Real-Time Scenario Sliders:** Built dynamic controls for calendar free-time (`10m` to `45m`), distance to cafe (`600m` to `<50m`), and one-click situational presets (`Lunch Window`, `Gluten-Free`, `Vegan Rush`, `Quiet Hours`).

---

## 🤖 5. Autonomous AI Engine & Allergen Safety

### A. Google Gemini 4 Argon Pipeline
* **Deterministic Structured JSON Output:** Built the prompt engineering and schema validation layer using `@google/genai` with `responseMimeType: 'application/json'`.
* **FDA Top-9 Allergen Exclusion:** Implemented hard pre-filtering guardrails before passing dishes to Gemini, preventing life-threatening cross-contamination or allergen mismatches.
* **Quiet-Hours Context Engine:** Architected the calendar inference logic that suppresses prompts when user calendar gaps fall below 30 minutes.

---

## 🏗️ 6. Fullstack Engineering & Reliability

* **Dual-Track Persistence Architecture:** Engineered dual storage drivers:
  * `STORAGE_DRIVER=memory`: Zero-Docker instantaneous local development experience.
  * `STORAGE_DRIVER=postgres`: Production multi-tenant PostgreSQL parity with Prisma ORM and `FOR UPDATE SKIP LOCKED` station leasing.
* **Automated Quality & E2E Test Suite:** Wrote comprehensive unit tests (Vitest) and Playwright slow-motion test scripts with automated video capture and responsive multi-device audit.


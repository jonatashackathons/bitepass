# Bypass.ai (Bitepass) — Agent & Development Instructions

> **Primary Model Target:** Gemini 4 Argon (`gemini-4-argon`)  
> **Development Harness:** Google Antigravity IDE  
> **Domain:** Agentic Micro-Commerce Engine (PayPal AI & AG Grid tracks)

---

## 1. Gemini 4 Argon Execution Profile

When operating as or configuring **Gemini 4 Argon** in this codebase:

* **Reasoning Depth (`thinkingLevel`):**
  * Use `high` for complex architecture, state machine verification (2-phase escrow holds, geofence capture), and multi-component wiring.
  * Use `medium` for route handlers, UI component drafting, and standard CRUD.
* **Deterministic Structured Outputs:**
  * Always use the official `@google/genai` SDK with `responseMimeType: 'application/json'` and strict `responseSchema` (using `Type` enums).
  * Do not rely on markdown code fences or prompt parsing for programmatic agent logic.
* **Long Context Utilization:**
  * Leverage the 1M token context window by referencing the full specifications in `docs/` (`Architectural Design & Rapid Engineering Blueprint.md`, `User Stories.md`, `User Experience (UX) features.md`) rather than guessing schemas.

---

## 2. Core Architecture: The "Zero-Latency" Monolith

* **Stack:** Fullstack **Next.js (App Router)** + **TypeScript** + **Tailwind CSS / Modern CSS**.
* **Zero Distributed Bloat (Ruthless YAGNI):** Everything runs inside the single Next.js project. No separate microservices, Docker swarm, Kafka, or heavy external databases.
* **In-Memory State & SSE:**
  * Merchant bay state, queue tickets, and active authorizations reside in a singleton in-memory kernel (`lib/store/state.ts` or similar).
  * Real-time client updates use Server-Sent Events (SSE) or simple local polling/React state synchronization.

---

## 3. The Dual-Viewport Split Console ("Judge Experience")

The frontend is specifically structured as a split screen designed to wow hackathon judges:

1. **Left Viewport (Consumer Ambient Experience):**
   * Realistic iPhone hardware frame.
   * State A: Ambient Lock Screen Push Card (Glassmorphic, time saved badge, proactive meal recommendation).
   * State B: 1-Tap PayPal Escrow Authorization (`#0070BA` CTA, micro-spinner, cubby ticket).
   * State C: Proximity Arrival Geofence Capture (Auto-settles payment, flashes green pickup alert).
2. **Right Viewport (Observability & Merchant Station):**
   * **Top:** **Judge Scenario Controller** (Interactive sliders for Meeting Gap, Distance to Cafe, Dietary Preferences).
   * **Bottom:** **Live Kitchen Queue (AG Grid)** showing real-time ticket state transitions: `PROPOSED` $\to$ `AUTHORIZED` $\to$ `CAPTURED`.

---

## 4. PayPal Integration Rules (2-Phase Escrow)

Never capture funds immediately at recommendation time:
1. **Phase 1 (User taps button):** Call PayPal Orders v2 API with `intent: "AUTHORIZE"`. Hold funds in escrow.
2. **Phase 2 (User enters arrival geofence / triggers pickup):** Execute `v2/checkout/orders/{id}/authorize` capture.
3. **Graceful Fallback:** If PayPal API credentials (`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`) are missing in development, automatically provide a transparent mock mode with visual indicators so the full judge simulation demo functions seamlessly offline.

---

## 5. UI/UX Design System & Aesthetics (Food-First & Agent-First)

* **Visual Standard:** Clean, fresh, warm culinary palette. Warm paper/cream backgrounds (`bg-[#FAFAF8]`, subtle warm border `#EAE8E2`, crisp text `#1A1917`), rich food photography/styling, warm terracotta `#E05A38` and bakery amber `#D97706` accents, combined with official PayPal Blue (`#0070BA`) for payment CTAs.
* **Agent-First Experience:** The AI Agent is the primary protagonist. Transparent agent thought logs ("Observing calendar gap...", "Matching dietary memory...", "Reserving bay in escrow..."), proactive voice, and natural interaction.
* **No Unappetizing Dark-Mode:** Avoid generic dark developer shells or flat cyber dashboards. The UI must look and feel like a modern, Michelin-grade culinary concierge.
* **Zero Placeholders:** Use appetizing dish imagery, realistic cafe menus, chef notes, calorie & nutrition macros, and real timestamps.

---

## 6. Coding & File Structure Conventions

```
/app
  ├── /api
  │    ├── /agent/recommend    # Gemini 4 Argon reasoning & recommendation endpoint
  │    ├── /paypal/authorize   # Phase 1 escrow hold
  │    ├── /paypal/capture     # Phase 2 geofence settlement
  │    └── /events             # SSE / state synchronization
  ├── /layout.tsx
  └── /page.tsx                # Dual-Viewport Split Console
/components
  ├── /phone                   # iPhone frame, lock screen, push card, arrival ticket
  ├── /controller              # Judge sliders (Meeting gap, distance, dietary)
  ├── /merchant                # AG Grid kitchen queue board
  └── /ui                      # Glassmorphic primitives & buttons
/lib
  ├── /gemini.ts               # @google/genai client initialization (Gemini 4 Argon)
  ├── /paypal.ts               # PayPal SDK & REST API adapter
  └── /catalog.ts              # Menu catalog and pricing matrix
```

---

## 7. Verification Checklist Before Reporting Work Done

* [ ] TypeScript types compile without errors (`npx tsc --noEmit`).
* [ ] Next.js app builds cleanly (`npm run build` or dev runs without hydration mismatches).
* [ ] Agent endpoints return valid JSON compliant with declared schemas.
* [ ] Judge sliders dynamically trigger or dismiss the ambient phone card in real time.

# BitePass — Agent & Development Instructions

> **Primary Model Target:** Gemini 4 Argon (`gemini-4-argon`, configurable via `GEMINI_MODEL`)  
> **Development Harness:** Google Antigravity IDE  
> **Domain:** Autonomous Proactive Culinary Concierge (PayPal AI & AG Grid Observability)

---

## 1. Gemini 4 Argon Execution Profile

* **Reasoning Depth (`thinkingLevel`):**
  * Use `high` for state machine verification (2-phase escrow holds, 2-stage `<250m` fire + `<50m` capture geofences) and multi-component wiring.
  * Use `medium` for route handlers, structured catalog ranking, and UI component drafting.
* **Deterministic Structured Outputs & Zero Financial Hallucination:**
  * Always use `@google/genai` with `config.systemInstruction`, `responseMimeType: 'application/json'`, and enum-constrained `responseSchema`.
  * Gemini selects only from pre-filtered `eligibleItems` (respecting `isAvailable`, `dietaryTags`, and FDA Top-9 allergen exclusions); all monetary amounts are computed strictly in integer cents via [lib/pricing.ts](lib/pricing.ts).

---

## 2. Core Architecture: Hexagonal Monolith with Dual-Track Persistence

* **Stack:** Fullstack **Next.js 15 (App Router)** + **TypeScript 5.7** + **Tailwind CSS 3.4** + **Zod** + **Prisma (PostgreSQL)** + **AG Grid React v33**.
* **Dual-Track Persistence (`STORAGE_DRIVER`):**
  * **Track 1 (`STORAGE_DRIVER=memory`):** Zero-Docker offline local dev (`npm run dev`) backed by `InMemoryKitchenRepository` ([lib/repositories/kitchen-repository.ts](lib/repositories/kitchen-repository.ts)).
  * **Track 2 (`STORAGE_DRIVER=postgres`):** Production & local Docker parity (`npm run dx:up`) backed by `PrismaKitchenRepository` ([prisma/schema.prisma](prisma/schema.prisma)) with `FOR UPDATE SKIP LOCKED` station leasing and partial unique index `idx_station_one_active_order`.
* **Real-Time Transport:** Scoped Server-Sent Events (`GET /api/events`) with 15-second heartbeats + visibility-aware snapshot healing.

---

## 3. Application Routes (`/` vs `/merchant` vs `/demo`)

1. **Consumer Experience (`/`, [app/page.tsx](app/page.tsx)):**
   * Mobile-first culinary concierge (`0 B` of AG Grid bundle overhead).
   * Supports FDA Top-9 allergen blocklists, dish swapping, itemized municipal tax + optional tip (`$0 | $1 | $2 | Custom`), 90s Grace Hold + `<=250m` Kitchen Fire + `<=50m` Doorstep Capture, scannable QR pass, and 2-tap instant refund/cubby quarantine.
2. **Merchant Kitchen Operations KDS (`/merchant`, [app/merchant/page.tsx](app/merchant/page.tsx)):**
   * Granular AG Grid React v33 (`ClientSideRowModelModule`, `TextFilterModule`, `NumberFilterModule`) with gloved operator actions (`Accept & Fire`, `Ready -> Station`, `Settle & Unlock`, `Clear Bay`, `+5m Delay`, `86 Item`).
3. **Interactive Judge Console (`/demo`, [app/demo/page.tsx](app/demo/page.tsx)):**
   * Unified consumer + merchant simulation harness with scenario presets and proximity triggers.

---

## 4. PayPal 2-Phase Escrow & 2-Stage Geofence Rules

1. **Phase 1 (`POST /api/paypal/create`):** Pre-leases an available merchant station, then calls PayPal Orders v2 (`intent: "AUTHORIZE"`, Vault v3 / Multiparty `payee` + `platform_fees`, `soft_descriptor: "BITEPASS*..."`, `PayPal-Request-Id` idempotency).
2. **Cancellation & Spoilage Shield (`POST /api/paypal/void`):**
   * `0–90s` Grace Hold / `>250m` (`AUTHORIZED_QUEUED`): `$0.00` free void; station released immediately.
   * Post-Fire (`<=250m` `KITCHEN_FIRED`): Requires `$5.00` partial final capture COGS recovery (`is_final_capture: true`), releasing the remainder to the diner.
3. **Phase 2 (`POST /api/paypal/capture`):** Verifies server-side Haversine (`<=50m`) + kinematics/BLE or KDS attestation, executes crash-safe 3-phase capture (`CAPTURING` $\to$ PayPal `/capture` $\to$ `CAPTURED`), and unlocks the assigned pickup bay/cubby.
4. **Fail-Closed Live Safety:** Live/production environments (`APP_ENV=production|staging` or `PAYPAL_ENV=live`) **never** fall back to `isMock: true` on API errors.

---

## 5. Coding & File Structure

```text
app/
  ├── api/
  │    ├── agent/route.ts             # Gemini 4 Argon reasoning & allergen-safe ranking
  │    ├── events/route.ts            # Real-time SSE stream for KDS & active orders
  │    ├── health/route.ts            # Readiness & mock-safety probe
  │    ├── orders/route.ts            # Scoped order list & bay capacity
  │    ├── orders/[orderId]/route.ts  # Single order lookup & KDS operator transitions
  │    ├── orders/reset/route.ts      # Demo/sandbox reset (blocked in production)
  │    ├── paypal/create/route.ts     # Phase 1 station lease + escrow authorization
  │    ├── paypal/capture/route.ts    # Phase 2 proximity/KDS settlement
  │    ├── paypal/void/route.ts       # Grace-window void vs $5 COGS partial capture
  │    ├── paypal/refund/route.ts     # 2-tap cubby dispute refund + quarantine
  │    └── webhooks/paypal/route.ts   # Signature-verified PayPal webhook listener
  ├── demo/page.tsx                   # Judge split/tab simulation console
  ├── merchant/page.tsx               # Dedicated RBAC Merchant Kitchen KDS
  └── page.tsx                        # Consumer mobile-first concierge
components/                           # WCAG 2.1 AA culinary UI & KDS components
lib/
  ├── env.ts                          # Zod startup & runtime environment validator
  ├── errors.ts                       # DomainError hierarchy & RFC 9457 Problem Details
  ├── gemini.ts                       # @google/genai adapter + context memoization
  ├── order-state-machine.ts          # OrderStatus FSM & 2-stage geofence rules
  ├── paypal-client.ts                # PayPal Orders v2 + Vault v3 + Multiparty adapter
  ├── pricing.ts                      # Branded integer Cents + basis-point tax/tip math
  ├── repositories/                   # Hexagonal KitchenRepository (Memory + Prisma)
  └── validation.ts                   # Strict Zod request/response schemas
prisma/
  ├── schema.prisma                   # Multi-tenant PostgreSQL schema
  └── seed.ts                         # Deterministic catalog & merchant station seeder
```

---

## 6. Verification Checklist

* [ ] `npm run typecheck` (`tsc --noEmit`) passes with 0 errors.
* [ ] `npm run lint` (`eslint . --max-warnings=0`) passes non-interactively.
* [ ] `npm run check:links` passes with 0 broken links, 0 machine paths, and 100% `.env.example` parity.
* [ ] `npm test` (Vitest) and `npm run build` succeed cleanly.

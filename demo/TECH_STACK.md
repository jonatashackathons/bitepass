# 💻 BitePass — Technology Stack

## ⚡ One-Line Tech Stack String

```text
Next.js 15 (App Router) · React 19 · TypeScript 5.7 · Tailwind CSS 3.4 · Google Gemini 4 Argon (@google/genai) · PayPal Orders v2 (2-Phase Escrow) · AG Grid React v33 · Prisma ORM & PostgreSQL (with In-Memory Dual-Track Persistence) · Zod · Server-Sent Events (SSE) · Playwright · Vitest
```

---

## 🏗️ Detailed Technology Stack Breakdown

| Layer | Technology | Version / Spec | Purpose & Implementation Details |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | **Next.js** (App Router) | `15.1.7` | High-performance React 19 architecture, Server Components + Client PWA modules. |
| **UI Library** | **React** | `19.0.0` | Concurrent rendering, declarative hooks, tactile micro-interaction animations. |
| **Language** | **TypeScript** | `5.7.3` | Strict type safety, branded integer cents (`Cents`), exhaustive FSM type matching. |
| **Styling & Design** | **Tailwind CSS** | `3.4.17` | Glassmorphic design tokens (`backdrop-blur-md`), responsive grid layouts, WCAG 2.1 AA accessible contrast. |
| **Icons & Badges** | **Lucide React** | `0.475.0` | Crisp geometric iconography (`UtensilsCrossed`, `MapPin`, `Leaf`, `Clock`, `ShieldCheck`). |
| **QR Code Engine** | **QRCode.react** | `4.2.0` | Contactless SVG/Canvas QR rendering for doorstep FASTPASS cubby authorization. |
| **AI Reasoning Engine** | **Google Gemini 4 Argon** | `@google/genai 2.31.0` | Autonomous ambient intent, calendar gap inference, FDA Top-9 allergen exclusion, deterministic JSON output. |
| **Payments & Escrow** | **PayPal Orders v2** | REST v2 / Vault v3 | 2-Phase Escrow (`intent: "AUTHORIZE"` $\to$ `<50m` Proximity `POST /capture`), 90s free void, and COGS spoilage shield. |
| **Kitchen Observability** | **AG Grid React** | `v33.1.1` | Enterprise high-density Merchant KDS (`Quartz` theme, custom cell renderers, gloved operator actions, `0 B` client bundle leak). |
| **ORM & Database** | **Prisma** + **PostgreSQL** | `@prisma/client 6.19.3` | Multi-tenant kitchen schema, atomic station leasing (`FOR UPDATE SKIP LOCKED`), partial unique index `idx_station_one_active_order`. |
| **Dual-Track Storage** | **In-Memory + Prisma** | Hexagonal Pattern | Zero-Docker offline dev (`STORAGE_DRIVER=memory`) vs. production PostgreSQL parity (`STORAGE_DRIVER=postgres`). |
| **Validation Layer** | **Zod** | `4.6.7` | Strict runtime environment parsing (`lib/env.ts`) and API schema validation (`lib/validation.ts`). |
| **Real-Time Streaming** | **Server-Sent Events (SSE)**| Native Web Streams | Scoped live transport (`GET /api/events`) with 15s heartbeats and snapshot healing for KDS terminals. |
| **E2E & Demo Recording**| **Playwright** | `1.64.1` | Automated slow-motion video walkthroughs, multi-device responsive audits, high-DPI screenshots. |
| **Unit & Integration** | **Vitest** + **V8 Coverage** | `3.0.5` | Fast test harness verifying state machine transitions, pricing math, and allergen safety guardrails. |


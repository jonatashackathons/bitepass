# Architectural Design & Rapid Engineering Blueprint

**Codename:** Bypass.ai (Agentic Micro-Commerce Engine)

**Hackathon Target Tracks:** *Best Use of Agentic Commerce ($5,000)* & *Best Use of PayPal + AI ($5,000)*

**Core Framework:** Google Senior PM Rigor, YC Speed & Ruthless YAGNI

---

## 1. System Architecture: The "Zero-Latency" Monolith

To win a hackathon, eliminate distributed microservice overhead. You do not need Docker swarms, Kafka message brokers, or multi-repo syncing.

Run a **Fullstack Next.js App Router (TypeScript) deployed on Render**. The client, agent orchestrator, PayPal proxy, and merchant views live inside a single unified repository.

```
                           ┌─────────────────────────────────────────────────────────────┐
                           │                  CLIENT VIEWPORT (Next.js)                  │
                           │  - Dynamic Phone Shell (Consumer Agent Simulation)          │
                           │  - Live Merchant Prep Board (AG Grid Track Eligible)        │
                           └───────────────┬─────────────────────────────▲───────────────┘
                                           │                             │
                                  1. Context Trigger              Server-Sent Events
                                 (Free Gap / Distance)           (Real-Time State Sync)
                                           │                             │
                                           ▼                             │
┌────────────────────────────────────────────────────────────────────────┴───────────────┐
│                       FULLSTACK BACKEND API (/app/api/*)                               │
│                                                                                        │
│   ┌────────────────────────────────┐          ┌────────────────────────────────────┐   │
│   │   AGENT ORCHESTRATION ENGINE   │          │        PAYPAL ADAPTER LAYER        │   │
│   │   - Scoped Context Ingestion   │          │   - PayPal Orders v2 (Authorize)   │   │
│   │   - Gemini 1.5 Flash           │          │   - PayPal Orders v2 (Capture)     │   │
│   │     (Strict Tool / JSON Mode)  │          │   - PayPal Vault / Fastlane SDK    │   │
│   └───────────────┬────────────────┘          └─────────────────▲──────────────────┘   │
│                   │                                             │                      │
│                   │ Evaluates Matches                           │ Executes 2-Phase     │
│                   ▼                                             │ Escrow Hold          │
│   ┌─────────────────────────────────────────────────────────────┴──────────────────┐   │
│   │                      IN-MEMORY MERCHANT KERNEL                                 │   │
│   │                      - Menu Catalog & Deterministic Pricing Matrix             │   │
│   │                      - Real-Time Queue & Fast-Track Bay State                  │   │
│   └────────────────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────────────────┘

```

---

## 2. Frontend Strategy: The "Judge Experience" Shell

### The Core Problem with Mobile Prototypes

If you build a native Swift or React Native app, judges cannot run it without an Xcode emulator or TestFlight build. If you build a plain desktop website, it ruins the story of an ambient phone assistant.

### The Fastest Approach: The Dual-Viewport Split Console

Create a **Desktop Responsive Canvas** that splits the judge’s screen into two synchronized views:

1. **Left Half (The Consumer Mobile Experience):** A realistic iPhone hardware mockup containing the proactive lock screen, ambient widget, and one-tap checkout.
2. **Right Half (The Observability & Merchant Terminal):**
* **The "Judge Scenario Controller" (Top Right):** Sliders to manipulate context dynamically:
* *Meeting Gap:* Slide from `10m (No Suggestion)` $\to$ `35m (Agent Triggers)`.
* *Distance to Cafe:* Slide from `600m (Out of range)` $\to$ `120m (In range)`.
* *Dietary Preference:* Toggle `Gluten-Free` / `Vegan` / `Omnivore`.


* **The Live Kitchen Queue (Bottom Right - AG Grid):** Displays live tickets, state transitions (`PROPOSED` $\to$ `AUTHORIZED` $\to$ `CAPTURED`), and prep timestamps.



---

## 3. UI/UX Design System (The "Zero-Friction" Interface)

Fast-casual commerce fails when users must click through 8 configuration steps. Design the interaction around **3 specific visual states**:

### State A: The Ambient Lock Screen Push Card

* **Visual Tone:** Glassmorphic card (`backdrop-blur-md bg-zinc-900/80 border border-zinc-800`).
* **Visual Hierarchy:**
* **Header:** Micro-badge with time savings: `⚡ 18 MINS SAVED | 35M MEETING GAP DETECTED`.
* **Core Recommendation:** "Jack's Cafe — Turkey Avocado Club ($14.50)".
* **Context Reason:** *"Matches your lunch window before 1:30 PM Standup. 8m walking buffer."*
* **The Hero CTA:** High-contrast PayPal Blue button (`#0070BA`):
`[ ⚡ 1-Tap Bypass with PayPal ]`



### State B: The Single-Tap Action (Under 1 Second)

* On Tap:
* The button turns into an active micro-spinner (`Authorizing $14.50...`).
* PayPal Orders API returns the authorization ID.
* Card transitions to an arrival ticket with a live countdown: *"Order Fired to Kitchen. Pickup Cubby #3. Arrive in 6 mins."*



### State C: The Arrival Geofence Capture

* When the judge moves the distance slider to `< 50m`:
* Card flashes emerald green: `✓ Verified at Doorstep. Captured via PayPal.`
* The right-hand Merchant AG Grid row turns green (`SETTLED`).



---

## 4. Financial Architecture: The 2-Phase PayPal Agentic Flow

To satisfy the **Best Use of Agentic Commerce** track, prove that the agent safely negotiates escrow instead of blindly charging credit cards.

```
[Agent Context Match]
         │
         ▼
[1-Tap Interaction]  ───>  POST /api/paypal/create-order
                           Body: { intent: "AUTHORIZE", amount: 14.50, currency: "USD" }
                           Returns: { order_id: "ORD-928371", status: "CREATED" }
         │
         ▼
[Merchant Hold]      ───>  Mock Kitchen reserves Bay & queues sandwich prep.
         │
         ▼
[Proximity Trigger]  ───>  POST /api/paypal/capture-order
 (Simulated Walk)          Body: { order_id: "ORD-928371" }
                           Calls PayPal API: /v2/checkout/orders/{id}/authorize
                           Then: /v2/payments/authorizations/{auth_id}/capture
                           Returns: { status: "COMPLETED", transaction_id: "TX-4819" }

```

* **YAGNI Rule for Hallucinations:** The LLM *never* sets the price. The LLM returns `{ item_id: "prod_turkey_panini" }`. The server matches this against the internal inventory database: `base_price: 12.50 + default_tax: 1.00 + default_tip: 1.00 = 14.50`. This prevents AI billing hallucination errors.

---

## 5. Technical Stack & Implementation Matrix

| Layer | Selected Tech | Justification / Hackathon Velocity |
| --- | --- | --- |
| **Framework** | **Next.js 15 (App Router)** | Fullstack in a single directory; zero API CORS hurdles; instant SSR. |
| **Styling** | **Tailwind CSS + Lucide Icons** | Ultra-rapid styling with no CSS overhead; native dark-mode aesthetic. |
| **Merchant Queue** | **AG Grid React** | Directly qualifies for the **$5,000 AG Grid Sponsor Prize**. |
| **AI Model** | **Gemini 1.5 Flash (via `@google/genai`)** | Sub-second latency, structured JSON outputs, low cost. |
| **Payments** | **PayPal Orders API v2 (Sandbox)** | Official hackathon platform; implements `AUTHORIZE` & `CAPTURE`. |
| **Hosting** | **Render (Web Service)** | Directly qualifies for the **$1,000 Render Sponsor Prize**. |

---

## 6. Project Directory Blueprint (Keep It Minimal)

```text
bypass-ai/
├── app/
│   ├── api/
│   │   ├── agent/route.ts        # Gemini Function Calling (Context -> Item)
│   │   ├── paypal/
│   │   │   ├── create/route.ts   # Calls PayPal Orders v2 (Authorize)
│   │   │   └── capture/route.ts  # Calls PayPal Auth Capture
│   │   └── events/route.ts       # Server-Sent Events to sync phone & AG Grid
│   ├── merchant/page.tsx         # AG Grid Merchant View
│   ├── layout.tsx
│   └── page.tsx                  # Dual-View Canvas (Phone Shell + Controller)
├── components/
│   ├── PhoneShell.tsx            # Realistic mobile mock interface
│   ├── LockScreenCard.tsx        # Push card with 1-Tap PayPal button
│   ├── SimulatorBar.tsx          # Judge slider controls (Gap, Distance)
│   └── MerchantGrid.tsx          # AG Grid table with real-time status updates
├── lib/
│   ├── mock-db.ts                # Deterministic menus, items, and pricing
│   └── paypal-client.ts          # Sandbox OAuth token & request wrapper
├── .env.example
├── LICENSE                       # AGPL-3.0 (Required by hackathon rules)
└── README.md                     # 3-step setup guide for judges

```

---

## 7. Concrete Next.js Implementation Code

### A. The PayPal Client Helper (`lib/paypal-client.ts`)

```typescript
const PAYPAL_API = 'https://api-m.sandbox.paypal.com';

export async function getPayPalAccessToken(): Promise<string> {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');

  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    body: 'grant_type=client_credentials',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  const data = await res.json();
  return data.access_token;
}

export async function createAuthorizationOrder(amount: string) {
  const token = await getPayPalAccessToken();
  const res = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'AUTHORIZE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: amount,
          },
          description: 'Bypass.ai - Fast-Track Lunch Order',
        },
      ],
    }),
  });
  return res.json();
}

```

### B. The AI Agent Route (`app/api/agent/route.ts`)

```typescript
import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { MENU_CATALOG } from '@/lib/mock-db';

const ai = new GoogleGenAI();

export async function POST(req: Request) {
  const { freeMinutes, distanceMeters, dietary } = await req.json();

  // Guardrail: Context threshold check
  if (freeMinutes < 30 || distanceMeters > 500) {
    return NextResponse.json({ shouldTrigger: false });
  }

  const prompt = `You are Bypass.ai, an agent anticipating user lunch decisions.
Context: User has ${freeMinutes} minutes free, is ${distanceMeters}m from dining strip, and prefers: ${dietary}.
Available catalog: ${JSON.stringify(MENU_CATALOG)}.
Select the single best match and write a punchy, 1-sentence notification.`;

  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          shouldTrigger: { type: Type.BOOLEAN },
          merchantId: { type: Type.STRING },
          itemId: { type: Type.STRING },
          reason: { type: Type.STRING },
        },
        required: ['shouldTrigger', 'merchantId', 'itemId', 'reason'],
      },
    },
  });

  const parsed = JSON.parse(response.text || '{}');
  const matchedItem = MENU_CATALOG.find((i) => i.id === parsed.itemId);

  return NextResponse.json({
    shouldTrigger: true,
    item: matchedItem,
    reason: parsed.reason,
  });
}

```

---

## 8. Complete Hackathon Execution Checklist

* [ ] **Day 1–3:** Register PayPal Sandbox business account; test token retrieval, order creation (`AUTHORIZE`), and order capture.
* [ ] **Day 4–7:** Build the Next.js split screen layout (Phone Shell on left, Scenario Controller on right).
* [ ] **Day 8–10:** Integrate Gemini 1.5 Flash structured output with the context scenario sliders.
* [ ] **Day 11–13:** Hook the Merchant Queue to **AG Grid** with status-changing column renderers.
* [ ] **Day 14:** Deploy repository directly to **Render** with verified environment variables.
* [ ] **Day 15–17:** Record a screen capture walk-through demo video (under 3 minutes) matching the 4-beat pitch script.
* [ ] **Day 18–19:** Write repo `README.md`, attach `LICENSE` (AGPL-3.0), and submit to Devpost.
# 💳 Integration Guide: PayPal 2-Phase Escrow & Fastlane

> **Domain:** Payment Escrow, Authorizations & Proximity Settlement  
> **Master Graph Hub:** [README.md](../../README.md) &middot; [Architecture](../ARCHITECTURE.md) &middot; [Pitch Deck](../PITCH_DECK.md) &middot; [Gap Analysis](../GAP_ANALYSIS_ROADMAP.md)

---

## 1. Overview: The 2-Phase Escrow Pattern

In autonomous micro-commerce, charging users immediately upon meal recommendation introduces high friction, cancellation disputes, and customer anxiety. 

BitePass solves this with **PayPal Orders v2 Two-Phase Escrow**:
1. **Phase 1 (Pre-Authorization Hold):** When the user taps `[ ⚡ Hold with PayPal ]`, BitePass calls PayPal Orders v2 with `intent: "AUTHORIZE"`. Funds are guaranteed and held on the user's payment method for up to 3 days. No money has changed hands.
2. **Phase 2 (Proximity Doorstep Settlement):** When the user physically arrives within 50 meters of the cafe, a background geofence triggers `POST /v2/checkout/orders/{id}/authorize` capture. The funds settle immediately, and the pickup cubby unlocks.
3. **Graceful Cancellation (Pre-Prep Void):** If the user's meeting overruns or they cancel during preparation, BitePass calls `POST /v2/payments/authorizations/{authorization_id}/void`. The hold releases immediately with **zero chargeback fees**.

---

## 2. Current Mock vs. Production Gap

| Feature | Current Working Demo | Production Commercial Deployment |
| :--- | :--- | :--- |
| **Credentials** | Transparent mock fallback if credentials unset | PayPal Developer Dashboard Sandbox / Live keys (`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`) |
| **Authentication** | In-memory token mock | OAuth2 `client_credentials` grant with auto-refreshing bearer tokens |
| **Vaulting / 1-Tap** | Simulated 1-tap checkout | **PayPal Fastlane / Vault v3** for biometric TouchID/FaceID zero-redirect checkout |
| **Webhooks** | Synchronous REST callbacks | PayPal Webhooks verifying digital signatures (`PAYPAL-TRANSMISSION-SIG`) |
| **Disputes / Expiry** | Automatic timeout reset | Webhook listeners for `PAYMENT.AUTHORIZATION.VOIDED` & `PAYMENT.CAPTURE.DENIED` |

---

## 3. Step-by-Step Production Implementation Guide

### Step 1: Environment Configuration
Create `.env.production` with your live or sandbox PayPal credentials:
```bash
PAYPAL_ENV=sandbox # or 'live'
PAYPAL_CLIENT_ID=your_paypal_client_id_here
PAYPAL_CLIENT_SECRET=your_paypal_client_secret_here
PAYPAL_WEBHOOK_ID=your_webhook_id_here
NEXT_PUBLIC_BASE_URL=https://bitepass.ai
```

### Step 2: OAuth2 Token Service
In production, obtain and cache the bearer token using PayPal's OAuth2 endpoint:
```typescript
// lib/paypal/auth.ts
let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getPayPalAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.token;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID!;
  const secret = process.env.PAYPAL_CLIENT_SECRET!;
  const base = process.env.PAYPAL_ENV === 'live' 
    ? 'https://api-m.paypal.com' 
    : 'https://api-m.sandbox.paypal.com';

  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');
  const response = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.token;
}
```

### Step 3: Phase 1 Pre-Authorization Endpoint (`/api/paypal/create`)
Call `/v2/checkout/orders` with `intent: "AUTHORIZE"`:
```typescript
// app/api/paypal/create/route.ts
export async function POST(req: Request) {
  const { itemId, tweakDelta, customerName } = await req.json();
  const token = await getPayPalAccessToken();
  const base = getPayPalBaseUrl();

  const orderPayload = {
    intent: 'AUTHORIZE',
    purchase_units: [
      {
        reference_id: `BITE-${Date.now()}`,
        description: `BitePass Autonomous Escrow Hold`,
        amount: {
          currency_code: 'USD',
          value: totalAmount.toFixed(2),
          breakdown: {
            item_total: { currency_code: 'USD', value: basePrice.toFixed(2) },
            tax_total: { currency_code: 'USD', value: '1.00' },
            handling: { currency_code: 'USD', value: '1.00' }, // Tip
          },
        },
      },
    ],
  };

  const res = await fetch(`${base}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderPayload),
  });

  const orderData = await res.json();
  return Response.json({ orderId: orderData.id });
}
```

### Step 4: Phase 2 Proximity Doorstep Capture (`/api/paypal/capture`)
When the client confirms doorstep arrival (< 50m), capture the authorization:
```typescript
// app/api/paypal/capture/route.ts
export async function POST(req: Request) {
  const { authId, amount } = await req.json();
  const token = await getPayPalAccessToken();
  const base = getPayPalBaseUrl();

  const res = await fetch(`${base}/v2/payments/authorizations/${authId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: { currency_code: 'USD', value: amount.toFixed(2) },
      is_final_capture: true,
    }),
  });

  const captureData = await res.json();
  return Response.json({ status: captureData.status, captureId: captureData.id });
}
```

### Step 5: Webhook Event Dispatcher
Register the following webhooks in your PayPal Developer Portal:
1. `CHECKOUT.ORDER.APPROVED` $\to$ Confirm escrow hold established.
2. `PAYMENT.AUTHORIZATION.CREATED` $\to$ Trigger kitchen prep and assign cubby.
3. `PAYMENT.CAPTURE.COMPLETED` $\to$ Signal smart cubby latch relay to unlock.
4. `PAYMENT.AUTHORIZATION.VOIDED` $\to$ Free merchant bay and release hold.

---

## 4. Connected Graph

* 🏠 **Hub:** [README.md](../../README.md)
* 🏗️ **Architecture:** [docs/ARCHITECTURE.md](../ARCHITECTURE.md)
* 🧠 **Gemini 4 Argon Reasoning:** [GEMINI_ARGON.md](GEMINI_ARGON.md)
* 🍳 **Merchant KDS & AG Grid:** [MERCHANT_KDS_IOT.md](MERCHANT_KDS_IOT.md)
* 📍 **Geofencing & Passes:** [MOBILE_GEOFENCING.md](MOBILE_GEOFENCING.md)
* 🗺️ **Roadmap & Checklist:** [docs/GAP_ANALYSIS_ROADMAP.md](../GAP_ANALYSIS_ROADMAP.md)

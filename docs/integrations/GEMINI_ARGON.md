# 🧠 Integration Guide: Gemini 4 Argon Autonomous Reasoning

> **Domain:** Proactive Agent Intelligence, Structured Outputs & Contextual Guardrails  
> **SDK:** `@google/genai` (v2.31.0+) &middot; Model: `gemini-4-argon`  
> **Master Graph Hub:** [README.md](../../README.md) &middot; [Architecture](../ARCHITECTURE.md) &middot; [Pitch Deck](../PITCH_DECK.md) &middot; [Gap Analysis](../GAP_ANALYSIS_ROADMAP.md)

---

## 1. Overview: The Agent Protagonist

Unlike reactive chatbots where a user must prompt and query a search box, **BitePass uses Gemini 4 Argon as a proactive, autonomous background agent**.

Gemini 4 Argon continuously monitors 3 environmental streams:
1. **Calendar Schedule Telemetry:** Detects calendar gaps between meetings (e.g. 35m free before a 1:30 PM standup).
2. **Real-Time Geolocation Buffer:** Calculates walking distance to cafe strips (e.g. 200m away = ~3m walking buffer).
3. **User Memory & Taste Profile:** Tracks dietary tags (`Omnivore`, `Vegan`, `Gluten-Free`), previous meal history, and stone-oven baking schedules.

---

## 2. Current Mock vs. Production Gap

| Feature | Current Working Demo | Production Commercial Deployment |
| :--- | :--- | :--- |
| **Model** | `gemini-4-argon` via `@google/genai` with deterministic fallback | High-throughput `gemini-4-argon` with cached prompt contexts |
| **Calendar Sync** | Simulated calendar window slider/pills | Google Calendar API / Microsoft Graph API OAuth2 webhook listener |
| **Location Feed** | Client simulated distance coordinates | Background CoreLocation (iOS) / Android Fused Location Provider |
| **Context Memory** | Session React state | Vector embeddings in Supabase pgvector / Pinecone for multi-week meal history |
| **Guardrails** | Static boundary checks (<30m suppresses interruptions) | LLM semantic filter + rate-limited push notifications (Apple APNs / Firebase FCM) |

---

## 3. Step-by-Step Production Implementation Guide

### Step 1: SDK Installation & Environment Setup
Ensure `@google/genai` is installed:
```bash
npm install @google/genai
```
Configure `.env.production`:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-4-argon
GOOGLE_CLIENT_ID=your_google_calendar_oauth_id
GOOGLE_CLIENT_SECRET=your_google_calendar_oauth_secret
```

### Step 2: Strict Structured Output Schema
Gemini 4 Argon guarantees valid JSON adhering to the TypeScript contracts without code fences or prompt parsing:

```typescript
// lib/gemini.ts
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function reasonCulinaryRecommendation(
  freeMinutes: number,
  distanceMeters: number,
  dietary: string,
  catalog: MenuItem[]
): Promise<AgentRecommendation> {
  // Autonomous Quiet Hours Guardrail
  if (freeMinutes < 30) {
    return {
      shouldTrigger: false,
      reason: `Schedule gap is only ${freeMinutes}m (requires ≥ 30m). Respecting focus mode.`,
    };
  }

  // Geofence Proximity Guardrail
  if (distanceMeters > 500) {
    return {
      shouldTrigger: false,
      reason: `User is ${distanceMeters}m away (exceeds 500m proximity boundary).`,
    };
  }

  const prompt = `You are BitePass's culinary concierge. 
Evaluate available cafe items against user context:
- Free schedule gap: ${freeMinutes} minutes
- Walking distance: ${distanceMeters} meters (~${Math.round(distanceMeters / 75)}m walking buffer)
- Dietary preference: ${dietary}
- Available Catalog: ${JSON.stringify(catalog)}

Select the single best item that can be prepared and consumed within the schedule gap.`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-argon',
    contents: prompt,
    config: {
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.MEDIUM,
      },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          shouldTrigger: { type: Type.BOOLEAN },
          selectedItemId: { type: Type.STRING },
          reason: { type: Type.STRING },
          timeSavedMinutes: { type: Type.NUMBER },
          walkingBufferMinutes: { type: Type.NUMBER },
        },
        required: ['shouldTrigger', 'selectedItemId', 'reason', 'timeSavedMinutes', 'walkingBufferMinutes'],
      },
    },
  });

  const parsed = JSON.parse(response.text!);
  const matchedItem = catalog.find((i) => i.id === parsed.selectedItemId) || catalog[0];

  return {
    shouldTrigger: true,
    item: matchedItem,
    reason: parsed.reason,
    timeSavedMinutes: parsed.timeSavedMinutes,
    walkingBufferMinutes: parsed.walkingBufferMinutes,
    total: matchedItem.price + 2.00, // $1.00 tax + $1.00 tip
  };
}
```

### Step 3: Google Calendar Push Notification Listener
In production, register a webhook to trigger evaluations when calendar events finish or change:
```typescript
// app/api/webhooks/google-calendar/route.ts
export async function POST(req: Request) {
  const syncToken = req.headers.get('x-goog-resource-state');
  if (syncToken === 'exists') {
    // 1. Fetch upcoming events via Google Calendar API
    // 2. Compute free minutes between current time and next scheduled meeting
    // 3. If gap >= 30m and lunchtime window (11:30 AM - 2:00 PM), trigger Gemini reasoning
    // 4. Send APNs / FCM push notification to consumer phone
  }
  return new Response('OK');
}
```

---

## 4. Connected Graph

* 🏠 **Hub:** [README.md](../../README.md)
* 🏗️ **Architecture:** [docs/ARCHITECTURE.md](../ARCHITECTURE.md)
* 💳 **PayPal Escrow Integration:** [PAYPAL_ESCROW.md](PAYPAL_ESCROW.md)
* 🍳 **Merchant KDS & AG Grid:** [MERCHANT_KDS_IOT.md](MERCHANT_KDS_IOT.md)
* 📍 **Geofencing & Passes:** [MOBILE_GEOFENCING.md](MOBILE_GEOFENCING.md)
* 🗺️ **Roadmap & Checklist:** [docs/GAP_ANALYSIS_ROADMAP.md](../GAP_ANALYSIS_ROADMAP.md)

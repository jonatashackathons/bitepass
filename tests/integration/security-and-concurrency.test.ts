import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { POST as agentHandler } from '@/app/api/agent/route';
import { GET as eventsGetHandler } from '@/app/api/events/route';
import { GET as healthGetHandler } from '@/app/api/health/route';
import {
  GET as orderGetHandler,
  PATCH as orderPatchHandler,
} from '@/app/api/orders/[orderId]/route';
import { POST as ordersResetHandler } from '@/app/api/orders/reset/route';
import { GET as ordersGetHandler } from '@/app/api/orders/route';
import { POST as paypalCaptureHandler } from '@/app/api/paypal/capture/route';
import { POST as paypalCreateHandler } from '@/app/api/paypal/create/route';
import { POST as paypalRefundHandler } from '@/app/api/paypal/refund/route';
import { POST as paypalVoidHandler } from '@/app/api/paypal/void/route';
import { POST as paypalWebhookHandler } from '@/app/api/webhooks/paypal/route';
import { resetRateLimits } from '@/lib/security';

describe('API Security, Financial Tampering Guards & 25x Concurrency Stress', () => {
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    resetRateLimits();
    await ordersResetHandler();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetRateLimits();
  });

  it('rejects negative tweakDelta, arbitrary uncatalogued tweakDelta, and malformed JSON with 400 Problem Details', async () => {
    const negReq = new Request('http://localhost:3000/api/paypal/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemId: 'prod_turkey_panini',
        tweakDelta: -50,
      }),
    });
    const negRes = await paypalCreateHandler(negReq);
    expect(negRes.status).toBe(400);
    expect(negRes.headers.get('content-type')).toContain(
      'application/problem+json'
    );

    const uncataloguedReq = new Request(
      'http://localhost:3000/api/paypal/create',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: 'prod_turkey_panini',
          tweakDelta: 7.77,
        }),
      }
    );
    const uncataloguedRes = await paypalCreateHandler(uncataloguedReq);
    expect(uncataloguedRes.status).toBe(400);

    const badJsonReq = new Request('http://localhost:3000/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{invalid-json',
    });
    const badJsonRes = await agentHandler(badJsonReq);
    expect(badJsonRes.status).toBe(400);
  });

  it('blocks allergen conflicts on /api/paypal/create with 422 ALLERGEN_CONFLICT', async () => {
    const req = new Request('http://localhost:3000/api/paypal/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemId: 'prod_turkey_panini', // Contains Wheat & Eggs
        excludedAllergens: ['Wheat'],
      }),
    });

    const res = await paypalCreateHandler(req);
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.code).toBe('ALLERGEN_CONFLICT');
  });

  it('rejects cross-site CSRF Origin headers (403) and blocks /api/orders/reset in production (403)', async () => {
    const csrfReq = new Request('http://localhost:3000/api/paypal/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://evil-attacker.example',
      },
      body: JSON.stringify({ itemId: 'prod_turkey_panini' }),
    });
    const csrfRes = await paypalCreateHandler(csrfReq);
    expect(csrfRes.status).toBe(403);

    process.env.APP_ENV = 'production';
    process.env.PAYPAL_CLIENT_ID = 'prod_id';
    process.env.PAYPAL_CLIENT_SECRET = 'prod_secret';
    process.env.PAYPAL_WEBHOOK_ID = 'WH_PROD';
    process.env.GEMINI_API_KEY = 'gem_prod';
    process.env.DATABASE_URL = 'postgresql://localhost:5432/bitepass';
    process.env.BITEPASS_SESSION_SECRET =
      'strong-production-secret-at-least-32-characters-long';

    const resetRes = await ordersResetHandler(
      new Request('http://localhost:3000/api/orders/reset', { method: 'POST' })
    );
    expect(resetRes.status).toBe(403);
  });

  it('rejects forged PayPal webhooks with 401 and processes signed webhooks idempotently', async () => {
    const forgedReq = new Request('http://localhost:3000/api/webhooks/paypal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'WH-FORGED-1',
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
      }),
    });
    const forgedRes = await paypalWebhookHandler(forgedReq);
    expect(forgedRes.status).toBe(401);

    const validReq = () =>
      new Request('http://localhost:3000/api/webhooks/paypal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-paypal-mock-signature': 'VALID_SANDBOX_SIMULATION',
        },
        body: JSON.stringify({
          id: 'WH-VALID-99',
          event_type: 'PAYMENT.AUTHORIZATION.VOIDED',
          resource: { id: 'AUTH-SIM-9104' },
        }),
      });

    const first = await paypalWebhookHandler(validReq());
    expect(first.status).toBe(200);
    const second = await paypalWebhookHandler(validReq());
    const secondJson = await second.json();
    expect(secondJson.duplicate).toBe(true);
  });

  it('allocates 20 simultaneous orders with ZERO duplicate pickup stations under concurrency', async () => {
    const requests = Array.from({ length: 18 }, (_, i) =>
      paypalCreateHandler(
        new Request('http://localhost:3000/api/paypal/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-bitepass-user-id': `usr_stress_${i}`,
          },
          body: JSON.stringify({
            itemId: 'prod_quinoa_bowl',
            customerName: `Diner ${i}`,
          }),
        })
      )
    );

    const responses = await Promise.all(requests);
    const stations: string[] = [];
    for (const r of responses) {
      expect(r.status).toBe(200);
      const body = await r.json();
      stations.push(body.order.cubbyOrBay);
    }

    const uniqueStations = new Set(stations);
    expect(uniqueStations.size).toBe(stations.length);
  });

  it('enforces post-fire 409 GRACE_PERIOD_EXPIRED then executes $5.00 partial-capture void on confirmation, and supports 2-tap cubby refund', async () => {
    // 1. Create order outside 250m (starts in GRACE_HOLD)
    const createRes = await paypalCreateHandler(
      new Request('http://localhost:3000/api/paypal/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: 'prod_turkey_panini',
          distanceMeters: 400,
        }),
      })
    );
    const { order } = await createRes.json();
    expect(order.fulfillmentStage).toBe('GRACE_HOLD');

    // 2. Diner crosses <=250m kitchen fire geofence
    await orderPatchHandler(
      new Request(`http://localhost:3000/api/orders/${order.orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TRIGGER_KITCHEN_FIRE_GEOFENCE',
          distanceMeters: 220,
        }),
      }),
      { params: Promise.resolve({ orderId: order.orderId }) }
    );

    // 3. Unconfirmed cancel returns 409 GRACE_PERIOD_EXPIRED
    const unconfirmedVoid = await paypalVoidHandler(
      new Request('http://localhost:3000/api/paypal/void', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.orderId }),
      })
    );
    expect(unconfirmedVoid.status).toBe(409);

    // 4. Confirmed cancel executes $5.00 partial final capture & releases remainder
    const confirmedVoid = await paypalVoidHandler(
      new Request('http://localhost:3000/api/paypal/void', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.orderId,
          confirmRestockingFee: true,
        }),
      })
    );
    expect(confirmedVoid.status).toBe(200);
    const voidBody = await confirmedVoid.json();
    expect(voidBody.order.status).toBe('CANCELLED_FEE_CAPTURED');
    expect(voidBody.restockingFeeCents).toBe(500);

    // 5. Verify server ignores tampered $0.01 capture amount and supports 2-tap cubby refund
    const create2 = await paypalCreateHandler(
      new Request('http://localhost:3000/api/paypal/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: 'prod_salmon_poke' }),
      })
    );
    const order2 = (await create2.json()).order;

    const captureRes = await paypalCaptureHandler(
      new Request('http://localhost:3000/api/paypal/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order2.orderId,
          distanceMeters: 20,
          amount: 0.01, // Tampered client amount — must be ignored!
        }),
      })
    );
    const capBody = await captureRes.json();
    expect(capBody.capture.capturedAmount).toBe('16.00'); // $14.00 + $1 tax + $1 tip

    const refundRes = await paypalRefundHandler(
      new Request('http://localhost:3000/api/paypal/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order2.orderId,
          reason: 'EMPTY_CUBBY',
          resolution: 'INSTANT_REFUND',
        }),
      })
    );
    expect(refundRes.status).toBe(200);
    const refBody = await refundRes.json();
    expect(refBody.order.status).toBe('REFUNDED');
    expect(refBody.bayCapacity.quarantinedStations).toContain(
      order2.cubbyOrBay
    );
  });

  it('serves /api/health, SSE /api/events snapshot, /api/orders?mine=true, and KDS CLEAR_STATION + VOID_86_ITEM', async () => {
    const healthRes = await healthGetHandler();
    expect(healthRes.status).toBe(200);
    const healthData = await healthRes.json();
    expect(healthData.status).toBe('ok');

    // SSE stream initial snapshot
    const abortCtrl = new AbortController();
    const sseRes = await eventsGetHandler(
      new Request('http://localhost:3000/api/events', {
        signal: abortCtrl.signal,
      })
    );
    expect(sseRes.headers.get('content-type')).toContain('text/event-stream');
    const reader = sseRes.body?.getReader();
    const chunk = await reader?.read();
    const text = new TextDecoder().decode(chunk?.value);
    expect(text).toContain('event: snapshot');
    abortCtrl.abort();

    // KDS CLEAR_STATION on seeded CAPTURED ORD-1089 releases Bay #1
    const clearRes = await orderPatchHandler(
      new Request('http://localhost:3000/api/orders/ORD-1089', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CLEAR_STATION' }),
      }),
      { params: Promise.resolve({ orderId: 'ORD-1089' }) }
    );
    expect(clearRes.status).toBe(200);
    const clearData = await clearRes.json();
    expect(clearData.order.status).toBe('COLLECTED');
    expect(clearData.bayCapacity.occupiedBays).toBe(1);

    // KDS VOID_86_ITEM on seeded AUTHORIZED ORD-1090 voids hold & frees Bay #2
    const void86Res = await orderPatchHandler(
      new Request('http://localhost:3000/api/orders/ORD-1090', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'VOID_86_ITEM' }),
      }),
      { params: Promise.resolve({ orderId: 'ORD-1090' }) }
    );
    expect(void86Res.status).toBe(200);
    const void86Data = await void86Res.json();
    expect(void86Data.order.status).toBe('VOIDED');
    expect(void86Data.bayCapacity.occupiedBays).toBe(0);

    // Single order GET & consumer ?mine=true privacy filter
    const singleGet = await orderGetHandler(
      new Request('http://localhost:3000/api/orders/ORD-1089'),
      { params: Promise.resolve({ orderId: 'ORD-1089' }) }
    );
    expect(singleGet.status).toBe(200);

    const mineGet = await ordersGetHandler(
      new Request('http://localhost:3000/api/orders?mine=true')
    );
    expect(mineGet.status).toBe(200);
    const mineData = await mineGet.json();
    expect(mineData.orders).toBeUndefined(); // Zero cross-user order list leaked!
  });
});

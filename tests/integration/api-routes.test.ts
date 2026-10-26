import { describe, it, expect, beforeEach } from 'vitest';
import { POST as agentHandler } from '@/app/api/agent/route';
import { POST as paypalCreateHandler } from '@/app/api/paypal/create/route';
import { POST as paypalCaptureHandler } from '@/app/api/paypal/capture/route';
import { POST as paypalVoidHandler } from '@/app/api/paypal/void/route';
import { GET as ordersGetHandler } from '@/app/api/orders/route';
import { POST as ordersResetHandler } from '@/app/api/orders/reset/route';

describe('API Route Handlers Integration Test', () => {
  beforeEach(async () => {
    await ordersResetHandler();
  });

  it('POST /api/agent returns structured recommendation for valid context', async () => {
    const req = new Request('http://localhost:3000/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        freeMinutes: 35,
        distanceMeters: 200,
        dietary: 'Omnivore',
      }),
    });

    const res = await agentHandler(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.shouldTrigger).toBe(true);
    expect(data.item.name).toBe('Turkey Avocado Club');
  });

  it('POST /api/agent respects guardrail and returns shouldTrigger: false', async () => {
    const req = new Request('http://localhost:3000/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        freeMinutes: 15,
        distanceMeters: 200,
        dietary: 'Omnivore',
      }),
    });

    const res = await agentHandler(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.shouldTrigger).toBe(false);
  });

  it('Full 2-Phase Lifecycle: /api/paypal/create -> /api/paypal/capture', async () => {
    // 1. Create 1-Tap Authorization
    const createReq = new Request('http://localhost:3000/api/paypal/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemId: 'prod_turkey_panini',
        tweakDelta: 0,
        customerName: 'Judge Evaluator',
      }),
    });

    const createRes = await paypalCreateHandler(createReq);
    expect(createRes.status).toBe(200);

    const createData = await createRes.json();
    expect(createData.success).toBe(true);
    expect(createData.order.status).toBe('AUTHORIZED');
    expect(createData.order.cubbyOrBay).toBeDefined();

    const orderId = createData.order.orderId;
    const authId = createData.order.authId;

    // 2. Doorstep Arrival Proximity Capture
    const captureReq = new Request('http://localhost:3000/api/paypal/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        authId,
        amount: createData.order.totalAmount,
      }),
    });

    const captureRes = await paypalCaptureHandler(captureReq);
    expect(captureRes.status).toBe(200);

    const captureData = await captureRes.json();
    expect(captureData.success).toBe(true);
    expect(captureData.order.status).toBe('CAPTURED');
  });

  it('US-08 Pre-prep Void: /api/paypal/create -> /api/paypal/void', async () => {
    const createReq = new Request('http://localhost:3000/api/paypal/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemId: 'prod_quinoa_bowl',
        customerName: 'Test Diner',
      }),
    });

    const createRes = await paypalCreateHandler(createReq);
    const createData = await createRes.json();
    const orderId = createData.order.orderId;

    const voidReq = new Request('http://localhost:3000/api/paypal/void', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        authId: createData.order.authId,
      }),
    });

    const voidRes = await paypalVoidHandler(voidReq);
    const voidData = await voidRes.json();
    expect(voidData.success).toBe(true);
    expect(voidData.order.status).toBe('VOIDED');
  });

  it('GET /api/orders returns active orders and bay capacity', async () => {
    const res = await ordersGetHandler();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(Array.isArray(data.orders)).toBe(true);
    expect(data.bayCapacity).toBeDefined();
    expect(data.catalog).toBeDefined();
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { POST as agentV1 } from '@/app/api/v1/agent/route';
import { GET as healthV1 } from '@/app/api/v1/health/route';
import { GET as openApiV1 } from '@/app/api/v1/openapi/route';
import { POST as createV1 } from '@/app/api/v1/paypal/create/route';
import { POST as captureV1 } from '@/app/api/v1/paypal/capture/route';
import { POST as voidV1 } from '@/app/api/v1/paypal/void/route';
import { POST as refundV1 } from '@/app/api/v1/paypal/refund/route';
import {
  GET as getOrderV1,
  PATCH as patchOrderV1,
} from '@/app/api/v1/orders/[orderId]/route';
import { GET as walletPassV1 } from '@/app/api/v1/orders/[orderId]/wallet-pass/route';
import { DELETE as deleteAccountDataV1 } from '@/app/api/v1/account/data/route';
import { POST as reconcileV1 } from '@/app/api/v1/internal/reconcile/route';
import { POST as paypalWebhookV1 } from '@/app/api/v1/webhooks/paypal/route';
import { POST as resetOrders } from '@/app/api/orders/reset/route';
import { getKitchenRepository } from '@/lib/mock-db';
import { verifySignedWalletPass } from '@/lib/security';
import { getTelemetrySummary, resetTelemetryBuffer } from '@/lib/telemetry';

describe('Production Readiness Gates (PROD-03..PROD-36)', () => {
  beforeEach(async () => {
    await resetOrders();
    resetTelemetryBuffer();
  });

  it('PROD-03: enforces IDOR ownership across order lookup, capture, void, and refund', async () => {
    const createRes = await createV1(
      new Request('http://localhost:3000/api/v1/paypal/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bitepass-user-id': 'usr_alice',
        },
        body: JSON.stringify({
          itemId: 'prod_turkey_panini',
          customerName: 'Alice',
          distanceMeters: 400,
        }),
      })
    );
    expect(createRes.status).toBe(200);
    const { order } = await createRes.json();

    // Attacker ('usr_mallory') attempts GET, void, capture, and refund on Alice's order
    const malloryGet = await getOrderV1(
      new Request(`http://localhost:3000/api/v1/orders/${order.orderId}`, {
        headers: { 'x-bitepass-user-id': 'usr_mallory' },
      }),
      { params: Promise.resolve({ orderId: order.orderId }) }
    );
    expect(malloryGet.status).toBe(403);

    const malloryVoid = await voidV1(
      new Request('http://localhost:3000/api/v1/paypal/void', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bitepass-user-id': 'usr_mallory',
        },
        body: JSON.stringify({ orderId: order.orderId }),
      })
    );
    expect(malloryVoid.status).toBe(403);

    const malloryCapture = await captureV1(
      new Request('http://localhost:3000/api/v1/paypal/capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bitepass-user-id': 'usr_mallory',
        },
        body: JSON.stringify({ orderId: order.orderId, distanceMeters: 25 }),
      })
    );
    expect(malloryCapture.status).toBe(403);

    const malloryRefund = await refundV1(
      new Request('http://localhost:3000/api/v1/paypal/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bitepass-user-id': 'usr_mallory',
        },
        body: JSON.stringify({
          orderId: order.orderId,
          reason: 'EMPTY_CUBBY',
        }),
      })
    );
    expect(malloryRefund.status).toBe(403);

    // Owner ('usr_alice') succeeds
    const aliceGet = await getOrderV1(
      new Request(`http://localhost:3000/api/v1/orders/${order.orderId}`, {
        headers: { 'x-bitepass-user-id': 'usr_alice' },
      }),
      { params: Promise.resolve({ orderId: order.orderId }) }
    );
    expect(aliceGet.status).toBe(200);
  });

  it('PROD-18: blocks concurrent /create holds for the same diner (409) and enforces 10/min /api/v1/agent rate limit (429)', async () => {
    const makeCreate = () =>
      createV1(
        new Request('http://localhost:3000/api/v1/paypal/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-bitepass-user-id': 'usr_race_diner',
          },
          body: JSON.stringify({
            itemId: 'prod_quinoa_bowl',
            customerName: 'Race Diner',
          }),
        })
      );

    const [r1, r2] = await Promise.all([makeCreate(), makeCreate()]);
    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toEqual([200, 409]);

    // 10 requests succeed on /api/v1/agent; 11th returns 429
    for (let i = 0; i < 10; i += 1) {
      const okRes = await agentV1(
        new Request('http://localhost:3000/api/v1/agent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': '203.0.113.77',
          },
          body: JSON.stringify({
            freeMinutes: 35,
            distanceMeters: 200,
            dietary: 'Omnivore',
          }),
        })
      );
      expect(okRes.status).toBe(200);
    }

    const throttledRes = await agentV1(
      new Request('http://localhost:3000/api/v1/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '203.0.113.77',
        },
        body: JSON.stringify({
          freeMinutes: 35,
          distanceMeters: 200,
          dietary: 'Omnivore',
        }),
      })
    );
    expect(throttledRes.status).toBe(429);
  });

  it('PROD-07: rejects spoofed GPS teleportation (>12 m/s) and stale telemetry (>15s)', async () => {
    const createRes = await createV1(
      new Request('http://localhost:3000/api/v1/paypal/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bitepass-user-id': 'usr_kinematics',
        },
        body: JSON.stringify({
          itemId: 'prod_turkey_panini',
          distanceMeters: 450,
        }),
      })
    );
    const { order } = await createRes.json();

    // Stale GPS fix (30 seconds old) -> 422
    const staleRes = await captureV1(
      new Request('http://localhost:3000/api/v1/paypal/capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bitepass-user-id': 'usr_kinematics',
        },
        body: JSON.stringify({
          orderId: order.orderId,
          telemetry: {
            lat: 37.7897,
            lng: -122.4014,
            accuracyMeters: 8,
            capturedAtMs: Date.now() - 30_000,
          },
        }),
      })
    );
    expect(staleRes.status).toBe(422);

    // Teleportation: order created at 450m away and captured milliseconds later at cafe doorstep (>12 m/s) -> 422
    const now = Date.now();
    const teleportRes = await captureV1(
      new Request('http://localhost:3000/api/v1/paypal/capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bitepass-user-id': 'usr_kinematics',
        },
        body: JSON.stringify({
          orderId: order.orderId,
          telemetry: {
            lat: 37.7897,
            lng: -122.4014,
            accuracyMeters: 8,
            capturedAtMs: now,
          },
        }),
      })
    );
    expect(teleportRes.status).toBe(422);

    // Realistic proximity (<100m walk delta within fresh GPS window) -> 200 CAPTURED
    const createWalkRes = await createV1(
      new Request('http://localhost:3000/api/v1/paypal/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bitepass-user-id': 'usr_kinematics_walk',
        },
        body: JSON.stringify({
          itemId: 'prod_turkey_panini',
          distanceMeters: 85,
        }),
      })
    );
    const walkOrder = (await createWalkRes.json()).order;
    const validWalkRes = await captureV1(
      new Request('http://localhost:3000/api/v1/paypal/capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bitepass-user-id': 'usr_kinematics_walk',
        },
        body: JSON.stringify({
          orderId: walkOrder.orderId,
          telemetry: {
            lat: 37.7897,
            lng: -122.4014,
            accuracyMeters: 8,
            capturedAtMs: Date.now(),
          },
        }),
      })
    );
    expect(validWalkRes.status).toBe(200);
    const capturedBody = await validWalkRes.json();
    expect(capturedBody.order.status).toBe('CAPTURED');
  });

  it('PROD-05: reconciles stuck CAPTURING sagas and reaps >3h expired escrow holds', async () => {
    const repo = getKitchenRepository();
    const catalog = await repo.getCatalog();
    const item = catalog[0];

    const expiredStation = await repo.leaseStation(item.merchantId);
    const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000;
    const staleOrder = await repo.createOrder({
      userId: 'usr_stale',
      customerName: 'Stale Hold',
      item,
      totalAmountCents: 1550,
      totalAmount: 15.5,
      status: 'AUTHORIZED',
      authId: 'AUTH-MOCK-STALE-01',
      cubbyOrBay: expiredStation,
      etaMinutes: 5,
      createdAt: fourHoursAgo,
      authorizedAt: fourHoursAgo,
    });

    const stuckStation = await repo.leaseStation(item.merchantId);
    const twoMinutesAgo = Date.now() - 120_000;
    const stuckOrder = await repo.createOrder({
      userId: 'usr_stuck',
      customerName: 'Stuck Capture',
      item,
      totalAmountCents: 1650,
      totalAmount: 16.5,
      status: 'AUTHORIZED',
      authId: 'AUTH-MOCK-STUCK-02',
      cubbyOrBay: stuckStation,
      etaMinutes: 5,
      createdAt: twoMinutesAgo,
      authorizedAt: twoMinutesAgo,
    });
    await repo.transitionOrder(stuckOrder.orderId, 'CAPTURING');

    const recRes = await reconcileV1(
      new Request('http://localhost:3000/api/v1/internal/reconcile', {
        method: 'POST',
      })
    );
    expect(recRes.status).toBe(200);
    const recBody = await recRes.json();
    expect(recBody.report.expiredReapedIds).toContain(staleOrder.orderId);
    expect(recBody.report.capturingRecoveredIds).toContain(
      stuckOrder.orderId
    );

    const afterStale = await repo.getOrderById(staleOrder.orderId);
    const afterStuck = await repo.getOrderById(stuckOrder.orderId);
    expect(afterStale?.status).toBe('EXPIRED');
    expect(afterStuck?.status).toBe('CAPTURED');
  });

  it('PROD-15 & PROD-24: supports KDS SETTLE_AND_UNLOCK, +5m delay free-cancel reopen, and MERCHANT.PARTNER-CONSENT.REVOKED circuit breaker', async () => {
    const createRes = await createV1(
      new Request('http://localhost:3000/api/v1/paypal/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bitepass-user-id': 'usr_kds_flow',
        },
        body: JSON.stringify({
          itemId: 'prod_turkey_panini',
          distanceMeters: 180, // Inside <=250m fire zone!
        }),
      })
    );
    const { order } = await createRes.json();
    expect(order.fulfillmentStage).toBe('KITCHEN_FIRED');

    // Merchant triggers +5m Delay -> reopens 60s consumer $0 free-cancel window
    const delayRes = await patchOrderV1(
      new Request(`http://localhost:3000/api/v1/orders/${order.orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DELAY_5M' }),
      }),
      { params: Promise.resolve({ orderId: order.orderId }) }
    );
    expect(delayRes.status).toBe(200);

    // Consumer cancels for $0 without restocking fee confirmation!
    const freeVoidRes = await voidV1(
      new Request('http://localhost:3000/api/v1/paypal/void', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bitepass-user-id': 'usr_kds_flow',
        },
        body: JSON.stringify({
          orderId: order.orderId,
          distanceMeters: 180,
          confirmRestockingFee: false,
        }),
      })
    );
    expect(freeVoidRes.status).toBe(200);
    const voidedData = await freeVoidRes.json();
    expect(voidedData.order.status).toBe('VOIDED');

    // Create second order and settle directly from KDS broadband ('SETTLE_AND_UNLOCK')
    const create2 = await createV1(
      new Request('http://localhost:3000/api/v1/paypal/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bitepass-user-id': 'usr_kds_settle',
        },
        body: JSON.stringify({ itemId: 'prod_quinoa_bowl' }),
      })
    );
    const order2 = (await create2.json()).order;
    const settleRes = await patchOrderV1(
      new Request(`http://localhost:3000/api/v1/orders/${order2.orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SETTLE_AND_UNLOCK' }),
      }),
      { params: Promise.resolve({ orderId: order2.orderId }) }
    );
    expect(settleRes.status).toBe(200);
    expect((await settleRes.json()).order.status).toBe('CAPTURED');

    // Revoke Jack's Cafe merchant consent via webhook -> blocks new holds on Jack's items
    const whRes = await paypalWebhookV1(
      new Request('http://localhost:3000/api/v1/webhooks/paypal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-paypal-mock-signature': 'VALID_SANDBOX_SIMULATION',
        },
        body: JSON.stringify({
          id: 'WH-CONSENT-REVOKED-1',
          event_type: 'MERCHANT.PARTNER-CONSENT.REVOKED',
          resource: { merchant_id: 'merch_jacks_cafe' },
        }),
      })
    );
    expect(whRes.status).toBe(200);

    const blockedCreate = await createV1(
      new Request('http://localhost:3000/api/v1/paypal/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bitepass-user-id': 'usr_after_revoke',
        },
        body: JSON.stringify({ itemId: 'prod_turkey_panini' }),
      })
    );
    expect(blockedCreate.status).toBe(400);
  });

  it('PROD-22, PROD-23, PROD-31, PROD-33, PROD-35, PROD-36: verifies OpenAPI 3.1, health probe, B2B/run_id waiver, signed Wallet Pass, telemetry margin, and GDPR erasure', async () => {
    const healthRes = await healthV1();
    expect(healthRes.status).toBe(200);
    const health = await healthRes.json();
    expect(health.db).toBe('up');
    expect(typeof health.mockFallbackEnabled).toBe('boolean');

    const specRes = await openApiV1();
    expect(specRes.status).toBe(200);
    const spec = await specRes.json();
    expect(spec.openapi).toBe('3.1.0');
    expect(spec.paths['/api/v1/paypal/create']).toBeDefined();

    // Create with B2B workEmail + pickupRunId even when waiveFastPassFee=false -> automatically waived!
    const createRes = await createV1(
      new Request('http://localhost:3000/api/v1/paypal/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bitepass-user-id': 'usr_gdpr_diner',
        },
        body: JSON.stringify({
          itemId: 'prod_turkey_panini',
          customerName: 'Casey Enterprise',
          workEmail: 'casey@stripe.com',
          pickupRunId: 'run_bp_floor14',
          waiveFastPassFee: false,
          distanceMeters: 40,
        }),
      })
    );
    expect(createRes.status).toBe(200);
    const { order } = await createRes.json();
    expect(order.pricing.fastPassFeeCents).toBe(0);

    // Export HMAC-signed Wallet Pass & verify cryptographic signature
    const passRes = await walletPassV1(
      new Request(
        `http://localhost:3000/api/v1/orders/${order.orderId}/wallet-pass`,
        { headers: { 'x-bitepass-user-id': 'usr_gdpr_diner' } }
      ),
      { params: Promise.resolve({ orderId: order.orderId }) }
    );
    expect(passRes.status).toBe(200);
    const walletPass = await passRes.json();
    expect(verifySignedWalletPass(walletPass)).toBe(true);

    // Verify funnel telemetry captured pickup_run_joined + wallet_pass_exported
    const telemetry = getTelemetrySummary();
    expect(telemetry.countsByEvent.escrow_authorized).toBeGreaterThanOrEqual(1);
    expect(telemetry.countsByEvent.pickup_run_joined).toBe(1);
    expect(telemetry.countsByEvent.wallet_pass_exported).toBe(1);

    // GDPR Art. 17 DELETE /api/v1/account/data voids active hold & anonymizes diner PII
    const eraseRes = await deleteAccountDataV1(
      new Request('http://localhost:3000/api/v1/account/data', {
        method: 'DELETE',
        headers: { 'x-bitepass-user-id': 'usr_gdpr_diner' },
      })
    );
    expect(eraseRes.status).toBe(200);
    const eraseBody = await eraseRes.json();
    expect(eraseBody.voidedActiveOrderId).toBe(order.orderId);
    expect(eraseBody.anonymizedRecords).toBe(1);

    const scrubbed = await getKitchenRepository().getOrderById(order.orderId);
    expect(scrubbed?.customerName).toBe('Redacted Diner');
    expect(scrubbed?.userId).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';
import {
  GeofenceOutOfBoundsError,
  InvalidStateTransitionError,
  ValidationError,
} from '@/lib/errors';
import {
  assertValidOrderTransition,
  canTransitionOrder,
  evaluateOrderCancellation,
} from '@/lib/order-state-machine';
import { calculateOrderPricingCents, cents } from '@/lib/pricing';
import {
  generateBleToken,
  haversineMeters,
  verifyBleToken,
  verifyDoorstepProximity,
} from '@/lib/validation';

describe('Integer-Cent Financial Math & Breakdown Invariants', () => {
  it('rejects negative or floating-point cent inputs', () => {
    expect(() => cents(-1)).toThrow(ValidationError);
    expect(() => cents(12.5)).toThrow(ValidationError);
    expect(() => cents(Number.NaN)).toThrow(ValidationError);
  });

  it('computes municipal basis-point tax, percent tip, and PAYG FastPass fee with 0-cent drift', () => {
    const summary = calculateOrderPricingCents({
      basePriceCents: 1180, // $11.80 Quinoa Bowl
      tweakDeltaCents: 150, // +$1.50 Avocado Mash = $13.30 subtotal
      taxRateBps: 888, // 8.88% NYC tax -> 118 cents
      tipSelection: { mode: 'percent', percent: 15 }, // 15% of 1330 -> 200 cents
      waiveFastPassFee: false, // $0.99 PAYG FastPass fee
    });

    expect(summary.subtotalCents).toBe(1330);
    expect(summary.taxCents).toBe(118);
    expect(summary.tipCents).toBe(200);
    expect(summary.fastPassFeeCents).toBe(99);
    expect(summary.platformFeeCents).toBe(106); // 8.00% Multiparty split fee
    expect(summary.totalCents).toBe(1330 + 118 + 200 + 99);
    expect(
      summary.subtotalCents +
        summary.taxCents +
        summary.tipCents +
        summary.fastPassFeeCents
    ).toBe(summary.totalCents);
  });

  it('supports $0 optional tip without breaking PayPal breakdown reconciliation', () => {
    const summary = calculateOrderPricingCents({
      basePriceCents: 1250,
      fixedTaxCents: 100,
      tipSelection: { mode: 'fixed_cents', amountCents: 0 },
      waiveFastPassFee: true,
    });

    expect(summary.tipCents).toBe(0);
    expect(summary.totalCents).toBe(1350);
    expect(summary.total).toBe(13.5);
  });
});

describe('Order State Machine & 2-Stage Cancellation Spoilage Shield', () => {
  it('blocks illegal state transitions (e.g., VOIDED -> CAPTURED and CAPTURED -> VOIDED)', () => {
    expect(canTransitionOrder('VOIDED', 'CAPTURED')).toBe(false);
    expect(canTransitionOrder('CAPTURED', 'VOIDED')).toBe(false);
    expect(() =>
      assertValidOrderTransition('ORD-900', 'VOIDED', 'CAPTURED')
    ).toThrow(InvalidStateTransitionError);
  });

  it('grants $0.00 free void inside 90s grace hold when diner is >250m away', () => {
    const now = 1_700_000_000_000;
    const result = evaluateOrderCancellation(
      {
        createdAt: now - 40_000,
        authorizedAt: now - 40_000,
        fulfillmentStage: 'GRACE_HOLD',
        totalAmountCents: 1450,
      },
      now,
      320
    );

    expect(result.canFreeVoid).toBe(true);
    expect(result.requiresRestockingFee).toBe(false);
    expect(result.restockingFeeCents).toBe(0);
  });

  it('enforces $5.00 partial-capture spoilage shield once diner crosses <=250m fire geofence', () => {
    const now = 1_700_000_000_000;
    const result = evaluateOrderCancellation(
      {
        createdAt: now - 20_000,
        authorizedAt: now - 20_000,
        fulfillmentStage: 'GRACE_HOLD',
        totalAmountCents: 1450,
      },
      now,
      210 // <= 250m kitchen fire boundary
    );

    expect(result.canFreeVoid).toBe(false);
    expect(result.requiresRestockingFee).toBe(true);
    expect(result.restockingFeeCents).toBe(500);
  });

  it('enforces $5.00 partial-capture spoilage shield once 90s grace window elapses', () => {
    const now = 1_700_000_000_000;
    const result = evaluateOrderCancellation(
      {
        createdAt: now - 95_000,
        authorizedAt: now - 95_000,
        fulfillmentStage: 'GRACE_HOLD',
        totalAmountCents: 1450,
      },
      now,
      400
    );

    expect(result.canFreeVoid).toBe(false);
    expect(result.requiresRestockingFee).toBe(true);
    expect(result.restockingFeeCents).toBe(500);
  });
});

describe('Haversine Doorstep Telemetry & Rotating BLE HMAC Token', () => {
  const cafeLat = 37.7897;
  const cafeLng = -122.4014;

  it('accepts valid <=50m GPS + fresh BLE token and rejects >50m or coarse GPS', () => {
    const now = Date.now();
    const validBle = generateBleToken('merch_jacks_cafe', Math.floor(now / 30_000));
    expect(verifyBleToken('merch_jacks_cafe', validBle, now)).toBe(true);
    expect(verifyBleToken('merch_jacks_cafe', 'forged0000000000', now)).toBe(
      false
    );

    // ~15m away
    expect(() =>
      verifyDoorstepProximity({
        merchantId: 'merch_jacks_cafe',
        merchantLat: cafeLat,
        merchantLng: cafeLng,
        nowMs: now,
        telemetry: {
          lat: cafeLat + 0.0001,
          lng: cafeLng,
          accuracyMeters: 12,
          capturedAtMs: now - 2_000,
          bleToken: validBle,
        },
      })
    ).not.toThrow();

    // ~220m away (>50m doorstep boundary)
    const farLat = cafeLat + 0.002;
    expect(haversineMeters(farLat, cafeLng, cafeLat, cafeLng)).toBeGreaterThan(50);
    expect(() =>
      verifyDoorstepProximity({
        merchantId: 'merch_jacks_cafe',
        merchantLat: cafeLat,
        merchantLng: cafeLng,
        nowMs: now,
        telemetry: {
          lat: farLat,
          lng: cafeLng,
          accuracyMeters: 10,
          capturedAtMs: now,
        },
      })
    ).toThrow(GeofenceOutOfBoundsError);
  });
});


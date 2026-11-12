import { NextResponse } from 'next/server';
import { getMerchantForMenuItem } from '@/lib/catalog';
import {
  InvalidStateTransitionError,
  OrderNotFoundError,
  PaymentDeclinedError,
  parseJsonBody,
  toProblemResponse,
} from '@/lib/errors';
import { logger, resolveTraceId } from '@/lib/logger';
import { getKitchenRepository } from '@/lib/mock-db';
import { canTransitionOrder } from '@/lib/order-state-machine';
import { captureAuthorization } from '@/lib/paypal-client';
import {
  assertMerchantOrDemoAccess,
  assertOrderOwnershipOrMerchant,
  assertSameOrigin,
  buildActiveOrderCookie,
  checkRateLimit,
  sanitizeOrderForDiner,
} from '@/lib/security';
import {
  computeOrderContributionMargin,
  trackFunnelEvent,
} from '@/lib/telemetry';
import {
  CaptureEscrowRequestSchema,
  validateSchema,
  verifyDoorstepProximity,
} from '@/lib/validation';

export async function POST(req: Request) {
  const repo = getKitchenRepository();
  const traceId = resolveTraceId(req);

  try {
    assertSameOrigin(req);
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    checkRateLimit(`paypal-capture:${ip}`, 30);

    const rawBody = await parseJsonBody(req);
    const input = validateSchema(CaptureEscrowRequestSchema, rawBody);

    const existing = await repo.getOrderById(input.orderId);
    if (!existing) {
      throw new OrderNotFoundError(input.orderId);
    }

    // PROD-03: Enforce IDOR ownership or Merchant KDS broadband attestation
    if (input.kdsAttested) {
      assertMerchantOrDemoAccess(req);
    } else {
      assertOrderOwnershipOrMerchant(req, existing);
    }

    // Idempotent replay if already settled
    if (existing.status === 'CAPTURED') {
      const bayCapacity = await repo.getBayCapacity();
      return NextResponse.json(
        {
          success: true,
          idempotentReplay: true,
          order: sanitizeOrderForDiner(existing),
          bayCapacity,
        },
        { headers: { 'X-Trace-Id': traceId } }
      );
    }

    if (!canTransitionOrder(existing.status, 'CAPTURING')) {
      throw new InvalidStateTransitionError(
        existing.orderId,
        existing.status,
        'CAPTURED'
      );
    }

    if (!existing.authId) {
      throw new PaymentDeclinedError(
        `Order '${existing.orderId}' has no valid PayPal authorizationId on record.`
      );
    }

    const merchant = getMerchantForMenuItem(existing.item);
    verifyDoorstepProximity({
      merchantId: existing.merchantId,
      merchantLat: merchant.latitude,
      merchantLng: merchant.longitude,
      telemetry: input.telemetry,
      distanceMeters: input.distanceMeters,
      initialDistanceMeters: existing.distanceMeters,
      authorizedAtMs: existing.authorizedAt ?? existing.createdAt,
      manualCheckInConfirmed: input.manualCheckInConfirmed,
      kdsAttested: input.kdsAttested,
    });

    // Phase A: Claim CAPTURING lock before external settlement call
    await repo.transitionOrder(existing.orderId, 'CAPTURING');

    let captureRes;
    try {
      // Phase B: Execute PayPal capture strictly using SERVER-STORED authId and totalAmountCents
      captureRes = await captureAuthorization(existing.authId, {
        amountCents: existing.totalAmountCents,
        idempotencyKey:
          req.headers.get('idempotency-key')?.trim() ??
          input.idempotencyKey ??
          `cap:${existing.orderId}`,
        isFinalCapture: true,
      });
    } catch (captureErr) {
      await repo.transitionOrder(existing.orderId, 'CAPTURE_FAILED');
      throw captureErr;
    }

    // Phase C: Persist settled state
    const settled = await repo.transitionOrder(existing.orderId, 'CAPTURED', {
      captureId: captureRes.id,
      capturedAt: Date.now(),
      etaMinutes: 0,
      fulfillmentStage: 'READY',
    });

    const margin = computeOrderContributionMargin(settled.pricing);
    trackFunnelEvent({
      event: 'doorstep_captured',
      traceId,
      orderId: settled.orderId,
      userId: settled.userId,
      merchantId: settled.merchantId,
      net_contribution_margin_usd: margin.netContributionMarginUsd,
      llm_cost_usd: margin.llmCostUsd,
      properties: {
        station: settled.cubbyOrBay,
        kdsAttested: Boolean(input.kdsAttested),
      },
    });

    logger.info('Settled Phase 2 PayPal doorstep capture', {
      traceId,
      orderId: settled.orderId,
      merchantId: settled.merchantId,
      station: settled.cubbyOrBay,
    });

    const bayCapacity = await repo.getBayCapacity();
    const res = NextResponse.json(
      {
        success: true,
        capture: captureRes,
        order: input.kdsAttested ? settled : sanitizeOrderForDiner(settled),
        bayCapacity,
      },
      { headers: { 'X-Trace-Id': traceId } }
    );
    if (!input.kdsAttested) {
      res.headers.append('Set-Cookie', buildActiveOrderCookie(settled.orderId));
    }
    return res;
  } catch (error) {
    return toProblemResponse(error, '/api/paypal/capture');
  }
}

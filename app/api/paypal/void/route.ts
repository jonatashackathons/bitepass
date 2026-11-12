import { NextResponse } from 'next/server';
import { getEnv } from '@/lib/env';
import {
  GracePeriodExpiredError,
  InvalidStateTransitionError,
  OrderNotFoundError,
  parseJsonBody,
  toProblemResponse,
} from '@/lib/errors';
import { logger, resolveTraceId } from '@/lib/logger';
import { getKitchenRepository } from '@/lib/mock-db';
import {
  canTransitionOrder,
  evaluateOrderCancellation,
} from '@/lib/order-state-machine';
import { captureAuthorization, voidAuthorization } from '@/lib/paypal-client';
import {
  assertOrderOwnershipOrMerchant,
  assertSameOrigin,
  buildActiveOrderCookie,
  checkRateLimit,
  sanitizeOrderForDiner,
} from '@/lib/security';
import { trackFunnelEvent } from '@/lib/telemetry';
import { VoidEscrowRequestSchema, validateSchema } from '@/lib/validation';

export async function POST(req: Request) {
  const traceId = resolveTraceId(req);
  try {
    assertSameOrigin(req);
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    checkRateLimit(`paypal-void:${ip}`, 30);

    const rawBody = await parseJsonBody(req);
    const input = validateSchema(VoidEscrowRequestSchema, rawBody);

    const repo = getKitchenRepository();
    const existing = await repo.getOrderById(input.orderId);
    if (!existing) {
      throw new OrderNotFoundError(input.orderId);
    }

    // PROD-03: Enforce IDOR ownership or Merchant KDS access
    assertOrderOwnershipOrMerchant(req, existing);

    if (
      existing.status === 'VOIDED' ||
      existing.status === 'CANCELLED_FEE_CAPTURED'
    ) {
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

    if (!canTransitionOrder(existing.status, 'VOIDED')) {
      throw new InvalidStateTransitionError(
        existing.orderId,
        existing.status,
        'VOIDED'
      );
    }

    const allowSimOverride =
      Boolean(input.freeCancelOverride) && !getEnv().isProductionTier;
    const evaluation = evaluateOrderCancellation(
      existing,
      Date.now(),
      input.distanceMeters
    );

    if (evaluation.canFreeVoid || allowSimOverride) {
      const voidRes = existing.authId
        ? await voidAuthorization(existing.authId, `void:${existing.orderId}`)
        : { status: 'VOIDED', isMock: true };

      const updated = await repo.transitionOrder(existing.orderId, 'VOIDED', {
        voidedAt: Date.now(),
        fulfillmentStage: 'HANDED_OFF',
      });
      await repo.releaseStation(existing.cubbyOrBay);

      trackFunnelEvent({
        event: 'escrow_voided',
        traceId,
        orderId: updated.orderId,
        userId: updated.userId,
        merchantId: updated.merchantId,
        net_contribution_margin_usd: 0,
        llm_cost_usd: 0,
        void_zone: 'PRE_FIRE_GRACE_0_FEE',
      });

      logger.info('Voided pre-fire PayPal escrow hold ($0 fee)', {
        traceId,
        orderId: updated.orderId,
      });

      const bayCapacity = await repo.getBayCapacity();
      const res = NextResponse.json(
        {
          success: true,
          void: voidRes,
          order: sanitizeOrderForDiner(updated),
          bayCapacity,
        },
        { headers: { 'X-Trace-Id': traceId } }
      );
      res.headers.append('Set-Cookie', buildActiveOrderCookie(null));
      return res;
    }

    // Kitchen has already fired (past 90s grace hold or inside <=250m fire geofence)
    if (!input.confirmRestockingFee) {
      throw new GracePeriodExpiredError(
        existing.orderId,
        evaluation.restockingFeeCents,
        evaluation.reason
      );
    }

    const partialCaptureRes = await captureAuthorization(
      existing.authId ?? existing.orderId,
      {
        amountCents: evaluation.restockingFeeCents,
        idempotencyKey: `cancel-fee:${existing.orderId}`,
        isFinalCapture: true,
        noteToPayer:
          'BitePass post-fire perishable COGS restocking fee; remaining hold released.',
      }
    );

    const updated = await repo.transitionOrder(
      existing.orderId,
      'CANCELLED_FEE_CAPTURED',
      {
        captureId: partialCaptureRes.id,
        restockingFeeCents: evaluation.restockingFeeCents,
        voidedAt: Date.now(),
        fulfillmentStage: 'HANDED_OFF',
      }
    );
    await repo.releaseStation(existing.cubbyOrBay);

    trackFunnelEvent({
      event: 'escrow_voided',
      traceId,
      orderId: updated.orderId,
      userId: updated.userId,
      merchantId: updated.merchantId,
      net_contribution_margin_usd: 0.4,
      llm_cost_usd: 0,
      void_zone: 'POST_FIRE_5_COGS_SHIELD',
      properties: { restockingFeeCents: evaluation.restockingFeeCents },
    });

    const bayCapacity = await repo.getBayCapacity();
    const res = NextResponse.json(
      {
        success: true,
        partialCapture: partialCaptureRes,
        restockingFeeCents: evaluation.restockingFeeCents,
        order: sanitizeOrderForDiner(updated),
        bayCapacity,
      },
      { headers: { 'X-Trace-Id': traceId } }
    );
    res.headers.append('Set-Cookie', buildActiveOrderCookie(null));
    return res;
  } catch (error) {
    return toProblemResponse(error, '/api/paypal/void');
  }
}

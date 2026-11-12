import { NextResponse } from 'next/server';
import {
  InvalidStateTransitionError,
  OrderNotFoundError,
  parseJsonBody,
  toProblemResponse,
} from '@/lib/errors';
import { logger, resolveTraceId } from '@/lib/logger';
import { getKitchenRepository } from '@/lib/mock-db';
import { refundCapture } from '@/lib/paypal-client';
import {
  assertOrderOwnershipOrMerchant,
  assertSameOrigin,
  buildActiveOrderCookie,
  checkRateLimit,
  sanitizeOrderForDiner,
} from '@/lib/security';
import { trackFunnelEvent } from '@/lib/telemetry';
import { RefundOrderRequestSchema, validateSchema } from '@/lib/validation';

export async function POST(req: Request) {
  const traceId = resolveTraceId(req);
  try {
    assertSameOrigin(req);
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    checkRateLimit(`paypal-refund:${ip}`, 15);

    const rawBody = await parseJsonBody(req);
    const input = validateSchema(RefundOrderRequestSchema, rawBody);

    const repo = getKitchenRepository();
    const existing = await repo.getOrderById(input.orderId);
    if (!existing) {
      throw new OrderNotFoundError(input.orderId);
    }

    // PROD-03: Enforce IDOR ownership or Merchant KDS access
    assertOrderOwnershipOrMerchant(req, existing);

    if (existing.status === 'REFUNDED') {
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

    // Immediately quarantine the faulty cubby/bay so no subsequent diner is routed to it
    await repo.quarantineStation(existing.cubbyOrBay);

    if (input.resolution === 'RUSH_REMAKE') {
      const remakeStation = await repo.leaseStation(existing.merchantId);
      const updated = await repo.updateOrderFields(existing.orderId, {
        cubbyOrBay: remakeStation,
        fulfillmentStage: 'KITCHEN_FIRED',
        etaMinutes: 3,
      });
      const bayCapacity = await repo.getBayCapacity();
      return NextResponse.json(
        {
          success: true,
          resolution: 'RUSH_REMAKE',
          order: sanitizeOrderForDiner(updated),
          bayCapacity,
        },
        { headers: { 'X-Trace-Id': traceId } }
      );
    }

    if (existing.status !== 'CAPTURED' && existing.status !== 'COLLECTED') {
      throw new InvalidStateTransitionError(
        existing.orderId,
        existing.status,
        'REFUNDED'
      );
    }

    const refundRes = await refundCapture(
      existing.captureId ?? existing.orderId,
      existing.totalAmountCents,
      `BitePass Cubby Issue: ${input.reason}`,
      `refund:${existing.orderId}`
    );

    const refunded = await repo.transitionOrder(existing.orderId, 'REFUNDED', {
      refundId: refundRes.id,
      refundedAt: Date.now(),
      fulfillmentStage: 'QUARANTINED',
    });

    trackFunnelEvent({
      event: 'cubby_refunded',
      traceId,
      orderId: refunded.orderId,
      userId: refunded.userId,
      merchantId: refunded.merchantId,
      net_contribution_margin_usd: -0.49,
      llm_cost_usd: 0,
      properties: {
        reason: input.reason,
        quarantinedStation: existing.cubbyOrBay,
      },
    });

    logger.warn('Issued instant cubby dispute refund & quarantined station', {
      traceId,
      orderId: refunded.orderId,
      station: existing.cubbyOrBay,
      reason: input.reason,
    });

    const bayCapacity = await repo.getBayCapacity();
    const res = NextResponse.json(
      {
        success: true,
        resolution: 'INSTANT_REFUND',
        refund: refundRes,
        order: sanitizeOrderForDiner(refunded),
        bayCapacity,
      },
      { headers: { 'X-Trace-Id': traceId } }
    );
    res.headers.append('Set-Cookie', buildActiveOrderCookie(null));
    return res;
  } catch (error) {
    return toProblemResponse(error, '/api/paypal/refund');
  }
}

import { NextResponse } from 'next/server';
import {
  OrderNotFoundError,
  PaymentDeclinedError,
  parseJsonBody,
  toProblemResponse,
} from '@/lib/errors';
import { getKitchenRepository } from '@/lib/mock-db';
import { captureAuthorization, voidAuthorization } from '@/lib/paypal-client';
import {
  assertMerchantOrDemoAccess,
  assertOrderOwnershipOrMerchant,
  assertSameOrigin,
  hasMerchantToken,
  sanitizeOrderForDiner,
} from '@/lib/security';
import {
  computeOrderContributionMargin,
  trackFunnelEvent,
} from '@/lib/telemetry';
import { KdsOrderPatchSchema, validateSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await context.params;
    const repo = getKitchenRepository();
    const order = await repo.getOrderById(orderId);
    if (!order) {
      throw new OrderNotFoundError(orderId);
    }

    assertOrderOwnershipOrMerchant(req, order);

    const bayCapacity = await repo.getBayCapacity();
    return NextResponse.json(
      {
        order: hasMerchantToken(req) ? order : sanitizeOrderForDiner(order),
        bayCapacity,
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) {
    return toProblemResponse(error, '/api/orders/[orderId]');
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    assertSameOrigin(req);
    const { orderId } = await context.params;
    const rawBody = await parseJsonBody(req);
    const input = validateSchema(KdsOrderPatchSchema, rawBody);

    const repo = getKitchenRepository();
    const existing = await repo.getOrderById(orderId);
    if (!existing) {
      throw new OrderNotFoundError(orderId);
    }

    if (input.action === 'TRIGGER_KITCHEN_FIRE_GEOFENCE') {
      assertOrderOwnershipOrMerchant(req, existing);
    } else {
      assertMerchantOrDemoAccess(req);
    }

    const now = Date.now();
    let updated = existing;

    switch (input.action) {
      case 'ACCEPT_AND_FIRE':
      case 'TRIGGER_KITCHEN_FIRE_GEOFENCE': {
        updated = await repo.updateOrderFields(orderId, {
          fulfillmentStage: 'KITCHEN_FIRED',
          kitchenFiredAt: existing.kitchenFiredAt ?? now,
        });
        trackFunnelEvent({
          event: 'kitchen_fired',
          orderId: updated.orderId,
          userId: updated.userId,
          merchantId: updated.merchantId,
          net_contribution_margin_usd: 0,
          llm_cost_usd: 0,
        });
        break;
      }
      case 'MARK_READY': {
        updated = await repo.updateOrderFields(orderId, {
          fulfillmentStage: 'READY',
          readyAt: now,
          etaMinutes: 0,
        });
        break;
      }
      case 'SETTLE_AND_UNLOCK': {
        if (!existing.authId) {
          throw new PaymentDeclinedError(
            `Order '${existing.orderId}' has no PayPal authorizationId for KDS settlement.`
          );
        }
        await repo.transitionOrder(orderId, 'CAPTURING');
        try {
          const capRes = await captureAuthorization(existing.authId, {
            amountCents: existing.totalAmountCents,
            idempotencyKey: `cap:${existing.orderId}`,
            isFinalCapture: true,
          });
          updated = await repo.transitionOrder(orderId, 'CAPTURED', {
            captureId: capRes.id,
            capturedAt: now,
            etaMinutes: 0,
            fulfillmentStage: 'READY',
          });
          const margin = computeOrderContributionMargin(updated.pricing);
          trackFunnelEvent({
            event: 'doorstep_captured',
            orderId: updated.orderId,
            userId: updated.userId,
            merchantId: updated.merchantId,
            net_contribution_margin_usd: margin.netContributionMarginUsd,
            llm_cost_usd: margin.llmCostUsd,
            properties: { kdsAttested: true },
          });
        } catch (err) {
          await repo.transitionOrder(orderId, 'CAPTURE_FAILED');
          throw err;
        }
        break;
      }
      case 'CLEAR_STATION': {
        if (existing.status === 'CAPTURED') {
          updated = await repo.transitionOrder(orderId, 'COLLECTED', {
            fulfillmentStage: 'HANDED_OFF',
            collectedAt: now,
            etaMinutes: 0,
          });
        } else {
          updated = await repo.updateOrderFields(orderId, {
            fulfillmentStage: 'HANDED_OFF',
            collectedAt: now,
          });
        }
        await repo.releaseStation(existing.cubbyOrBay);
        break;
      }
      case 'DELAY_5M': {
        // PROD-15: +5m delay also re-opens/extends at least a 60-second consumer free-cancellation window
        const baseGraceEnd =
          existing.graceExpiresAt ??
          (existing.authorizedAt ?? existing.createdAt) + 90_000;
        updated = await repo.updateOrderFields(orderId, {
          etaMinutes: existing.etaMinutes + 5,
          graceExpiresAt: Math.max(baseGraceEnd + 60_000, now + 60_000),
          fulfillmentStage: 'GRACE_HOLD',
          kitchenFiredAt: undefined,
        });
        break;
      }
      case 'VOID_86_ITEM': {
        await repo.setItemAvailability(existing.item.id, false);
        if (existing.status === 'AUTHORIZED' && existing.authId) {
          await voidAuthorization(existing.authId, `kds-86:${orderId}`);
          updated = await repo.transitionOrder(orderId, 'VOIDED', {
            voidedAt: now,
            fulfillmentStage: 'HANDED_OFF',
          });
          trackFunnelEvent({
            event: 'escrow_voided',
            orderId: updated.orderId,
            merchantId: updated.merchantId,
            net_contribution_margin_usd: 0,
            llm_cost_usd: 0,
            void_zone: 'MERCHANT_86_0_FEE',
          });
        }
        await repo.releaseStation(existing.cubbyOrBay);
        break;
      }
      case 'CLEAR_QUARANTINE': {
        await repo.clearStationQuarantine(input.stationCode ?? existing.cubbyOrBay);
        break;
      }
    }

    const bayCapacity = await repo.getBayCapacity();
    return NextResponse.json({
      success: true,
      order: updated,
      bayCapacity,
    });
  } catch (error) {
    return toProblemResponse(error, '/api/orders/[orderId]');
  }
}

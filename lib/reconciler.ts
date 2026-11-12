import { logger } from './logger';
import { getKitchenRepository } from './mock-db';
import { ESCROW_EXPIRY_DURATION_MS } from './order-state-machine';
import { captureAuthorization, voidAuthorization } from './paypal-client';
import { computeOrderContributionMargin, trackFunnelEvent } from './telemetry';

export interface ReconciliationReport {
  scanned: number;
  expiredReapedIds: string[];
  capturingRecoveredIds: string[];
  capturingFailedIds: string[];
  timestamp: string;
}

export const STUCK_CAPTURING_THRESHOLD_MS = 30_000;

/**
 * Crash-Safe Saga Reconciler & 3-Hour Escrow SLA Reaper:
 * 1. Reaps uncaptured AUTHORIZED holds exceeding the 3-hour SLA (`VOID` + station release).
 * 2. Converges interrupted `CAPTURING` sagas via PayPal-Request-Id idempotent replay (`cap:${orderId}`).
 */
export async function reconcileEscrowOrders(
  nowMs = Date.now()
): Promise<ReconciliationReport> {
  const repo = getKitchenRepository();
  const orders = await repo.listOrders();

  const expiredReapedIds: string[] = [];
  const capturingRecoveredIds: string[] = [];
  const capturingFailedIds: string[] = [];

  for (const order of orders) {
    const authTimestamp = order.authorizedAt ?? order.createdAt;

    if (
      order.status === 'AUTHORIZED' &&
      nowMs - authTimestamp >= ESCROW_EXPIRY_DURATION_MS
    ) {
      try {
        if (order.authId && !order.isSimulated) {
          await voidAuthorization(order.authId, `reaper:${order.orderId}`);
        }
      } catch (err) {
        logger.warn('Reaper void upstream warning; marking local hold EXPIRED', {
          orderId: order.orderId,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      await repo.transitionOrder(order.orderId, 'EXPIRED', {
        voidedAt: nowMs,
        fulfillmentStage: 'HANDED_OFF',
      });
      await repo.releaseStation(order.cubbyOrBay);
      trackFunnelEvent({
        event: 'escrow_voided',
        orderId: order.orderId,
        merchantId: order.merchantId,
        net_contribution_margin_usd: 0,
        llm_cost_usd: 0,
        void_zone: 'EXPIRED_SLA',
      });
      expiredReapedIds.push(order.orderId);
      continue;
    }

    if (
      order.status === 'CAPTURING' &&
      order.authId &&
      nowMs - order.createdAt >= STUCK_CAPTURING_THRESHOLD_MS
    ) {
      try {
        const capRes = await captureAuthorization(order.authId, {
          amountCents: order.totalAmountCents,
          idempotencyKey: `cap:${order.orderId}`,
          isFinalCapture: true,
        });
        await repo.transitionOrder(order.orderId, 'CAPTURED', {
          captureId: capRes.id,
          capturedAt: nowMs,
          etaMinutes: 0,
          fulfillmentStage: 'READY',
        });
        const margin = computeOrderContributionMargin(order.pricing);
        trackFunnelEvent({
          event: 'doorstep_captured',
          orderId: order.orderId,
          merchantId: order.merchantId,
          net_contribution_margin_usd: margin.netContributionMarginUsd,
          llm_cost_usd: margin.llmCostUsd,
          properties: { recoveredByReconciler: true },
        });
        capturingRecoveredIds.push(order.orderId);
      } catch (err) {
        await repo.transitionOrder(order.orderId, 'CAPTURE_FAILED');
        logger.error('Reconciler failed to settle stuck CAPTURING order', {
          orderId: order.orderId,
          error: err instanceof Error ? err.message : String(err),
        });
        capturingFailedIds.push(order.orderId);
      }
    }
  }

  return {
    scanned: orders.length,
    expiredReapedIds,
    capturingRecoveredIds,
    capturingFailedIds,
    timestamp: new Date(nowMs).toISOString(),
  };
}


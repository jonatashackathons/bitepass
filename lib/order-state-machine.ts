import { InvalidStateTransitionError } from './errors';
import { POST_FIRE_RESTOCKING_FEE_CENTS } from './pricing';
import { FulfillmentStage, OrderStatus, OrderTicket } from './types';

export const GRACE_HOLD_DURATION_MS = 90_000; // 90-second pre-prep grace window
export const KITCHEN_FIRE_GEOFENCE_METERS = 250; // Outer <=250m kitchen assembly trigger
export const DOORSTEP_CAPTURE_GEOFENCE_METERS = 50; // Inner <=50m settlement trigger
export const ESCROW_EXPIRY_DURATION_MS = 3 * 60 * 60 * 1000; // 3-hour SLA hold cap

export const ALLOWED_ORDER_TRANSITIONS: Readonly<
  Record<OrderStatus, readonly OrderStatus[]>
> = {
  PROPOSED: ['AUTHORIZING', 'AUTHORIZED', 'VOIDED'],
  AUTHORIZING: ['AUTHORIZED', 'VOIDED', 'EXPIRED'],
  AUTHORIZED: [
    'CAPTURING',
    'CAPTURED',
    'VOIDING',
    'VOIDED',
    'CANCELLED_FEE_CAPTURED',
    'EXPIRED',
    'CAPTURE_FAILED',
  ],
  CAPTURING: ['CAPTURED', 'CAPTURE_FAILED', 'AUTHORIZED'],
  CAPTURED: ['COLLECTED', 'REFUNDED'],
  CAPTURE_FAILED: ['CAPTURING', 'CAPTURED', 'VOIDED', 'EXPIRED'],
  VOIDING: ['VOIDED', 'EXPIRED', 'CANCELLED_FEE_CAPTURED'],
  COLLECTED: ['REFUNDED'], // Allow post-pickup dispute refund
  VOIDED: [],
  CANCELLED_FEE_CAPTURED: [],
  EXPIRED: [],
  REFUNDED: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_ORDER_TRANSITIONS[from].includes(to);
}

export function assertValidOrderTransition(
  orderId: string,
  from: OrderStatus,
  to: OrderStatus
): void {
  if (!canTransitionOrder(from, to)) {
    throw new InvalidStateTransitionError(orderId, from, to);
  }
}

export function doesOrderOccupyStation(status: OrderStatus, stage: FulfillmentStage): boolean {
  if (stage === 'HANDED_OFF') return false;
  return (
    status === 'AUTHORIZING' ||
    status === 'AUTHORIZED' ||
    status === 'CAPTURING' ||
    status === 'CAPTURED' ||
    status === 'CAPTURE_FAILED'
  );
}

export interface CancellationEvaluation {
  canFreeVoid: boolean;
  requiresRestockingFee: boolean;
  restockingFeeCents: number;
  reason: string;
}

/**
 * Evaluates the 2-Stage Cancellation & Spoilage Shield Rule:
 * - Free $0.00 Void if order is still in GRACE_HOLD (<90s since authorization AND >250m away)
 * - Post-fire ($5.00 partial-capture COGS shield) once kitchen has fired (<=250m or >=90s elapsed)
 */
export function evaluateOrderCancellation(
  order: Pick<
    OrderTicket,
    | 'authorizedAt'
    | 'createdAt'
    | 'graceExpiresAt'
    | 'fulfillmentStage'
    | 'kitchenFiredAt'
    | 'totalAmountCents'
  >,
  nowMs = Date.now(),
  currentDistanceMeters?: number
): CancellationEvaluation {
  const authTime = order.authorizedAt ?? order.createdAt;
  const elapsedMs = Math.max(0, nowMs - authTime);

  // PROD-15: Honor merchant-granted +5m delay 60s consumer free-cancellation window
  const hasExtendedMerchantDelayWindow =
    typeof order.graceExpiresAt === 'number' &&
    order.graceExpiresAt > authTime + GRACE_HOLD_DURATION_MS + 1_000 &&
    nowMs <= order.graceExpiresAt;

  if (hasExtendedMerchantDelayWindow) {
    return {
      canFreeVoid: true,
      requiresRestockingFee: false,
      restockingFeeCents: 0,
      reason: 'Within merchant-extended delay free-cancellation window ($0.00 fee).',
    };
  }

  const crossedFireGeofence =
    typeof currentDistanceMeters === 'number' &&
    currentDistanceMeters <= KITCHEN_FIRE_GEOFENCE_METERS;

  const isKitchenFired =
    order.fulfillmentStage === 'KITCHEN_FIRED' ||
    order.fulfillmentStage === 'READY' ||
    Boolean(order.kitchenFiredAt) ||
    elapsedMs > GRACE_HOLD_DURATION_MS ||
    crossedFireGeofence;

  if (!isKitchenFired) {
    return {
      canFreeVoid: true,
      requiresRestockingFee: false,
      restockingFeeCents: 0,
      reason: 'Within pre-prep 90s grace hold before kitchen fire ($0.00 fee).',
    };
  }

  const cappedFee = Math.min(POST_FIRE_RESTOCKING_FEE_CENTS, order.totalAmountCents);
  return {
    canFreeVoid: false,
    requiresRestockingFee: true,
    restockingFeeCents: cappedFee,
    reason:
      'Kitchen assembly has already fired (past 90s grace window or <=250m fire perimeter). Canceling requires a $5.00 partial capture to cover perishable ingredients, releasing the remainder immediately.',
  };
}


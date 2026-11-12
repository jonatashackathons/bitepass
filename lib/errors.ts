import { NextResponse } from 'next/server';
import { OrderStatus } from './types';

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  code: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;
  abstract readonly slug: string;
  readonly retryable: boolean = false;

  constructor(
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends DomainError {
  readonly code = 'REQUEST_VALIDATION_FAILED';
  readonly httpStatus = 400;
  readonly slug = 'validation-failed';
}

export class MalformedJsonError extends DomainError {
  readonly code = 'REQUEST_MALFORMED_JSON';
  readonly httpStatus = 400;
  readonly slug = 'malformed-json';
}

export class UnauthorizedError extends DomainError {
  readonly code = 'UNAUTHORIZED';
  readonly httpStatus = 401;
  readonly slug = 'unauthorized';
}

export class ForbiddenError extends DomainError {
  readonly code = 'FORBIDDEN';
  readonly httpStatus = 403;
  readonly slug = 'forbidden';
}

export class OrderNotFoundError extends DomainError {
  readonly code = 'ORDER_NOT_FOUND';
  readonly httpStatus = 404;
  readonly slug = 'order-not-found';

  constructor(orderId: string) {
    super(`Order '${orderId}' was not found.`, { orderId });
  }
}

export class InvalidStateTransitionError extends DomainError {
  readonly code = 'ORDER_INVALID_STATE_TRANSITION';
  readonly httpStatus = 409;
  readonly slug = 'invalid-order-state';

  constructor(orderId: string, from: OrderStatus, to: OrderStatus) {
    super(`Illegal state transition for ${orderId}: ${from} -> ${to}`, {
      orderId,
      from,
      to,
    });
  }
}

export class GracePeriodExpiredError extends DomainError {
  readonly code = 'GRACE_PERIOD_EXPIRED';
  readonly httpStatus = 409;
  readonly slug = 'grace-period-expired';

  constructor(orderId: string, restockingFeeCents: number, reason: string) {
    super(reason, {
      orderId,
      restockingFeeCents,
      restockingFee: Number((restockingFeeCents / 100).toFixed(2)),
    });
  }
}

export class StationExhaustedError extends DomainError {
  readonly code = 'BAY_CAPACITY_EXHAUSTED';
  readonly httpStatus = 409;
  readonly slug = 'capacity-exhausted';

  constructor(merchantName: string) {
    super(`All pickup bays and heated cubbies at ${merchantName} are currently occupied.`, {
      merchantName,
    });
  }
}

export class ActiveOrderExistsError extends DomainError {
  readonly code = 'ACTIVE_ORDER_EXISTS';
  readonly httpStatus = 409;
  readonly slug = 'active-order-exists';

  constructor(existingOrderId: string) {
    super(`Diner already holds an active escrow authorization (${existingOrderId}).`, {
      existingOrderId,
    });
  }
}

export class GeofenceOutOfBoundsError extends DomainError {
  readonly code = 'GEOFENCE_DISTANCE_OUT_OF_BOUNDS';
  readonly httpStatus = 422;
  readonly slug = 'geofence-out-of-bounds';
}

export class AllergenConflictError extends DomainError {
  readonly code = 'ALLERGEN_CONFLICT';
  readonly httpStatus = 422;
  readonly slug = 'allergen-conflict';
}

export class RateLimitExceededError extends DomainError {
  readonly code = 'RATE_LIMIT_EXCEEDED';
  readonly httpStatus = 429;
  readonly slug = 'rate-limit-exceeded';
  override readonly retryable = true;
}

export class PaymentDeclinedError extends DomainError {
  readonly code = 'PAYPAL_CAPTURE_DENIED';
  readonly httpStatus = 422;
  readonly slug = 'paypal-capture-denied';
}

export class PaymentProviderError extends DomainError {
  readonly code = 'PAYMENT_PROVIDER_ERROR';
  readonly httpStatus = 502;
  readonly slug = 'payment-provider-error';
  override readonly retryable = true;

  constructor(
    operation: 'oauth' | 'authorize' | 'capture' | 'void' | 'refund' | 'webhook',
    message: string,
    upstreamStatus?: number
  ) {
    super(`PayPal ${operation} failed: ${message}`, { operation, upstreamStatus });
  }
}

export async function parseJsonBody(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new MalformedJsonError('Request body must be valid JSON.');
  }
}

export function toProblemResponse(err: unknown, instance?: string): NextResponse {
  if (err instanceof DomainError) {
    const body: ProblemDetails = {
      type: `https://docs.bitepass.ai/problems/${err.slug}`,
      title: err.name,
      status: err.httpStatus,
      detail: err.message,
      instance,
      code: err.code,
      retryable: err.retryable,
      details: err.details,
    };
    return NextResponse.json(
      { ...body, error: err.message },
      {
        status: err.httpStatus,
        headers: { 'Content-Type': 'application/problem+json' },
      }
    );
  }

  console.error('[BitePass Unhandled API Error]', err);
  const fallback: ProblemDetails = {
    type: 'https://docs.bitepass.ai/problems/internal-error',
    title: 'Internal Server Error',
    status: 500,
    detail: 'An unexpected internal error occurred.',
    instance,
    code: 'INTERNAL_SERVER_ERROR',
    retryable: false,
  };
  return NextResponse.json(
    { ...fallback, error: fallback.detail },
    {
      status: 500,
      headers: { 'Content-Type': 'application/problem+json' },
    }
  );
}


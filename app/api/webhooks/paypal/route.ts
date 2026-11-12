import { NextResponse } from 'next/server';
import { setMerchantPayability } from '@/lib/catalog';
import {
  UnauthorizedError,
  ValidationError,
  parseJsonBody,
  toProblemResponse,
} from '@/lib/errors';
import { logger, resolveTraceId } from '@/lib/logger';
import { getKitchenRepository } from '@/lib/mock-db';
import { verifyPayPalWebhookSignature } from '@/lib/paypal-client';

interface PayPalWebhookEvent {
  id?: string;
  event_type?: string;
  resource?: {
    id?: string;
    custom_id?: string;
    merchant_id?: string;
    status?: string;
  };
}

export async function POST(req: Request) {
  const traceId = resolveTraceId(req);
  try {
    const rawBody = await parseJsonBody(req);
    if (!rawBody || typeof rawBody !== 'object') {
      throw new ValidationError('Webhook payload must be a JSON object.');
    }

    const event = rawBody as PayPalWebhookEvent & Record<string, unknown>;
    if (!event.id || !event.event_type) {
      throw new ValidationError('Missing PayPal webhook id or event_type.');
    }

    const verified = await verifyPayPalWebhookSignature(req.headers, event);
    if (!verified) {
      throw new UnauthorizedError('Invalid PayPal webhook cryptographic signature.');
    }

    const repo = getKitchenRepository();
    if (await repo.hasProcessedWebhook(event.id)) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    // PROD-24: Partner Merchant KYC & Consent Circuit Breaker Webhooks
    const merchantTarget = event.resource?.merchant_id ?? event.resource?.id;
    if (
      event.event_type === 'MERCHANT.PARTNER-CONSENT.REVOKED' &&
      merchantTarget
    ) {
      const updated = setMerchantPayability(merchantTarget, false);
      logger.warn('Merchant partner consent revoked via PayPal webhook', {
        traceId,
        merchantTarget,
        updated,
      });
    } else if (
      event.event_type === 'MERCHANT.ONBOARDING.COMPLETED' &&
      merchantTarget
    ) {
      setMerchantPayability(merchantTarget, true);
    }

    const resourceId = event.resource?.id;
    if (resourceId) {
      const orders = await repo.listOrders();
      const matched = orders.find(
        (o) =>
          o.authId === resourceId ||
          o.paypalOrderId === resourceId ||
          o.captureId === resourceId ||
          o.orderId === event.resource?.custom_id
      );

      if (matched) {
        if (
          event.event_type === 'PAYMENT.AUTHORIZATION.VOIDED' &&
          matched.status === 'AUTHORIZED'
        ) {
          await repo.transitionOrder(matched.orderId, 'EXPIRED', {
            voidedAt: Date.now(),
            fulfillmentStage: 'HANDED_OFF',
          });
          await repo.releaseStation(matched.cubbyOrBay);
        } else if (
          event.event_type === 'PAYMENT.CAPTURE.COMPLETED' &&
          (matched.status === 'AUTHORIZED' || matched.status === 'CAPTURING')
        ) {
          await repo.transitionOrder(matched.orderId, 'CAPTURED', {
            captureId: resourceId,
            capturedAt: Date.now(),
            etaMinutes: 0,
            fulfillmentStage: 'READY',
          });
        } else if (
          event.event_type === 'PAYMENT.CAPTURE.DENIED' &&
          matched.status === 'CAPTURING'
        ) {
          await repo.transitionOrder(matched.orderId, 'CAPTURE_FAILED');
        }
      }
    }

    await repo.markWebhookProcessed(event.id);
    return NextResponse.json({ received: true, eventType: event.event_type });
  } catch (error) {
    return toProblemResponse(error, '/api/webhooks/paypal');
  }
}

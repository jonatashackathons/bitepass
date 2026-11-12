import { NextResponse } from 'next/server';
import { toProblemResponse } from '@/lib/errors';
import { logger, resolveTraceId } from '@/lib/logger';
import { getKitchenRepository } from '@/lib/mock-db';
import { voidAuthorization } from '@/lib/paypal-client';
import {
  assertSameOrigin,
  buildActiveOrderCookie,
  buildClearedSessionCookie,
  resolveDinerPrincipal,
} from '@/lib/security';

export const dynamic = 'force-dynamic';

/**
 * PROD-23: GDPR Art. 17 / CCPA Right-to-Erasure Endpoint (`DELETE /api/v1/account/data`).
 * Releases any uncaptured escrow authorization, anonymizes historical order PII,
 * and expires session & active-order cookies immediately.
 */
export async function DELETE(req: Request) {
  const traceId = resolveTraceId(req);
  try {
    assertSameOrigin(req);
    const principal = resolveDinerPrincipal(req);
    const repo = getKitchenRepository();

    let voidedActiveOrderId: string | null = null;
    if (!principal.isNewSession) {
      const active = await repo.findActiveOrderForUser(principal.userId);
      if (active && active.status === 'AUTHORIZED') {
        if (active.authId && !active.isSimulated) {
          await voidAuthorization(active.authId, `gdpr-delete:${active.orderId}`);
        }
        await repo.transitionOrder(active.orderId, 'VOIDED', {
          voidedAt: Date.now(),
          fulfillmentStage: 'HANDED_OFF',
        });
        await repo.releaseStation(active.cubbyOrBay);
        voidedActiveOrderId = active.orderId;
      }
    }

    const anonymizedRecords = principal.isNewSession
      ? 0
      : await repo.anonymizeUserOrders(principal.userId);

    logger.info('Completed GDPR/CCPA diner data erasure', {
      traceId,
      anonymizedRecords,
      voidedActiveOrderId,
    });

    const res = NextResponse.json(
      {
        deleted: true,
        anonymizedRecords,
        voidedActiveOrderId,
        timestamp: new Date().toISOString(),
      },
      { headers: { 'X-Trace-Id': traceId } }
    );
    res.headers.append('Set-Cookie', buildClearedSessionCookie());
    res.headers.append('Set-Cookie', buildActiveOrderCookie(null));
    return res;
  } catch (error) {
    return toProblemResponse(error, '/api/v1/account/data');
  }
}


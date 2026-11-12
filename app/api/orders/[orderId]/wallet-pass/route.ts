import { NextResponse } from 'next/server';
import { OrderNotFoundError, toProblemResponse } from '@/lib/errors';
import { resolveTraceId } from '@/lib/logger';
import { getKitchenRepository } from '@/lib/mock-db';
import {
  assertOrderOwnershipOrMerchant,
  createSignedWalletPass,
} from '@/lib/security';
import { trackFunnelEvent } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  const traceId = resolveTraceId(req);
  try {
    const { orderId } = await context.params;
    const repo = getKitchenRepository();
    const order = await repo.getOrderById(orderId);
    if (!order) {
      throw new OrderNotFoundError(orderId);
    }

    assertOrderOwnershipOrMerchant(req, order);

    const passBundle = createSignedWalletPass(order);
    trackFunnelEvent({
      event: 'wallet_pass_exported',
      traceId,
      orderId: order.orderId,
      userId: order.userId,
      merchantId: order.merchantId,
      net_contribution_margin_usd: 0,
      llm_cost_usd: 0,
      properties: { shelfColorCode: passBundle.expressShelfColor.code },
    });

    return NextResponse.json(passBundle, {
      headers: {
        'Cache-Control': 'no-store',
        'X-Trace-Id': traceId,
      },
    });
  } catch (error) {
    return toProblemResponse(error, '/api/v1/orders/[orderId]/wallet-pass');
  }
}


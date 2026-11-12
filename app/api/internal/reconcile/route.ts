import { NextResponse } from 'next/server';
import { toProblemResponse } from '@/lib/errors';
import { logger, resolveTraceId } from '@/lib/logger';
import { reconcileEscrowOrders } from '@/lib/reconciler';
import { assertMerchantOrDemoAccess } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const traceId = resolveTraceId(req);
  try {
    assertMerchantOrDemoAccess(req);
    const report = await reconcileEscrowOrders();
    logger.info('Executed escrow saga reconciler & 3h SLA reaper', {
      traceId,
      ...report,
    });
    return NextResponse.json(
      { success: true, report },
      { headers: { 'X-Trace-Id': traceId } }
    );
  } catch (error) {
    return toProblemResponse(error, '/api/internal/reconcile');
  }
}


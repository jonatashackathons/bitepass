import { NextResponse } from 'next/server';
import { getEnv } from '@/lib/env';
import { ForbiddenError, toProblemResponse } from '@/lib/errors';
import { getKitchenRepository } from '@/lib/mock-db';
import {
  assertSameOrigin,
  assertSandboxAdminAccess,
  buildActiveOrderCookie,
  resetRateLimits,
} from '@/lib/security';

export function POST(): Promise<NextResponse>;
export function POST(req: Request): Promise<NextResponse>;
export async function POST(req?: Request): Promise<NextResponse> {
  try {
    if (req) {
      assertSameOrigin(req);
      assertSandboxAdminAccess(req);
    } else {
      const env = getEnv();
      if (env.isProductionTier || env.PAYPAL_ENV === 'live') {
        throw new ForbiddenError(
          'Queue reset is permanently disabled in live/production environments.'
        );
      }
    }

    const repo = getKitchenRepository();
    await repo.reset();
    resetRateLimits();
    const orders = await repo.listOrders();
    const bayCapacity = await repo.getBayCapacity();

    const res = NextResponse.json({
      success: true,
      orders,
      bayCapacity,
    });
    res.headers.append('Set-Cookie', buildActiveOrderCookie(null));
    return res;
  } catch (error) {
    return toProblemResponse(error, '/api/orders/reset');
  }
}

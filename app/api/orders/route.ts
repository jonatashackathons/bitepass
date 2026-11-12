import { NextResponse } from 'next/server';
import { getEnv } from '@/lib/env';
import { toProblemResponse } from '@/lib/errors';
import { getKitchenRepository } from '@/lib/mock-db';
import {
  assertMerchantOrDemoAccess,
  getActiveOrderCookie,
  hasExplicitDinerPrincipal,
  maskDinerNameForKds,
  sanitizeOrderForDiner,
} from '@/lib/security';

export const dynamic = 'force-dynamic';

export function GET(): Promise<NextResponse>;
export function GET(req: Request): Promise<NextResponse>;
export async function GET(req?: Request): Promise<NextResponse> {
  try {
    const repo = getKitchenRepository();
    const bayCapacity = await repo.getBayCapacity();
    const catalog = await repo.getCatalog();

    if (req) {
      const url = new URL(req.url);
      if (url.searchParams.get('mine') === 'true') {
        const cookieOrderId = getActiveOrderCookie(req);
        const existingUserId = hasExplicitDinerPrincipal(req);
        let activeOrder = cookieOrderId
          ? await repo.getOrderById(cookieOrderId)
          : existingUserId
            ? await repo.findActiveOrderForUser(existingUserId)
            : null;

        if (
          activeOrder &&
          existingUserId &&
          activeOrder.userId &&
          activeOrder.userId !== existingUserId
        ) {
          activeOrder = await repo.findActiveOrderForUser(existingUserId);
        }

        const terminalCleared =
          activeOrder &&
          (activeOrder.status === 'VOIDED' ||
            activeOrder.status === 'CANCELLED_FEE_CAPTURED' ||
            activeOrder.status === 'REFUNDED' ||
            activeOrder.status === 'COLLECTED' ||
            activeOrder.status === 'EXPIRED');

        return NextResponse.json(
          {
            activeOrder:
              !activeOrder || terminalCleared
                ? null
                : sanitizeOrderForDiner(activeOrder),
            bayCapacity,
            catalog,
          },
          { headers: { 'Cache-Control': 'no-store, max-age=0' } }
        );
      }

      assertMerchantOrDemoAccess(req);
    }

    const rawOrders = await repo.listOrders();
    const isProd = getEnv().isProductionTier;
    const orders = isProd
      ? rawOrders.map((o) => ({
          ...o,
          customerName: maskDinerNameForKds(o.customerName),
        }))
      : rawOrders;

    return NextResponse.json(
      {
        orders,
        bayCapacity,
        catalog,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    return toProblemResponse(error, '/api/orders');
  }
}

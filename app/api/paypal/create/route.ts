import { NextResponse } from 'next/server';
import { createAuthorizationOrder } from '@/lib/paypal-client';
import { kitchenStore, MENU_CATALOG, calculateOrderPricing } from '@/lib/mock-db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const itemId = body.itemId || 'prod_turkey_panini';
    const tweakDelta = Number(body.tweakDelta || 0);
    const selectedTweak = body.selectedTweak || undefined;
    const customerName = body.customerName || 'Alex Hunter';

    const item = MENU_CATALOG.find((i) => i.id === itemId) || MENU_CATALOG[0];
    const pricing = calculateOrderPricing(item.price, tweakDelta);

    // Call PayPal Orders v2 with intent: "AUTHORIZE"
    const paypalRes = await createAuthorizationOrder(pricing.total);

    // Allocate station and record in kitchen state
    const station = kitchenStore.allocateStation();
    const now = Date.now();

    const orderTicket = kitchenStore.addOrder({
      customerName,
      item,
      totalAmount: pricing.total,
      status: 'AUTHORIZED',
      authId: paypalRes.authorizationId || `AUTH-${paypalRes.id}`,
      cubbyOrBay: station,
      etaMinutes: item.prepTimeMinutes,
      createdAt: now,
      authorizedAt: now,
      selectedTweak,
    });

    return NextResponse.json({
      success: true,
      order: orderTicket,
      paypal: paypalRes,
    });
  } catch (error) {
    console.error('PayPal create error:', error);
    return NextResponse.json(
      { error: 'Failed to create PayPal authorization' },
      { status: 500 }
    );
  }
}

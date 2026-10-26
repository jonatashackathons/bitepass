import { NextResponse } from 'next/server';
import { captureAuthorization } from '@/lib/paypal-client';
import { kitchenStore } from '@/lib/mock-db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, authId, amount } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing orderId' },
        { status: 400 }
      );
    }

    const captureRes = await captureAuthorization(authId || orderId, amount);

    const updated = kitchenStore.updateOrderStatus(orderId, 'CAPTURED', {
      captureId: captureRes.id,
      capturedAt: Date.now(),
      etaMinutes: 0,
    });

    return NextResponse.json({
      success: true,
      capture: captureRes,
      order: updated,
    });
  } catch (error) {
    console.error('PayPal capture error:', error);
    return NextResponse.json(
      { error: 'Failed to capture PayPal authorization' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { voidAuthorization } from '@/lib/paypal-client';
import { kitchenStore } from '@/lib/mock-db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, authId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing orderId' },
        { status: 400 }
      );
    }

    const voidRes = await voidAuthorization(authId || orderId);

    const updated = kitchenStore.updateOrderStatus(orderId, 'VOIDED');

    return NextResponse.json({
      success: true,
      void: voidRes,
      order: updated,
    });
  } catch (error) {
    console.error('PayPal void error:', error);
    return NextResponse.json(
      { error: 'Failed to void PayPal authorization' },
      { status: 500 }
    );
  }
}

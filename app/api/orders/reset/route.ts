import { NextResponse } from 'next/server';
import { kitchenStore } from '@/lib/mock-db';

export async function POST() {
  kitchenStore.resetOrders();
  return NextResponse.json({
    success: true,
    orders: kitchenStore.getOrders(),
    bayCapacity: kitchenStore.getBayCapacity(),
  });
}

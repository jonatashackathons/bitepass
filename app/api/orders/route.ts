import { NextResponse } from 'next/server';
import { kitchenStore, MENU_CATALOG } from '@/lib/mock-db';

export async function GET() {
  const orders = kitchenStore.getOrders();
  const bayCapacity = kitchenStore.getBayCapacity();

  return NextResponse.json({
    orders,
    bayCapacity,
    catalog: MENU_CATALOG,
  });
}

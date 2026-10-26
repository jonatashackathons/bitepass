import { describe, it, expect, beforeEach } from 'vitest';
import {
  MENU_CATALOG,
  calculateOrderPricing,
  findBestMenuItem,
  kitchenStore,
  FIXED_TAX,
  FIXED_TIP,
} from '@/lib/mock-db';

describe('Mock DB & Deterministic Pricing Matrix', () => {
  beforeEach(() => {
    kitchenStore.resetOrders();
  });

  it('contains all 4 required hackathon menu items with fixed prices', () => {
    expect(MENU_CATALOG).toHaveLength(4);

    const turkeyClub = MENU_CATALOG.find((i) => i.id === 'prod_turkey_panini');
    expect(turkeyClub).toBeDefined();
    expect(turkeyClub?.merchantName).toBe("Jack's Cafe");
    expect(turkeyClub?.price).toBe(12.50);
  });

  it('calculates deterministic pricing without AI hallucination', () => {
    // 12.50 base + 1.00 tax + 1.00 tip = 14.50
    const pricing = calculateOrderPricing(12.50);
    expect(pricing.basePrice).toBe(12.50);
    expect(pricing.tax).toBe(FIXED_TAX);
    expect(pricing.tip).toBe(FIXED_TIP);
    expect(pricing.total).toBe(14.50);

    // With quick tweak (e.g. +$1.50)
    const tweakedPricing = calculateOrderPricing(12.50, 1.50);
    expect(tweakedPricing.basePrice).toBe(14.00);
    expect(tweakedPricing.total).toBe(16.00);
  });

  it('matches dietary preferences accurately', () => {
    const veganItem = findBestMenuItem('Vegan');
    expect(veganItem.dietaryTags).toContain('Vegan');

    const gfItem = findBestMenuItem('Gluten-Free');
    expect(gfItem.dietaryTags).toContain('Gluten-Free');

    const omniItem = findBestMenuItem('Omnivore');
    expect(omniItem.dietaryTags).toContain('Omnivore');
  });

  it('handles kitchen bay capacity and auto-routes to grab-and-go when bays are occupied', () => {
    const initialCapacity = kitchenStore.getBayCapacity();
    expect(initialCapacity.totalBays).toBe(2);

    // Initial seeded orders occupy bays
    const station = kitchenStore.allocateStation();
    // Since seed has Bay #1 and Bay #2 occupied, next is auto-routed to Grab & Go cubby
    expect(station).toContain('Pickup Cubby');

    // Add an order
    const order = kitchenStore.addOrder({
      customerName: 'Test Diner',
      item: MENU_CATALOG[0],
      totalAmount: 14.50,
      status: 'AUTHORIZED',
      cubbyOrBay: station,
      etaMinutes: 5,
      createdAt: Date.now(),
    });

    expect(order.orderId).toBeDefined();
    expect(order.status).toBe('AUTHORIZED');

    // Update order to CAPTURED
    const updated = kitchenStore.updateOrderStatus(order.orderId, 'CAPTURED');
    expect(updated?.status).toBe('CAPTURED');
  });
});

import { MenuItem, OrderTicket, BayCapacity, DietaryPreference } from './types';

export const MENU_CATALOG: MenuItem[] = [
  {
    id: 'prod_turkey_panini',
    name: 'Turkey Avocado Club',
    merchantName: "Jack's Cafe",
    category: 'Artisan Sandwiches',
    price: 12.50,
    prepTimeMinutes: 5,
    dietaryTags: ['Omnivore'],
    description: 'Smoked turkey breast, Haas avocado, applewood bacon, garlic aioli on toasted sourdough.',
    calories: 640,
    image: '/images/turkey_club.jpg',
    quickTweaks: {
      label: 'Side Selection',
      options: [
        { name: 'Kettle Sea Salt Chips', priceDelta: 0 },
        { name: 'Arugula Citrus Side Salad', priceDelta: 1.50 },
      ],
    },
  },
  {
    id: 'prod_quinoa_bowl',
    name: 'Kale Quinoa Power Bowl',
    merchantName: 'Green & Grains',
    category: 'Warm Grain Bowls',
    price: 11.80,
    prepTimeMinutes: 4,
    dietaryTags: ['Vegan', 'Gluten-Free'],
    description: 'Organic red quinoa, massaged Tuscan kale, roasted sweet potato, pumpkin seeds, lemon tahini dressing.',
    calories: 520,
    image: '/images/quinoa_bowl.jpg',
    quickTweaks: {
      label: 'Dressing & Toppings',
      options: [
        { name: 'Lemon Tahini (Standard)', priceDelta: 0 },
        { name: 'Extra Avocado Mash', priceDelta: 1.50 },
      ],
    },
  },
  {
    id: 'prod_truffle_melt',
    name: 'Sourdough Truffle Melt',
    merchantName: 'Artisan Melt Co.',
    category: 'Gourmet Melts',
    price: 10.50,
    prepTimeMinutes: 6,
    dietaryTags: ['Omnivore'],
    description: 'Aged gruyère, sharp cheddar, caramelized shallots, white truffle butter on country sourdough.',
    calories: 680,
    image: '/images/truffle_melt.jpg',
    quickTweaks: {
      label: 'Dip Pairing',
      options: [
        { name: 'Roasted Tomato Bisque', priceDelta: 2.00 },
        { name: 'House Herb Mayo', priceDelta: 0 },
      ],
    },
  },
  {
    id: 'prod_salmon_poke',
    name: 'Salmon Poke Protein Bowl',
    merchantName: 'Tokyo Bites',
    category: 'Fresh Bowls',
    price: 14.00,
    prepTimeMinutes: 5,
    dietaryTags: ['Gluten-Free', 'Omnivore'],
    description: 'Sashimi salmon, sushi rice, edamame, cucumber, pickled ginger, tamari gluten-free glaze.',
    calories: 580,
    image: '/images/salmon_poke.jpg',
    quickTweaks: {
      label: 'Base Choice',
      options: [
        { name: 'Standard Sushi Rice', priceDelta: 0 },
        { name: 'Cauliflower Rice Swap', priceDelta: 1.00 },
      ],
    },
  },
];

export const FIXED_TAX = 1.00;
export const FIXED_TIP = 1.00;

export function calculateOrderPricing(basePrice: number, tweakDelta = 0) {
  const adjustedBase = Number((basePrice + tweakDelta).toFixed(2));
  const tax = FIXED_TAX;
  const tip = FIXED_TIP;
  const total = Number((adjustedBase + tax + tip).toFixed(2));
  return {
    basePrice: adjustedBase,
    tax,
    tip,
    total,
  };
}

export function findBestMenuItem(dietary: DietaryPreference): MenuItem {
  const match = MENU_CATALOG.find((item) => item.dietaryTags.includes(dietary));
  return match || MENU_CATALOG[0];
}

// In-Memory Kitchen and Bay State
class KitchenStateStore {
  private orders: OrderTicket[] = [];
  private orderCounter = 101;
  private maxHighTopBays = 2;

  constructor() {
    this.seedInitialOrders();
  }

  private seedInitialOrders() {
    const now = Date.now();
    this.orders = [
      {
        orderId: 'ORD-1089',
        customerName: 'Sarah Jenkins',
        item: MENU_CATALOG[1], // Quinoa Bowl
        totalAmount: 13.80,
        status: 'CAPTURED',
        authId: 'AUTH-SIM-8821',
        captureId: 'CAP-SIM-4912',
        cubbyOrBay: 'Bay #1',
        etaMinutes: 0,
        createdAt: now - 12 * 60 * 1000,
        authorizedAt: now - 10 * 60 * 1000,
        capturedAt: now - 2 * 60 * 1000,
      },
      {
        orderId: 'ORD-1090',
        customerName: 'David Chen',
        item: MENU_CATALOG[2], // Truffle Melt
        totalAmount: 12.50,
        status: 'AUTHORIZED',
        authId: 'AUTH-SIM-9104',
        cubbyOrBay: 'Bay #2',
        etaMinutes: 4,
        createdAt: now - 3 * 60 * 1000,
        authorizedAt: now - 2 * 60 * 1000,
      },
    ];
  }

  public getOrders(): OrderTicket[] {
    return [...this.orders];
  }

  public getBayCapacity(): BayCapacity {
    const activeOrders = this.orders.filter(
      (o) => o.status === 'AUTHORIZED' || o.status === 'CAPTURED'
    );
    const activeBays = activeOrders
      .map((o) => o.cubbyOrBay)
      .filter((loc) => loc.startsWith('Bay #'));

    const occupiedBays = Math.min(activeBays.length, this.maxHighTopBays);
    return {
      occupiedBays,
      totalBays: this.maxHighTopBays,
      activeBayNames: activeBays,
    };
  }

  public allocateStation(): string {
    const capacity = this.getBayCapacity();
    if (!capacity.activeBayNames.includes('Bay #1')) {
      return 'Bay #1';
    }
    if (!capacity.activeBayNames.includes('Bay #2')) {
      return 'Bay #2';
    }
    // Bays full -> auto-route to Grab & Go cubbies
    const nextCubbyLetter = String.fromCharCode(65 + (this.orders.length % 4));
    return `Pickup Cubby #${nextCubbyLetter} (Grab & Go)`;
  }

  public addOrder(order: Omit<OrderTicket, 'orderId'>): OrderTicket {
    const newOrder: OrderTicket = {
      ...order,
      orderId: `ORD-${this.orderCounter++}`,
    };
    this.orders.unshift(newOrder);
    return newOrder;
  }

  public updateOrderStatus(
    orderId: string,
    status: OrderTicket['status'],
    extra?: Partial<OrderTicket>
  ): OrderTicket | null {
    const idx = this.orders.findIndex((o) => o.orderId === orderId);
    if (idx === -1) return null;
    this.orders[idx] = {
      ...this.orders[idx],
      status,
      ...extra,
    };
    return this.orders[idx];
  }

  public resetOrders() {
    this.seedInitialOrders();
    this.orderCounter = 101;
  }
}

// Global Singleton to retain state across Next.js API requests during dev
const globalForKitchen = globalThis as unknown as {
  kitchenStore?: KitchenStateStore;
};

export const kitchenStore =
  globalForKitchen.kitchenStore ?? new KitchenStateStore();

if (process.env.NODE_ENV !== 'production') {
  globalForKitchen.kitchenStore = kitchenStore;
}

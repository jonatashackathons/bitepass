export type DietaryPreference = 'Omnivore' | 'Vegan' | 'Gluten-Free';

export interface MenuItem {
  id: string;
  name: string;
  merchantName: string;
  category: string;
  price: number;
  prepTimeMinutes: number;
  dietaryTags: DietaryPreference[];
  description: string;
  calories: number;
  image?: string;
  quickTweaks?: {
    label: string;
    options: { name: string; priceDelta: number }[];
  };
}

export interface AgentContext {
  freeMinutes: number;
  distanceMeters: number;
  dietary: DietaryPreference;
  userLocationName?: string;
  nextMeetingTitle?: string;
}

export interface AgentRecommendation {
  shouldTrigger: boolean;
  item?: MenuItem;
  reason?: string;
  timeSavedMinutes?: number;
  walkingBufferMinutes?: number;
  total?: number;
  breakdown?: {
    basePrice: number;
    tax: number;
    tip: number;
    total: number;
  };
}

export type OrderStatus =
  | 'PROPOSED'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'VOIDED'
  | 'REFUNDED';

export interface OrderTicket {
  orderId: string;
  customerName: string;
  item: MenuItem;
  totalAmount: number;
  status: OrderStatus;
  authId?: string;
  captureId?: string;
  cubbyOrBay: string;
  etaMinutes: number;
  createdAt: number;
  authorizedAt?: number;
  capturedAt?: number;
  selectedTweak?: string;
}

export interface BayCapacity {
  occupiedBays: number;
  totalBays: number;
  activeBayNames: string[];
}

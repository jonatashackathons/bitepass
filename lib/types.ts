export type DietaryPreference = 'Omnivore' | 'Vegan' | 'Gluten-Free';

export const ALL_FDA_ALLERGENS = [
  'Milk',
  'Eggs',
  'Fish',
  'Shellfish',
  'Tree Nuts',
  'Peanuts',
  'Wheat',
  'Soy',
  'Sesame',
] as const;

export type Allergen = (typeof ALL_FDA_ALLERGENS)[number];

export interface QuickTweakOption {
  id: string;
  name: string;
  priceDeltaCents: number;
  priceDelta: number;
}

export interface MenuItem {
  id: string;
  merchantId: string;
  merchantName: string;
  merchantPayeeId?: string;
  taxRateBps: number;
  name: string;
  category: string;
  basePriceCents: number;
  price: number;
  prepTimeMinutes: number;
  dietaryTags: DietaryPreference[];
  allergens: Allergen[];
  isAvailable: boolean;
  description: string;
  calories: number;
  image?: string;
  quickTweaks?: {
    label: string;
    options: QuickTweakOption[];
  };
}

export type ContextMode = 'calendar_gap' | 'transit_transfer' | 'on_call_lull';

export interface AgentContext {
  freeMinutes: number;
  distanceMeters: number;
  dietary: DietaryPreference;
  excludedAllergens?: Allergen[];
  contextMode?: ContextMode;
  towerId?: string;
}

export type SuppressionCode =
  | 'QUIET_WINDOW'
  | 'OUTSIDE_PERIMETER'
  | 'MODEL_DECLINED'
  | 'NO_ELIGIBLE_DIETARY_ITEM'
  | 'STATION_AT_CAPACITY';

export interface OrderPricingSummary {
  basePriceCents: number;
  tweakDeltaCents: number;
  subtotalCents: number;
  taxRateBps: number;
  taxCents: number;
  tipCents: number;
  fastPassFeeCents: number;
  platformFeeCents: number;
  totalCents: number;
  // Dollar representations for UI rendering
  basePrice: number;
  tax: number;
  tip: number;
  fastPassFee: number;
  total: number;
}

export interface TriggeredRecommendation {
  shouldTrigger: true;
  item: MenuItem;
  alternatives: MenuItem[];
  reason: string;
  timeSavedMinutes: number;
  walkingBufferMinutes: number;
  totalCents: number;
  total: number;
  breakdown: OrderPricingSummary;
}

export interface SuppressedRecommendation {
  shouldTrigger: false;
  suppressionCode: SuppressionCode;
  reason: string;
  item?: undefined;
  alternatives?: undefined;
  timeSavedMinutes?: undefined;
  walkingBufferMinutes?: undefined;
  totalCents?: undefined;
  total?: undefined;
  breakdown?: undefined;
}

export type AgentRecommendation = TriggeredRecommendation | SuppressedRecommendation;

export type OrderStatus =
  | 'PROPOSED'
  | 'AUTHORIZING'
  | 'AUTHORIZED'
  | 'CAPTURING'
  | 'CAPTURED'
  | 'COLLECTED'
  | 'VOIDING'
  | 'VOIDED'
  | 'CANCELLED_FEE_CAPTURED'
  | 'EXPIRED'
  | 'CAPTURE_FAILED'
  | 'REFUNDED';

export type FulfillmentStage =
  | 'GRACE_HOLD'
  | 'KITCHEN_FIRED'
  | 'READY'
  | 'HANDED_OFF'
  | 'QUARANTINED';

export interface OrderTicket {
  orderId: string;
  merchantId: string;
  userId?: string;
  customerName: string;
  item: MenuItem;
  totalAmountCents: number;
  totalAmount: number;
  pricing?: OrderPricingSummary;
  status: OrderStatus;
  fulfillmentStage: FulfillmentStage;
  authId?: string;
  paypalOrderId?: string;
  captureId?: string;
  refundId?: string;
  cubbyOrBay: string;
  etaMinutes: number;
  createdAt: number;
  authorizedAt?: number;
  graceExpiresAt?: number;
  kitchenFiredAt?: number;
  readyAt?: number;
  capturedAt?: number;
  collectedAt?: number;
  voidedAt?: number;
  refundedAt?: number;
  restockingFeeCents?: number;
  selectedTweak?: string;
  selectedTweakId?: string;
  distanceMeters?: number;
  pickupRunId?: string;
  offlineQrToken?: string;
  isSimulated?: boolean;
  version: number;
}

export interface BayCapacity {
  occupiedBays: number;
  totalBays: number;
  activeBayNames: string[];
  occupiedCubbies?: number;
  totalCubbies?: number;
  quarantinedStations?: string[];
}

export interface OrdersApiResponse {
  orders: OrderTicket[];
  bayCapacity: BayCapacity;
  catalog: MenuItem[];
}

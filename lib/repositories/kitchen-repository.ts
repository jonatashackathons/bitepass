import { Prisma } from '@prisma/client';
import {
  MENU_CATALOG,
  MERCHANT_DIRECTORY,
  calculateOrderPricing,
  getMerchantForMenuItem,
  resetMerchantPayability,
} from '../catalog';
import { getEnv } from '../env';
import {
  ActiveOrderExistsError,
  InvalidStateTransitionError,
  OrderNotFoundError,
  StationExhaustedError,
} from '../errors';
import {
  GRACE_HOLD_DURATION_MS,
  KITCHEN_FIRE_GEOFENCE_METERS,
  assertValidOrderTransition,
  doesOrderOccupyStation,
} from '../order-state-machine';
import { centsToDollars } from '../pricing';
import { getPrismaClient } from '../prisma';
import { realtimeBus } from '../realtime';
import { createOfflineOrderQrToken } from '../security';
import {
  Allergen,
  BayCapacity,
  DietaryPreference,
  FulfillmentStage,
  MenuItem,
  OrderPricingSummary,
  OrderStatus,
  OrderTicket,
} from '../types';

export interface CreateOrderInput {
  userId?: string;
  customerName: string;
  item: MenuItem;
  pricing?: OrderPricingSummary;
  totalAmountCents?: number;
  totalAmount?: number;
  status?: OrderStatus;
  fulfillmentStage?: FulfillmentStage;
  authId?: string;
  paypalOrderId?: string;
  cubbyOrBay?: string;
  etaMinutes?: number;
  selectedTweak?: string;
  selectedTweakId?: string;
  distanceMeters?: number;
  pickupRunId?: string;
  createdAt?: number;
  authorizedAt?: number;
}

export interface IdempotencyRecord<T = unknown> {
  key: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  responseCode: number;
  responseBody: T;
  createdAt: number;
}

export interface KitchenRepository {
  listOrders(): Promise<OrderTicket[]>;
  getOrderById(orderId: string): Promise<OrderTicket | null>;
  findActiveOrderForUser(userId: string): Promise<OrderTicket | null>;
  getBayCapacity(): BayCapacity | Promise<BayCapacity>;
  getCatalog(): Promise<MenuItem[]>;
  setItemAvailability(itemId: string, isAvailable: boolean): Promise<void>;
  leaseStation(merchantId?: string): Promise<string>;
  releaseStation(stationCode: string): Promise<void>;
  quarantineStation(stationCode: string): Promise<void>;
  clearStationQuarantine(stationCode: string): Promise<void>;
  createOrder(input: CreateOrderInput): Promise<OrderTicket>;
  transitionOrder(
    orderId: string,
    toStatus: OrderStatus,
    patch?: Partial<OrderTicket>
  ): Promise<OrderTicket>;
  updateOrderFields(
    orderId: string,
    patch: Partial<OrderTicket>
  ): Promise<OrderTicket>;
  getIdempotency<T = unknown>(key: string): Promise<IdempotencyRecord<T> | null>;
  saveIdempotency<T = unknown>(
    key: string,
    responseCode: number,
    responseBody: T
  ): Promise<void>;
  hasProcessedWebhook(eventId: string): Promise<boolean>;
  markWebhookProcessed(eventId: string): Promise<void>;
  anonymizeUserOrders(userId: string): Promise<number>;
  reset(): Promise<void>;
}

const HIGH_TOP_BAYS = ['Bay #1', 'Bay #2'] as const;
const GRAB_AND_GO_CUBBIES = Array.from({ length: 26 }, (_, idx) => {
  const letter = String.fromCharCode(65 + idx);
  return `Pickup Cubby #${letter} (Grab & Go)`;
});

export class InMemoryKitchenRepository implements KitchenRepository {
  private orders: OrderTicket[] = [];
  private orderCounter = 101;
  private readonly maxHighTopBays = 2;
  private readonly leasedStations = new Set<string>();
  private readonly quarantinedStations = new Set<string>();
  private readonly unavailableItemIds = new Set<string>();
  private readonly idempotencyStore = new Map<string, IdempotencyRecord>();
  private readonly processedWebhooks = new Set<string>();

  constructor() {
    this.seedInitialOrders();
  }

  private seedInitialOrders(): void {
    const now = Date.now();
    this.leasedStations.clear();
    this.quarantinedStations.clear();
    this.unavailableItemIds.clear();
    this.idempotencyStore.clear();
    this.processedWebhooks.clear();
    resetMerchantPayability();

    for (const item of MENU_CATALOG) {
      item.isAvailable = true;
    }

    const quinoa = MENU_CATALOG[1];
    const truffle = MENU_CATALOG[2];
    const quinoaPricing = calculateOrderPricing(quinoa.price);
    const trufflePricing = calculateOrderPricing(truffle.price);

    this.orders = [
      {
        orderId: 'ORD-1089',
        merchantId: quinoa.merchantId,
        userId: 'usr_seed_sarah',
        customerName: 'Sarah Jenkins',
        item: quinoa,
        totalAmountCents: quinoaPricing.totalCents,
        totalAmount: quinoaPricing.total,
        pricing: quinoaPricing,
        status: 'CAPTURED',
        fulfillmentStage: 'READY',
        authId: 'AUTH-SIM-8821',
        paypalOrderId: 'ORD-PP-882100',
        captureId: 'CAP-SIM-4912',
        cubbyOrBay: 'Bay #1',
        etaMinutes: 0,
        createdAt: now - 12 * 60 * 1000,
        authorizedAt: now - 10 * 60 * 1000,
        kitchenFiredAt: now - 8 * 60 * 1000,
        readyAt: now - 3 * 60 * 1000,
        capturedAt: now - 2 * 60 * 1000,
        offlineQrToken: createOfflineOrderQrToken('ORD-1089', quinoaPricing.totalCents),
        isSimulated: true,
        version: 3,
      },
      {
        orderId: 'ORD-1090',
        merchantId: truffle.merchantId,
        userId: 'usr_seed_david',
        customerName: 'David Chen',
        item: truffle,
        totalAmountCents: trufflePricing.totalCents,
        totalAmount: trufflePricing.total,
        pricing: trufflePricing,
        status: 'AUTHORIZED',
        fulfillmentStage: 'KITCHEN_FIRED',
        authId: 'AUTH-SIM-9104',
        paypalOrderId: 'ORD-PP-910400',
        cubbyOrBay: 'Bay #2',
        etaMinutes: 4,
        createdAt: now - 3 * 60 * 1000,
        authorizedAt: now - 2 * 60 * 1000,
        graceExpiresAt: now - 30 * 1000,
        kitchenFiredAt: now - 30 * 1000,
        offlineQrToken: createOfflineOrderQrToken('ORD-1090', trufflePricing.totalCents),
        isSimulated: true,
        version: 2,
      },
    ];
  }

  private getOccupiedStationSet(): Set<string> {
    const occupied = new Set<string>(this.leasedStations);
    for (const o of this.orders) {
      if (doesOrderOccupyStation(o.status, o.fulfillmentStage)) {
        occupied.add(o.cubbyOrBay);
      }
    }
    return occupied;
  }

  // Synchronous compatibility accessors for unit tests & fast reads
  public getOrders(): OrderTicket[] {
    return [...this.orders];
  }

  public getBayCapacity(): BayCapacity {
    const occupied = this.getOccupiedStationSet();
    const activeBayNames = HIGH_TOP_BAYS.filter(
      (b) => occupied.has(b) || this.quarantinedStations.has(b)
    );
    const activeCubbies = GRAB_AND_GO_CUBBIES.filter(
      (c) => occupied.has(c) || this.quarantinedStations.has(c)
    );
    return {
      occupiedBays: Math.min(activeBayNames.length, this.maxHighTopBays),
      totalBays: this.maxHighTopBays,
      activeBayNames: [...activeBayNames],
      occupiedCubbies: activeCubbies.length,
      totalCubbies: GRAB_AND_GO_CUBBIES.length,
      quarantinedStations: Array.from(this.quarantinedStations),
    };
  }

  public allocateStation(merchantName = "Jack's Cafe"): string {
    const occupied = this.getOccupiedStationSet();

    for (const bay of HIGH_TOP_BAYS) {
      if (!occupied.has(bay) && !this.quarantinedStations.has(bay)) {
        this.leasedStations.add(bay);
        return bay;
      }
    }

    for (const cubby of GRAB_AND_GO_CUBBIES) {
      if (!occupied.has(cubby) && !this.quarantinedStations.has(cubby)) {
        this.leasedStations.add(cubby);
        return cubby;
      }
    }

    throw new StationExhaustedError(merchantName);
  }

  public addOrder(
    order: Omit<
      OrderTicket,
      | 'orderId'
      | 'merchantId'
      | 'totalAmountCents'
      | 'fulfillmentStage'
      | 'version'
    > & {
      merchantId?: string;
      totalAmountCents?: number;
      fulfillmentStage?: FulfillmentStage;
      version?: number;
    }
  ): OrderTicket {
    const now = order.createdAt ?? Date.now();
    const orderId = `ORD-${this.orderCounter++}`;
    const totalAmountCents =
      order.totalAmountCents ?? Math.round(order.totalAmount * 100);
    const station = order.cubbyOrBay || this.allocateStation(order.item.merchantName);
    this.leasedStations.delete(station);

    const newOrder: OrderTicket = {
      ...order,
      orderId,
      merchantId: order.merchantId ?? order.item.merchantId,
      totalAmountCents,
      totalAmount: centsToDollars(totalAmountCents),
      cubbyOrBay: station,
      fulfillmentStage: order.fulfillmentStage ?? 'GRACE_HOLD',
      graceExpiresAt: order.graceExpiresAt ?? now + GRACE_HOLD_DURATION_MS,
      offlineQrToken:
        order.offlineQrToken ?? createOfflineOrderQrToken(orderId, totalAmountCents),
      version: order.version ?? 1,
    };

    this.orders.unshift(newOrder);
    realtimeBus.publish({
      type: 'ORDER_CREATED',
      order: newOrder,
      bayCapacity: this.getBayCapacity(),
      timestamp: Date.now(),
    });
    return newOrder;
  }

  public updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    extra?: Partial<OrderTicket>
  ): OrderTicket | null {
    const idx = this.orders.findIndex((o) => o.orderId === orderId);
    if (idx === -1) return null;
    const current = this.orders[idx];
    const updated: OrderTicket = {
      ...current,
      ...extra,
      status,
      version: current.version + 1,
    };
    if (!doesOrderOccupyStation(updated.status, updated.fulfillmentStage)) {
      this.leasedStations.delete(updated.cubbyOrBay);
    }
    this.orders[idx] = updated;
    realtimeBus.publish({
      type: 'ORDER_UPDATED',
      order: updated,
      bayCapacity: this.getBayCapacity(),
      timestamp: Date.now(),
    });
    return updated;
  }

  public resetOrders(): void {
    this.seedInitialOrders();
    this.orderCounter = 101;
    realtimeBus.publish({
      type: 'QUEUE_RESET',
      bayCapacity: this.getBayCapacity(),
      timestamp: Date.now(),
    });
  }

  // Async KitchenRepository interface implementation
  public async listOrders(): Promise<OrderTicket[]> {
    return this.getOrders();
  }

  public async getOrderById(orderId: string): Promise<OrderTicket | null> {
    return this.orders.find((o) => o.orderId === orderId) ?? null;
  }

  public async findActiveOrderForUser(userId: string): Promise<OrderTicket | null> {
    return (
      this.orders.find(
        (o) =>
          o.userId === userId &&
          (o.status === 'AUTHORIZING' ||
            o.status === 'AUTHORIZED' ||
            o.status === 'CAPTURING' ||
            o.status === 'CAPTURE_FAILED')
      ) ?? null
    );
  }

  public async getBayCapacityAsync(): Promise<BayCapacity> {
    return this.getBayCapacity();
  }

  async getCatalog(): Promise<MenuItem[]> {
    return MENU_CATALOG.map((item) => ({
      ...item,
      isAvailable: !this.unavailableItemIds.has(item.id) && item.isAvailable,
    }));
  }

  async setItemAvailability(itemId: string, isAvailable: boolean): Promise<void> {
    const item = MENU_CATALOG.find((i) => i.id === itemId);
    if (item) {
      item.isAvailable = isAvailable;
    }
    if (isAvailable) {
      this.unavailableItemIds.delete(itemId);
    } else {
      this.unavailableItemIds.add(itemId);
    }
  }

  async leaseStation(merchantId?: string): Promise<string> {
    const merchName =
      (merchantId ? MERCHANT_DIRECTORY[merchantId]?.name : undefined) ??
      "Jack's Cafe";
    return this.allocateStation(merchName);
  }

  async releaseStation(stationCode: string): Promise<void> {
    this.leasedStations.delete(stationCode);
    realtimeBus.publish({
      type: 'CAPACITY_UPDATED',
      bayCapacity: this.getBayCapacity(),
      timestamp: Date.now(),
    });
  }

  async quarantineStation(stationCode: string): Promise<void> {
    this.quarantinedStations.add(stationCode);
    this.leasedStations.delete(stationCode);
    realtimeBus.publish({
      type: 'CAPACITY_UPDATED',
      bayCapacity: this.getBayCapacity(),
      timestamp: Date.now(),
    });
  }

  async clearStationQuarantine(stationCode: string): Promise<void> {
    this.quarantinedStations.delete(stationCode);
    realtimeBus.publish({
      type: 'CAPACITY_UPDATED',
      bayCapacity: this.getBayCapacity(),
      timestamp: Date.now(),
    });
  }

  async createOrder(input: CreateOrderInput): Promise<OrderTicket> {
    if (input.userId) {
      const existing = await this.findActiveOrderForUser(input.userId);
      if (existing) {
        if (input.cubbyOrBay) {
          this.leasedStations.delete(input.cubbyOrBay);
        }
        throw new ActiveOrderExistsError(existing.orderId);
      }
    }

    const now = input.createdAt ?? Date.now();
    const totalAmountCents =
      input.totalAmountCents ??
      input.pricing?.totalCents ??
      Math.round((input.totalAmount ?? input.item.price) * 100);

    const immediateFire =
      typeof input.distanceMeters === 'number' &&
      input.distanceMeters <= KITCHEN_FIRE_GEOFENCE_METERS;

    const fulfillmentStage: FulfillmentStage =
      input.fulfillmentStage ?? (immediateFire ? 'KITCHEN_FIRED' : 'GRACE_HOLD');

    return this.addOrder({
      userId: input.userId,
      customerName: input.customerName,
      item: input.item,
      merchantId: input.item.merchantId,
      pricing: input.pricing,
      totalAmountCents,
      totalAmount: centsToDollars(totalAmountCents),
      status: input.status ?? 'AUTHORIZED',
      fulfillmentStage,
      authId: input.authId,
      paypalOrderId: input.paypalOrderId,
      cubbyOrBay: input.cubbyOrBay ?? this.allocateStation(input.item.merchantName),
      etaMinutes: input.etaMinutes ?? input.item.prepTimeMinutes,
      createdAt: now,
      authorizedAt: input.authorizedAt ?? now,
      graceExpiresAt: now + GRACE_HOLD_DURATION_MS,
      kitchenFiredAt: immediateFire ? now : undefined,
      selectedTweak: input.selectedTweak,
      selectedTweakId: input.selectedTweakId,
      distanceMeters: input.distanceMeters,
      pickupRunId: input.pickupRunId,
    });
  }

  async transitionOrder(
    orderId: string,
    toStatus: OrderStatus,
    patch?: Partial<OrderTicket>
  ): Promise<OrderTicket> {
    const existing = await this.getOrderById(orderId);
    if (!existing) {
      throw new OrderNotFoundError(orderId);
    }
    if (existing.status === toStatus) {
      return existing;
    }
    assertValidOrderTransition(orderId, existing.status, toStatus);
    const updated = this.updateOrderStatus(orderId, toStatus, patch);
    if (!updated) {
      throw new OrderNotFoundError(orderId);
    }
    return updated;
  }

  async updateOrderFields(
    orderId: string,
    patch: Partial<OrderTicket>
  ): Promise<OrderTicket> {
    const existing = await this.getOrderById(orderId);
    if (!existing) {
      throw new OrderNotFoundError(orderId);
    }
    const updated = this.updateOrderStatus(orderId, patch.status ?? existing.status, patch);
    if (!updated) {
      throw new OrderNotFoundError(orderId);
    }
    return updated;
  }

  async getIdempotency<T = unknown>(
    key: string
  ): Promise<IdempotencyRecord<T> | null> {
    const rec = this.idempotencyStore.get(key);
    if (!rec) return null;
    return rec as IdempotencyRecord<T>;
  }

  async saveIdempotency<T = unknown>(
    key: string,
    responseCode: number,
    responseBody: T
  ): Promise<void> {
    this.idempotencyStore.set(key, {
      key,
      status: 'COMPLETED',
      responseCode,
      responseBody,
      createdAt: Date.now(),
    });
  }

  async hasProcessedWebhook(eventId: string): Promise<boolean> {
    return this.processedWebhooks.has(eventId);
  }

  async markWebhookProcessed(eventId: string): Promise<void> {
    this.processedWebhooks.add(eventId);
  }

  async anonymizeUserOrders(userId: string): Promise<number> {
    let anonymizedCount = 0;
    this.orders = this.orders.map((order) => {
      if (order.userId !== userId) return order;
      anonymizedCount += 1;
      return {
        ...order,
        userId: undefined,
        customerName: 'Redacted Diner',
      };
    });
    return anonymizedCount;
  }

  async reset(): Promise<void> {
    this.resetOrders();
  }
}

/**
 * Production PostgreSQL repository backed by Prisma and `SELECT ... FOR UPDATE SKIP LOCKED`
 * atomic station leasing. Activated when `STORAGE_DRIVER=postgres`.
 */
export class PrismaKitchenRepository implements KitchenRepository {
  private mapDbOrder(
    row: Prisma.OrderGetPayload<{ include: { menuItem: { include: { merchant: true } } } }>
  ): OrderTicket {
    const catalogFallback = MENU_CATALOG.find((m) => m.id === row.menuItemId);
    const item: MenuItem = {
      id: row.menuItem.id,
      merchantId: row.menuItem.merchantId,
      merchantName: row.menuItem.merchant.name,
      merchantPayeeId: row.menuItem.merchant.paypalMerchantId ?? undefined,
      taxRateBps: row.menuItem.merchant.taxRateBps,
      name: row.menuItem.name,
      category: row.menuItem.category,
      basePriceCents: row.menuItem.basePriceCents,
      price: centsToDollars(row.menuItem.basePriceCents),
      prepTimeMinutes: row.menuItem.prepTimeMinutes,
      dietaryTags: row.menuItem.dietaryTags as DietaryPreference[],
      allergens: row.menuItem.allergens as Allergen[],
      isAvailable: row.menuItem.isAvailable,
      description: row.menuItem.description,
      calories: row.menuItem.calories,
      image: row.menuItem.imageUrl ?? catalogFallback?.image,
      quickTweaks: catalogFallback?.quickTweaks,
    };

    return {
      orderId: row.displayCode,
      merchantId: row.merchantId,
      userId: row.userId,
      customerName: row.customerName,
      item,
      totalAmountCents: row.totalAmountCents,
      totalAmount: centsToDollars(row.totalAmountCents),
      status: row.status as OrderStatus,
      fulfillmentStage: row.fulfillmentStage as FulfillmentStage,
      authId: row.paypalAuthId ?? undefined,
      paypalOrderId: row.paypalOrderId ?? undefined,
      captureId: row.paypalCaptureId ?? undefined,
      refundId: row.paypalRefundId ?? undefined,
      cubbyOrBay: row.stationCode,
      etaMinutes: row.etaMinutes,
      createdAt: row.createdAt.getTime(),
      authorizedAt: row.authorizedAt?.getTime(),
      graceExpiresAt: row.graceExpiresAt?.getTime(),
      kitchenFiredAt: row.kitchenFiredAt?.getTime(),
      readyAt: row.readyAt?.getTime(),
      capturedAt: row.capturedAt?.getTime(),
      collectedAt: row.collectedAt?.getTime(),
      voidedAt: row.voidedAt?.getTime(),
      refundedAt: row.refundedAt?.getTime(),
      restockingFeeCents: row.restockingFeeCents ?? undefined,
      selectedTweak: row.selectedTweak ?? undefined,
      selectedTweakId: row.selectedTweakId ?? undefined,
      offlineQrToken: row.offlineQrToken ?? undefined,
      isSimulated: row.isSimulated,
      version: row.version,
    };
  }

  async listOrders(): Promise<OrderTicket[]> {
    const prisma = getPrismaClient();
    const rows = await prisma.order.findMany({
      include: { menuItem: { include: { merchant: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((r) => this.mapDbOrder(r));
  }

  async getOrderById(orderId: string): Promise<OrderTicket | null> {
    const prisma = getPrismaClient();
    const row = await prisma.order.findUnique({
      where: { displayCode: orderId },
      include: { menuItem: { include: { merchant: true } } },
    });
    return row ? this.mapDbOrder(row) : null;
  }

  async findActiveOrderForUser(userId: string): Promise<OrderTicket | null> {
    const prisma = getPrismaClient();
    const row = await prisma.order.findFirst({
      where: {
        userId,
        status: {
          in: ['AUTHORIZING', 'AUTHORIZED', 'CAPTURING', 'CAPTURE_FAILED'],
        },
      },
      include: { menuItem: { include: { merchant: true } } },
    });
    return row ? this.mapDbOrder(row) : null;
  }

  async getBayCapacity(): Promise<BayCapacity> {
    const prisma = getPrismaClient();
    const activeOrders = await prisma.order.findMany({
      where: {
        status: {
          in: ['AUTHORIZING', 'AUTHORIZED', 'CAPTURING', 'CAPTURED', 'CAPTURE_FAILED'],
        },
        fulfillmentStage: { not: 'HANDED_OFF' },
      },
      select: { stationCode: true },
    });

    const quarantined = await prisma.station.findMany({
      where: { health: 'QUARANTINED' },
      select: { code: true },
    });

    const activeBays = Array.from(
      new Set(
        activeOrders
          .map((o) => o.stationCode)
          .filter((code) => code.startsWith('Bay #'))
      )
    );

    return {
      occupiedBays: Math.min(activeBays.length, 2),
      totalBays: 2,
      activeBayNames: activeBays,
      quarantinedStations: quarantined.map((q) => q.code),
    };
  }

  async getCatalog(): Promise<MenuItem[]> {
    const prisma = getPrismaClient();
    const items = await prisma.menuItem.findMany({
      include: { merchant: true },
    });
    if (items.length === 0) return MENU_CATALOG;
    return items.map((dbItem) => {
      const fallback = MENU_CATALOG.find((m) => m.id === dbItem.id);
      return {
        id: dbItem.id,
        merchantId: dbItem.merchantId,
        merchantName: dbItem.merchant.name,
        merchantPayeeId: dbItem.merchant.paypalMerchantId ?? undefined,
        taxRateBps: dbItem.merchant.taxRateBps,
        name: dbItem.name,
        category: dbItem.category,
        basePriceCents: dbItem.basePriceCents,
        price: centsToDollars(dbItem.basePriceCents),
        prepTimeMinutes: dbItem.prepTimeMinutes,
        dietaryTags: dbItem.dietaryTags as DietaryPreference[],
        allergens: dbItem.allergens as Allergen[],
        isAvailable: dbItem.isAvailable,
        description: dbItem.description,
        calories: dbItem.calories,
        image: dbItem.imageUrl ?? fallback?.image,
        quickTweaks: fallback?.quickTweaks,
      };
    });
  }

  async setItemAvailability(itemId: string, isAvailable: boolean): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.menuItem.update({
      where: { id: itemId },
      data: { isAvailable },
    });
  }

  async leaseStation(merchantId = 'merch_jacks_cafe'): Promise<string> {
    const prisma = getPrismaClient();
    const rows = await prisma.$queryRaw<Array<{ id: string; code: string }>>`
      SELECT s."id", s."code"
      FROM "Station" s
      WHERE s."merchantId" = ${merchantId}
        AND s."health" = 'AVAILABLE'
        AND NOT EXISTS (
          SELECT 1 FROM "Order" o
          WHERE o."stationId" = s."id"
            AND o."status" IN ('AUTHORIZING', 'AUTHORIZED', 'CAPTURING', 'CAPTURED', 'CAPTURE_FAILED')
            AND o."fulfillmentStage" != 'HANDED_OFF'
        )
      ORDER BY s."priorityOrder" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    `;
    const first = rows[0];
    if (!first) {
      const merch = MERCHANT_DIRECTORY[merchantId];
      throw new StationExhaustedError(merch?.name ?? 'Cafe');
    }
    return first.code;
  }

  async releaseStation(): Promise<void> {
    // PostgreSQL partial unique index releases automatically when Order status transitions
  }

  async quarantineStation(stationCode: string): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.station.updateMany({
      where: { code: stationCode },
      data: { health: 'QUARANTINED' },
    });
  }

  async clearStationQuarantine(stationCode: string): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.station.updateMany({
      where: { code: stationCode },
      data: { health: 'AVAILABLE' },
    });
  }

  async createOrder(input: CreateOrderInput): Promise<OrderTicket> {
    const prisma = getPrismaClient();
    const merchant = getMerchantForMenuItem(input.item);
    const totalAmountCents =
      input.totalAmountCents ??
      input.pricing?.totalCents ??
      Math.round((input.totalAmount ?? input.item.price) * 100);
    const displayCode = `ORD-${Math.floor(1000 + Math.random() * 900000)}`;
    const now = new Date(input.createdAt ?? Date.now());
    const immediateFire =
      typeof input.distanceMeters === 'number' &&
      input.distanceMeters <= KITCHEN_FIRE_GEOFENCE_METERS;

    const created = await prisma.$transaction(async (tx) => {
      if (input.userId) {
        const existing = await tx.order.findFirst({
          where: {
            userId: input.userId,
            status: {
              in: ['AUTHORIZING', 'AUTHORIZED', 'CAPTURING', 'CAPTURE_FAILED'],
            },
          },
        });
        if (existing) {
          throw new ActiveOrderExistsError(existing.displayCode);
        }
      }

      const stationRows = await tx.$queryRaw<Array<{ id: string; code: string }>>`
        SELECT s."id", s."code"
        FROM "Station" s
        WHERE s."merchantId" = ${merchant.id}
          AND s."health" = 'AVAILABLE'
          AND NOT EXISTS (
            SELECT 1 FROM "Order" o
            WHERE o."stationId" = s."id"
              AND o."status" IN ('AUTHORIZING', 'AUTHORIZED', 'CAPTURING', 'CAPTURED', 'CAPTURE_FAILED')
              AND o."fulfillmentStage" != 'HANDED_OFF'
          )
        ORDER BY s."priorityOrder" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      `;

      const station = stationRows[0];
      if (!station) {
        throw new StationExhaustedError(merchant.name);
      }

      const row = await tx.order.create({
        data: {
          displayCode,
          merchantId: merchant.id,
          userId: input.userId ?? 'usr_guest',
          customerName: input.customerName,
          menuItemId: input.item.id,
          stationId: station.id,
          stationCode: station.code,
          selectedTweak: input.selectedTweak,
          selectedTweakId: input.selectedTweakId,
          baseAmountCents: input.pricing?.basePriceCents ?? input.item.basePriceCents,
          tweakAmountCents: input.pricing?.tweakDeltaCents ?? 0,
          taxAmountCents: input.pricing?.taxCents ?? 100,
          tipAmountCents: input.pricing?.tipCents ?? 100,
          fastPassFeeCents: input.pricing?.fastPassFeeCents ?? 0,
          platformFeeCents: input.pricing?.platformFeeCents ?? 0,
          totalAmountCents,
          status: input.status ?? 'AUTHORIZED',
          fulfillmentStage:
            input.fulfillmentStage ?? (immediateFire ? 'KITCHEN_FIRED' : 'GRACE_HOLD'),
          paypalOrderId: input.paypalOrderId,
          paypalAuthId: input.authId,
          offlineQrToken: createOfflineOrderQrToken(displayCode, totalAmountCents),
          etaMinutes: input.etaMinutes ?? input.item.prepTimeMinutes,
          authorizedAt: now,
          graceExpiresAt: new Date(now.getTime() + GRACE_HOLD_DURATION_MS),
          kitchenFiredAt: immediateFire ? now : null,
        },
        include: { menuItem: { include: { merchant: true } } },
      });

      await tx.escrowLedgerEvent.create({
        data: {
          orderId: row.id,
          eventType: 'ORDER_AUTHORIZED',
          toStatus: row.status,
          amountCents: totalAmountCents,
          paypalRequestId: `auth:${displayCode}`,
          paypalReferenceId: input.authId,
          actorType: 'DINER',
        },
      });

      return row;
    });

    const mapped = this.mapDbOrder(created);
    realtimeBus.publish({
      type: 'ORDER_CREATED',
      order: mapped,
      bayCapacity: await this.getBayCapacity(),
      timestamp: Date.now(),
    });
    return mapped;
  }

  async transitionOrder(
    orderId: string,
    toStatus: OrderStatus,
    patch?: Partial<OrderTicket>
  ): Promise<OrderTicket> {
    const prisma = getPrismaClient();
    const current = await prisma.order.findUnique({
      where: { displayCode: orderId },
    });
    if (!current) {
      throw new OrderNotFoundError(orderId);
    }
    if (current.status !== toStatus) {
      assertValidOrderTransition(orderId, current.status as OrderStatus, toStatus);
    }

    const updatedCount = await prisma.order.updateMany({
      where: { id: current.id, version: current.version },
      data: {
        status: toStatus,
        fulfillmentStage: patch?.fulfillmentStage ?? current.fulfillmentStage,
        paypalCaptureId: patch?.captureId ?? current.paypalCaptureId,
        paypalRefundId: patch?.refundId ?? current.paypalRefundId,
        restockingFeeCents: patch?.restockingFeeCents ?? current.restockingFeeCents,
        etaMinutes: patch?.etaMinutes ?? current.etaMinutes,
        capturedAt: patch?.capturedAt ? new Date(patch.capturedAt) : current.capturedAt,
        voidedAt: patch?.voidedAt ? new Date(patch.voidedAt) : current.voidedAt,
        refundedAt: patch?.refundedAt ? new Date(patch.refundedAt) : current.refundedAt,
        collectedAt: patch?.collectedAt ? new Date(patch.collectedAt) : current.collectedAt,
        kitchenFiredAt: patch?.kitchenFiredAt
          ? new Date(patch.kitchenFiredAt)
          : current.kitchenFiredAt,
        readyAt: patch?.readyAt ? new Date(patch.readyAt) : current.readyAt,
        version: { increment: 1 },
      },
    });

    if (updatedCount.count === 0) {
      throw new InvalidStateTransitionError(
        orderId,
        current.status as OrderStatus,
        toStatus
      );
    }

    await prisma.escrowLedgerEvent.create({
      data: {
        orderId: current.id,
        eventType: `TRANSITION_${toStatus}`,
        fromStatus: current.status,
        toStatus,
        amountCents: patch?.restockingFeeCents ?? current.totalAmountCents,
        paypalRequestId: `transition:${orderId}:${current.version + 1}`,
        paypalReferenceId: patch?.captureId ?? patch?.refundId ?? current.paypalAuthId,
        actorType: 'SYSTEM',
      },
    });

    const reloaded = await prisma.order.findUnique({
      where: { id: current.id },
      include: { menuItem: { include: { merchant: true } } },
    });
    if (!reloaded) {
      throw new OrderNotFoundError(orderId);
    }

    const mapped = this.mapDbOrder(reloaded);
    realtimeBus.publish({
      type: 'ORDER_UPDATED',
      order: mapped,
      bayCapacity: await this.getBayCapacity(),
      timestamp: Date.now(),
    });
    return mapped;
  }

  async updateOrderFields(
    orderId: string,
    patch: Partial<OrderTicket>
  ): Promise<OrderTicket> {
    const existing = await this.getOrderById(orderId);
    if (!existing) {
      throw new OrderNotFoundError(orderId);
    }
    return this.transitionOrder(orderId, patch.status ?? existing.status, patch);
  }

  async getIdempotency<T = unknown>(
    key: string
  ): Promise<IdempotencyRecord<T> | null> {
    const prisma = getPrismaClient();
    const row = await prisma.idempotencyKey.findUnique({ where: { key } });
    if (!row || row.status !== 'COMPLETED') return null;
    return {
      key: row.key,
      status: 'COMPLETED',
      responseCode: row.responseCode ?? 200,
      responseBody: row.responseBody as T,
      createdAt: row.createdAt.getTime(),
    };
  }

  async saveIdempotency<T = unknown>(
    key: string,
    responseCode: number,
    responseBody: T
  ): Promise<void> {
    const prisma = getPrismaClient();
    const now = Date.now();
    await prisma.idempotencyKey.upsert({
      where: { key },
      create: {
        key,
        requestHash: key,
        status: 'COMPLETED',
        responseCode,
        responseBody: responseBody as Prisma.InputJsonValue,
        lockedUntil: new Date(now),
        expiresAt: new Date(now + 24 * 60 * 60 * 1000),
      },
      update: {
        status: 'COMPLETED',
        responseCode,
        responseBody: responseBody as Prisma.InputJsonValue,
      },
    });
  }

  async hasProcessedWebhook(eventId: string): Promise<boolean> {
    const rec = await this.getIdempotency(`webhook:${eventId}`);
    return Boolean(rec);
  }

  async markWebhookProcessed(eventId: string): Promise<void> {
    await this.saveIdempotency(`webhook:${eventId}`, 200, { processed: true });
  }

  async anonymizeUserOrders(userId: string): Promise<number> {
    const prisma = getPrismaClient();
    const res = await prisma.order.updateMany({
      where: { userId },
      data: {
        userId: 'anon_redacted',
        customerName: 'Redacted Diner',
      },
    });
    return res.count;
  }

  async reset(): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.escrowLedgerEvent.deleteMany({
      where: { order: { isSimulated: false } },
    });
    await prisma.order.deleteMany({
      where: { isSimulated: false },
    });
  }
}

const globalForKitchenRepo = globalThis as unknown as {
  bitepassInMemoryRepo?: InMemoryKitchenRepository;
  bitepassPrismaRepo?: PrismaKitchenRepository;
};

// Unconditional globalThis binding across dev and production runtime
export const inMemoryKitchenRepo =
  globalForKitchenRepo.bitepassInMemoryRepo ?? new InMemoryKitchenRepository();
globalForKitchenRepo.bitepassInMemoryRepo = inMemoryKitchenRepo;

const prismaKitchenRepo =
  globalForKitchenRepo.bitepassPrismaRepo ?? new PrismaKitchenRepository();
globalForKitchenRepo.bitepassPrismaRepo = prismaKitchenRepo;

export function getKitchenRepository(): KitchenRepository {
  return getEnv().storageDriver === 'postgres'
    ? prismaKitchenRepo
    : inMemoryKitchenRepo;
}

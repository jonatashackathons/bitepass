import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { getEnv } from './env';
import { GeofenceOutOfBoundsError, ValidationError } from './errors';
import { ALL_FDA_ALLERGENS } from './types';

export const DietaryEnum = z.enum(['Omnivore', 'Vegan', 'Gluten-Free']);
export const AllergenEnum = z.enum(ALL_FDA_ALLERGENS);
export const ContextModeEnum = z.enum([
  'calendar_gap',
  'transit_transfer',
  'on_call_lull',
]);

export const AgentEvaluateRequestSchema = z
  .object({
    freeMinutes: z.number().finite().int().min(0).max(480),
    distanceMeters: z.number().finite().min(0).max(10_000),
    dietary: DietaryEnum,
    excludedAllergens: z.array(AllergenEnum).max(9).optional(),
    contextMode: ContextModeEnum.optional(),
    towerId: z.string().trim().max(64).optional(),
    // Permitted on wire for backward compatibility with older clients, but NEVER injected into Gemini prompt
    userLocationName: z.string().trim().max(120).optional(),
    nextMeetingTitle: z.string().trim().max(160).optional(),
  })
  .strict();

export const TipSelectionSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('fixed_cents'),
    amountCents: z.number().int().min(0).max(5000),
  }),
  z.object({
    mode: z.literal('percent'),
    percent: z.union([
      z.literal(0),
      z.literal(10),
      z.literal(15),
      z.literal(20),
    ]),
  }),
]);

export const CreateEscrowRequestSchema = z
  .object({
    itemId: z.string().regex(/^prod_[a-z0-9_]{2,48}$/),
    tweakOptionId: z.string().regex(/^opt_[a-z0-9_]{2,48}$/).optional(),
    selectedTweak: z.string().trim().min(1).max(80).optional(),
    // Validated server-side against catalog options only; negative or arbitrary values are rejected!
    tweakDelta: z.number().finite().min(0).max(20).optional(),
    tipSelection: TipSelectionSchema.optional(),
    excludedAllergens: z.array(AllergenEnum).max(9).optional(),
    customerName: z.string().trim().min(1).max(60).optional(),
    distanceMeters: z.number().finite().min(0).max(10_000).optional(),
    idempotencyKey: z.string().trim().min(6).max(128).optional(),
    vaultId: z.string().trim().min(4).max(128).optional(),
    waiveFastPassFee: z.boolean().optional(),
    workEmail: z.string().trim().email().max(120).optional(),
    pickupRunId: z.string().trim().regex(/^[a-zA-Z0-9_-]{3,48}$/).optional(),
  })
  .strict();

export const TelemetryProofSchema = z
  .object({
    lat: z.number().finite().min(-90).max(90),
    lng: z.number().finite().min(-180).max(180),
    accuracyMeters: z.number().finite().min(0).max(100),
    capturedAtMs: z.number().int().positive(),
    bleToken: z.string().trim().min(8).max(128).optional(),
  })
  .strict();

export const CaptureEscrowRequestSchema = z
  .object({
    orderId: z.string().regex(/^ORD-[A-Z0-9-]{2,40}$/),
    idempotencyKey: z.string().trim().min(6).max(128).optional(),
    distanceMeters: z.number().finite().min(0).max(10_000).optional(),
    manualCheckInConfirmed: z.boolean().optional(),
    kdsAttested: z.boolean().optional(),
    telemetry: TelemetryProofSchema.optional(),
    // Ignored for financial calculation (server uses order.authId & order.totalAmountCents), accepted only for legacy test callers
    authId: z.string().trim().max(128).optional(),
    amount: z.number().finite().positive().max(500).optional(),
  })
  .strict();

export const VoidEscrowRequestSchema = z
  .object({
    orderId: z.string().regex(/^ORD-[A-Z0-9-]{2,40}$/),
    confirmRestockingFee: z.boolean().default(false),
    distanceMeters: z.number().finite().min(0).max(10_000).optional(),
    freeCancelOverride: z.boolean().optional(),
    authId: z.string().trim().max(128).optional(),
  })
  .strict();

export const RefundOrderRequestSchema = z
  .object({
    orderId: z.string().regex(/^ORD-[A-Z0-9-]{2,40}$/),
    reason: z.enum(['EMPTY_CUBBY', 'WRONG_ITEM_OR_ALLERGEN', 'COLD_OR_MISSING_SIDE']),
    resolution: z.enum(['INSTANT_REFUND', 'RUSH_REMAKE']).default('INSTANT_REFUND'),
  })
  .strict();

export const KdsOrderPatchSchema = z
  .object({
    action: z.enum([
      'ACCEPT_AND_FIRE',
      'MARK_READY',
      'SETTLE_AND_UNLOCK',
      'CLEAR_STATION',
      'DELAY_5M',
      'VOID_86_ITEM',
      'CLEAR_QUARANTINE',
      'TRIGGER_KITCHEN_FIRE_GEOFENCE',
    ]),
    distanceMeters: z.number().finite().min(0).max(10_000).optional(),
    stationCode: z.string().trim().max(64).optional(),
  })
  .strict();

export function validateSchema<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const first = result.error.issues[0];
    const pointer = first ? first.path.join('.') || 'body' : 'body';
    throw new ValidationError(
      `Invalid request field '${pointer}': ${first?.message ?? 'validation failed'}`,
      {
        issues: result.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      }
    );
  }
  return result.data;
}

/**
 * Haversine great-circle distance in meters
 */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function generateBleToken(merchantId: string, windowIndex = Math.floor(Date.now() / 30_000)): string {
  const secret = getEnv().GEOFENCE_HMAC_SECRET;
  return createHmac('sha256', secret)
    .update(`${merchantId}:${windowIndex}`)
    .digest('hex')
    .slice(0, 16);
}

export function verifyBleToken(merchantId: string, candidate: string, nowMs = Date.now()): boolean {
  const currentWin = Math.floor(nowMs / 30_000);
  for (const w of [currentWin, currentWin - 1]) {
    const expected = generateBleToken(merchantId, w);
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(candidate, 'utf8');
    if (a.length === b.length && timingSafeEqual(a, b)) {
      return true;
    }
  }
  return false;
}

export const MAX_TELEMETRY_VELOCITY_MPS = 12; // ~43 km/h urban pedestrian/micromobility ceiling
export const MAX_TELEMETRY_STALENESS_MS = 15_000; // 15-second GPS freshness window

export function verifyDoorstepProximity(params: {
  merchantId: string;
  merchantLat: number;
  merchantLng: number;
  telemetry?: z.infer<typeof TelemetryProofSchema>;
  distanceMeters?: number;
  initialDistanceMeters?: number;
  authorizedAtMs?: number;
  manualCheckInConfirmed?: boolean;
  kdsAttested?: boolean;
  nowMs?: number;
}): void {
  const now = params.nowMs ?? Date.now();
  const env = getEnv();

  // Merchant KDS broadband settle override or explicit diner manual indoor-GPS check-in confirmation
  if (params.kdsAttested || params.manualCheckInConfirmed) {
    return;
  }

  if (params.telemetry) {
    const dist = haversineMeters(
      params.telemetry.lat,
      params.telemetry.lng,
      params.merchantLat,
      params.merchantLng
    );
    if (dist > 50) {
      throw new GeofenceOutOfBoundsError(
        `Verified GPS distance (${Math.round(dist)}m) exceeds the 50m doorstep capture perimeter.`,
        { distanceMeters: Math.round(dist) }
      );
    }
    if (params.telemetry.accuracyMeters > 35) {
      throw new GeofenceOutOfBoundsError(
        `GPS horizontal accuracy (${params.telemetry.accuracyMeters}m) is too coarse (>35m); use Manual Check-In or scan Cubby QR.`
      );
    }
    if (Math.abs(now - params.telemetry.capturedAtMs) > MAX_TELEMETRY_STALENESS_MS) {
      throw new GeofenceOutOfBoundsError(
        `Location telemetry timestamp is stale (>${MAX_TELEMETRY_STALENESS_MS / 1000}s).`
      );
    }
    if (
      typeof params.initialDistanceMeters === 'number' &&
      typeof params.authorizedAtMs === 'number' &&
      params.initialDistanceMeters - dist > 100
    ) {
      const elapsedSec = Math.max(
        0.1,
        (params.telemetry.capturedAtMs - params.authorizedAtMs) / 1000
      );
      const velocityMps = (params.initialDistanceMeters - dist) / elapsedSec;
      if (velocityMps > MAX_TELEMETRY_VELOCITY_MPS) {
        throw new GeofenceOutOfBoundsError(
          `Implausible teleportation velocity (${velocityMps.toFixed(1)} m/s > ${MAX_TELEMETRY_VELOCITY_MPS} m/s) detected between authorization and capture.`,
          { velocityMps: Number(velocityMps.toFixed(2)) }
        );
      }
    }
    if (params.telemetry.bleToken && !verifyBleToken(params.merchantId, params.telemetry.bleToken, now)) {
      throw new GeofenceOutOfBoundsError('Invalid or expired cafe BLE/QR proximity token.');
    }
    return;
  }

  if (typeof params.distanceMeters === 'number') {
    if (params.distanceMeters > 50) {
      throw new GeofenceOutOfBoundsError(
        `Diner is ${params.distanceMeters}m away (must be <= 50m for doorstep capture).`,
        { distanceMeters: params.distanceMeters }
      );
    }
    if (env.isProductionTier) {
      throw new GeofenceOutOfBoundsError(
        'Production capture requires signed GPS/BLE telemetry or explicit Manual Check-In confirmation.'
      );
    }
    return;
  }

  if (env.isProductionTier) {
    throw new GeofenceOutOfBoundsError('Missing proximity verification proof.');
  }
}

import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { getEnv } from './env';
import {
  ActiveOrderExistsError,
  ForbiddenError,
  RateLimitExceededError,
  UnauthorizedError,
} from './errors';
import { OrderTicket } from './types';

interface RateWindow {
  timestamps: number[];
}

const globalForRateLimiter = globalThis as unknown as {
  bitepassRateWindows?: Map<string, RateWindow>;
  bitepassUserCreateLocks?: Set<string>;
};

const rateWindows =
  globalForRateLimiter.bitepassRateWindows ?? new Map<string, RateWindow>();
globalForRateLimiter.bitepassRateWindows = rateWindows;

const userCreateLocks =
  globalForRateLimiter.bitepassUserCreateLocks ?? new Set<string>();
globalForRateLimiter.bitepassUserCreateLocks = userCreateLocks;

export function checkRateLimit(
  bucketKey: string,
  maxRequestsPerMinute: number,
  nowMs = Date.now()
): void {
  const windowStart = nowMs - 60_000;
  const entry = rateWindows.get(bucketKey) ?? { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= maxRequestsPerMinute) {
    throw new RateLimitExceededError(
      `Rate limit exceeded (${maxRequestsPerMinute} req/min). Please wait briefly before retrying.`,
      { bucketKey, limit: maxRequestsPerMinute }
    );
  }

  entry.timestamps.push(nowMs);
  rateWindows.set(bucketKey, entry);
}

export function resetRateLimits(): void {
  rateWindows.clear();
  userCreateLocks.clear();
}

export function acquireUserCreateLock(userId: string): void {
  if (userCreateLocks.has(userId)) {
    throw new ActiveOrderExistsError(`inflight:${userId}`);
  }
  userCreateLocks.add(userId);
}

export function releaseUserCreateLock(userId: string): void {
  userCreateLocks.delete(userId);
}

function signValue(value: string): string {
  const secret = getEnv().BITEPASS_SESSION_SECRET;
  const sig = createHmac('sha256', secret).update(value).digest('hex').slice(0, 24);
  return `${value}.${sig}`;
}

function verifySignedValue(signed: string | undefined): string | null {
  if (!signed) return null;
  const dotIdx = signed.lastIndexOf('.');
  if (dotIdx <= 0) return null;
  const raw = signed.slice(0, dotIdx);
  const expected = signValue(raw);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signed, 'utf8');
  if (a.length === b.length && timingSafeEqual(a, b)) {
    return raw;
  }
  return null;
}

export function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.get('cookie') ?? '';
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = decodeURIComponent(part.slice(idx + 1).trim());
    if (key) out[key] = val;
  }
  return out;
}

export interface DinerPrincipal {
  userId: string;
  isNewSession: boolean;
  setCookieHeader?: string;
}

export function resolveDinerPrincipal(req: Request): DinerPrincipal {
  const explicitTestUser = req.headers.get('x-bitepass-user-id');
  if (explicitTestUser && !getEnv().isProductionTier) {
    return { userId: explicitTestUser, isNewSession: false };
  }

  const cookies = parseCookies(req);
  const verified = verifySignedValue(cookies.bp_session);
  if (verified) {
    return { userId: verified, isNewSession: false };
  }

  const newUserId = `usr_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const signed = signValue(newUserId);
  const secureFlag = getEnv().isProductionTier ? '; Secure' : '';
  return {
    userId: newUserId,
    isNewSession: true,
    setCookieHeader: `bp_session=${encodeURIComponent(signed)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${secureFlag}`,
  };
}

export function buildActiveOrderCookie(orderId: string | null): string {
  const secureFlag = getEnv().isProductionTier ? '; Secure' : '';
  if (!orderId) {
    return `bp_active_order=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secureFlag}`;
  }
  return `bp_active_order=${encodeURIComponent(orderId)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=10800${secureFlag}`;
}

export function getActiveOrderCookie(req: Request): string | null {
  const cookies = parseCookies(req);
  return cookies.bp_active_order || null;
}

/**
 * Enforces CSRF Origin check on state-mutating requests when an Origin header is present.
 */
export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get('origin');
  const secFetchSite = req.headers.get('sec-fetch-site');

  if (secFetchSite === 'cross-site') {
    throw new ForbiddenError('Cross-site mutation rejected by CSRF guard.');
  }

  if (!origin) return;

  const env = getEnv();
  let reqHost = '';
  try {
    reqHost = new URL(req.url).origin;
  } catch {
    reqHost = env.NEXT_PUBLIC_BASE_URL;
  }

  const allowedOrigins = new Set([
    env.NEXT_PUBLIC_BASE_URL,
    reqHost,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ]);

  if (!allowedOrigins.has(origin)) {
    throw new ForbiddenError(`Cross-origin request from '${origin}' rejected by CSRF guard.`);
  }
}

export function hasMerchantToken(req: Request): boolean {
  const env = getEnv();
  const authHeader = req.headers.get('authorization');
  const kdsHeader = req.headers.get('x-merchant-kds-token');
  const cookies = parseCookies(req);
  const candidate =
    kdsHeader ??
    (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined) ??
    cookies.bp_merchant_token;

  return Boolean(candidate && candidate === env.MERCHANT_KDS_TOKEN);
}

export function hasExplicitDinerPrincipal(req: Request): string | null {
  const env = getEnv();
  const explicitTestUser = req.headers.get('x-bitepass-user-id');
  if (explicitTestUser && !env.isProductionTier) {
    return explicitTestUser;
  }
  const cookies = parseCookies(req);
  return verifySignedValue(cookies.bp_session);
}

/**
 * Enforces IDOR ownership protection across order-scoped mutations and lookups.
 * Merchant KDS operators with a valid token may act on their orders; otherwise,
 * any authenticated diner principal (and ALL callers in staging/production) must own `order.userId`.
 */
export function assertOrderOwnershipOrMerchant(
  req: Request,
  order: Pick<OrderTicket, 'orderId' | 'userId'>
): void {
  if (hasMerchantToken(req)) {
    return;
  }

  const env = getEnv();
  const explicitUserId = hasExplicitDinerPrincipal(req);

  if (env.isProductionTier) {
    if (!explicitUserId || !order.userId || order.userId !== explicitUserId) {
      throw new ForbiddenError(
        `Access denied: order '${order.orderId}' belongs to another diner session.`
      );
    }
    return;
  }

  if (explicitUserId && order.userId && order.userId !== explicitUserId) {
    throw new ForbiddenError(
      `Access denied: order '${order.orderId}' belongs to another diner session.`
    );
  }
}

export function sanitizeOrderForDiner(order: OrderTicket): OrderTicket {
  if (!getEnv().isProductionTier) {
    return order;
  }
  const copy: OrderTicket = { ...order };
  delete copy.authId;
  delete copy.captureId;
  return copy;
}

export function buildClearedSessionCookie(): string {
  const secureFlag = getEnv().isProductionTier ? '; Secure' : '';
  return `bp_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secureFlag}`;
}

export function assertMerchantOrDemoAccess(req: Request): void {
  const env = getEnv();
  if (!env.isProductionTier) return;

  if (!hasMerchantToken(req)) {
    throw new UnauthorizedError('Valid Merchant KDS authentication token required.');
  }
}

export function assertSandboxAdminAccess(req: Request): void {
  const env = getEnv();
  if (env.isProductionTier || env.PAYPAL_ENV === 'live') {
    throw new ForbiddenError('Queue reset is permanently disabled in live/production environments.');
  }

  const adminToken = req.headers.get('x-sandbox-admin-token');
  if (adminToken && adminToken !== env.SANDBOX_ADMIN_TOKEN) {
    throw new ForbiddenError('Invalid sandbox admin token.');
  }
}

export function createOfflineOrderQrToken(orderId: string, totalAmountCents: number): string {
  const secret = getEnv().BITEPASS_SESSION_SECRET;
  const payload = `BP1:${orderId}:${totalAmountCents}`;
  const mac = createHmac('sha256', secret).update(payload).digest('hex').slice(0, 12).toUpperCase();
  return `${payload}:${mac}`;
}

export function getExpressShelfColorOfDay(timestampMs = Date.now()): {
  name: string;
  code: string;
  hex: string;
} {
  const palette = [
    { name: 'Emerald Sage', code: 'SAGE-04', hex: '#047857' },
    { name: 'Terracotta Ember', code: 'EMBER-09', hex: '#BF3E21' },
    { name: 'Cobalt FastPass', code: 'COBALT-02', hex: '#0070BA' },
    { name: 'Saffron Reserve', code: 'SAFFRON-07', hex: '#A84D0A' },
  ] as const;
  const dayBucket = Math.floor(timestampMs / 86_400_000);
  return palette[Math.abs(dayBucket) % palette.length];
}

export interface SignedWalletPassBundle {
  formatVersion: 1;
  passTypeIdentifier: 'pass.ai.bitepass.fastpass';
  serialNumber: string;
  organizationName: 'BitePass Culinary Concierge';
  description: string;
  merchantName: string;
  station: string;
  itemName: string;
  totalUsd: string;
  status: string;
  expressShelfColor: { name: string; code: string; hex: string };
  barcodePayload: string;
  issuedAt: string;
  signature: string;
}

export function createSignedWalletPass(order: OrderTicket): SignedWalletPassBundle {
  const secret = getEnv().BITEPASS_SESSION_SECRET;
  const shelfColor = getExpressShelfColorOfDay(order.capturedAt ?? order.createdAt);
  const barcodePayload =
    order.offlineQrToken ?? createOfflineOrderQrToken(order.orderId, order.totalAmountCents);
  const issuedAt = new Date(order.capturedAt ?? order.createdAt).toISOString();
  const canonical = `${order.orderId}|${order.merchantId}|${order.cubbyOrBay}|${order.totalAmountCents}|${shelfColor.code}|${barcodePayload}`;
  const signature = createHmac('sha256', secret).update(canonical).digest('hex');

  return {
    formatVersion: 1,
    passTypeIdentifier: 'pass.ai.bitepass.fastpass',
    serialNumber: order.orderId,
    organizationName: 'BitePass Culinary Concierge',
    description: `${order.item.name} — ${order.item.merchantName}`,
    merchantName: order.item.merchantName,
    station: order.cubbyOrBay,
    itemName: order.item.name,
    totalUsd: (order.totalAmountCents / 100).toFixed(2),
    status: order.status,
    expressShelfColor: shelfColor,
    barcodePayload,
    issuedAt,
    signature,
  };
}

export function verifySignedWalletPass(bundle: SignedWalletPassBundle): boolean {
  const secret = getEnv().BITEPASS_SESSION_SECRET;
  const totalCents = Math.round(Number(bundle.totalUsd) * 100);
  const merchantId =
    bundle.merchantName === 'Green & Grains'
      ? 'merch_green_grains'
      : bundle.merchantName === 'Artisan Melt Co.'
        ? 'merch_artisan_melt'
        : bundle.merchantName === 'Tokyo Bites'
          ? 'merch_tokyo_bites'
          : 'merch_jacks_cafe';
  const canonical = `${bundle.serialNumber}|${merchantId}|${bundle.station}|${totalCents}|${bundle.expressShelfColor.code}|${bundle.barcodePayload}`;
  const expected = createHmac('sha256', secret).update(canonical).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(bundle.signature, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function maskDinerNameForKds(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return parts[0] || 'Guest';
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}


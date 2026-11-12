import { NextResponse } from 'next/server';
import {
  getMerchantForMenuItem,
  isCorporateWorkEmail,
  isMerchantPayable,
  resolveCatalogTweak,
} from '@/lib/catalog';
import {
  ActiveOrderExistsError,
  AllergenConflictError,
  PaymentDeclinedError,
  ValidationError,
  parseJsonBody,
  toProblemResponse,
} from '@/lib/errors';
import { logger, resolveTraceId } from '@/lib/logger';
import { getKitchenRepository } from '@/lib/mock-db';
import { createAuthorizationOrder } from '@/lib/paypal-client';
import { calculateOrderPricingCents } from '@/lib/pricing';
import {
  acquireUserCreateLock,
  assertSameOrigin,
  buildActiveOrderCookie,
  checkRateLimit,
  releaseUserCreateLock,
  resolveDinerPrincipal,
  sanitizeOrderForDiner,
} from '@/lib/security';
import {
  computeOrderContributionMargin,
  trackFunnelEvent,
} from '@/lib/telemetry';
import { CreateEscrowRequestSchema, validateSchema } from '@/lib/validation';

export async function POST(req: Request) {
  let leasedStation: string | null = null;
  let lockedUserId: string | null = null;
  const repo = getKitchenRepository();
  const traceId = resolveTraceId(req);

  try {
    assertSameOrigin(req);

    const principal = resolveDinerPrincipal(req);
    // PROD-18: 5 authorizations/min sliding window per diner
    checkRateLimit(`paypal-create:${principal.userId}`, 5);

    const rawBody = await parseJsonBody(req);
    const input = validateSchema(CreateEscrowRequestSchema, rawBody);

    const idempotencyKey =
      req.headers.get('idempotency-key')?.trim() || input.idempotencyKey;

    if (idempotencyKey) {
      const existingIdem = await repo.getIdempotency<Record<string, unknown>>(
        `create:${idempotencyKey}`
      );
      if (existingIdem) {
        return NextResponse.json(
          { ...existingIdem.responseBody, idempotentReplay: true },
          {
            status: existingIdem.responseCode,
            headers: { 'X-Trace-Id': traceId },
          }
        );
      }
    }

    // PROD-18: Serialize concurrent /create attempts for the same diner & enforce max 1 active hold
    acquireUserCreateLock(principal.userId);
    lockedUserId = principal.userId;

    if (!principal.isNewSession) {
      const existingActive = await repo.findActiveOrderForUser(principal.userId);
      if (existingActive) {
        throw new ActiveOrderExistsError(existingActive.orderId);
      }
    }

    const catalog = await repo.getCatalog();
    const item = catalog.find((i) => i.id === input.itemId);
    if (!item) {
      throw new ValidationError(`Unknown catalog itemId '${input.itemId}'.`);
    }
    if (!item.isAvailable) {
      throw new ValidationError(
        `Dish '${item.name}' was recently 86'd by ${item.merchantName} and is temporarily unavailable.`
      );
    }
    if (!isMerchantPayable(item.merchantId)) {
      throw new ValidationError(
        `Merchant '${item.merchantName}' cannot currently accept escrow authorizations.`
      );
    }

    if (input.excludedAllergens && input.excludedAllergens.length > 0) {
      const excluded = new Set(input.excludedAllergens);
      const conflicting = item.allergens.filter((a) => excluded.has(a));
      if (conflicting.length > 0) {
        throw new AllergenConflictError(
          `Safety block: '${item.name}' contains excluded allergen(s): ${conflicting.join(', ')}.`,
          { conflictingAllergens: conflicting }
        );
      }
    }

    const tweak = resolveCatalogTweak(item, {
      tweakOptionId: input.tweakOptionId,
      selectedTweak: input.selectedTweak,
      tweakDelta: input.tweakDelta,
    });

    // PROD-35: Waive $0.99 FastPass fee automatically for B2B work emails & coworker pickup runs (?run_id=)
    const b2bOrRunWaiver =
      Boolean(input.pickupRunId) || isCorporateWorkEmail(input.workEmail);
    const waiveFastPassFee = b2bOrRunWaiver ? true : (input.waiveFastPassFee ?? true);

    const merchant = getMerchantForMenuItem(item);
    const pricing = calculateOrderPricingCents({
      basePriceCents: item.basePriceCents,
      tweakDeltaCents: tweak.tweakDeltaCents,
      fixedTaxCents: 100,
      taxRateBps: merchant.taxRateBps,
      tipSelection: input.tipSelection,
      waiveFastPassFee,
    });

    // Lease station BEFORE external payment authorization to prevent orphaned holds on full capacity
    leasedStation = await repo.leaseStation(item.merchantId);

    const paypalRes = await createAuthorizationOrder({
      amountCents: pricing.totalCents,
      pricing,
      merchantName: item.merchantName,
      merchantPayeeId: item.merchantPayeeId,
      vaultId: input.vaultId,
      idempotencyKey,
      description: `BitePass — ${item.name} (${item.merchantName})`,
    });

    if (!paypalRes.authorizationId) {
      await repo.releaseStation(leasedStation);
      leasedStation = null;
      throw new PaymentDeclinedError(
        'PayPal order requires buyer approval before an escrow authorization hold can be established.'
      );
    }

    const now = Date.now();
    const orderTicket = await repo.createOrder({
      userId: principal.userId,
      customerName: input.customerName ?? 'Alex Hunter',
      item,
      pricing,
      totalAmountCents: pricing.totalCents,
      totalAmount: pricing.total,
      status: 'AUTHORIZED',
      authId: paypalRes.authorizationId,
      paypalOrderId: paypalRes.id,
      cubbyOrBay: leasedStation,
      etaMinutes: item.prepTimeMinutes,
      createdAt: now,
      authorizedAt: now,
      selectedTweak: tweak.label,
      selectedTweakId: tweak.option?.id,
      distanceMeters: input.distanceMeters,
      pickupRunId: input.pickupRunId,
    });
    leasedStation = null;

    const margin = computeOrderContributionMargin(pricing);
    trackFunnelEvent({
      event: 'escrow_authorized',
      traceId,
      orderId: orderTicket.orderId,
      userId: principal.userId,
      merchantId: item.merchantId,
      net_contribution_margin_usd: margin.netContributionMarginUsd,
      llm_cost_usd: 0,
      properties: {
        station: orderTicket.cubbyOrBay,
        fulfillmentStage: orderTicket.fulfillmentStage,
        b2bWorkEmail: isCorporateWorkEmail(input.workEmail),
      },
    });

    if (orderTicket.fulfillmentStage === 'KITCHEN_FIRED') {
      trackFunnelEvent({
        event: 'kitchen_fired',
        traceId,
        orderId: orderTicket.orderId,
        userId: principal.userId,
        merchantId: item.merchantId,
        net_contribution_margin_usd: 0,
        llm_cost_usd: 0,
      });
    }

    if (input.pickupRunId) {
      trackFunnelEvent({
        event: 'pickup_run_joined',
        traceId,
        orderId: orderTicket.orderId,
        userId: principal.userId,
        merchantId: item.merchantId,
        net_contribution_margin_usd: margin.netContributionMarginUsd,
        llm_cost_usd: 0,
        properties: { pickupRunId: input.pickupRunId },
      });
    }

    logger.info('Created Phase 1 PayPal escrow hold', {
      traceId,
      orderId: orderTicket.orderId,
      userId: principal.userId,
      merchantId: item.merchantId,
      station: orderTicket.cubbyOrBay,
    });

    const bayCapacity = await repo.getBayCapacity();
    const payload = {
      success: true,
      order: sanitizeOrderForDiner(orderTicket),
      paypal: paypalRes,
      bayCapacity,
    };

    if (idempotencyKey) {
      await repo.saveIdempotency(`create:${idempotencyKey}`, 200, payload);
    }

    const res = NextResponse.json(payload, {
      headers: { 'X-Trace-Id': traceId },
    });
    if (principal.setCookieHeader) {
      res.headers.append('Set-Cookie', principal.setCookieHeader);
    }
    res.headers.append('Set-Cookie', buildActiveOrderCookie(orderTicket.orderId));
    return res;
  } catch (error) {
    if (leasedStation) {
      await repo.releaseStation(leasedStation);
    }
    return toProblemResponse(error, '/api/paypal/create');
  } finally {
    if (lockedUserId) {
      releaseUserCreateLock(lockedUserId);
    }
  }
}

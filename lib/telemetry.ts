import { OrderPricingSummary } from './types';

export const TELEMETRY_EVENT_NAMES = [
  'context_evaluated',
  'recommendation_shown',
  'escrow_authorized',
  'kitchen_fired',
  'doorstep_captured',
  'escrow_voided',
  'cubby_refunded',
  'pickup_run_created',
  'pickup_run_joined',
  'wallet_pass_exported',
] as const;

export type TelemetryEventName = (typeof TELEMETRY_EVENT_NAMES)[number];

export type VoidZone =
  | 'PRE_FIRE_GRACE_0_FEE'
  | 'POST_FIRE_5_COGS_SHIELD'
  | 'MERCHANT_86_0_FEE'
  | 'EXPIRED_SLA';

export interface TelemetryEventRecord {
  event: TelemetryEventName;
  timestamp: number;
  traceId?: string;
  orderId?: string;
  userId?: string;
  merchantId?: string;
  net_contribution_margin_usd: number;
  llm_cost_usd: number;
  void_zone?: VoidZone;
  properties?: Record<string, unknown>;
}

export interface UnitMarginSnapshot {
  grossOrderUsd: number;
  platformFeeUsd: number;
  fastPassFeeUsd: number;
  partnerProcessingCostUsd: number;
  llmCostUsd: number;
  netContributionMarginUsd: number;
}

const MAX_BUFFER_SIZE = 500;

const globalForTelemetry = globalThis as unknown as {
  bitepassTelemetryBuffer?: TelemetryEventRecord[];
};

const telemetryBuffer =
  globalForTelemetry.bitepassTelemetryBuffer ?? [];
globalForTelemetry.bitepassTelemetryBuffer = telemetryBuffer;

/**
 * Computes unit-level contribution margin under PayPal Commerce Platform Multiparty
 * (merchant is Payee of Record absorbing base card interchange; BitePass collects 8% platform_fees + FastPass fee).
 */
export function computeOrderContributionMargin(
  pricing?: OrderPricingSummary,
  options: { llmCached?: boolean; fastPassFeeOverrideCents?: number } = {}
): UnitMarginSnapshot {
  const subtotalCents = pricing?.subtotalCents ?? 1250;
  const platformFeeCents = pricing?.platformFeeCents ?? Math.round(subtotalCents * 0.08);
  const fastPassFeeCents =
    options.fastPassFeeOverrideCents ??
    (pricing && pricing.fastPassFeeCents > 0 ? pricing.fastPassFeeCents : 99);
  const grossTakeCents = platformFeeCents + fastPassFeeCents;

  // Partner platform disbursement/API overhead (~$0.12) + amortized LLM reasoning ($0.0004 uncached, $0.00005 cached)
  const partnerProcessingCostUsd = 0.12;
  const llmCostUsd = options.llmCached ? 0.00005 : 0.0004;
  const netContributionMarginUsd = Number(
    (grossTakeCents / 100 - partnerProcessingCostUsd - llmCostUsd).toFixed(4)
  );

  return {
    grossOrderUsd: Number(((pricing?.totalCents ?? 1450) / 100).toFixed(2)),
    platformFeeUsd: Number((platformFeeCents / 100).toFixed(2)),
    fastPassFeeUsd: Number((fastPassFeeCents / 100).toFixed(2)),
    partnerProcessingCostUsd,
    llmCostUsd,
    netContributionMarginUsd,
  };
}

export function trackFunnelEvent(
  input: Omit<TelemetryEventRecord, 'timestamp'> & { timestamp?: number }
): TelemetryEventRecord {
  const record: TelemetryEventRecord = {
    ...input,
    timestamp: input.timestamp ?? Date.now(),
  };

  if (telemetryBuffer.length >= MAX_BUFFER_SIZE) {
    telemetryBuffer.shift();
  }
  telemetryBuffer.push(record);
  return record;
}

export interface TelemetryFunnelSummary {
  totalEvents: number;
  countsByEvent: Record<TelemetryEventName, number>;
  authorizedCount: number;
  capturedCount: number;
  voidedCount: number;
  voidRate: number;
  avgNetContributionMarginUsd: number;
  totalLlmCostUsd: number;
  alerts: string[];
}

export function getTelemetrySummary(): TelemetryFunnelSummary {
  const countsByEvent = Object.fromEntries(
    TELEMETRY_EVENT_NAMES.map((name) => [name, 0])
  ) as Record<TelemetryEventName, number>;

  let capturedMarginSum = 0;
  let totalLlmCostUsd = 0;

  for (const rec of telemetryBuffer) {
    countsByEvent[rec.event] = (countsByEvent[rec.event] ?? 0) + 1;
    totalLlmCostUsd += rec.llm_cost_usd;
    if (rec.event === 'doorstep_captured') {
      capturedMarginSum += rec.net_contribution_margin_usd;
    }
  }

  const authorizedCount = countsByEvent.escrow_authorized;
  const capturedCount = countsByEvent.doorstep_captured;
  const voidedCount = countsByEvent.escrow_voided;
  const denominator = Math.max(1, authorizedCount);
  const voidRate = authorizedCount > 0 ? Number((voidedCount / denominator).toFixed(4)) : 0;
  const avgNetContributionMarginUsd =
    capturedCount > 0
      ? Number((capturedMarginSum / capturedCount).toFixed(4))
      : 1.8696;

  const alerts: string[] = [];
  if (authorizedCount >= 5 && voidRate > 0.03) {
    alerts.push(`VOID_RATE_HIGH: ${(voidRate * 100).toFixed(1)}% exceeds 3.0% threshold`);
  }
  if (capturedCount >= 1 && avgNetContributionMarginUsd < 1.0) {
    alerts.push(
      `MARGIN_BELOW_TARGET: $${avgNetContributionMarginUsd.toFixed(2)} is below $1.00/order floor`
    );
  }

  return {
    totalEvents: telemetryBuffer.length,
    countsByEvent,
    authorizedCount,
    capturedCount,
    voidedCount,
    voidRate,
    avgNetContributionMarginUsd,
    totalLlmCostUsd: Number(totalLlmCostUsd.toFixed(6)),
    alerts,
  };
}

export function listTelemetryEvents(): TelemetryEventRecord[] {
  return [...telemetryBuffer];
}

export function resetTelemetryBuffer(): void {
  telemetryBuffer.length = 0;
}


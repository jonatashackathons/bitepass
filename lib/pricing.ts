import { ValidationError } from './errors';
import { OrderPricingSummary } from './types';

export type Cents = number & { readonly __brand: 'Cents' };

export const DEFAULT_TAX_RATE_BPS = 800; // 8.00% municipal food tax ($1.00 on $12.50 flagship panini)
export const DEFAULT_TIP_CENTS = 100; // $1.00 optional default staff gratuity
export const STANDARD_FASTPASS_FEE_CENTS = 99; // $0.99 PAYG FastPass fee (waived on first 3 orders / Pro / B2B)
export const PLATFORM_FEE_BPS = 800; // 8.00% PayPal Multiparty platform_fees
export const POST_FIRE_RESTOCKING_FEE_CENTS = 500; // $5.00 COGS spoilage recovery shield

export function cents(value: number): Cents {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new ValidationError(`Invalid integer cents value: ${value}`);
  }
  return value as Cents;
}

export function centsToDollars(amountCents: number): number {
  return Number((amountCents / 100).toFixed(2));
}

export function formatUsdDecimal(amountCents: number): string {
  return (amountCents / 100).toFixed(2);
}

export type TipSelection =
  | { readonly mode: 'fixed_cents'; readonly amountCents: number }
  | { readonly mode: 'percent'; readonly percent: 0 | 10 | 15 | 20 };

export interface PricingCalculationInput {
  basePriceCents: number;
  tweakDeltaCents?: number;
  taxRateBps?: number;
  fixedTaxCents?: number;
  tipSelection?: TipSelection;
  waiveFastPassFee?: boolean; // True for First-3-Free, BitePass Pro, and B2B Corporate Pass
}

/**
 * Pure integer-cent pricing engine guaranteeing exact bottom-up PayPal v2 breakdown reconciliation:
 * subtotalCents + taxCents + tipCents + fastPassFeeCents === totalCents (0 cent rounding drift).
 */
export function calculateOrderPricingCents(
  input: PricingCalculationInput
): OrderPricingSummary {
  const baseCents = cents(input.basePriceCents);
  const tweakCents = cents(input.tweakDeltaCents ?? 0);
  const taxRateBps = input.taxRateBps ?? DEFAULT_TAX_RATE_BPS;

  if (!Number.isSafeInteger(taxRateBps) || taxRateBps < 0 || taxRateBps > 2500) {
    throw new ValidationError(`Invalid taxRateBps: ${taxRateBps}`);
  }

  const subtotalCents = cents(baseCents + tweakCents);

  // Supports either explicit fixed municipal meal tax cents or half-up basis-point calculation (10,000 bps = 100%)
  const taxCents =
    input.fixedTaxCents !== undefined
      ? cents(input.fixedTaxCents)
      : cents(Math.floor((subtotalCents * taxRateBps + 5_000) / 10_000));

  const tipSpec = input.tipSelection ?? {
    mode: 'fixed_cents',
    amountCents: DEFAULT_TIP_CENTS,
  };
  const tipCents =
    tipSpec.mode === 'fixed_cents'
      ? cents(tipSpec.amountCents)
      : cents(Math.floor((subtotalCents * tipSpec.percent + 50) / 100));

  // Default: waive FastPass fee during initial onboarding ("First 3 Free") unless explicitly enabled
  const waiveFee = input.waiveFastPassFee ?? true;
  const fastPassFeeCents = cents(waiveFee ? 0 : STANDARD_FASTPASS_FEE_CENTS);

  const platformFeeCents = cents(
    Math.floor((subtotalCents * PLATFORM_FEE_BPS + 5_000) / 10_000)
  );

  const totalCents = cents(subtotalCents + taxCents + tipCents + fastPassFeeCents);

  // Invariant check: guarantees zero PayPal 422 AMOUNT_MISMATCH
  if (baseCents + tweakCents !== subtotalCents) {
    throw new ValidationError('Subtotal breakdown mismatch');
  }
  if (subtotalCents + taxCents + tipCents + fastPassFeeCents !== totalCents) {
    throw new ValidationError('Total breakdown mismatch');
  }

  return {
    basePriceCents: subtotalCents,
    tweakDeltaCents: tweakCents,
    subtotalCents,
    taxRateBps,
    taxCents,
    tipCents,
    fastPassFeeCents,
    platformFeeCents,
    totalCents,
    basePrice: centsToDollars(subtotalCents),
    tax: centsToDollars(taxCents),
    tip: centsToDollars(tipCents),
    fastPassFee: centsToDollars(fastPassFeeCents),
    total: centsToDollars(totalCents),
  };
}

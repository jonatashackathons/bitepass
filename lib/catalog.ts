import { AllergenConflictError, ValidationError } from './errors';
import { calculateOrderPricingCents, centsToDollars } from './pricing';
import {
  Allergen,
  DietaryPreference,
  MenuItem,
  OrderPricingSummary,
  QuickTweakOption,
} from './types';

export interface MerchantProfile {
  id: string;
  slug: string;
  name: string;
  paypalMerchantId: string;
  paymentsReceivable: boolean;
  primaryEmailConfirmed: boolean;
  taxRateBps: number;
  latitude: number;
  longitude: number;
  geofenceRadiusM: number;
}

export const MERCHANT_DIRECTORY: Readonly<Record<string, MerchantProfile>> = {
  merch_jacks_cafe: {
    id: 'merch_jacks_cafe',
    slug: 'jacks-cafe',
    name: "Jack's Cafe",
    paypalMerchantId: 'PP-MERCH-JACKS-01',
    paymentsReceivable: true,
    primaryEmailConfirmed: true,
    taxRateBps: 800,
    latitude: 37.7897,
    longitude: -122.4014,
    geofenceRadiusM: 50,
  },
  merch_green_grains: {
    id: 'merch_green_grains',
    slug: 'green-and-grains',
    name: 'Green & Grains',
    paypalMerchantId: 'PP-MERCH-GREEN-02',
    paymentsReceivable: true,
    primaryEmailConfirmed: true,
    taxRateBps: 850,
    latitude: 37.7902,
    longitude: -122.4021,
    geofenceRadiusM: 50,
  },
  merch_artisan_melt: {
    id: 'merch_artisan_melt',
    slug: 'artisan-melt-co',
    name: 'Artisan Melt Co.',
    paypalMerchantId: 'PP-MERCH-MELT-03',
    paymentsReceivable: true,
    primaryEmailConfirmed: true,
    taxRateBps: 800,
    latitude: 37.7891,
    longitude: -122.4008,
    geofenceRadiusM: 50,
  },
  merch_tokyo_bites: {
    id: 'merch_tokyo_bites',
    slug: 'tokyo-bites',
    name: 'Tokyo Bites',
    paypalMerchantId: 'PP-MERCH-TOKYO-04',
    paymentsReceivable: true,
    primaryEmailConfirmed: true,
    taxRateBps: 800,
    latitude: 37.7908,
    longitude: -122.4002,
    geofenceRadiusM: 50,
  },
};

export const MENU_CATALOG: MenuItem[] = [
  {
    id: 'prod_turkey_panini',
    merchantId: 'merch_jacks_cafe',
    merchantName: "Jack's Cafe",
    merchantPayeeId: 'PP-MERCH-JACKS-01',
    taxRateBps: 800,
    name: 'Turkey Avocado Club',
    category: 'Artisan Sandwiches',
    basePriceCents: 1250,
    price: 12.5,
    prepTimeMinutes: 5,
    dietaryTags: ['Omnivore'],
    allergens: ['Wheat', 'Eggs'],
    isAvailable: true,
    description:
      'Smoked turkey breast, Haas avocado, applewood bacon, garlic aioli on toasted sourdough.',
    calories: 640,
    image: '/images/turkey_club.jpg',
    quickTweaks: {
      label: 'Side Selection',
      options: [
        {
          id: 'opt_kettle_chips',
          name: 'Kettle Sea Salt Chips',
          priceDeltaCents: 0,
          priceDelta: 0,
        },
        {
          id: 'opt_arugula_salad',
          name: 'Arugula Citrus Side Salad',
          priceDeltaCents: 150,
          priceDelta: 1.5,
        },
      ],
    },
  },
  {
    id: 'prod_quinoa_bowl',
    merchantId: 'merch_green_grains',
    merchantName: 'Green & Grains',
    merchantPayeeId: 'PP-MERCH-GREEN-02',
    taxRateBps: 850,
    name: 'Kale Quinoa Power Bowl',
    category: 'Warm Grain Bowls',
    basePriceCents: 1180,
    price: 11.8,
    prepTimeMinutes: 4,
    dietaryTags: ['Vegan', 'Gluten-Free'],
    allergens: ['Sesame'],
    isAvailable: true,
    description:
      'Organic red quinoa, massaged Tuscan kale, roasted sweet potato, pumpkin seeds, lemon tahini dressing.',
    calories: 520,
    image: '/images/quinoa_bowl.jpg',
    quickTweaks: {
      label: 'Dressing & Toppings',
      options: [
        {
          id: 'opt_lemon_tahini',
          name: 'Lemon Tahini (Standard)',
          priceDeltaCents: 0,
          priceDelta: 0,
        },
        {
          id: 'opt_extra_avocado',
          name: 'Extra Avocado Mash',
          priceDeltaCents: 150,
          priceDelta: 1.5,
        },
      ],
    },
  },
  {
    id: 'prod_truffle_melt',
    merchantId: 'merch_artisan_melt',
    merchantName: 'Artisan Melt Co.',
    merchantPayeeId: 'PP-MERCH-MELT-03',
    taxRateBps: 800,
    name: 'Sourdough Truffle Melt',
    category: 'Gourmet Melts',
    basePriceCents: 1050,
    price: 10.5,
    prepTimeMinutes: 6,
    dietaryTags: ['Omnivore'],
    allergens: ['Wheat', 'Milk'],
    isAvailable: true,
    description:
      'Aged gruyère, sharp cheddar, caramelized shallots, white truffle butter on country sourdough.',
    calories: 680,
    image: '/images/truffle_melt.jpg',
    quickTweaks: {
      label: 'Dip Pairing',
      options: [
        {
          id: 'opt_tomato_bisque',
          name: 'Roasted Tomato Bisque',
          priceDeltaCents: 200,
          priceDelta: 2.0,
        },
        {
          id: 'opt_herb_mayo',
          name: 'House Herb Mayo',
          priceDeltaCents: 0,
          priceDelta: 0,
        },
      ],
    },
  },
  {
    id: 'prod_salmon_poke',
    merchantId: 'merch_tokyo_bites',
    merchantName: 'Tokyo Bites',
    merchantPayeeId: 'PP-MERCH-TOKYO-04',
    taxRateBps: 800,
    name: 'Salmon Poke Protein Bowl',
    category: 'Fresh Bowls',
    basePriceCents: 1400,
    price: 14.0,
    prepTimeMinutes: 5,
    dietaryTags: ['Gluten-Free', 'Omnivore'],
    allergens: ['Fish', 'Soy', 'Sesame'],
    isAvailable: true,
    description:
      'Sashimi salmon, sushi rice, edamame, cucumber, pickled ginger, tamari gluten-free glaze.',
    calories: 580,
    image: '/images/salmon_poke.jpg',
    quickTweaks: {
      label: 'Base Choice',
      options: [
        {
          id: 'opt_sushi_rice',
          name: 'Standard Sushi Rice',
          priceDeltaCents: 0,
          priceDelta: 0,
        },
        {
          id: 'opt_cauliflower_rice',
          name: 'Cauliflower Rice Swap',
          priceDeltaCents: 100,
          priceDelta: 1.0,
        },
      ],
    },
  },
];

export const FIXED_TAX = 1.0;
export const FIXED_TIP = 1.0;

const merchantPayabilityOverrides = new Map<string, boolean>();

export function setMerchantPayability(
  merchantOrPayeeId: string,
  receivable: boolean
): boolean {
  for (const profile of Object.values(MERCHANT_DIRECTORY)) {
    if (
      profile.id === merchantOrPayeeId ||
      profile.paypalMerchantId === merchantOrPayeeId ||
      profile.slug === merchantOrPayeeId
    ) {
      merchantPayabilityOverrides.set(profile.id, receivable);
      return true;
    }
  }
  return false;
}

export function resetMerchantPayability(): void {
  merchantPayabilityOverrides.clear();
}

export function isCorporateWorkEmail(email: string | undefined): boolean {
  if (!email) return false;
  const trimmed = email.trim().toLowerCase();
  const atIdx = trimmed.indexOf('@');
  if (atIdx <= 0) return false;
  const domain = trimmed.slice(atIdx + 1);
  if (!domain.includes('.')) return false;
  const consumerDomains = new Set([
    'gmail.com',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'icloud.com',
    'aol.com',
    'proton.me',
    'protonmail.com',
  ]);
  return !consumerDomains.has(domain);
}

export function getMerchantForMenuItem(item: MenuItem): MerchantProfile {
  const merchant = MERCHANT_DIRECTORY[item.merchantId];
  if (merchant) return merchant;
  return MERCHANT_DIRECTORY.merch_jacks_cafe;
}

export function isMerchantPayable(merchantId: string): boolean {
  const merchant = MERCHANT_DIRECTORY[merchantId];
  if (!merchant) return false;
  if (merchantPayabilityOverrides.has(merchantId)) {
    return Boolean(merchantPayabilityOverrides.get(merchantId));
  }
  return Boolean(merchant.paymentsReceivable && merchant.primaryEmailConfirmed);
}

/**
 * Deterministic dollar/cent pricing calculation used by UI cards and tests.
 * Uses integer-cent arithmetic internally to prevent IEEE-754 rounding drift.
 */
export function calculateOrderPricing(
  basePriceDollars: number,
  tweakDeltaDollars = 0
): OrderPricingSummary {
  const basePriceCents = Math.round(basePriceDollars * 100);
  const tweakDeltaCents = Math.round(tweakDeltaDollars * 100);
  return calculateOrderPricingCents({
    basePriceCents,
    tweakDeltaCents,
    fixedTaxCents: 100,
    tipSelection: { mode: 'fixed_cents', amountCents: 100 },
    waiveFastPassFee: true,
  });
}

/**
 * Resolves and validates a menu item's quick tweak exclusively against the server catalog.
 * Rejects uncatalogued or tampered tweak deltas.
 */
export function resolveCatalogTweak(
  item: MenuItem,
  params: {
    tweakOptionId?: string;
    selectedTweak?: string;
    tweakDelta?: number;
  }
): { option?: QuickTweakOption; tweakDeltaCents: number; label?: string } {
  const options = item.quickTweaks?.options ?? [];

  if (params.tweakOptionId) {
    const found = options.find((o) => o.id === params.tweakOptionId);
    if (!found) {
      throw new ValidationError(
        `Unknown tweakOptionId '${params.tweakOptionId}' for item '${item.id}'.`
      );
    }
    return {
      option: found,
      tweakDeltaCents: found.priceDeltaCents,
      label: found.name,
    };
  }

  if (params.selectedTweak) {
    const found = options.find((o) => o.name === params.selectedTweak);
    if (!found) {
      throw new ValidationError(
        `Unknown selectedTweak '${params.selectedTweak}' for item '${item.id}'.`
      );
    }
    return {
      option: found,
      tweakDeltaCents: found.priceDeltaCents,
      label: found.name,
    };
  }

  if (params.tweakDelta !== undefined) {
    const requestedCents = Math.round(params.tweakDelta * 100);
    if (requestedCents === 0) {
      const zeroOpt = options.find((o) => o.priceDeltaCents === 0);
      return {
        option: zeroOpt,
        tweakDeltaCents: 0,
        label: zeroOpt?.name,
      };
    }
    const matchingOption = options.find((o) => o.priceDeltaCents === requestedCents);
    if (!matchingOption) {
      throw new ValidationError(
        `Invalid tweakDelta (${centsToDollars(requestedCents)}) does not match any catalog option for '${item.id}'.`
      );
    }
    return {
      option: matchingOption,
      tweakDeltaCents: matchingOption.priceDeltaCents,
      label: matchingOption.name,
    };
  }

  const defaultOpt = options[0];
  return {
    option: defaultOpt,
    tweakDeltaCents: 0,
    label: defaultOpt?.name,
  };
}

/**
 * Returns all currently available menu items matching the diner's dietary preference
 * and containing ZERO excluded FDA allergens, from payable merchants only.
 */
export function getEligibleMenuItems(
  dietary: DietaryPreference,
  excludedAllergens: readonly Allergen[] = [],
  catalog: readonly MenuItem[] = MENU_CATALOG
): MenuItem[] {
  const excludedSet = new Set<Allergen>(excludedAllergens);
  return catalog.filter((item) => {
    if (!item.isAvailable) return false;
    if (!isMerchantPayable(item.merchantId)) return false;
    if (!item.dietaryTags.includes(dietary)) return false;
    if (excludedSet.size > 0 && item.allergens.some((a) => excludedSet.has(a))) {
      return false;
    }
    return true;
  });
}

export function findEligibleMenuItem(
  dietary: DietaryPreference,
  excludedAllergens: readonly Allergen[] = [],
  catalog: readonly MenuItem[] = MENU_CATALOG
): MenuItem | null {
  const matches = getEligibleMenuItems(dietary, excludedAllergens, catalog);
  return matches[0] ?? null;
}

/**
 * Strict fail-closed dietary/allergen lookup.
 * NEVER falls back to MENU_CATALOG[0] (meat/wheat/allergen hazard) when no eligible item exists.
 */
export function findBestMenuItem(
  dietary: DietaryPreference,
  excludedAllergens: readonly Allergen[] = [],
  catalog: readonly MenuItem[] = MENU_CATALOG
): MenuItem {
  const match = findEligibleMenuItem(dietary, excludedAllergens, catalog);
  if (!match) {
    throw new AllergenConflictError(
      `No available menu item safely satisfies dietary '${dietary}'${
        excludedAllergens.length > 0
          ? ` while excluding [${excludedAllergens.join(', ')}]`
          : ''
      }.`
    );
  }
  return match;
}


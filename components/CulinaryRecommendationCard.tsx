'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Zap,
  Loader2,
  ShieldCheck,
  Check,
  UtensilsCrossed,
  MapPin,
  Leaf,
  Clock,
  ShieldAlert,
  SlidersHorizontal,
  ArrowLeftRight,
  Users,
} from 'lucide-react';
import {
  ALL_FDA_ALLERGENS,
  Allergen,
  DietaryPreference,
  MenuItem,
  QuickTweakOption,
  TriggeredRecommendation,
} from '@/lib/types';

export interface AuthorizeOrderSelection {
  tweakOptionId?: string;
  name?: string;
  priceDelta: number;
  tipAmountCents: number;
  workEmail?: string;
}

interface CulinaryRecommendationCardProps {
  recommendation: TriggeredRecommendation;
  freeMinutes: number;
  distanceMeters?: number;
  dietary?: DietaryPreference;
  excludedAllergens?: Allergen[];
  pickupRunId?: string | null;
  onToggleAllergen?: (allergen: Allergen) => void;
  onSelectAlternative?: (item: MenuItem) => void;
  onAuthorize: (selection?: AuthorizeOrderSelection) => Promise<void>;
  isAuthorizing: boolean;
  authError?: string | null;
  onSimulateWalk?: () => void;
  onTriggerDoorstep?: () => void;
  onToggleDietary?: () => void;
  onTriggerOverrun?: () => void;
  onOpenGuide?: () => void;
}

export function CulinaryRecommendationCard({
  recommendation,
  freeMinutes,
  distanceMeters = 200,
  dietary = 'Omnivore',
  excludedAllergens = [],
  pickupRunId,
  onToggleAllergen,
  onSelectAlternative,
  onAuthorize,
  isAuthorizing,
  authError,
  onSimulateWalk,
  onTriggerDoorstep,
  onToggleDietary,
  onTriggerOverrun,
  onOpenGuide,
}: CulinaryRecommendationCardProps) {
  const item: MenuItem = recommendation.item;
  const [selectedTweak, setSelectedTweak] = useState<QuickTweakOption | null>(null);
  const [tipCents, setTipCents] = useState<number>(100); // Default $1.00 optional tip
  const [isCustomTip, setIsCustomTip] = useState(false);
  const [customTipDollars, setCustomTipDollars] = useState('3.00');
  const [workEmail, setWorkEmail] = useState('');
  const [showPreferencesDrawer, setShowPreferencesDrawer] = useState(false);
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);

  const tweakDeltaCents = selectedTweak ? selectedTweak.priceDeltaCents : 0;
  const taxCents = recommendation.breakdown.taxCents ?? 100;
  const currentTotalCents = item.basePriceCents + tweakDeltaCents + taxCents + tipCents;
  const currentTotal = (currentTotalCents / 100).toFixed(2);

  const handleTap = async () => {
    if (isAuthorizing) return;
    await onAuthorize({
      tweakOptionId: selectedTweak?.id,
      name: selectedTweak?.name,
      priceDelta: selectedTweak ? selectedTweak.priceDelta : 0,
      tipAmountCents: tipCents,
      workEmail: workEmail.trim() || undefined,
    });
  };

  const handleCycleAlternative = () => {
    if (!onSelectAlternative || recommendation.alternatives.length === 0) return;
    onSelectAlternative(recommendation.alternatives[0]);
  };

  const handleCustomTipChange = (raw: string) => {
    setCustomTipDollars(raw);
    const parsed = Number.parseFloat(raw);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setTipCents(0);
      return;
    }
    const clampedCents = Math.min(5000, Math.round(parsed * 100));
    setTipCents(clampedCents);
  };

  const isLunchActive =
    freeMinutes >= 30 && distanceMeters === 200 && dietary === 'Omnivore';
  const isDoorstepActive = distanceMeters <= 50;
  const isVeganActive = dietary === 'Vegan';
  const isLateActive = freeMinutes < 30;

  const scenarioBadges = [
    {
      id: 'lunch',
      label: '12:15 PM Lunch',
      icon: <UtensilsCrossed className="w-4 h-4" />,
      active: isLunchActive,
      activeColor:
        'bg-culinary-terracottaFill text-white ring-2 ring-white/60 shadow-lg',
      inactiveColor: 'bg-white/15 hover:bg-white/25 text-white/95',
      action: onSimulateWalk,
    },
    {
      id: 'doorstep',
      label: 'Doorstep (<50m)',
      icon: <MapPin className="w-4 h-4" />,
      active: isDoorstepActive,
      activeColor:
        'bg-emerald-600 text-white ring-2 ring-white/60 shadow-lg',
      inactiveColor: 'bg-white/15 hover:bg-white/25 text-white/95',
      action: onTriggerDoorstep,
    },
    {
      id: 'vegan',
      label: 'Vegan',
      icon: <Leaf className="w-4 h-4" />,
      active: isVeganActive,
      activeColor:
        'bg-emerald-700 text-white ring-2 ring-white/60 shadow-lg',
      inactiveColor: 'bg-white/15 hover:bg-white/25 text-white/95',
      action: onToggleDietary,
    },
    {
      id: 'late',
      label: 'Late (<30m)',
      icon: <Clock className="w-4 h-4" />,
      active: isLateActive,
      activeColor:
        'bg-amber-600 text-white ring-2 ring-white/60 shadow-lg',
      inactiveColor: 'bg-white/15 hover:bg-white/25 text-white/95',
      action: onTriggerOverrun,
    },
  ];

  return (
    <div className="w-full bg-white rounded-3xl overflow-hidden border border-culinary-border shadow-md transition-all">
      {/* Compact Food Photography with Scenario Dock */}
      <div
        className="relative w-full h-52 bg-culinary-subtle overflow-hidden"
        style={{ position: 'relative' }}
      >
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 100vw, 448px"
            className="object-cover object-center"
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-culinary-subtle text-culinary-muted text-xs">
            Artisan Culinary
          </div>
        )}

        {/* Warm readability vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/30 pointer-events-none" />

        {/* Top Badges (Prep & Window) */}
        <div className="absolute top-3 left-3 right-16 flex items-center justify-between gap-2 z-10 pointer-events-none">
          <span className="px-2.5 py-0.5 rounded-full bg-white/95 backdrop-blur-md text-xs font-bold text-culinary-text shadow-xs flex items-center gap-1">
            <Zap className="w-3 h-3 text-culinary-terracottaFill fill-culinary-terracottaFill" />
            <span>Ready in {item.prepTimeMinutes}m</span>
          </span>

          <span className="px-2.5 py-0.5 rounded-full bg-black/65 backdrop-blur-md text-xs font-medium text-white shadow-xs">
            {freeMinutes}m Window
          </span>
        </div>

        {/* Floating Vertical Scenario Dock (>=44x44px touch targets + high-contrast focus ring) */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex flex-col items-end">
          <div className="bg-black/65 backdrop-blur-md border border-white/15 p-1 rounded-2xl flex flex-col gap-1 shadow-2xl">
            {scenarioBadges.map((badge) => {
              const isTooltipVisible = activeTooltipId === badge.id;

              return (
                <div
                  key={badge.id}
                  className="relative flex items-center justify-end group"
                  onMouseEnter={() => setActiveTooltipId(badge.id)}
                  onMouseLeave={() => setActiveTooltipId(null)}
                >
                  <div
                    className={`absolute right-full mr-2.5 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-200 ease-out flex items-center ${
                      isTooltipVisible
                        ? 'opacity-100 translate-x-0'
                        : 'opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'
                    }`}
                  >
                    <div className="px-2.5 py-1 rounded-full bg-black/90 backdrop-blur-md border border-white/20 text-white text-xs font-semibold whitespace-nowrap shadow-2xl">
                      {badge.label}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      badge.action?.();
                      setActiveTooltipId(badge.id);
                      setTimeout(() => setActiveTooltipId(null), 1600);
                    }}
                    title={badge.label}
                    aria-label={badge.label}
                    aria-pressed={badge.active}
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer focus-ring-on-dark ${
                      badge.active ? badge.activeColor : badge.inactiveColor
                    }`}
                  >
                    {badge.icon}
                    <span className="sr-only">{badge.label}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cafe & Category tag over image bottom */}
        <div className="absolute bottom-2.5 left-3.5 right-16 text-white z-10 pointer-events-none">
          <span className="text-xs uppercase tracking-wider font-semibold text-amber-300 drop-shadow-sm block truncate">
            {item.merchantName} &middot; {item.calories} kcal
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 sm:p-5">
        {pickupRunId && (
          <div className="mb-2.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-semibold flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-culinary-sage shrink-0" />
            <span className="truncate">
              Joining Coworker Pickup Run ({pickupRunId}) &middot; $0 FastPass
            </span>
          </div>
        )}

        {/* Title & Price Header */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-culinary-text tracking-tight leading-snug">
              {item.name}
            </h3>
            <p className="text-xs text-culinary-muted leading-relaxed mt-0.5 line-clamp-2">
              {item.description}
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="font-mono text-xl font-black text-culinary-text block leading-tight">
              ${currentTotal}
            </span>
            <span className="text-xs text-culinary-muted uppercase font-mono block">
              All-in
            </span>
          </div>
        </div>

        {/* Compact Allergen Warning + Swap/Tip Toggle Row */}
        <div className="flex items-center justify-between gap-1.5 py-1.5 px-2.5 rounded-xl bg-culinary-bg border border-culinary-border text-xs mb-2.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <ShieldAlert
              className="w-3.5 h-3.5 text-culinary-amber shrink-0"
              aria-hidden="true"
            />
            <span className="text-culinary-text font-medium truncate">
              {item.allergens.length > 0
                ? `Contains: ${item.allergens.join(', ')}`
                : 'FDA Top-9 Allergen Free'}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {recommendation.alternatives.length > 0 && onSelectAlternative && (
              <button
                type="button"
                onClick={handleCycleAlternative}
                className="px-2 py-1 rounded-lg bg-white hover:bg-culinary-subtle border border-culinary-border text-culinary-text font-semibold inline-flex items-center gap-1 cursor-pointer"
                title="Swap recommended dish"
              >
                <ArrowLeftRight className="w-3 h-3 text-culinary-terracotta" />
                <span>Swap</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowPreferencesDrawer((prev) => !prev)}
              aria-expanded={showPreferencesDrawer}
              className="px-2 py-1 rounded-lg bg-white hover:bg-culinary-subtle border border-culinary-border text-culinary-muted hover:text-culinary-text font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Tip/Allergy</span>
            </button>
          </div>
        </div>

        {/* Expandable Tip ([ $0 | $1 | $2 | Custom ]), B2B Work Email & FDA Allergen Guardrail Drawer */}
        {showPreferencesDrawer && (
          <div className="p-3 rounded-2xl bg-culinary-bg border border-culinary-border mb-2.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-culinary-text">
                Barista Tip (${(tipCents / 100).toFixed(2)}) &middot; Tax $
                {(taxCents / 100).toFixed(2)}
              </span>
              <div
                role="radiogroup"
                aria-label="Barista tip selection"
                className="flex items-center gap-1"
              >
                {[0, 100, 200].map((amt) => {
                  const selected = !isCustomTip && tipCents === amt;
                  return (
                    <button
                      key={amt}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        setIsCustomTip(false);
                        setTipCents(amt);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border cursor-pointer ${
                        selected
                          ? 'bg-paypal-blue text-white border-paypal-blue'
                          : 'bg-white text-culinary-text border-culinary-border'
                      }`}
                    >
                      ${amt / 100}
                    </button>
                  );
                })}
                <button
                  type="button"
                  role="radio"
                  aria-checked={isCustomTip}
                  onClick={() => {
                    setIsCustomTip(true);
                    handleCustomTipChange(customTipDollars);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-sans font-bold border cursor-pointer ${
                    isCustomTip
                      ? 'bg-paypal-blue text-white border-paypal-blue'
                      : 'bg-white text-culinary-text border-culinary-border'
                  }`}
                >
                  Custom
                </button>
              </div>
            </div>

            {isCustomTip && (
              <label className="block">
                <span className="text-xs font-semibold text-culinary-muted block mb-1">
                  Custom Tip Amount (USD):
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="50"
                  step="0.50"
                  value={customTipDollars}
                  onChange={(e) => handleCustomTipChange(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-white border border-culinary-border text-base font-mono text-culinary-text"
                />
              </label>
            )}

            <label className="block">
              <span className="text-xs font-semibold text-culinary-muted block mb-1">
                Corporate FastPass Waiver (Work Email):
              </span>
              <input
                type="email"
                value={workEmail}
                onChange={(e) => setWorkEmail(e.target.value)}
                placeholder="alex@company.com ($0 FastPass)"
                className="w-full px-3 py-1.5 rounded-xl bg-white border border-culinary-border text-base text-culinary-text placeholder:text-culinary-muted/70"
              />
            </label>

            {onToggleAllergen && (
              <div>
                <span className="text-xs font-semibold text-culinary-muted block mb-1">
                  Exclude FDA Allergens (Auto-filters catalog):
                </span>
                <div className="flex flex-wrap gap-1">
                  {ALL_FDA_ALLERGENS.map((alg) => {
                    const active = excludedAllergens.includes(alg);
                    return (
                      <button
                        key={alg}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onToggleAllergen(alg)}
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold border cursor-pointer ${
                          active
                            ? 'bg-red-50 text-red-800 border-red-300'
                            : 'bg-white text-culinary-muted border-culinary-border'
                        }`}
                      >
                        {active ? `✕ ${alg}` : alg}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Side Selection Chips (US-07) */}
        {item.quickTweaks && item.quickTweaks.options.length > 0 && (
          <div className="mb-3">
            <div
              role="radiogroup"
              aria-label={item.quickTweaks.label}
              className="grid grid-cols-2 gap-2"
            >
              {item.quickTweaks.options.map((opt) => {
                const isSelected = selectedTweak
                  ? selectedTweak.id === opt.id
                  : opt.priceDeltaCents === 0;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setSelectedTweak(opt)}
                    className={`w-full py-2 px-2.5 rounded-xl text-xs font-medium flex items-center justify-between gap-1 transition-all cursor-pointer border min-w-0 ${
                      isSelected
                        ? 'bg-orange-50/90 border-culinary-terracotta text-culinary-terracotta font-semibold'
                        : 'bg-culinary-bg hover:bg-culinary-subtle border-culinary-border text-culinary-muted'
                    }`}
                  >
                    <span className="flex items-center gap-1 min-w-0 truncate text-left">
                      {isSelected && (
                        <Check className="w-3 h-3 text-culinary-terracotta shrink-0" />
                      )}
                      <span className="truncate">{opt.name}</span>
                    </span>
                    {opt.priceDelta > 0 && (
                      <span className="font-mono text-xs shrink-0 ml-1">
                        +${opt.priceDelta.toFixed(2)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {authError && (
          <div
            role="alert"
            className="mb-2.5 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 font-medium"
          >
            {authError}
          </div>
        )}

        {/* Hero 1-Tap PayPal Escrow Button (US-02) */}
        <div>
          <button
            id="paypal-one-tap-button"
            type="button"
            onClick={handleTap}
            disabled={isAuthorizing}
            className="w-full relative rounded-2xl bg-paypal-blue hover:bg-paypal-hover active:scale-[0.99] text-white font-bold py-3.5 px-4 shadow-md shadow-paypal-blue/20 transition-all duration-150 cursor-pointer disabled:opacity-80 flex items-center justify-center gap-2"
          >
            {isAuthorizing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span className="text-sm font-semibold tracking-wide">
                  Holding Escrow (${currentTotal})...
                </span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span className="text-sm tracking-wide font-sans">
                  Hold with PayPal &middot; ${currentTotal}
                </span>
              </>
            )}
          </button>

          {/* Reg E Pre-Authorized Escrow Notice + How it works */}
          <div className="mt-2 flex items-center justify-between gap-2 text-xs text-culinary-muted px-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <ShieldCheck className="w-3.5 h-3.5 text-paypal-blue shrink-0" />
              <span className="truncate">
                90s $0 grace &middot; Settles ≤50m (
                <Link href="/legal/terms" className="underline hover:text-culinary-text">
                  Terms
                </Link>
                )
              </span>
            </div>
            {onOpenGuide && (
              <button
                type="button"
                onClick={onOpenGuide}
                className="text-culinary-terracotta hover:underline font-semibold cursor-pointer shrink-0 text-xs whitespace-nowrap"
              >
                How it works
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

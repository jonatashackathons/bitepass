'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Zap,
  Loader2,
  ShieldCheck,
  Check,
  UtensilsCrossed,
  MapPin,
  Leaf,
  Clock,
  Sparkles
} from 'lucide-react';
import { MenuItem, AgentRecommendation, DietaryPreference } from '@/lib/types';

interface CulinaryRecommendationCardProps {
  recommendation: AgentRecommendation;
  freeMinutes: number;
  distanceMeters?: number;
  dietary?: DietaryPreference;
  onAuthorize: (tweak?: { name: string; priceDelta: number }) => Promise<void>;
  isAuthorizing: boolean;
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
  onAuthorize,
  isAuthorizing,
  onSimulateWalk,
  onTriggerDoorstep,
  onToggleDietary,
  onTriggerOverrun,
  onOpenGuide,
}: CulinaryRecommendationCardProps) {
  const item: MenuItem = recommendation.item!;
  const [selectedTweak, setSelectedTweak] = useState<{ name: string; priceDelta: number } | null>(
    null
  );
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);

  const priceDelta = selectedTweak ? selectedTweak.priceDelta : 0;
  const currentTotal = ((recommendation.total ?? 14.50) + priceDelta).toFixed(2);

  const handleTap = async () => {
    if (isAuthorizing) return;
    await onAuthorize(selectedTweak ?? undefined);
  };

  const isLunchActive = freeMinutes >= 30 && distanceMeters === 200 && dietary === 'Omnivore';
  const isDoorstepActive = distanceMeters <= 50;
  const isVeganActive = dietary === 'Vegan';
  const isLateActive = freeMinutes < 30;

  // Floating scenario circular badges overlay specification
  const scenarioBadges = [
    {
      id: 'lunch',
      label: '12:15 PM Lunch',
      icon: <UtensilsCrossed className="w-4 h-4" />,
      active: isLunchActive,
      activeColor: 'bg-[#E05A38] text-white ring-2 ring-white/60 shadow-lg scale-105',
      inactiveColor: 'bg-white/15 hover:bg-white/25 text-white/90',
      action: onSimulateWalk,
    },
    {
      id: 'doorstep',
      label: 'Doorstep (<50m)',
      icon: <MapPin className="w-4 h-4" />,
      active: isDoorstepActive,
      activeColor: 'bg-emerald-600 text-white ring-2 ring-white/60 shadow-lg scale-105',
      inactiveColor: 'bg-white/15 hover:bg-white/25 text-white/90',
      action: onTriggerDoorstep,
    },
    {
      id: 'vegan',
      label: 'Vegan',
      icon: <Leaf className="w-4 h-4" />,
      active: isVeganActive,
      activeColor: 'bg-emerald-700 text-white ring-2 ring-white/60 shadow-lg scale-105',
      inactiveColor: 'bg-white/15 hover:bg-white/25 text-white/90',
      action: onToggleDietary,
    },
    {
      id: 'late',
      label: 'Late (<30m)',
      icon: <Clock className="w-4 h-4" />,
      active: isLateActive,
      activeColor: 'bg-amber-600 text-white ring-2 ring-white/60 shadow-lg scale-105',
      inactiveColor: 'bg-white/15 hover:bg-white/25 text-white/90',
      action: onTriggerOverrun,
    },
  ];

  return (
    <div className="w-full bg-white rounded-3xl overflow-hidden border border-[#EAE7DF] shadow-md transition-all">
      {/* Compact Food Photography with Overlay */}
      <div className="relative w-full h-52 sm:h-56 bg-[#F5F3EF] overflow-hidden" style={{ position: 'relative' }}>
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover object-center"
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#F5F3EF] text-[#A8A29E]">
            Artisan Culinary
          </div>
        )}

        {/* Minimal gradient vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30 pointer-events-none" />

        {/* Top Badges (Window & Prep) */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
          <span className="px-2.5 py-0.5 rounded-full bg-white/95 backdrop-blur-md text-[11px] font-bold text-[#1C1917] shadow-xs flex items-center gap-1">
            <Zap className="w-3 h-3 text-[#E05A38] fill-[#E05A38]" />
            <span>Ready in 5m</span>
          </span>

          <span className="px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-medium text-white shadow-xs">
            {freeMinutes}m Window
          </span>
        </div>

        {/* 👉 FLOATING VERTICAL CIRCULAR BADGES DOCK (ON THE RIGHT OF THE PICTURE) */}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 flex flex-col items-end">
          {/* Opaque frosted backdrop div */}
          <div className="bg-black/60 backdrop-blur-md border border-white/15 p-1.5 rounded-2xl flex flex-col gap-2 shadow-2xl">
            {scenarioBadges.map((badge) => {
              const isTooltipVisible = activeTooltipId === badge.id;

              return (
                <div
                  key={badge.id}
                  className="relative flex items-center justify-end group"
                  onMouseEnter={() => setActiveTooltipId(badge.id)}
                  onMouseLeave={() => setActiveTooltipId(null)}
                >
                  {/* Sliding label on hover or tap (slides out to the left) */}
                  <div
                    className={`absolute right-full mr-2.5 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-300 ease-out flex items-center ${
                      isTooltipVisible
                        ? 'opacity-100 translate-x-0'
                        : 'opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'
                    }`}
                  >
                    <div className="px-2.5 py-1 rounded-full bg-black/90 backdrop-blur-md border border-white/20 text-white text-[11px] font-semibold whitespace-nowrap shadow-2xl flex items-center gap-1.5">
                      <span>{badge.label}</span>
                    </div>
                    {/* Small arrow triangle pointing right towards the circle */}
                    <div className="w-1.5 h-1.5 bg-black/90 rotate-45 -ml-1 border-t border-r border-white/20" />
                  </div>

                  {/* Circular Button */}
                  <button
                    onClick={() => {
                      badge.action?.();
                      setActiveTooltipId(badge.id);
                      setTimeout(() => setActiveTooltipId(null), 1600);
                    }}
                    title={badge.label}
                    aria-label={badge.label}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                      badge.active ? badge.activeColor : badge.inactiveColor
                    }`}
                  >
                    {badge.icon}
                    {/* Semantic text inside button for accessibility and testing */}
                    <span className="sr-only">{badge.label}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cafe & Category tag over image bottom */}
        <div className="absolute bottom-2.5 left-3.5 right-16 text-white z-10 pointer-events-none">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-amber-300 drop-shadow-sm">
            {item.merchantName} &middot; {item.category}
          </span>
        </div>
      </div>

      {/* Clean Mobile Card Content */}
      <div className="p-4 sm:p-5">
        {/* Title & Price Header */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1C1917] tracking-tight leading-snug">
              {item.name}
            </h3>
            <p className="text-xs text-[#57534E] leading-relaxed mt-0.5">
              {item.description}
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="font-mono text-xl font-black text-[#1C1917] block leading-tight">
              ${currentTotal}
            </span>
            <span className="text-[10px] text-[#78716C] uppercase font-mono block">All-in</span>
          </div>
        </div>

        {/* Clean Side Selection Chips (US-07) */}
        {item.quickTweaks && item.quickTweaks.options.length > 0 && (
          <div className="my-3 pt-3 border-t border-[#F2EFE9]">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {item.quickTweaks.options.map((opt) => {
                const isSelected = selectedTweak
                  ? selectedTweak.name === opt.name
                  : opt.priceDelta === 0;
                return (
                  <button
                    key={opt.name}
                    onClick={() => setSelectedTweak(opt)}
                    className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-orange-50/80 border-[#E05A38] text-[#E05A38] font-semibold'
                        : 'bg-[#FAF9F5] hover:bg-[#F2EFE9] border-[#EAE7DF] text-[#57534E]'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-[#E05A38]" />}
                    <span className="truncate">{opt.name}</span>
                    {opt.priceDelta > 0 && (
                      <span className="font-mono text-[10px] opacity-80">
                        +${opt.priceDelta.toFixed(2)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Hero 1-Tap PayPal Escrow Button (US-02) */}
        <div className="mt-3">
          <button
            id="paypal-one-tap-button"
            onClick={handleTap}
            disabled={isAuthorizing}
            className="w-full relative rounded-2xl bg-[#0070BA] hover:bg-[#005EA6] active:scale-[0.99] text-white font-bold py-3.5 px-4 shadow-md shadow-[#0070BA]/20 transition-all duration-150 cursor-pointer disabled:opacity-80 flex items-center justify-center gap-2"
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

          {/* Micro Trust Reassurance */}
          <div className="mt-2 flex items-center justify-between text-[11px] text-[#78716C] px-1">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0070BA]" />
              <span>Held in escrow &middot; Auto-pays only at doorstep (&lt;50m)</span>
            </div>
            {onOpenGuide && (
              <button
                onClick={onOpenGuide}
                className="text-[#E05A38] hover:underline font-semibold cursor-pointer shrink-0"
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

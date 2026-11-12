'use client';

import React from 'react';
import { Sparkles, HelpCircle, Clock, MapPin, Leaf, ShieldAlert } from 'lucide-react';
import { Allergen, DietaryPreference } from '@/lib/types';

interface AgentCognitiveBarProps {
  freeMinutes: number;
  setFreeMinutes: (val: number) => void;
  distanceMeters: number;
  setDistanceMeters: (val: number) => void;
  dietary: DietaryPreference;
  setDietary: (val: DietaryPreference) => void;
  excludedAllergens?: Allergen[];
  isEvaluating: boolean;
  agentThought: string;
  onSimulateWalk: () => void;
  onTriggerDoorstep: () => void;
  onTriggerOverrun: () => void;
  onOpenGuide?: () => void;
}

export function AgentCognitiveBar({
  freeMinutes,
  distanceMeters,
  dietary,
  excludedAllergens = [],
  isEvaluating,
  agentThought,
  onOpenGuide,
}: AgentCognitiveBarProps) {
  return (
    <div className="w-full bg-white/90 backdrop-blur-md rounded-2xl p-3 border border-culinary-border shadow-xs mb-2.5">
      {/* 1-Line Agent Cognitive Greeting */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
          <Sparkles
            className="w-3.5 h-3.5 text-culinary-terracotta"
            aria-hidden="true"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 leading-none">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-serif font-bold text-xs text-culinary-text truncate">
                BitePass Culinary Agent
              </span>
              <span className="text-xs font-mono px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold leading-none shrink-0">
                Argon
              </span>
            </div>

            {isEvaluating ? (
              <span className="text-xs text-culinary-amber animate-pulse font-mono shrink-0">
                Updating...
              </span>
            ) : onOpenGuide ? (
              <button
                type="button"
                onClick={onOpenGuide}
                className="text-xs text-culinary-terracotta hover:underline font-semibold flex items-center gap-0.5 cursor-pointer shrink-0"
                title="View Mobile Guide"
              >
                <HelpCircle className="w-3 h-3" aria-hidden="true" />
                <span>Guide</span>
              </button>
            ) : null}
          </div>

          <p
            aria-live="polite"
            className="text-xs text-culinary-muted font-medium truncate mt-1"
          >
            {agentThought}
          </p>
        </div>
      </div>

      {/* Glanceable Context Indicator Bar */}
      <div className="flex items-center justify-between text-xs text-culinary-muted pt-2 mt-2 border-t border-culinary-subtle px-0.5">
        <div className="flex items-center gap-2 font-medium min-w-0 flex-wrap sm:flex-nowrap">
          <span className="flex items-center gap-1 text-culinary-text shrink-0">
            <Clock className="w-3 h-3 text-culinary-amber" aria-hidden="true" />
            <span>{freeMinutes}m gap</span>
          </span>
          <span className="text-stone-300 shrink-0" aria-hidden="true">
            &middot;
          </span>
          <span className="flex items-center gap-1 text-culinary-text shrink-0">
            <MapPin className="w-3 h-3 text-culinary-sage" aria-hidden="true" />
            <span>{distanceMeters}m walk</span>
          </span>
          <span className="text-stone-300 shrink-0" aria-hidden="true">
            &middot;
          </span>
          <span className="flex items-center gap-1 text-culinary-text shrink-0 truncate">
            <Leaf className="w-3 h-3 text-culinary-sage" aria-hidden="true" />
            <span>{dietary}</span>
          </span>
          {excludedAllergens.length > 0 && (
            <span className="flex items-center gap-0.5 text-culinary-terracotta font-semibold shrink-0">
              <ShieldAlert className="w-3 h-3" aria-hidden="true" />
              <span>-{excludedAllergens.length}</span>
            </span>
          )}
        </div>

        <div className="text-xs text-culinary-muted hidden md:block font-mono shrink-0">
          Tap photo badges
        </div>
      </div>
    </div>
  );
}

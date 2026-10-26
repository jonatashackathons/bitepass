'use client';

import React from 'react';
import { Sparkles, HelpCircle, Compass, Clock, MapPin, Leaf } from 'lucide-react';
import { DietaryPreference } from '@/lib/types';

interface AgentCognitiveBarProps {
  freeMinutes: number;
  setFreeMinutes: (val: number) => void;
  distanceMeters: number;
  setDistanceMeters: (val: number) => void;
  dietary: DietaryPreference;
  setDietary: (val: DietaryPreference) => void;
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
  isEvaluating,
  agentThought,
  onOpenGuide,
}: AgentCognitiveBarProps) {
  return (
    <div className="w-full bg-white/85 backdrop-blur-md rounded-2xl p-3 border border-[#EAE7DF] shadow-xs mb-2.5">
      {/* 1-Line Agent Cognitive Greeting */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-xl bg-orange-50 border border-orange-200/80 flex items-center justify-center shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-[#E05A38]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 leading-none">
            <div className="flex items-center gap-1.5">
              <span className="font-serif font-bold text-xs text-[#1C1917]">
                BitePass Culinary Agent
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                Argon
              </span>
            </div>

            {isEvaluating ? (
              <span className="text-[10px] text-amber-600 animate-pulse font-mono">
                Updating...
              </span>
            ) : onOpenGuide ? (
              <button
                onClick={onOpenGuide}
                className="text-[10px] text-[#E05A38] hover:text-[#C84A2A] font-medium flex items-center gap-0.5 cursor-pointer"
                title="View Mobile Guide"
              >
                <HelpCircle className="w-2.5 h-2.5" />
                <span>Guide</span>
              </button>
            ) : null}
          </div>

          <p className="text-xs text-[#57534E] font-medium truncate mt-1">
            {agentThought}
          </p>
        </div>
      </div>

      {/* Glanceable Micro Context Indicator Bar */}
      <div className="flex items-center justify-between text-[11px] text-[#78716C] pt-2 mt-2 border-t border-[#F2EFE9] px-0.5">
        <div className="flex items-center gap-2.5 font-medium">
          <span className="flex items-center gap-1 text-[#1C1917]">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>{freeMinutes}m gap</span>
          </span>
          <span className="text-[#D6D3D1]">&middot;</span>
          <span className="flex items-center gap-1 text-[#1C1917]">
            <MapPin className="w-3 h-3 text-emerald-600" />
            <span>{distanceMeters}m walk</span>
          </span>
          <span className="text-[#D6D3D1]">&middot;</span>
          <span className="flex items-center gap-1 text-[#1C1917]">
            <Leaf className="w-3 h-3 text-emerald-700" />
            <span>{dietary}</span>
          </span>
        </div>

        <div className="text-[10px] text-[#A8A29E] hidden sm:block font-mono">
          Hover photo icons to test
        </div>
      </div>
    </div>
  );
}

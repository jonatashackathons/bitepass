'use client';

import React from 'react';
import { UtensilsCrossed, RefreshCw, ChefHat, Sparkles, BookOpen } from 'lucide-react';

interface NavbarProps {
  onReset: () => void;
  isResetting: boolean;
  activeTab: 'meal' | 'queue';
  setActiveTab: (tab: 'meal' | 'queue') => void;
  activeOrdersCount: number;
  onOpenGuide?: () => void;
}

export function Navbar({
  onReset,
  isResetting,
  activeTab,
  setActiveTab,
  activeOrdersCount,
  onOpenGuide,
}: NavbarProps) {
  return (
    <nav className="w-full bg-[#FFFFFF]/95 backdrop-blur-md border-b border-[#EAE7DF] sticky top-0 z-50">
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
        {/* BitePass Brand */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#E05A38] to-[#D97706] p-0.5 shadow-xs">
            <div className="w-full h-full bg-white rounded-[9px] flex items-center justify-center">
              <UtensilsCrossed className="w-3.5 h-3.5 text-[#E05A38]" />
            </div>
          </div>
          <span className="font-serif text-base font-bold text-[#1C1917] tracking-tight">
            BitePass
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-orange-50 text-[#E05A38] border border-orange-200">
            Agent
          </span>
        </div>

        {/* View Switcher: My Lunch vs Kitchen Queue */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center p-0.5 rounded-xl bg-[#FAF9F5] border border-[#EAE7DF] text-xs">
            <button
              onClick={() => setActiveTab('meal')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold ${
                activeTab === 'meal'
                  ? 'bg-white text-[#1C1917] shadow-xs'
                  : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              <Sparkles className="w-3 h-3 text-[#E05A38]" />
              <span>Lunch</span>
            </button>

            <button
              onClick={() => setActiveTab('queue')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold ${
                activeTab === 'queue'
                  ? 'bg-white text-[#1C1917] shadow-xs'
                  : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              <ChefHat className="w-3 h-3 text-[#D97706]" />
              <span>Kitchen Queue</span>
              {activeOrdersCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                  {activeOrdersCount}
                </span>
              )}
            </button>
          </div>

          {/* Guide walkthrough button */}
          {onOpenGuide && (
            <button
              onClick={onOpenGuide}
              className="p-1.5 rounded-xl bg-[#FAF9F5] hover:bg-[#F2EFE9] border border-[#EAE7DF] text-[#78716C] hover:text-[#E05A38] transition-all cursor-pointer flex items-center gap-1"
              title="Mobile Onboarding Guide"
              aria-label="Open Mobile Onboarding Guide"
            >
              <BookOpen className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Reset button */}
          <button
            onClick={onReset}
            disabled={isResetting}
            className="p-1.5 rounded-xl bg-[#FAF9F5] hover:bg-[#F2EFE9] border border-[#EAE7DF] text-[#78716C] transition-all cursor-pointer disabled:opacity-50"
            title="Reset scenario"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </nav>
  );
}

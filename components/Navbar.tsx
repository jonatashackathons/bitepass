'use client';

import React from 'react';
import { RefreshCw, ChefHat, Sparkles, BookOpen } from 'lucide-react';
import { BitePassLogo } from './BitePassLogo';

interface NavbarProps {
  onReset: () => void;
  isResetting: boolean;
  activeTab: 'meal' | 'queue';
  setActiveTab: (tab: 'meal' | 'queue') => void;
  activeOrdersCount: number;
  onOpenGuide?: () => void;
  maxWidthClass?: string;
}

export function Navbar({
  onReset,
  isResetting,
  activeTab,
  setActiveTab,
  activeOrdersCount,
  onOpenGuide,
  maxWidthClass = 'max-w-md',
}: NavbarProps) {
  return (
    <nav className="w-full bg-white/95 backdrop-blur-md border-b border-culinary-border sticky top-0 z-40">
      <div
        className={`${maxWidthClass} mx-auto px-2.5 sm:px-4 h-14 flex items-center justify-between gap-1`}
      >
        {/* BitePass Brand */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <BitePassLogo size={28} />
          <span className="font-sans text-sm sm:text-base font-extrabold text-culinary-text tracking-tight">
            Bite<span className="text-culinary-terracotta">Pass</span>
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-50 text-culinary-terracotta border border-orange-200 hidden sm:inline-block">
            Fast Pass
          </span>
        </div>

        {/* View Switcher: Lunch vs Kitchen Queue */}
        <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
          <div className="flex items-center p-0.5 rounded-xl bg-culinary-bg border border-culinary-border text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('meal')}
              className={`px-2 sm:px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold ${
                activeTab === 'meal'
                  ? 'bg-white text-culinary-text shadow-xs'
                  : 'text-culinary-muted hover:text-culinary-text'
              }`}
            >
              <Sparkles
                className="w-3 h-3 text-culinary-terracotta hidden sm:inline-block"
                aria-hidden="true"
              />
              <span>Lunch</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('queue')}
              className={`px-2 sm:px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold ${
                activeTab === 'queue'
                  ? 'bg-white text-culinary-text shadow-xs'
                  : 'text-culinary-muted hover:text-culinary-text'
              }`}
            >
              <ChefHat
                className="w-3 h-3 text-culinary-amber hidden sm:inline-block"
                aria-hidden="true"
              />
              <span className="hidden sm:inline">Kitchen </span>
              <span>Queue</span>
              {activeOrdersCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold leading-none">
                  {activeOrdersCount}
                </span>
              )}
            </button>
          </div>

          {/* Guide walkthrough button */}
          {onOpenGuide && (
            <button
              type="button"
              onClick={onOpenGuide}
              className="min-w-[44px] min-h-[44px] p-2 rounded-xl bg-culinary-bg hover:bg-culinary-subtle border border-culinary-border text-culinary-muted hover:text-culinary-terracotta transition-all cursor-pointer flex items-center justify-center shrink-0"
              title="Mobile Onboarding Guide"
              aria-label="Open Mobile Onboarding Guide"
            >
              <BookOpen className="w-4 h-4" aria-hidden="true" />
            </button>
          )}

          {/* Reset button */}
          <button
            type="button"
            onClick={onReset}
            disabled={isResetting}
            className="min-w-[44px] min-h-[44px] p-2 rounded-xl bg-culinary-bg hover:bg-culinary-subtle border border-culinary-border text-culinary-muted transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center shrink-0"
            title="Reset scenario"
            aria-label="Reset scenario"
          >
            <RefreshCw
              className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </nav>
  );
}

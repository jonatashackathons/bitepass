'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  UtensilsCrossed,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  X,
  ArrowRight,
  ArrowLeft,
  Zap,
  Leaf,
  Clock,
  QrCode
} from 'lucide-react';

interface MobileOnboardingGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulateLunch?: () => void;
  onSimulateVegan?: () => void;
}

export function MobileOnboardingGuide({
  isOpen,
  onClose,
  onSimulateLunch,
  onSimulateVegan,
}: MobileOnboardingGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      badge: 'Step 1 of 4 · Autonomous AI',
      badgeColor: 'bg-orange-50 text-[#E05A38] border-orange-200',
      title: 'Proactive, Not Reactive',
      subtitle: 'BitePass evaluates dining states in ambient silence.',
      description:
        'Instead of endless browsing, BitePass monitors your calendar gaps (≥30m before meetings) and physical distance (<500m) to proactively propose the ideal artisan dish when hunger strikes.',
      icon: <Sparkles className="w-6 h-6 text-[#E05A38]" />,
      iconBg: 'bg-orange-50 border-orange-200',
      highlight: 'Zero notification spam · Triggered only during verified lunch windows',
    },
    {
      badge: 'Step 2 of 4 · New Feature',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      title: 'Floating Photo Scenario Badges',
      subtitle: 'Interactive circular controls docked directly on the dish image.',
      description:
        'Hover on desktop or tap on mobile the circular icons on the right of the photo. Each icon slides out its description and lets you switch between 12:15 PM Lunch, Doorstep proximity (<50m), Vegan options, or tight schedules.',
      icon: <UtensilsCrossed className="w-6 h-6 text-[#D97706]" />,
      iconBg: 'bg-amber-50 border-amber-200',
      highlight: 'Saves vertical screen space & keeps the 1-Tap button above the fold',
    },
    {
      badge: 'Step 3 of 4 · Trust & Safety',
      badgeColor: 'bg-blue-50 text-[#0070BA] border-blue-200',
      title: '2-Phase PayPal Escrow',
      subtitle: 'One single tap locks your order without taking your money.',
      description:
        'When you tap "Hold with PayPal", funds ($14.50) are authorized and held safely in escrow. $0 leaves your account while Jack’s Cafe freshly prepares your artisan sandwich.',
      icon: <ShieldCheck className="w-6 h-6 text-[#0070BA]" />,
      iconBg: 'bg-blue-50 border-blue-200',
      highlight: 'Free cancellation anytime before physical arrival · Full buyer protection',
    },
    {
      badge: 'Step 4 of 4 · Contactless Pick-Up',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      title: 'Doorstep Geofence Auto-Pay',
      subtitle: 'Walk in, pick up, walk out. No waiting in lines.',
      description:
        'As you arrive within 50m of the cafe, BitePass automatically releases escrow and unlocks your digital FASTPASS with your assigned pickup bay. Your food is hot, packaged, and waiting.',
      icon: <MapPin className="w-6 h-6 text-emerald-600" />,
      iconBg: 'bg-emerald-50 border-emerald-200',
      highlight: 'Zero POS terminal interaction · Zero paper receipts · Pure speed',
    },
  ];

  const step = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm bg-white rounded-3xl p-5 border border-[#EAE7DF] shadow-2xl flex flex-col relative text-[#1C1917] max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Dismiss Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-[#FAF9F5] hover:bg-[#F2EFE9] border border-[#EAE7DF] flex items-center justify-center text-[#78716C] hover:text-[#1C1917] transition-colors cursor-pointer"
          aria-label="Close guide"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Step Badge & Icon Header */}
        <div className="flex items-center gap-3 mb-3.5 pt-1">
          <div
            className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${step.iconBg}`}
          >
            {step.icon}
          </div>
          <div>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border font-mono ${step.badgeColor}`}
            >
              {step.badge}
            </span>
            <h3 className="font-serif text-lg font-bold text-[#1C1917] leading-tight mt-1">
              {step.title}
            </h3>
          </div>
        </div>

        {/* Subtitle & Body */}
        <p className="text-xs font-semibold text-[#E05A38] mb-1.5 leading-snug">
          {step.subtitle}
        </p>
        <p className="text-xs text-[#57534E] leading-relaxed mb-3">
          {step.description}
        </p>

        {/* Highlight Callout */}
        <div className="bg-[#FAF9F5] border border-[#EAE7DF] rounded-xl p-2.5 mb-4 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span className="text-[11px] font-medium text-[#1C1917] leading-tight">
            {step.highlight}
          </span>
        </div>

        {/* Step Indicator Dots */}
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {steps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                idx === currentStep ? 'w-6 bg-[#E05A38]' : 'w-1.5 bg-[#EAE7DF] hover:bg-[#D6D3D1]'
              }`}
              aria-label={`Go to step ${idx + 1}`}
            />
          ))}
        </div>

        {/* Quick Action Simulator Shortcuts (If on Step 2) */}
        {currentStep === 1 && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => {
                onSimulateLunch?.();
                onClose();
              }}
              className="py-1.5 px-2 rounded-xl bg-orange-50 hover:bg-orange-100/80 border border-orange-200 text-xs font-semibold text-[#E05A38] flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <UtensilsCrossed className="w-3 h-3" />
              <span>Try Lunch</span>
            </button>
            <button
              onClick={() => {
                onSimulateVegan?.();
                onClose();
              }}
              className="py-1.5 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-xs font-semibold text-emerald-700 flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <Leaf className="w-3 h-3" />
              <span>Try Vegan</span>
            </button>
          </div>
        )}

        {/* Bottom Navigation Buttons */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#F2EFE9]">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
              currentStep === 0
                ? 'opacity-30 cursor-not-allowed text-[#A8A29E]'
                : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#FAF9F5] cursor-pointer'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <button
            onClick={handleNext}
            className="px-4 py-2 rounded-xl bg-[#E05A38] hover:bg-[#C84A2A] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <span>{currentStep === steps.length - 1 ? 'Start Experience' : 'Next'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

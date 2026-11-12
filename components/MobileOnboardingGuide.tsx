'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  UtensilsCrossed,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  X,
  ArrowRight,
  ArrowLeft,
  Leaf,
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
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const handleDismiss = () => {
    setCurrentStep(0);
    onClose();
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (typeof dialog.showModal === 'function' && !dialog.open) {
        dialog.showModal();
      } else {
        dialog.setAttribute('open', 'true');
      }
    } else {
      if (dialog.open && typeof dialog.close === 'function') {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
      setCurrentStep(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const steps = [
    {
      badge: 'Step 1 of 4 · Autonomous AI',
      badgeColor: 'bg-orange-50 text-culinary-terracotta border-orange-200',
      title: 'Proactive, Not Reactive',
      subtitle: 'BitePass evaluates dining states in ambient silence.',
      description:
        'Instead of endless browsing, BitePass monitors your calendar gaps (≥30m before meetings) and physical distance (≤500m) to proactively propose the ideal artisan dish when hunger strikes.',
      icon: <Sparkles className="w-6 h-6 text-culinary-terracotta" />,
      iconBg: 'bg-orange-50 border-orange-200',
      highlight: 'Zero notification spam · Strict FDA Top-9 allergen safety filter',
    },
    {
      badge: 'Step 2 of 4 · Quick Context',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      title: 'Floating Photo Scenario Badges',
      subtitle: 'Interactive circular controls docked directly on the dish image.',
      description:
        'Hover on desktop or tap on mobile the circular icons on the right of the photo. Switch between 12:15 PM Lunch, Doorstep proximity (<50m), Vegan options, or tight schedules.',
      icon: <UtensilsCrossed className="w-6 h-6 text-culinary-amber" />,
      iconBg: 'bg-amber-50 border-amber-200',
      highlight: 'Saves vertical screen space & keeps the 1-Tap button above the fold',
    },
    {
      badge: 'Step 3 of 4 · Trust & Safety',
      badgeColor: 'bg-blue-50 text-paypal-blue border-blue-200',
      title: '2-Phase PayPal Escrow',
      subtitle: 'One single tap reserves your pickup bay without immediate capture.',
      description:
        'When you tap "Hold with PayPal", funds ($14.50) are authorized in escrow. You enjoy a 90-second free $0.00 grace window before kitchen assembly fires at ≤250m.',
      icon: <ShieldCheck className="w-6 h-6 text-paypal-blue" />,
      iconBg: 'bg-blue-50 border-blue-200',
      highlight: '$0.00 pre-fire cancellation · $5.00 perishable shield after kitchen fire',
    },
    {
      badge: 'Step 4 of 4 · Contactless Pick-Up',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      title: 'Doorstep Geofence Auto-Pay',
      subtitle: 'Walk in, pick up, walk out. No waiting in lines.',
      description:
        'As you arrive within 50m of the cafe, BitePass settles escrow and unlocks your scannable QR FASTPASS with your assigned pickup bay or heated cubby.',
      icon: <MapPin className="w-6 h-6 text-culinary-sage" />,
      iconBg: 'bg-emerald-50 border-emerald-200',
      highlight: 'Offline signed QR backup · 2-tap instant refund if cubby has an issue',
    },
  ];

  const step = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleDismiss();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="onboarding-dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        handleDismiss();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) {
          handleDismiss();
        }
      }}
      className="fixed inset-0 z-50 m-auto w-[calc(100%-1.75rem)] max-w-sm rounded-3xl p-0 bg-transparent border-0 shadow-none backdrop:bg-black/60"
    >
      <div className="w-full bg-white rounded-3xl p-5 border border-culinary-border shadow-2xl flex flex-col relative text-culinary-text max-h-[90vh] overflow-y-auto">
        {/* Top Dismiss Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-3 right-3 min-w-[44px] min-h-[44px] rounded-full bg-culinary-bg hover:bg-culinary-subtle border border-culinary-border flex items-center justify-center text-culinary-muted hover:text-culinary-text transition-colors cursor-pointer"
          aria-label="Close guide"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Step Badge & Icon Header */}
        <div className="flex items-center gap-3 mb-3.5 pt-1 pr-8">
          <div
            className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${step.iconBg}`}
          >
            {step.icon}
          </div>
          <div className="min-w-0">
            <span
              className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border font-mono inline-block ${step.badgeColor}`}
            >
              {step.badge}
            </span>
            <h3
              id="onboarding-dialog-title"
              className="font-serif text-lg font-bold text-culinary-text leading-tight mt-1"
            >
              {step.title}
            </h3>
          </div>
        </div>

        {/* Subtitle & Body */}
        <p className="text-xs font-semibold text-culinary-terracotta mb-1.5 leading-snug">
          {step.subtitle}
        </p>
        <p className="text-xs text-culinary-muted leading-relaxed mb-3">
          {step.description}
        </p>

        {/* Highlight Callout */}
        <div className="bg-culinary-bg border border-culinary-border rounded-xl p-2.5 mb-4 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-culinary-sage shrink-0 mt-0.5" />
          <span className="text-xs font-medium text-culinary-text leading-tight">
            {step.highlight}
          </span>
        </div>

        {/* Step Indicator Dots (>=44x44px hitboxes around visual dots) */}
        <div className="flex items-center justify-center gap-0.5 mb-3">
          {steps.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentStep(idx)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
              aria-label={`Go to step ${idx + 1}`}
              aria-current={idx === currentStep ? 'step' : undefined}
            >
              <span
                className={`h-2 rounded-full transition-all block ${
                  idx === currentStep
                    ? 'w-6 bg-culinary-terracotta'
                    : 'w-2.5 bg-culinary-graphic hover:bg-culinary-muted'
                }`}
              />
            </button>
          ))}
        </div>

        {/* Quick Action Simulator Shortcuts (Step 2) */}
        {currentStep === 1 && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              type="button"
              onClick={() => {
                onSimulateLunch?.();
                handleDismiss();
              }}
              className="py-2 px-2 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-xs font-semibold text-culinary-terracotta flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>Try Lunch</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onSimulateVegan?.();
                handleDismiss();
              }}
              className="py-2 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <Leaf className="w-3.5 h-3.5" />
              <span>Try Vegan</span>
            </button>
          </div>
        )}

        {/* Bottom Navigation Buttons */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-culinary-subtle">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
              currentStep === 0
                ? 'opacity-40 cursor-not-allowed text-culinary-muted'
                : 'text-culinary-muted hover:text-culinary-text hover:bg-culinary-bg cursor-pointer'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="px-4 py-2 rounded-xl bg-culinary-terracotta hover:bg-orange-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <span>{currentStep === steps.length - 1 ? 'Start Experience' : 'Next'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </dialog>
  );
}

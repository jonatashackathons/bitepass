'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { AgentCognitiveBar } from '@/components/AgentCognitiveBar';
import {
  AuthorizeOrderSelection,
  CulinaryRecommendationCard,
} from '@/components/CulinaryRecommendationCard';
import { ActiveEscrowTicket } from '@/components/ActiveEscrowTicket';
import { DoorstepPass } from '@/components/DoorstepPass';
import { MobileOnboardingGuide } from '@/components/MobileOnboardingGuide';
import {
  AgentRecommendation,
  Allergen,
  ContextMode,
  DietaryPreference,
  MenuItem,
  OrderTicket,
} from '@/lib/types';
import { SituationalScenario, getScenarioById } from '@/lib/scenarios';
import { calculateOrderPricing, getEligibleMenuItems } from '@/lib/catalog';
import { Sparkles, Clock, ChefHat, ArrowRight, ShieldCheck } from 'lucide-react';

const ORDER_SYNC_CHANNEL = 'bitepass_order_sync';

function buildInitialRecommendation(
  scenario: SituationalScenario
): AgentRecommendation {
  const pricing = calculateOrderPricing(scenario.item.price);
  const alternatives = getEligibleMenuItems(scenario.dietary).filter(
    (m) => m.id !== scenario.item.id
  );
  return {
    shouldTrigger: true,
    item: scenario.item,
    alternatives,
    reason: scenario.reason,
    timeSavedMinutes: scenario.timeSavedMinutes,
    walkingBufferMinutes: Math.max(1, Math.round(scenario.distanceMeters / 75)),
    totalCents: pricing.totalCents,
    total: pricing.total,
    breakdown: pricing,
  };
}

function BitePassConsumerApp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlScenarioParam = searchParams.get('scenario') || 'lunch';
  const pickupRunId = searchParams.get('run_id');

  const [currentScenario, setCurrentScenario] = useState<SituationalScenario>(() =>
    getScenarioById(urlScenarioParam)
  );

  // Context state
  const [freeMinutes, setFreeMinutes] = useState(currentScenario.freeMinutes);
  const [distanceMeters, setDistanceMeters] = useState(
    currentScenario.distanceMeters
  );
  const [dietary, setDietary] = useState<DietaryPreference>(
    currentScenario.dietary
  );
  const [contextMode, setContextMode] = useState<ContextMode>(
    currentScenario.contextMode ?? 'calendar_gap'
  );
  const [excludedAllergens, setExcludedAllergens] = useState<Allergen[]>([]);

  // Agent & Order state
  const [recommendation, setRecommendation] =
    useState<AgentRecommendation | null>(() =>
      buildInitialRecommendation(currentScenario)
    );
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [activeOrder, setActiveOrder] = useState<OrderTicket | null>(null);
  const [activeOrdersCount, setActiveOrdersCount] = useState(2);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [pendingRestockingFeeCents, setPendingRestockingFeeCents] = useState<
    number | null
  >(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  const isCapturingRef = useRef(false);
  const firedGeofenceOrderRef = useRef<string | null>(null);
  const broadcastRef = useRef<BroadcastChannel | null>(null);

  const broadcastOrderSync = useCallback((order: OrderTicket | null) => {
    try {
      broadcastRef.current?.postMessage({ type: 'ORDER_SYNC', order });
    } catch {
      // Ignore closed/unsupported BroadcastChannel environments
    }
  }, []);

  // Sync with URL scenario query param
  useEffect(() => {
    const matched = getScenarioById(urlScenarioParam);
    if (matched.id !== currentScenario.id) {
      setCurrentScenario(matched);
      setFreeMinutes(matched.freeMinutes);
      setDistanceMeters(matched.distanceMeters);
      setDietary(matched.dietary);
      setContextMode(matched.contextMode ?? 'calendar_gap');
      setActiveOrder(null);
      setAuthError(null);
      setCaptureError(null);
      setPendingRestockingFeeCents(null);
      setRecommendation(buildInitialRecommendation(matched));
    }
  }, [urlScenarioParam, currentScenario.id]);

  // Rehydrate active diner order on mount / return from /merchant (Zero AG Grid or cross-user PII!)
  const syncMyActiveOrder = useCallback(async () => {
    try {
      const res = await fetch('/api/orders?mine=true', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.activeOrder) {
        setActiveOrder(data.activeOrder);
      }
      if (data.bayCapacity) {
        setActiveOrdersCount(
          (data.bayCapacity.occupiedBays ?? 0) +
            (data.bayCapacity.occupiedCubbies ?? 0)
        );
      }
    } catch {
      // Ignore offline transient poll failure
    }
  }, []);

  useEffect(() => {
    syncMyActiveOrder();
  }, [syncMyActiveOrder]);

  // PROD-10: Multi-tab BroadcastChannel synchronization
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(ORDER_SYNC_CHANNEL);
    broadcastRef.current = channel;
    channel.onmessage = (ev: MessageEvent<{ type?: string; order?: OrderTicket | null }>) => {
      if (ev.data?.type === 'ORDER_SYNC') {
        setActiveOrder(ev.data.order ?? null);
      }
    };
    return () => {
      channel.close();
      broadcastRef.current = null;
    };
  }, []);

  // Evaluate Agent Recommendation via API
  const evaluateAgent = useCallback(
    async (
      mins: number,
      dist: number,
      diet: DietaryPreference,
      allergens: Allergen[] = excludedAllergens,
      mode: ContextMode = contextMode
    ) => {
      setIsEvaluating(true);
      setAuthError(null);
      try {
        const res = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            freeMinutes: mins,
            distanceMeters: dist,
            dietary: diet,
            excludedAllergens: allergens,
            contextMode: mode,
          }),
        });

        if (res.ok) {
          const data: AgentRecommendation = await res.json();
          setRecommendation(data);
        }
      } catch (err) {
        console.error('Agent recommendation failed:', err);
      } finally {
        setIsEvaluating(false);
      }
    },
    [excludedAllergens, contextMode]
  );

  const handleToggleAllergen = async (allergen: Allergen) => {
    const next = excludedAllergens.includes(allergen)
      ? excludedAllergens.filter((a) => a !== allergen)
      : [...excludedAllergens, allergen];
    setExcludedAllergens(next);
    await evaluateAgent(freeMinutes, distanceMeters, dietary, next, contextMode);
  };

  const handleSelectAlternative = (altItem: MenuItem) => {
    if (!recommendation || !recommendation.shouldTrigger) return;
    const pricing = calculateOrderPricing(altItem.price);
    const remainingAlts = [
      recommendation.item,
      ...recommendation.alternatives.filter((i) => i.id !== altItem.id),
    ];
    setRecommendation({
      ...recommendation,
      item: altItem,
      alternatives: remainingAlts,
      totalCents: pricing.totalCents,
      total: pricing.total,
      breakdown: pricing,
    });
  };

  // Phase 1: Authorize (1-Tap Escrow Hold)
  const handleAuthorize = async (selection?: AuthorizeOrderSelection) => {
    if (!recommendation?.shouldTrigger || isAuthorizing) return;

    setIsAuthorizing(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/paypal/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: recommendation.item.id,
          tweakOptionId: selection?.tweakOptionId,
          selectedTweak: selection?.name,
          tipSelection:
            selection?.tipAmountCents !== undefined
              ? { mode: 'fixed_cents', amountCents: selection.tipAmountCents }
              : undefined,
          excludedAllergens,
          customerName: currentScenario.persona,
          distanceMeters,
          workEmail: selection?.workEmail,
          pickupRunId: pickupRunId ?? undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setActiveOrder(data.order);
        broadcastOrderSync(data.order);
        setCaptureError(null);
        setPendingRestockingFeeCents(null);
        if (data.bayCapacity) {
          setActiveOrdersCount(
            (data.bayCapacity.occupiedBays ?? 0) +
              (data.bayCapacity.occupiedCubbies ?? 0)
          );
        }
      } else {
        setAuthError(data.detail ?? data.error ?? 'Authorization declined.');
      }
    } catch {
      setAuthError('Network error while establishing PayPal escrow hold.');
    } finally {
      setIsAuthorizing(false);
    }
  };

  // Phase 2: Capture (Doorstep Proximity <= 50m)
  const executeCapture = useCallback(
    async (order: OrderTicket, manualCheckInConfirmed = false) => {
      if (isCapturingRef.current) return;
      isCapturingRef.current = true;
      setCaptureError(null);

      try {
        const res = await fetch('/api/paypal/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: order.orderId,
            distanceMeters: Math.min(distanceMeters, 50),
            manualCheckInConfirmed,
          }),
        });

        const data = await res.json();
        if (res.ok && data.order) {
          setActiveOrder(data.order);
          broadcastOrderSync(data.order);
        } else {
          setCaptureError(
            data.detail ?? 'PayPal doorstep settlement failed. Tap Retry.'
          );
        }
      } catch {
        setCaptureError('Connection interrupted at cafe doorstep. Tap Retry.');
      } finally {
        isCapturingRef.current = false;
      }
    },
    [distanceMeters, broadcastOrderSync]
  );

  // Outer <=250m Kitchen Fire Geofence + Inner <=50m Doorstep Settlement Geofence
  useEffect(() => {
    if (!activeOrder || activeOrder.status !== 'AUTHORIZED') return;

    if (distanceMeters <= 50 && !captureError) {
      executeCapture(activeOrder, false);
      return;
    }

    if (
      distanceMeters <= 250 &&
      activeOrder.fulfillmentStage === 'GRACE_HOLD' &&
      firedGeofenceOrderRef.current !== activeOrder.orderId
    ) {
      firedGeofenceOrderRef.current = activeOrder.orderId;
      fetch(`/api/orders/${activeOrder.orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TRIGGER_KITCHEN_FIRE_GEOFENCE',
          distanceMeters,
        }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.order) {
            setActiveOrder(d.order);
            broadcastOrderSync(d.order);
          }
        })
        .catch(() => {});
    }
  }, [distanceMeters, activeOrder, captureError, executeCapture, broadcastOrderSync]);

  // Cancel order (90s $0 Grace Hold vs $5.00 Post-Fire Partial Capture)
  const handleCancelOrder = async (confirmRestockingFee = false) => {
    if (!activeOrder) return;

    setIsCanceling(true);
    try {
      const res = await fetch('/api/paypal/void', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: activeOrder.orderId,
          distanceMeters,
          confirmRestockingFee,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setActiveOrder(null);
        broadcastOrderSync(null);
        setCaptureError(null);
        setPendingRestockingFeeCents(null);
        await evaluateAgent(freeMinutes, distanceMeters, dietary);
      } else if (res.status === 409 && data.code === 'GRACE_PERIOD_EXPIRED') {
        const feeCents =
          typeof data.details?.restockingFeeCents === 'number'
            ? data.details.restockingFeeCents
            : 500;
        setPendingRestockingFeeCents(feeCents);
      }
    } catch (err) {
      console.error('Failed to cancel order:', err);
    } finally {
      setIsCanceling(false);
    }
  };

  // Reset full simulation
  const handleResetSimulation = async () => {
    setIsResetting(true);
    try {
      await fetch('/api/orders/reset', { method: 'POST' });
      setActiveOrder(null);
      broadcastOrderSync(null);
      setAuthError(null);
      setCaptureError(null);
      setPendingRestockingFeeCents(null);
      setExcludedAllergens([]);
      setFreeMinutes(currentScenario.freeMinutes);
      setDistanceMeters(currentScenario.distanceMeters);
      setDietary(currentScenario.dietary);
      setContextMode(currentScenario.contextMode ?? 'calendar_gap');
      await evaluateAgent(
        currentScenario.freeMinutes,
        currentScenario.distanceMeters,
        currentScenario.dietary,
        [],
        currentScenario.contextMode ?? 'calendar_gap'
      );
    } catch (err) {
      console.error('Failed to reset simulation:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const isSettled = activeOrder?.status === 'CAPTURED';

  const agentThought =
    recommendation?.shouldTrigger && recommendation.item
      ? `${freeMinutes}m gap · ${distanceMeters}m walk to ${recommendation.item.merchantName}`
      : recommendation && !recommendation.shouldTrigger
        ? recommendation.reason
        : `Evaluating menu catalogs and kitchen prep times...`;

  return (
    <div className="min-h-screen bg-culinary-bg flex flex-col text-culinary-text">
      <Navbar
        onReset={handleResetSimulation}
        isResetting={isResetting}
        activeTab="meal"
        setActiveTab={(tab) => {
          if (tab === 'queue') {
            router.push('/merchant');
          }
        }}
        activeOrdersCount={activeOrdersCount}
        onOpenGuide={() => setIsOnboardingOpen(true)}
      />

      <main className="flex-1 w-full mx-auto px-3.5 sm:px-4 py-4 sm:py-6 flex flex-col items-center">
        <div className="w-full max-w-md flex flex-col transition-all duration-300 ease-out">
          <AgentCognitiveBar
            freeMinutes={freeMinutes}
            setFreeMinutes={setFreeMinutes}
            distanceMeters={distanceMeters}
            setDistanceMeters={setDistanceMeters}
            dietary={dietary}
            setDietary={setDietary}
            excludedAllergens={excludedAllergens}
            isEvaluating={isEvaluating}
            agentThought={agentThought}
            onSimulateWalk={() => {
              setFreeMinutes(40);
              setDistanceMeters(200);
              setDietary('Omnivore');
              setContextMode('calendar_gap');
              evaluateAgent(40, 200, 'Omnivore', excludedAllergens, 'calendar_gap');
            }}
            onTriggerDoorstep={() => {
              setDistanceMeters(35);
              if (!activeOrder) {
                evaluateAgent(freeMinutes, 35, dietary, excludedAllergens, contextMode);
              }
            }}
            onTriggerOverrun={() => {
              setFreeMinutes(15);
              setContextMode('calendar_gap');
              evaluateAgent(15, distanceMeters, dietary, excludedAllergens, 'calendar_gap');
            }}
            onOpenGuide={() => setIsOnboardingOpen(true)}
          />

          <div className="transition-all duration-300 ease-out">
            {isSettled && activeOrder ? (
              <DoorstepPass
                order={activeOrder}
                onReset={handleResetSimulation}
                onOrderUpdated={(updated) => {
                  setActiveOrder(updated);
                  broadcastOrderSync(updated);
                }}
                onRefundComplete={() => {
                  setActiveOrder(null);
                  broadcastOrderSync(null);
                  evaluateAgent(freeMinutes, distanceMeters, dietary);
                }}
              />
            ) : activeOrder ? (
              <ActiveEscrowTicket
                order={activeOrder}
                distanceMeters={distanceMeters}
                onSimulateArrival={() => setDistanceMeters(30)}
                onManualCheckIn={async () => {
                  await executeCapture(activeOrder, true);
                }}
                onCancelOrder={handleCancelOrder}
                isCanceling={isCanceling}
                captureError={captureError}
                pendingRestockingFeeCents={pendingRestockingFeeCents}
                onDismissFeePrompt={() => setPendingRestockingFeeCents(null)}
              />
            ) : recommendation && recommendation.shouldTrigger ? (
              <CulinaryRecommendationCard
                key={recommendation.item.id}
                recommendation={recommendation}
                freeMinutes={freeMinutes}
                distanceMeters={distanceMeters}
                dietary={dietary}
                excludedAllergens={excludedAllergens}
                pickupRunId={pickupRunId}
                onToggleAllergen={handleToggleAllergen}
                onSelectAlternative={handleSelectAlternative}
                onAuthorize={handleAuthorize}
                isAuthorizing={isAuthorizing}
                authError={authError}
                onSimulateWalk={() => {
                  setFreeMinutes(40);
                  setDistanceMeters(200);
                  setDietary('Omnivore');
                  setContextMode('calendar_gap');
                  evaluateAgent(
                    40,
                    200,
                    'Omnivore',
                    excludedAllergens,
                    'calendar_gap'
                  );
                }}
                onTriggerDoorstep={() => {
                  setDistanceMeters(35);
                  evaluateAgent(
                    freeMinutes,
                    35,
                    dietary,
                    excludedAllergens,
                    contextMode
                  );
                }}
                onToggleDietary={() => {
                  const nextDiet = dietary === 'Vegan' ? 'Omnivore' : 'Vegan';
                  setDietary(nextDiet);
                  evaluateAgent(
                    freeMinutes,
                    distanceMeters,
                    nextDiet,
                    excludedAllergens,
                    contextMode
                  );
                }}
                onTriggerOverrun={() => {
                  setFreeMinutes(15);
                  setContextMode('calendar_gap');
                  evaluateAgent(
                    15,
                    distanceMeters,
                    dietary,
                    excludedAllergens,
                    'calendar_gap'
                  );
                }}
                onOpenGuide={() => setIsOnboardingOpen(true)}
              />
            ) : (
              /* Quiet / Safety Suppressed Ambient Card */
              <div className="w-full bg-white rounded-3xl p-6 text-center border border-culinary-border shadow-xs transition-all duration-300">
                <div className="w-10 h-10 mx-auto rounded-xl bg-culinary-bg border border-culinary-border flex items-center justify-center mb-2.5 text-culinary-muted">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="font-serif text-base font-bold text-culinary-text mb-1">
                  Ambient Silence Active
                </h3>
                <p className="text-xs text-culinary-muted max-w-xs mx-auto mb-3.5 leading-relaxed">
                  {recommendation?.reason ??
                    `Gap is ${freeMinutes}m (requires ≥ 30m). BitePass respects your quiet focus time.`}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFreeMinutes(35);
                    setDistanceMeters(200);
                    setExcludedAllergens([]);
                    setContextMode('calendar_gap');
                    evaluateAgent(35, 200, dietary, [], 'calendar_gap');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-culinary-bg hover:bg-culinary-subtle border border-culinary-border text-xs font-semibold text-culinary-text transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-culinary-terracotta" />
                  <span>Check Again</span>
                </button>
              </div>
            )}
          </div>

          {/* Dedicated Route Link to Merchant Kitchen Display System */}
          <div className="text-center pt-3">
            <button
              type="button"
              onClick={() => router.push('/merchant')}
              className="text-xs text-culinary-muted hover:text-culinary-text font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <ChefHat className="w-3.5 h-3.5 text-culinary-amber" />
              <span>View Kitchen Operations (AG Grid)</span>
              <ArrowRight className="w-3 h-3 text-culinary-muted" />
            </button>
          </div>
        </div>
      </main>

      <footer className="border-t border-culinary-border bg-white py-3 mt-auto safe-area-bottom">
        <div className="max-w-md mx-auto px-4 flex flex-wrap items-center justify-between gap-2 text-xs text-culinary-muted">
          <span>
            <strong className="text-culinary-text">BitePass</strong> &middot; Gemini 4 Argon
          </span>
          <div className="flex items-center gap-2.5">
            <Link href="/legal/terms" className="hover:text-culinary-text underline">
              Terms
            </Link>
            <Link href="/legal/privacy" className="hover:text-culinary-text underline">
              Privacy
            </Link>
            <span className="font-mono text-xs text-culinary-muted inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-culinary-sage" />
              <span>Escrow</span>
            </span>
          </div>
        </div>
      </footer>

      <MobileOnboardingGuide
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onSimulateLunch={() => {
          setFreeMinutes(40);
          setDistanceMeters(200);
          setDietary('Omnivore');
          evaluateAgent(40, 200, 'Omnivore', excludedAllergens, 'calendar_gap');
        }}
        onSimulateVegan={() => {
          setDietary('Vegan');
          evaluateAgent(
            Math.max(35, freeMinutes),
            distanceMeters,
            'Vegan',
            excludedAllergens,
            'calendar_gap'
          );
        }}
      />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-culinary-bg flex items-center justify-center text-xs font-mono text-culinary-muted">
          Loading BitePass...
        </div>
      }
    >
      <BitePassConsumerApp />
    </Suspense>
  );
}

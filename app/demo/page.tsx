'use client';

import React, { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { AgentCognitiveBar } from '@/components/AgentCognitiveBar';
import {
  AuthorizeOrderSelection,
  CulinaryRecommendationCard,
} from '@/components/CulinaryRecommendationCard';
import { ActiveEscrowTicket } from '@/components/ActiveEscrowTicket';
import { DoorstepPass } from '@/components/DoorstepPass';
import type { KdsOperatorAction } from '@/components/MerchantQueueGrid';
import { SITUATIONAL_SCENARIOS, SituationalScenario } from '@/lib/scenarios';
import { calculateOrderPricing, getEligibleMenuItems } from '@/lib/catalog';
import {
  AgentRecommendation,
  BayCapacity,
  DietaryPreference,
  OrderTicket,
} from '@/lib/types';
import { Sliders, RotateCcw, Sparkles } from 'lucide-react';

const LazyMerchantQueueGrid = dynamic(
  () =>
    import('@/components/MerchantQueueGrid').then((m) => m.MerchantQueueGrid),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[360px] rounded-3xl bg-white border border-culinary-border flex items-center justify-center text-xs font-mono text-culinary-muted">
        Loading Live AG Grid Kitchen Terminal...
      </div>
    ),
  }
);

export default function JudgeSplitConsolePage() {
  const [scenario, setScenario] = useState<SituationalScenario>(
    SITUATIONAL_SCENARIOS[0]
  );
  const [freeMinutes, setFreeMinutes] = useState(scenario.freeMinutes);
  const [distanceMeters, setDistanceMeters] = useState(scenario.distanceMeters);
  const [dietary, setDietary] = useState<DietaryPreference>(scenario.dietary);
  const [recommendation, setRecommendation] =
    useState<AgentRecommendation | null>(() => {
      const pricing = calculateOrderPricing(scenario.item.price);
      return {
        shouldTrigger: true,
        item: scenario.item,
        alternatives: getEligibleMenuItems(scenario.dietary).filter(
          (i) => i.id !== scenario.item.id
        ),
        reason: scenario.reason,
        timeSavedMinutes: scenario.timeSavedMinutes,
        walkingBufferMinutes: 3,
        totalCents: pricing.totalCents,
        total: pricing.total,
        breakdown: pricing,
      };
    });
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [activeOrder, setActiveOrder] = useState<OrderTicket | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [orders, setOrders] = useState<OrderTicket[]>([]);
  const [bayCapacity, setBayCapacity] = useState<BayCapacity>({
    occupiedBays: 2,
    totalBays: 2,
    activeBayNames: ['Bay #1', 'Bay #2'],
  });

  const refreshQueue = useCallback(async () => {
    const res = await fetch('/api/orders', { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    setOrders(data.orders ?? []);
    if (data.bayCapacity) setBayCapacity(data.bayCapacity);
  }, []);

  useEffect(() => {
    refreshQueue();
    const es =
      typeof EventSource !== 'undefined' ? new EventSource('/api/events') : null;
    es?.addEventListener('update', () => refreshQueue());
    return () => es?.close();
  }, [refreshQueue]);

  const evaluateContext = useCallback(
    async (
      mins: number,
      dist: number,
      diet: DietaryPreference,
      mode = scenario.contextMode ?? 'calendar_gap'
    ) => {
      setIsEvaluating(true);
      try {
        const res = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            freeMinutes: mins,
            distanceMeters: dist,
            dietary: diet,
            contextMode: mode,
          }),
        });
        if (res.ok) {
          setRecommendation(await res.json());
        }
      } finally {
        setIsEvaluating(false);
      }
    },
    [scenario.contextMode]
  );

  const handleAuthorize = async (selection?: AuthorizeOrderSelection) => {
    if (!recommendation?.shouldTrigger) return;
    setIsAuthorizing(true);
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
          customerName: scenario.persona,
          distanceMeters,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveOrder(data.order);
        await refreshQueue();
      }
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleCapture = useCallback(
    async (order: OrderTicket) => {
      const res = await fetch('/api/paypal/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.orderId,
          distanceMeters: Math.min(distanceMeters, 50),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveOrder(data.order);
        await refreshQueue();
      }
    },
    [distanceMeters, refreshQueue]
  );

  useEffect(() => {
    if (activeOrder?.status === 'AUTHORIZED' && distanceMeters <= 50) {
      handleCapture(activeOrder);
    }
  }, [activeOrder, distanceMeters, handleCapture]);

  const handleCancel = async (confirmFee = false) => {
    if (!activeOrder) return;
    setIsCanceling(true);
    try {
      const res = await fetch('/api/paypal/void', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: activeOrder.orderId,
          distanceMeters,
          confirmRestockingFee: confirmFee,
          freeCancelOverride: !confirmFee,
        }),
      });
      if (res.ok) {
        setActiveOrder(null);
        await refreshQueue();
      }
    } finally {
      setIsCanceling(false);
    }
  };

  const handleOperatorAction = async (
    orderId: string,
    action: KdsOperatorAction
  ) => {
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    await refreshQueue();
  };

  const handleReset = async () => {
    await fetch('/api/orders/reset', { method: 'POST' });
    setActiveOrder(null);
    await refreshQueue();
    await evaluateContext(freeMinutes, distanceMeters, dietary);
  };

  return (
    <div className="min-h-screen bg-culinary-bg text-culinary-text p-4 sm:p-6">
      <header className="max-w-7xl mx-auto mb-5 flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-culinary-border">
        <div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-orange-50 text-culinary-terracotta border border-orange-200">
            Dual-Viewport Judge Sandbox
          </span>
          <h1 className="font-serif text-2xl font-bold mt-1">
            BitePass — Split Evaluation Console
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="px-3 py-2 rounded-xl bg-white border border-culinary-border text-xs font-semibold hover:bg-culinary-subtle"
          >
            Consumer Route (/)
          </Link>
          <Link
            href="/merchant"
            className="px-3 py-2 rounded-xl bg-white border border-culinary-border text-xs font-semibold hover:bg-culinary-subtle"
          >
            Merchant KDS (/merchant)
          </Link>
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2 rounded-xl bg-culinary-text text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo</span>
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Viewport: Consumer Mobile Frame */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-md">
            <AgentCognitiveBar
              freeMinutes={freeMinutes}
              setFreeMinutes={setFreeMinutes}
              distanceMeters={distanceMeters}
              setDistanceMeters={setDistanceMeters}
              dietary={dietary}
              setDietary={setDietary}
              isEvaluating={isEvaluating}
              agentThought={
                recommendation?.reason ?? 'Monitoring dining corridor...'
              }
              onSimulateWalk={() => {
                setFreeMinutes(35);
                setDistanceMeters(200);
                evaluateContext(35, 200, dietary);
              }}
              onTriggerDoorstep={() => setDistanceMeters(30)}
              onTriggerOverrun={() => {
                setFreeMinutes(15);
                evaluateContext(15, distanceMeters, dietary, 'calendar_gap');
              }}
            />

            {activeOrder?.status === 'CAPTURED' ? (
              <DoorstepPass order={activeOrder} onReset={handleReset} />
            ) : activeOrder ? (
              <ActiveEscrowTicket
                order={activeOrder}
                distanceMeters={distanceMeters}
                onSimulateArrival={() => setDistanceMeters(30)}
                onCancelOrder={handleCancel}
                isCanceling={isCanceling}
              />
            ) : recommendation?.shouldTrigger ? (
              <CulinaryRecommendationCard
                key={recommendation.item.id}
                recommendation={recommendation}
                freeMinutes={freeMinutes}
                distanceMeters={distanceMeters}
                dietary={dietary}
                onAuthorize={handleAuthorize}
                isAuthorizing={isAuthorizing}
              />
            ) : (
              <div className="bg-white rounded-3xl p-6 border border-culinary-border text-center">
                <p className="text-xs text-culinary-muted mb-3">
                  {recommendation?.reason}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFreeMinutes(35);
                    setDistanceMeters(200);
                    evaluateContext(35, 200, dietary, 'calendar_gap');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-culinary-bg border border-culinary-border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-culinary-terracotta" />
                  <span>Restore 35m Window</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Viewport: Scenario Controller + Live AG Grid KDS */}
        <div className="lg:col-span-7 space-y-5">
          <div className="culinary-panel rounded-3xl p-5 border border-culinary-border">
            <div className="flex items-center gap-2 mb-3">
              <Sliders className="w-4 h-4 text-culinary-terracotta" />
              <h2 className="font-serif text-base font-bold">
                Judge Scenario &amp; Telemetry Controller
              </h2>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {SITUATIONAL_SCENARIOS.map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => {
                    setScenario(sc);
                    setFreeMinutes(sc.freeMinutes);
                    setDistanceMeters(sc.distanceMeters);
                    setDietary(sc.dietary);
                    evaluateContext(
                      sc.freeMinutes,
                      sc.distanceMeters,
                      sc.dietary,
                      sc.contextMode ?? 'calendar_gap'
                    );
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer ${
                    scenario.id === sc.id
                      ? 'bg-culinary-terracotta text-white border-culinary-terracotta'
                      : 'bg-culinary-bg text-culinary-text border-culinary-border'
                  }`}
                >
                  {sc.badge}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="block">
                <span className="text-xs font-semibold text-culinary-muted flex justify-between">
                  <span>Meeting Gap</span>
                  <strong className="font-mono text-culinary-text">
                    {freeMinutes}m
                  </strong>
                </span>
                <input
                  type="range"
                  min={5}
                  max={90}
                  step={5}
                  value={freeMinutes}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setFreeMinutes(v);
                    evaluateContext(v, distanceMeters, dietary);
                  }}
                  className="w-full mt-1.5 accent-culinary-terracottaFill"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-culinary-muted flex justify-between">
                  <span>Cafe Distance</span>
                  <strong className="font-mono text-culinary-text">
                    {distanceMeters}m
                  </strong>
                </span>
                <input
                  type="range"
                  min={10}
                  max={650}
                  step={10}
                  value={distanceMeters}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setDistanceMeters(v);
                    if (!activeOrder) {
                      evaluateContext(freeMinutes, v, dietary);
                    }
                  }}
                  className="w-full mt-1.5 accent-paypal-blue"
                />
              </label>

              <div>
                <span className="text-xs font-semibold text-culinary-muted block mb-1.5">
                  Dietary Profile
                </span>
                <div className="flex gap-1">
                  {(['Omnivore', 'Vegan', 'Gluten-Free'] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setDietary(d);
                        evaluateContext(freeMinutes, distanceMeters, d);
                      }}
                      className={`flex-1 py-1 px-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                        dietary === d
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-culinary-bg text-culinary-text border-culinary-border'
                      }`}
                    >
                      {d === 'Gluten-Free' ? 'GF' : d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <LazyMerchantQueueGrid
            orders={orders}
            bayCapacity={bayCapacity}
            onOperatorAction={handleOperatorAction}
          />
        </div>
      </div>
    </div>
  );
}


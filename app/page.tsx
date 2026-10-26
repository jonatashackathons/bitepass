'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from '@/components/Navbar';
import { AgentCognitiveBar } from '@/components/AgentCognitiveBar';
import { CulinaryRecommendationCard } from '@/components/CulinaryRecommendationCard';
import { ActiveEscrowTicket } from '@/components/ActiveEscrowTicket';
import { DoorstepPass } from '@/components/DoorstepPass';
import { MerchantQueueGrid } from '@/components/MerchantQueueGrid';
import { MobileOnboardingGuide } from '@/components/MobileOnboardingGuide';
import {
  AgentRecommendation,
  OrderTicket,
  BayCapacity,
  DietaryPreference,
} from '@/lib/types';
import { Sparkles, Clock, ChefHat, ArrowRight } from 'lucide-react';

export default function Home() {
  // View Tab state
  const [activeTab, setActiveTab] = useState<'meal' | 'queue'>('meal');

  // Context state
  const [freeMinutes, setFreeMinutes] = useState(35);
  const [distanceMeters, setDistanceMeters] = useState(200);
  const [dietary, setDietary] = useState<DietaryPreference>('Omnivore');

  // Agent & Order state
  const [recommendation, setRecommendation] = useState<AgentRecommendation | null>({
    shouldTrigger: true,
    item: {
      id: 'prod_turkey_panini',
      name: 'Turkey Avocado Club',
      merchantName: "Jack's Cafe",
      category: 'Artisan Sandwiches',
      price: 12.50,
      prepTimeMinutes: 5,
      dietaryTags: ['Omnivore'],
      description: 'Smoked turkey breast, Haas avocado, applewood bacon on toasted sourdough.',
      calories: 640,
      image: '/images/turkey_club.jpg',
      quickTweaks: {
        label: 'Side Selection',
        options: [
          { name: 'Kettle Sea Salt Chips', priceDelta: 0 },
          { name: 'Arugula Citrus Side Salad', priceDelta: 1.50 },
        ],
      },
    },
    reason: `35m window before Standup · 3m walk to Jack's Cafe.`,
    timeSavedMinutes: 20,
    walkingBufferMinutes: 3,
    total: 14.50,
    breakdown: { basePrice: 12.50, tax: 1.00, tip: 1.00, total: 14.50 },
  });
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [activeOrder, setActiveOrder] = useState<OrderTicket | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isCaptured, setIsCaptured] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Merchant Queue State
  const [orders, setOrders] = useState<OrderTicket[]>([]);
  const [bayCapacity, setBayCapacity] = useState<BayCapacity>({
    occupiedBays: 0,
    totalBays: 6,
    activeBayNames: ['Bay #1', 'Bay #2', 'Bay #3', 'Bay #4', 'Bay #5', 'Bay #6'],
  });

  const hasCapturedRef = useRef(false);

  // Fetch kitchen orders
  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        if (data.capacity) {
          setBayCapacity(data.capacity);
        }
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 4000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Evaluate Agent Recommendation via API
  const evaluateAgent = useCallback(
    async (mins: number, dist: number, diet: DietaryPreference) => {
      setIsEvaluating(true);
      try {
        const res = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            freeMinutes: mins,
            distanceMeters: dist,
            dietary: diet,
            userLocationName: 'Office Suite 402',
            nextMeetingTitle: 'Engineering Standup',
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
    []
  );

  // Re-evaluate on context change
  useEffect(() => {
    if (!activeOrder) {
      evaluateAgent(freeMinutes, distanceMeters, dietary);
    }
  }, [freeMinutes, distanceMeters, dietary, activeOrder, evaluateAgent]);

  // Phase 1: Authorize (1-Tap Escrow Hold)
  const handleAuthorize = async (tweak?: { name: string; priceDelta: number }) => {
    if (!recommendation?.item || isAuthorizing) return;

    setIsAuthorizing(true);
    try {
      const res = await fetch('/api/paypal/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: recommendation.item.id,
          tweakDelta: tweak ? tweak.priceDelta : 0,
          selectedTweak: tweak ? tweak.name : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setActiveOrder(data.order);
        setIsCaptured(false);
        hasCapturedRef.current = false;
        await fetchOrders();
      }
    } catch (err) {
      console.error('Failed to authorize escrow:', err);
    } finally {
      setIsAuthorizing(false);
    }
  };

  // Phase 2: Capture (Doorstep Proximity < 50m)
  const executeCapture = useCallback(
    async (order: OrderTicket) => {
      if (hasCapturedRef.current) return;
      hasCapturedRef.current = true;

      try {
        const res = await fetch('/api/paypal/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: order.orderId,
            authId: order.authId,
            amount: order.totalAmount,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setIsCaptured(true);
          if (data.order) {
            setActiveOrder(data.order);
          }
          await fetchOrders();
        }
      } catch (err) {
        console.error('Failed to capture:', err);
      }
    },
    [fetchOrders]
  );

  // Monitor geofence distance for proximity capture
  useEffect(() => {
    if (
      activeOrder &&
      activeOrder.status === 'AUTHORIZED' &&
      distanceMeters <= 50 &&
      !isCaptured &&
      !hasCapturedRef.current
    ) {
      executeCapture(activeOrder);
    }
  }, [distanceMeters, activeOrder, isCaptured, executeCapture]);

  // Cancel order (US-08)
  const handleCancelOrder = async () => {
    if (!activeOrder) return;

    setIsCanceling(true);
    try {
      const res = await fetch('/api/paypal/void', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: activeOrder.orderId,
          authId: activeOrder.authId,
        }),
      });

      if (res.ok) {
        setActiveOrder(null);
        setIsCaptured(false);
        hasCapturedRef.current = false;
        await fetchOrders();
        evaluateAgent(freeMinutes, distanceMeters, dietary);
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
      setIsCaptured(false);
      hasCapturedRef.current = false;
      setFreeMinutes(35);
      setDistanceMeters(200);
      setDietary('Omnivore');
      await fetchOrders();
      await evaluateAgent(35, 200, 'Omnivore');
    } catch (err) {
      console.error('Failed to reset simulation:', err);
    } finally {
      setIsResetting(false);
    }
  };

  // Presets
  const handleSimulateWalk = () => {
    setFreeMinutes(40);
    setDistanceMeters(200);
    setDietary('Omnivore');
  };

  const handleTriggerDoorstep = () => {
    setDistanceMeters(35);
  };

  const handleTriggerOverrun = () => {
    setFreeMinutes(15);
  };

  // Crisp, 1-line agent thought
  const agentThought = recommendation?.shouldTrigger && recommendation.item
    ? `${freeMinutes}m gap before Standup · 3m walk to ${recommendation.item.merchantName}`
    : freeMinutes < 30
    ? `Calendar gap is only ${freeMinutes}m (requires ≥ 30m). Respecting quiet focus mode.`
    : distanceMeters > 500
    ? `${distanceMeters}m away from cafe strip (boundary is 500m).`
    : `Evaluating menu catalogs and kitchen prep times...`;

  return (
    <div className="min-h-screen bg-[#FAF9F5] flex flex-col text-[#1C1917]">
      <Navbar
        onReset={handleResetSimulation}
        isResetting={isResetting}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeOrdersCount={orders.length}
        onOpenGuide={() => setIsOnboardingOpen(true)}
      />

      <main className="flex-1 w-full mx-auto px-3.5 sm:px-4 py-4 sm:py-6 flex flex-col items-center">
        {activeTab === 'meal' ? (
          /* Mobile-First Container (iPhone width: max-w-md / 400px) */
          <div className="w-full max-w-md flex flex-col">
            {/* The Agent Cognitive Stream */}
            <AgentCognitiveBar
              freeMinutes={freeMinutes}
              setFreeMinutes={setFreeMinutes}
              distanceMeters={distanceMeters}
              setDistanceMeters={setDistanceMeters}
              dietary={dietary}
              setDietary={setDietary}
              isEvaluating={isEvaluating}
              agentThought={agentThought}
              onSimulateWalk={handleSimulateWalk}
              onTriggerDoorstep={handleTriggerDoorstep}
              onTriggerOverrun={handleTriggerOverrun}
              onOpenGuide={() => setIsOnboardingOpen(true)}
            />

            {/* The Culinary Concierge Experience */}
            {isCaptured && activeOrder ? (
              <DoorstepPass order={activeOrder} onReset={handleResetSimulation} />
            ) : activeOrder ? (
              <ActiveEscrowTicket
                order={activeOrder}
                distanceMeters={distanceMeters}
                onSimulateArrival={() => setDistanceMeters(30)}
                onCancelOrder={handleCancelOrder}
                isCanceling={isCanceling}
              />
            ) : recommendation && recommendation.shouldTrigger && recommendation.item ? (
              <CulinaryRecommendationCard
                recommendation={recommendation}
                freeMinutes={freeMinutes}
                distanceMeters={distanceMeters}
                dietary={dietary}
                onAuthorize={handleAuthorize}
                isAuthorizing={isAuthorizing}
                onSimulateWalk={handleSimulateWalk}
                onTriggerDoorstep={handleTriggerDoorstep}
                onToggleDietary={() => setDietary(dietary === 'Vegan' ? 'Omnivore' : 'Vegan')}
                onTriggerOverrun={handleTriggerOverrun}
                onOpenGuide={() => setIsOnboardingOpen(true)}
              />
            ) : (
              /* Quiet Ambient Idle Card */
              <div className="w-full bg-white rounded-3xl p-6 text-center border border-[#EAE7DF] shadow-xs">
                <div className="w-10 h-10 mx-auto rounded-xl bg-[#FAF9F5] border border-[#EAE7DF] flex items-center justify-center mb-2.5 text-[#A8A29E]">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="font-serif text-base font-bold text-[#1C1917] mb-1">
                  Ambient Silence Active
                </h3>
                <p className="text-xs text-[#78716C] max-w-xs mx-auto mb-3.5 leading-relaxed">
                  {freeMinutes < 30
                    ? `Gap is ${freeMinutes}m (requires ≥ 30m). BitePass respects your quiet focus time.`
                    : distanceMeters > 500
                    ? `You are ${distanceMeters}m away (exceeds 500m proximity boundary).`
                    : `Agent is monitoring dining queue states...`}
                </p>
                <button
                  onClick={handleSimulateWalk}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF9F5] hover:bg-[#F2EFE9] border border-[#EAE7DF] text-xs font-semibold text-[#1C1917] transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#E05A38]" />
                  <span>Simulate 12:15 PM Lunch</span>
                </button>
              </div>
            )}

            {/* Subtle Link to Kitchen Board */}
            <div className="text-center pt-3">
              <button
                onClick={() => setActiveTab('queue')}
                className="text-[11px] text-[#78716C] hover:text-[#1C1917] font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
              >
                <ChefHat className="w-3 h-3 text-[#D97706]" />
                <span>View Kitchen Operations (AG Grid)</span>
                <ArrowRight className="w-2.5 h-2.5 text-[#A8A29E]" />
              </button>
            </div>
          </div>
        ) : (
          /* Kitchen Queue Tab (Full width for AG Grid) */
          <div className="w-full max-w-4xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#EAE7DF]">
              <div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1C1917]">
                  Merchant Kitchen Operations
                </h2>
                <p className="text-xs text-[#78716C]">
                  Real-time ticket state transitions powered by AG Grid React
                </p>
              </div>
              <button
                onClick={() => setActiveTab('meal')}
                className="px-3 py-1.5 rounded-xl bg-white border border-[#EAE7DF] text-xs font-semibold text-[#1C1917] hover:bg-[#FAF9F5] transition-colors cursor-pointer"
              >
                &larr; Back to Lunch
              </button>
            </div>

            <MerchantQueueGrid orders={orders} bayCapacity={bayCapacity} />
          </div>
        )}
      </main>

      {/* Culinary Minimal Footer */}
      <footer className="border-t border-[#EAE7DF] bg-[#FFFFFF] py-3 mt-auto">
        <div className="max-w-md mx-auto px-4 flex items-center justify-between text-[11px] text-[#78716C]">
          <span>
            <strong>BitePass</strong> &middot; Gemini 4 Argon
          </span>
          <span className="font-mono text-[10px] text-[#A8A29E]">
            PayPal 2-Phase Escrow
          </span>
        </div>
      </footer>

      {/* Mobile Onboarding Guide Modal */}
      <MobileOnboardingGuide
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onSimulateLunch={handleSimulateWalk}
        onSimulateVegan={() => setDietary('Vegan')}
      />
    </div>
  );
}

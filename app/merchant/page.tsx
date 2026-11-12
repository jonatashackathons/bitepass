'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import {
  KdsOperatorAction,
  MerchantQueueGrid,
} from '@/components/MerchantQueueGrid';
import { BayCapacity, OrderTicket } from '@/lib/types';
import { ShieldCheck, Radio } from 'lucide-react';

export default function MerchantKdsPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderTicket[]>([]);
  const [bayCapacity, setBayCapacity] = useState<BayCapacity>({
    occupiedBays: 0,
    totalBays: 2,
    activeBayNames: [],
  });
  const [isResetting, setIsResetting] = useState(false);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [sseConnected, setSseConnected] = useState(false);

  const fetchOrdersSnapshot = useCallback(async () => {
    try {
      const res = await fetch('/api/orders', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setOrders(data.orders ?? []);
      if (data.bayCapacity) {
        setBayCapacity(data.bayCapacity);
      }
    } catch (err) {
      console.error('Failed to fetch kitchen orders:', err);
    }
  }, []);

  useEffect(() => {
    fetchOrdersSnapshot();

    let es: EventSource | null = null;
    if (typeof EventSource !== 'undefined') {
      es = new EventSource('/api/events');
      es.addEventListener('snapshot', (evt) => {
        try {
          const parsed = JSON.parse((evt as MessageEvent).data);
          if (Array.isArray(parsed.orders)) setOrders(parsed.orders);
          if (parsed.bayCapacity) setBayCapacity(parsed.bayCapacity);
          setSseConnected(true);
        } catch {
          // Ignore malformed event
        }
      });

      es.addEventListener('update', () => {
        setSseConnected(true);
        fetchOrdersSnapshot();
      });

      es.onerror = () => {
        setSseConnected(false);
      };
    }

    const fallbackInterval = setInterval(fetchOrdersSnapshot, 8000);
    return () => {
      if (es) es.close();
      clearInterval(fallbackInterval);
    };
  }, [fetchOrdersSnapshot]);

  const handleOperatorAction = async (
    orderId: string,
    action: KdsOperatorAction
  ) => {
    setBusyOrderId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        await fetchOrdersSnapshot();
      }
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await fetch('/api/orders/reset', { method: 'POST' });
      await fetchOrdersSnapshot();
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-culinary-bg flex flex-col text-culinary-text">
      <Navbar
        onReset={handleReset}
        isResetting={isResetting}
        activeTab="queue"
        setActiveTab={(tab) => {
          if (tab === 'meal') {
            router.push('/');
          }
        }}
        activeOrdersCount={orders.length}
        maxWidthClass="max-w-5xl"
      />

      <main className="flex-1 w-full max-w-5xl mx-auto px-3.5 sm:px-6 py-5 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-culinary-border">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-xl sm:text-2xl font-bold text-culinary-text">
                Merchant Kitchen Operations
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-semibold">
                <Radio className="w-3 h-3" />
                <span>{sseConnected ? 'SSE Live' : 'Sync Active'}</span>
              </span>
            </div>
            <p className="text-xs text-culinary-muted mt-0.5">
              Dedicated KDS tablet station &middot; Zero AG Grid bytes shipped to consumer phones
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push('/')}
            className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-white border border-culinary-border text-xs font-semibold text-culinary-text hover:bg-culinary-bg transition-colors cursor-pointer"
          >
            &larr; Back to Lunch
          </button>
        </div>

        <MerchantQueueGrid
          orders={orders}
          bayCapacity={bayCapacity}
          onOperatorAction={handleOperatorAction}
          busyOrderId={busyOrderId}
        />
      </main>

      <footer className="border-t border-culinary-border bg-white py-3 mt-auto">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between text-xs text-culinary-muted">
          <span>
            <strong className="text-culinary-text">BitePass KDS</strong> &middot; Merchant Operations
          </span>
          <span className="font-mono text-xs flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-culinary-sage" />
            <span>2-Phase Escrow Telemetry</span>
          </span>
        </div>
      </footer>
    </div>
  );
}


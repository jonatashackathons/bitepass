'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { ChefHat, Clock, MapPin, ArrowRight, XCircle, Armchair } from 'lucide-react';
import { OrderTicket } from '@/lib/types';

interface ActiveEscrowTicketProps {
  order: OrderTicket;
  distanceMeters: number;
  onSimulateArrival: () => void;
  onCancelOrder: () => Promise<void>;
  isCanceling: boolean;
}

export function ActiveEscrowTicket({
  order,
  distanceMeters,
  onSimulateArrival,
  onCancelOrder,
  isCanceling,
}: ActiveEscrowTicketProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(
    Math.max(180, order.etaMinutes * 60)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const isNearDoorstep = distanceMeters <= 50;

  return (
    <div className="w-full bg-white rounded-3xl overflow-hidden border border-[#EAE7DF] shadow-md">
      {/* Header Status Banner */}
      <div className="bg-[#0070BA] p-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
            <ChefHat className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-[10px] uppercase font-bold text-blue-200">
                Escrow Authorized
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <h3 className="font-serif text-sm font-bold text-white mt-0.5">
              {order.item.merchantName} is Assembling
            </h3>
          </div>
        </div>

        <div className="text-right">
          <span className="font-mono text-xs font-bold text-white/90">{order.orderId}</span>
          <span className="text-[9px] text-blue-200 block uppercase font-mono">
            ${order.totalAmount.toFixed(2)} Hold
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {/* Pickup Station & Countdown */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="p-3 rounded-2xl bg-[#FAF9F5] border border-[#EAE7DF] text-center">
            <span className="text-[10px] uppercase font-bold text-[#78716C] tracking-wider block flex items-center justify-center gap-1">
              <Armchair className="w-3 h-3 text-[#E05A38]" />
              <span>Assigned Bay</span>
            </span>
            <span className="font-serif text-lg font-bold text-[#1C1917] block mt-0.5">
              {order.cubbyOrBay}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-[#FAF9F5] border border-[#EAE7DF] text-center">
            <span className="text-[10px] uppercase font-bold text-[#78716C] tracking-wider block flex items-center justify-center gap-1">
              <Clock className="w-3 h-3 text-[#0070BA]" />
              <span>Countdown</span>
            </span>
            <span className="font-mono text-lg font-extrabold text-[#0070BA] block mt-0.5">
              {formatCountdown(secondsRemaining)}
            </span>
          </div>
        </div>

        {/* Minimal Item Preview */}
        <div className="p-3 rounded-2xl bg-[#FAF9F5] border border-[#EAE7DF] flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            {order.item.image && (
              <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-[#EAE7DF]" style={{ position: 'relative' }}>
                <Image
                  src={order.item.image}
                  alt={order.item.name}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div className="min-w-0">
              <span className="font-semibold text-xs text-[#1C1917] truncate block">
                {order.item.name}
              </span>
              <span className="text-[10px] text-[#78716C] truncate block">
                {order.selectedTweak ? `Tweak: ${order.selectedTweak}` : 'Standard recipe'}
              </span>
            </div>
          </div>
          <span className="font-mono font-bold text-xs text-[#1C1917] shrink-0">
            ${order.totalAmount.toFixed(2)}
          </span>
        </div>

        {/* Geofence Doorstep Arrival CTA */}
        <div
          className={`p-3.5 rounded-2xl border transition-all mb-3 ${
            isNearDoorstep
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-white border-[#EAE7DF] text-[#1C1917]'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="flex items-center gap-1.5">
              <MapPin className={`w-3.5 h-3.5 ${isNearDoorstep ? 'text-emerald-600' : 'text-[#E05A38]'}`} />
              <span>Doorstep Geofence</span>
            </span>
            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#FAF9F5] border border-[#EAE7DF]">
              {distanceMeters}m away
            </span>
          </div>

          {isNearDoorstep ? (
            <p className="text-xs text-emerald-800 font-medium">
              ⚡ You are at the door! Executing PayPal capture...
            </p>
          ) : (
            <button
              onClick={onSimulateArrival}
              className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <span>Simulate Arrival at Doorstep (&lt;50m)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Subtle Grace Period Cancel */}
        <div className="text-center pt-1">
          <button
            onClick={onCancelOrder}
            disabled={isCanceling}
            className="text-[11px] text-stone-500 hover:text-red-600 transition-colors inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>{isCanceling ? 'Canceling...' : 'Cancel Order (Pre-prep grace period)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import Image from 'next/image';
import { CheckCircle2, QrCode, RotateCcw } from 'lucide-react';
import { OrderTicket } from '@/lib/types';

interface DoorstepPassProps {
  order: OrderTicket;
  onReset: () => void;
}

export function DoorstepPass({ order, onReset }: DoorstepPassProps) {
  return (
    <div className="w-full bg-white rounded-3xl overflow-hidden border border-emerald-200 shadow-md">
      {/* Top Banner */}
      <div className="bg-emerald-700 p-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-100 block">
              Doorstep Arrival Verified
            </span>
            <h3 className="font-serif text-sm font-bold text-white">
              Captured via PayPal Escrow
            </h3>
          </div>
        </div>

        <div className="text-right">
          <span className="font-mono text-xs font-bold text-white/90">{order.orderId}</span>
          <span className="text-[9px] text-emerald-200 block font-mono">
            ${order.totalAmount.toFixed(2)} PAID
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {/* Cubby & QR Code Row */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 flex flex-col justify-center text-center">
            <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">
              Pickup Cubby
            </span>
            <span className="font-serif text-2xl font-bold text-emerald-950 block mt-0.5">
              {order.cubbyOrBay}
            </span>
            <span className="text-[10px] text-emerald-700 font-medium mt-0.5">
              Ready for Grab &amp; Go
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-[#FAF9F5] border border-[#EAE7DF] flex items-center justify-center gap-2.5">
            <div className="p-1.5 bg-black rounded-lg text-white">
              <QrCode className="w-7 h-7" />
            </div>
            <div className="text-left">
              <span className="text-[9px] uppercase font-bold text-[#78716C] block">
                Doorstep Pass
              </span>
              <span className="text-[10px] font-mono font-bold text-[#1C1917] block">
                FASTPASS
              </span>
              <span className="text-[9px] text-emerald-600 font-medium block">
                Tap or Scan
              </span>
            </div>
          </div>
        </div>

        {/* Minimal Item Recap */}
        <div className="p-3 rounded-2xl bg-[#FAF9F5] border border-[#EAE7DF] mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            {order.item.image && (
              <div className="relative w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-[#EAE7DF]" style={{ position: 'relative' }}>
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
                {order.item.merchantName}
              </span>
            </div>
          </div>

          <span className="font-mono text-xs font-bold text-emerald-800 shrink-0">
            ${order.totalAmount.toFixed(2)}
          </span>
        </div>

        {/* Reset Button */}
        <button
          onClick={onReset}
          className="w-full py-2.5 px-3 rounded-xl bg-[#1C1917] hover:bg-[#292524] active:scale-[0.99] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
        >
          <RotateCcw className="w-3.5 h-3.5 text-stone-400" />
          <span>Reset Simulation</span>
        </button>
      </div>
    </div>
  );
}

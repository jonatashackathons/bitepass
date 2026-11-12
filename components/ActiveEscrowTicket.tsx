'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import {
  ChefHat,
  Clock,
  MapPin,
  ArrowRight,
  XCircle,
  Armchair,
  AlertTriangle,
  RefreshCw,
  Flame,
  ShieldCheck,
} from 'lucide-react';
import { OrderTicket } from '@/lib/types';

interface ActiveEscrowTicketProps {
  order: OrderTicket;
  distanceMeters: number;
  onSimulateArrival: () => void;
  onManualCheckIn?: () => Promise<void>;
  onCancelOrder: (confirmRestockingFee?: boolean) => Promise<void>;
  isCanceling: boolean;
  captureError?: string | null;
  pendingRestockingFeeCents?: number | null;
  onDismissFeePrompt?: () => void;
}

export function ActiveEscrowTicket({
  order,
  distanceMeters,
  onSimulateArrival,
  onManualCheckIn,
  onCancelOrder,
  isCanceling,
  captureError,
  pendingRestockingFeeCents,
  onDismissFeePrompt,
}: ActiveEscrowTicketProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const startMs = order.authorizedAt ?? order.createdAt;
  const targetReadyMs = startMs + Math.max(3, order.etaMinutes) * 60 * 1000;
  const secondsRemaining = Math.max(0, Math.ceil((targetReadyMs - nowMs) / 1000));

  const graceEndMs = order.graceExpiresAt ?? startMs + 90_000;
  const graceSecondsLeft = Math.max(0, Math.ceil((graceEndMs - nowMs) / 1000));
  const hasExtendedDelayWindow =
    typeof order.graceExpiresAt === 'number' &&
    order.graceExpiresAt > startMs + 91_000 &&
    graceSecondsLeft > 0;
  const isKitchenFired =
    !hasExtendedDelayWindow &&
    (order.fulfillmentStage === 'KITCHEN_FIRED' ||
      order.fulfillmentStage === 'READY' ||
      distanceMeters <= 250 ||
      graceSecondsLeft === 0);

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const isNearDoorstep = distanceMeters <= 50;

  return (
    <div className="w-full bg-white rounded-3xl overflow-hidden border border-culinary-border shadow-md">
      {/* Header Status Banner */}
      <div className="bg-paypal-blue p-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <ChefHat className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-xs uppercase font-bold text-blue-100">
                Escrow Authorized
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
            </div>
            <h3 className="font-serif text-sm font-bold text-white mt-0.5 truncate">
              {order.item.merchantName} is Assembling
            </h3>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="font-mono text-xs font-bold text-white">
            {order.orderId}
          </span>
          <span className="text-xs text-blue-100 block uppercase font-mono">
            ${order.totalAmount.toFixed(2)} Hold
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {/* 2-Stage Prep-Gating Status Pill */}
        <div
          className={`mb-3 px-3 py-2 rounded-xl border text-xs flex items-center justify-between gap-2 ${
            isKitchenFired
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          <span className="flex items-center gap-1.5 font-semibold min-w-0 truncate">
            {isKitchenFired ? (
              <>
                <Flame className="w-3.5 h-3.5 text-culinary-amber shrink-0" />
                <span className="truncate">Kitchen Fired (≤250m / Prep Active)</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-culinary-sage shrink-0" />
                <span className="truncate">Pre-Prep Grace Hold ($0.00 Cancel)</span>
              </>
            )}
          </span>
          <span className="font-mono font-bold shrink-0">
            {isKitchenFired ? '$5 Shield' : `${graceSecondsLeft}s`}
          </span>
        </div>

        {/* Pickup Station & Countdown */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="p-3 rounded-2xl bg-culinary-bg border border-culinary-border text-center min-w-0">
            <span className="text-xs uppercase font-bold text-culinary-muted tracking-wider flex items-center justify-center gap-1">
              <Armchair className="w-3 h-3 text-culinary-terracotta shrink-0" />
              <span className="truncate">Assigned Bay</span>
            </span>
            <span className="font-serif text-base sm:text-lg font-bold text-culinary-text block mt-0.5 truncate">
              {order.cubbyOrBay}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-culinary-bg border border-culinary-border text-center min-w-0">
            <span className="text-xs uppercase font-bold text-culinary-muted tracking-wider flex items-center justify-center gap-1">
              <Clock className="w-3 h-3 text-paypal-blue shrink-0" />
              <span className="truncate">Countdown</span>
            </span>
            <span className="font-mono text-base sm:text-lg font-extrabold text-paypal-blue block mt-0.5">
              {formatCountdown(secondsRemaining)}
            </span>
          </div>
        </div>

        {/* Minimal Item Preview */}
        <div className="p-3 rounded-2xl bg-culinary-bg border border-culinary-border flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            {order.item.image && (
              <div
                className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-culinary-border"
                style={{ position: 'relative' }}
              >
                <Image
                  src={order.item.image}
                  alt={order.item.name}
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              </div>
            )}
            <div className="min-w-0">
              <span className="font-semibold text-xs text-culinary-text truncate block">
                {order.item.name}
              </span>
              <span className="text-xs text-culinary-muted truncate block">
                {order.selectedTweak ? `Tweak: ${order.selectedTweak}` : 'Standard recipe'}
              </span>
            </div>
          </div>
          <span className="font-mono font-bold text-xs text-culinary-text shrink-0">
            ${order.totalAmount.toFixed(2)}
          </span>
        </div>

        {/* Capture Retry + Offline Signed QR Backup when network/issuer glitches */}
        {(captureError || order.status === 'CAPTURE_FAILED') && (
          <div
            role="alert"
            className="mb-3 p-3 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950"
          >
            <div className="flex items-start gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-culinary-amber shrink-0 mt-0.5" />
              <div className="text-xs leading-snug">
                <p className="font-bold">Doorstep Settlement Needs Retry</p>
                <p className="text-amber-900 mt-0.5">
                  {captureError ??
                    'Cellular connection dipped. Retry capture or show your Offline QR to the barista.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onManualCheckIn?.()}
                className="flex-1 py-2 px-3 rounded-xl bg-paypal-blue hover:bg-paypal-hover text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Manual Check-In</span>
              </button>
              <div className="p-1.5 bg-white rounded-xl border border-amber-200 shrink-0">
                <QRCodeSVG
                  value={order.offlineQrToken ?? order.orderId}
                  size={42}
                />
              </div>
            </div>
          </div>
        )}

        {/* Geofence Doorstep Arrival CTA */}
        <div
          className={`p-3.5 rounded-2xl border transition-all mb-3 ${
            isNearDoorstep
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-white border-culinary-border text-culinary-text'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="flex items-center gap-1.5">
              <MapPin
                className={`w-3.5 h-3.5 ${
                  isNearDoorstep ? 'text-culinary-sage' : 'text-culinary-terracotta'
                }`}
              />
              <span>Doorstep Geofence</span>
            </span>
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-culinary-bg border border-culinary-border">
              {distanceMeters}m away
            </span>
          </div>

          {isNearDoorstep && !captureError ? (
            <p className="text-xs text-emerald-800 font-medium">
              ⚡ Doorstep reached! Settling PayPal escrow hold...
            </p>
          ) : (
            <button
              type="button"
              onClick={onSimulateArrival}
              className="w-full py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <span>Simulate Arrival at Doorstep (&lt;50m)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Post-Fire $5.00 Restocking Fee Confirmation Prompt */}
        {pendingRestockingFeeCents !== null &&
        pendingRestockingFeeCents !== undefined ? (
          <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-950 space-y-2">
            <p className="font-semibold leading-snug">
              Kitchen has already started fresh assembly. Canceling now captures a ${(pendingRestockingFeeCents / 100).toFixed(2)} perishable fee and releases the remaining ${(order.totalAmount - pendingRestockingFeeCents / 100).toFixed(2)} immediately.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onDismissFeePrompt}
                className="py-2 px-2 rounded-xl bg-white border border-culinary-border text-culinary-text font-semibold cursor-pointer"
              >
                Keep My Meal
              </button>
              <button
                type="button"
                disabled={isCanceling}
                onClick={() => onCancelOrder(true)}
                className="py-2 px-2 rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold cursor-pointer disabled:opacity-50"
              >
                {isCanceling ? 'Releasing...' : 'Confirm $5.00 Cancel'}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => onCancelOrder(false)}
              disabled={isCanceling}
              className="text-xs text-culinary-muted hover:text-red-700 transition-colors inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>
                {isCanceling
                  ? 'Canceling...'
                  : isKitchenFired
                    ? 'Cancel Order ($5.00 post-fire restocking fee)'
                    : 'Cancel Order ($0.00 pre-prep grace period)'}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

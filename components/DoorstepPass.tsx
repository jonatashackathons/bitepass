'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import {
  CheckCircle2,
  RotateCcw,
  LifeBuoy,
  ShieldAlert,
  Wallet,
  CalendarPlus,
  Share2,
} from 'lucide-react';
import { OrderTicket } from '@/lib/types';

interface DoorstepPassProps {
  order: OrderTicket;
  onReset: () => void;
  onRefundComplete?: () => void;
  onOrderUpdated?: (order: OrderTicket) => void;
}

const EXPRESS_SHELF_PALETTE = [
  { name: 'Emerald Sage', code: 'SAGE-04', dotClass: 'bg-emerald-700' },
  { name: 'Terracotta Ember', code: 'EMBER-09', dotClass: 'bg-culinary-terracottaFill' },
  { name: 'Cobalt FastPass', code: 'COBALT-02', dotClass: 'bg-paypal-blue' },
  { name: 'Saffron Reserve', code: 'SAFFRON-07', dotClass: 'bg-culinary-amber' },
] as const;

function getClientShelfColor(timestampMs: number) {
  const dayBucket = Math.floor(timestampMs / 86_400_000);
  return EXPRESS_SHELF_PALETTE[Math.abs(dayBucket) % EXPRESS_SHELF_PALETTE.length];
}

function formatIcsUtc(ms: number): string {
  return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function DoorstepPass({
  order,
  onReset,
  onRefundComplete,
  onOrderUpdated,
}: DoorstepPassProps) {
  const [showIssueDrawer, setShowIssueDrawer] = useState(false);
  const [resolutionMode, setResolutionMode] = useState<
    'INSTANT_REFUND' | 'RUSH_REMAKE'
  >('INSTANT_REFUND');
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);
  const [issueFeedback, setIssueFeedback] = useState<string | null>(null);
  const [utilityFeedback, setUtilityFeedback] = useState<string | null>(null);

  const isHighTopBay = order.cubbyOrBay.startsWith('Bay #');
  const shelfColor = getClientShelfColor(order.capturedAt ?? order.createdAt);

  const handleDownloadWalletPass = async () => {
    try {
      const res = await fetch(`/api/v1/orders/${order.orderId}/wallet-pass`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        setUtilityFeedback('Could not export signed Wallet Pass.');
        return;
      }
      const data = await res.json();
      const passJson = JSON.stringify(data.walletPass ?? data, null, 2);
      const blob = new Blob([passJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bitepass-${order.orderId.toLowerCase()}.pkpass.json`;
      a.click();
      URL.revokeObjectURL(url);
      setUtilityFeedback(
        `Signed Wallet Pass (${shelfColor.code}) exported.`
      );
    } catch {
      setUtilityFeedback('Offline — show FASTPASS QR above at locker.');
    }
  };

  const handleDownloadCalendarBlock = () => {
    const startMs = Date.now();
    const endMs = startMs + 15 * 60 * 1000;
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//BitePass//Autonomous Culinary Concierge//EN',
      'BEGIN:VEVENT',
      `UID:${order.orderId}@bitepass.ai`,
      `DTSTAMP:${formatIcsUtc(startMs)}`,
      `DTSTART:${formatIcsUtc(startMs)}`,
      `DTEND:${formatIcsUtc(endMs)}`,
      `SUMMARY:🥪 BitePass Pickup — ${order.item.merchantName}`,
      `LOCATION:${order.item.merchantName} (${order.cubbyOrBay})`,
      `DESCRIPTION:Order ${order.orderId} (${order.item.name}) settled via PayPal Escrow. Express Shelf Badge: ${shelfColor.code}.`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bitepass-pickup-${order.orderId.toLowerCase()}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    setUtilityFeedback('15m calendar pickup block downloaded (.ics).');
  };

  const handleInviteFloorRun = async () => {
    const runId = `run_${order.orderId.toLowerCase()}`;
    const shareUrl = `${window.location.origin}/?run_id=${encodeURIComponent(runId)}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
      setUtilityFeedback(
        `Copied Coworker Run link (${runId}) — $0 FastPass unlocked!`
      );
    } catch {
      setUtilityFeedback(`Share Coworker Run ID: ${runId} ($0 FastPass)`);
    }
  };

  const handleCubbyDispute = async (
    reason: 'EMPTY_CUBBY' | 'WRONG_ITEM_OR_ALLERGEN' | 'COLD_OR_MISSING_SIDE'
  ) => {
    setIsSubmittingIssue(true);
    setIssueFeedback(null);
    try {
      const res = await fetch('/api/paypal/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.orderId,
          reason,
          resolution: resolutionMode,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (resolutionMode === 'RUSH_REMAKE' && data.order) {
          setIssueFeedback(
            `3m Rush Remake dispatched to ${data.order.cubbyOrBay} (${order.cubbyOrBay} quarantined).`
          );
          onOrderUpdated?.(data.order);
        } else {
          setIssueFeedback(
            `Instant PayPal refund ($${order.totalAmount.toFixed(2)}) issued & ${order.cubbyOrBay} quarantined.`
          );
          setTimeout(() => {
            onRefundComplete?.();
          }, 1600);
        }
      } else {
        setIssueFeedback(data.detail ?? 'Could not process resolution automatically.');
      }
    } catch {
      setIssueFeedback('Network error submitting cubby issue.');
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  return (
    <div className="w-full bg-white rounded-3xl overflow-hidden border border-emerald-200 shadow-md">
      {/* Top Banner */}
      <div className="bg-emerald-700 p-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <span className="text-xs uppercase font-bold text-emerald-100 block">
              Doorstep Arrival Verified
            </span>
            <h3 className="font-serif text-sm font-bold text-white truncate">
              Captured via PayPal Escrow
            </h3>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="font-mono text-xs font-bold text-white">
            {order.orderId}
          </span>
          <span className="text-xs text-emerald-100 block font-mono">
            ${order.totalAmount.toFixed(2)} PAID
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {/* PROD-36: Express Shelf "Color-of-the-Day" Zero-Hardware Verification Badge */}
        <div className="mb-3 px-3 py-2 rounded-xl bg-culinary-bg border border-culinary-border flex items-center justify-between gap-2 text-xs">
          <span className="flex items-center gap-2 font-semibold text-culinary-text min-w-0">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 animate-pulse motion-reduce:animate-none ${shelfColor.dotClass}`}
            />
            <span className="truncate">Express Shelf: {shelfColor.name}</span>
          </span>
          <span className="font-mono font-bold text-culinary-muted shrink-0">
            {shelfColor.code}
          </span>
        </div>

        {/* Station & Real Scannable QR Code Row */}
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col justify-center text-center min-w-0">
            <span className="text-xs uppercase font-bold text-emerald-800 tracking-wider block">
              {isHighTopBay ? 'Assigned Bay' : 'Pickup Cubby'}
            </span>
            <span className="font-serif text-lg sm:text-xl font-bold text-emerald-950 block mt-0.5 leading-snug truncate">
              {order.cubbyOrBay}
            </span>
            <span className="text-xs text-emerald-800 font-medium mt-0.5 truncate">
              {isHighTopBay ? 'Table Plated & Ready' : 'Ready for Grab & Go'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-culinary-bg border border-culinary-border flex items-center justify-center gap-2.5 min-w-0">
            <div className="p-1.5 bg-white rounded-lg border border-culinary-border shrink-0">
              <QRCodeSVG
                value={order.offlineQrToken ?? `BITEPASS:${order.orderId}`}
                size={44}
              />
            </div>
            <div className="text-left min-w-0">
              <span className="text-xs uppercase font-bold text-culinary-muted block truncate">
                Doorstep Pass
              </span>
              <span className="text-xs font-mono font-bold text-culinary-text block">
                FASTPASS
              </span>
              <span className="text-xs text-culinary-sage font-semibold block truncate">
                Scan Locker
              </span>
            </div>
          </div>
        </div>

        {/* Minimal Item Recap */}
        <div className="p-3 rounded-2xl bg-culinary-bg border border-culinary-border mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {order.item.image && (
              <div
                className="relative w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-culinary-border"
                style={{ position: 'relative' }}
              >
                <Image
                  src={order.item.image}
                  alt={order.item.name}
                  fill
                  sizes="36px"
                  className="object-cover"
                />
              </div>
            )}
            <div className="min-w-0">
              <span className="font-semibold text-xs text-culinary-text truncate block">
                {order.item.name}
              </span>
              <span className="text-xs text-culinary-muted truncate block">
                {order.item.merchantName}
              </span>
            </div>
          </div>

          <span className="font-mono text-xs font-bold text-emerald-800 shrink-0">
            ${order.totalAmount.toFixed(2)}
          </span>
        </div>

        {/* PROD-35 & PROD-36: Wallet Pass, .ics Calendar Hold & Coworker Pickup Run */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          <button
            type="button"
            onClick={handleDownloadWalletPass}
            className="min-h-[44px] px-2 py-2 rounded-xl bg-culinary-bg hover:bg-culinary-subtle border border-culinary-border text-xs font-semibold text-culinary-text inline-flex items-center justify-center gap-1 cursor-pointer"
          >
            <Wallet className="w-3.5 h-3.5 text-paypal-blue shrink-0" />
            <span className="truncate">Wallet Pass</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadCalendarBlock}
            className="min-h-[44px] px-2 py-2 rounded-xl bg-culinary-bg hover:bg-culinary-subtle border border-culinary-border text-xs font-semibold text-culinary-text inline-flex items-center justify-center gap-1 cursor-pointer"
          >
            <CalendarPlus className="w-3.5 h-3.5 text-culinary-sage shrink-0" />
            <span className="truncate">+ Calendar</span>
          </button>
          <button
            type="button"
            onClick={handleInviteFloorRun}
            className="min-h-[44px] px-2 py-2 rounded-xl bg-culinary-bg hover:bg-culinary-subtle border border-culinary-border text-xs font-semibold text-culinary-text inline-flex items-center justify-center gap-1 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-culinary-terracotta shrink-0" />
            <span className="truncate">Invite Floor</span>
          </button>
        </div>

        {utilityFeedback && (
          <p
            role="status"
            className="mb-3 px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-900"
          >
            {utilityFeedback}
          </p>
        )}

        {/* 2-Tap Self-Serve Cubby Exception Resolution (Instant Refund or 3m Rush Remake) */}
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setShowIssueDrawer((prev) => !prev)}
            aria-expanded={showIssueDrawer}
            className="w-full min-h-[44px] py-2 px-3 rounded-xl bg-culinary-bg hover:bg-culinary-subtle border border-culinary-border text-xs font-semibold text-culinary-muted hover:text-culinary-text inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LifeBuoy className="w-3.5 h-3.5 text-culinary-terracotta" />
            <span>Problem at Bay or Cubby? (Instant Refund)</span>
          </button>

          {showIssueDrawer && (
            <div className="mt-2 p-3 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
              <div
                role="radiogroup"
                aria-label="Exception resolution preference"
                className="grid grid-cols-2 gap-1.5"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={resolutionMode === 'INSTANT_REFUND'}
                  onClick={() => setResolutionMode('INSTANT_REFUND')}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold border cursor-pointer ${
                    resolutionMode === 'INSTANT_REFUND'
                      ? 'bg-paypal-blue text-white border-paypal-blue'
                      : 'bg-white text-culinary-text border-amber-300'
                  }`}
                >
                  Instant PayPal Refund
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={resolutionMode === 'RUSH_REMAKE'}
                  onClick={() => setResolutionMode('RUSH_REMAKE')}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold border cursor-pointer ${
                    resolutionMode === 'RUSH_REMAKE'
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-culinary-text border-amber-300'
                  }`}
                >
                  3m Rush Remake
                </button>
              </div>

              <p className="text-xs font-semibold text-amber-950 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-culinary-amber shrink-0" />
                <span>Tap issue to quarantine station &amp; resolve immediately:</span>
              </p>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  type="button"
                  disabled={isSubmittingIssue}
                  onClick={() => handleCubbyDispute('EMPTY_CUBBY')}
                  className="py-2 px-3 rounded-xl bg-white hover:bg-amber-100/60 border border-amber-300 text-xs font-semibold text-culinary-text text-left cursor-pointer disabled:opacity-50"
                >
                  1. Cubby / Bay was empty on arrival
                </button>
                <button
                  type="button"
                  disabled={isSubmittingIssue}
                  onClick={() => handleCubbyDispute('WRONG_ITEM_OR_ALLERGEN')}
                  className="py-2 px-3 rounded-xl bg-white hover:bg-amber-100/60 border border-amber-300 text-xs font-semibold text-culinary-text text-left cursor-pointer disabled:opacity-50"
                >
                  2. Wrong dish or allergen safety concern
                </button>
              </div>
              {issueFeedback && (
                <p className="text-xs font-bold text-emerald-800 pt-1">
                  {issueFeedback}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Reset / Done Button */}
        <button
          type="button"
          onClick={onReset}
          className="w-full min-h-[44px] py-2.5 px-3 rounded-xl bg-culinary-text hover:bg-stone-800 active:scale-[0.99] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
        >
          <RotateCcw className="w-3.5 h-3.5 text-stone-300" />
          <span>Reset Simulation</span>
        </button>
      </div>
    </div>
  );
}

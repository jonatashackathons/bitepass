'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  ClientSideRowModelModule,
  ColDef,
  GetRowIdParams,
  ICellRendererParams,
  ModuleRegistry,
  NumberFilterModule,
  TextFilterModule,
  ValidationModule,
  themeQuartz,
} from 'ag-grid-community';
import { BayCapacity, OrderTicket } from '@/lib/types';
import {
  ChefHat,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Armchair,
  Flame,
  LogOut,
  Ban,
  Unlock,
} from 'lucide-react';

// Register ONLY lean AG Grid v33 modules needed for KDS operations (avoids ~1MB AllCommunityModule bloat)
ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  TextFilterModule,
  NumberFilterModule,
  ValidationModule,
]);

const warmQuartzTheme = themeQuartz.withParams({
  backgroundColor: '#FFFFFF',
  headerBackgroundColor: '#FAF9F5',
  borderColor: '#EAE7DF',
  rowHoverColor: '#F5F3EF',
  headerTextColor: '#57534E',
  foregroundColor: '#1C1917',
  fontSize: 13,
});

export type KdsOperatorAction =
  | 'ACCEPT_AND_FIRE'
  | 'MARK_READY'
  | 'SETTLE_AND_UNLOCK'
  | 'CLEAR_STATION'
  | 'DELAY_5M'
  | 'VOID_86_ITEM'
  | 'CLEAR_QUARANTINE';

interface MerchantQueueGridProps {
  orders: OrderTicket[];
  bayCapacity?: BayCapacity;
  onOperatorAction?: (
    orderId: string,
    action: KdsOperatorAction
  ) => Promise<void> | void;
  busyOrderId?: string | null;
}

export function MerchantQueueGrid({
  orders,
  bayCapacity,
  onOperatorAction,
  busyOrderId,
}: MerchantQueueGridProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);

  const columnDefs = useMemo<ColDef<OrderTicket>[]>(
    () => [
      {
        field: 'orderId',
        headerName: 'Ticket #',
        width: 105,
        cellRenderer: (params: ICellRendererParams<OrderTicket>) => (
          <span className="font-mono font-bold text-culinary-text">
            {params.value}
          </span>
        ),
      },
      {
        field: 'status',
        headerName: 'Escrow Status',
        width: 185,
        cellRenderer: (params: ICellRendererParams<OrderTicket>) => {
          const status = params.value;
          switch (status) {
            case 'CAPTURED':
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>CAPTURED / SETTLED</span>
                </span>
              );
            case 'COLLECTED':
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-300 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-stone-600" />
                  <span>COLLECTED</span>
                </span>
              );
            case 'AUTHORIZED':
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-paypal-blue border border-blue-300 text-xs font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-paypal-blue" />
                  <span>AUTHORIZED (HOLD)</span>
                </span>
              );
            case 'CAPTURE_FAILED':
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-800 border border-red-300 text-xs font-bold">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-700" />
                  <span>CAPTURE FAILED</span>
                </span>
              );
            case 'CANCELLED_FEE_CAPTURED':
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-300 text-xs font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                  <span>CANCELLED ($5 FEE)</span>
                </span>
              );
            case 'REFUNDED':
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-800 border border-red-200 text-xs font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                  <span>REFUNDED</span>
                </span>
              );
            case 'VOIDED':
            case 'EXPIRED':
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 text-xs font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{status}</span>
                </span>
              );
            default:
              return <span className="text-xs text-culinary-muted">{status}</span>;
          }
        },
      },
      {
        field: 'customerName',
        headerName: 'Guest',
        width: 130,
        cellRenderer: (params: ICellRendererParams<OrderTicket>) => (
          <span className="font-semibold text-culinary-text">{params.value}</span>
        ),
      },
      {
        headerName: 'Artisan Meal & Prep Stage',
        flex: 1,
        minWidth: 195,
        valueGetter: (params) => params.data?.item.name,
        cellRenderer: (params: ICellRendererParams<OrderTicket>) => {
          const row = params.data;
          if (!row) return null;
          return (
            <div className="flex flex-col justify-center py-1 leading-tight">
              <span className="font-semibold text-culinary-text text-xs truncate">
                {row.item.name}
              </span>
              <span className="text-xs text-culinary-muted truncate mt-0.5">
                {row.item.merchantName} &bull; {row.fulfillmentStage.replace('_', ' ')}
                {row.selectedTweak ? ` • ${row.selectedTweak}` : ''}
              </span>
            </div>
          );
        },
      },
      {
        field: 'cubbyOrBay',
        headerName: 'Station',
        width: 155,
        cellRenderer: (params: ICellRendererParams<OrderTicket>) => {
          const val = String(params.value ?? '');
          const isBay = val.startsWith('Bay #');
          return (
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                isBay
                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                  : 'bg-purple-50 text-purple-800 border border-purple-200'
              }`}
            >
              {isBay ? (
                <Armchair className="w-3 h-3 shrink-0" />
              ) : (
                <Clock className="w-3 h-3 shrink-0" />
              )}
              <span className="truncate">{val}</span>
            </span>
          );
        },
      },
      {
        field: 'totalAmount',
        headerName: 'Amount',
        width: 95,
        cellRenderer: (params: ICellRendererParams<OrderTicket>) => (
          <span className="font-mono font-bold text-culinary-text">
            ${Number(params.value ?? 0).toFixed(2)}
          </span>
        ),
      },
      {
        headerName: 'KDS Controls',
        width: 245,
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams<OrderTicket>) => {
          const row = params.data;
          if (!row || !onOperatorAction) {
            return (
              <span className="text-xs text-culinary-muted font-mono">
                Read-only
              </span>
            );
          }
          const isBusy = busyOrderId === row.orderId;

          if (row.fulfillmentStage === 'QUARANTINED') {
            return (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onOperatorAction(row.orderId, 'CLEAR_QUARANTINE')}
                className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Unlock className="w-3 h-3" />
                <span>Clear Quarantine</span>
              </button>
            );
          }

          if (row.status === 'CAPTURED' && row.fulfillmentStage !== 'HANDED_OFF') {
            return (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onOperatorAction(row.orderId, 'CLEAR_STATION')}
                className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <LogOut className="w-3 h-3" />
                <span>Clear Bay</span>
              </button>
            );
          }

          if (row.status === 'AUTHORIZED' || row.status === 'CAPTURE_FAILED') {
            return (
              <div className="flex items-center gap-1">
                {row.status === 'CAPTURE_FAILED' || row.fulfillmentStage === 'READY' ? (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onOperatorAction(row.orderId, 'SETTLE_AND_UNLOCK')}
                    className="min-h-[38px] px-2 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    title="Broadband KDS Settlement & Station Unlock"
                  >
                    <Unlock className="w-3 h-3" />
                    <span>Settle</span>
                  </button>
                ) : row.fulfillmentStage === 'GRACE_HOLD' ? (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onOperatorAction(row.orderId, 'ACCEPT_AND_FIRE')}
                    className="min-h-[38px] px-2 py-1 rounded-lg bg-culinary-amber hover:bg-amber-800 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Flame className="w-3 h-3" />
                    <span>Fire</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onOperatorAction(row.orderId, 'MARK_READY')}
                    className="min-h-[38px] px-2 py-1 rounded-lg bg-paypal-blue hover:bg-paypal-hover text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    Ready
                  </button>
                )}
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => onOperatorAction(row.orderId, 'DELAY_5M')}
                  title="+5m Delay & Re-open 60s Diner Free Cancel"
                  className="min-h-[38px] px-2 py-1 rounded-lg bg-culinary-bg hover:bg-culinary-subtle border border-culinary-border text-culinary-text text-xs font-semibold cursor-pointer"
                >
                  +5m
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => onOperatorAction(row.orderId, 'VOID_86_ITEM')}
                  title="86 Item & Void Diner Hold ($0)"
                  className="min-h-[38px] px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-800 text-xs font-bold inline-flex items-center gap-0.5 cursor-pointer"
                >
                  <Ban className="w-3 h-3" />
                  <span>86</span>
                </button>
              </div>
            );
          }

          return (
            <span className="text-xs text-culinary-muted font-mono">
              Settled
            </span>
          );
        },
      },
    ],
    [onOperatorAction, busyOrderId]
  );

  const defaultColDef = useMemo<ColDef<OrderTicket>>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
    }),
    []
  );

  const getRowId = useMemo(
    () => (params: GetRowIdParams<OrderTicket>) => params.data.orderId,
    []
  );

  const occupiedBays = bayCapacity?.occupiedBays ?? 0;
  const totalBays = bayCapacity?.totalBays ?? 2;
  const quarantinedCount = bayCapacity?.quarantinedStations?.length ?? 0;

  return (
    <div className="w-full culinary-panel rounded-3xl p-4 sm:p-6 border border-culinary-border shadow-culinary">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-culinary-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
            <ChefHat className="w-5 h-5 text-culinary-amber" />
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-culinary-text flex items-center gap-2 flex-wrap">
              <span>Live Kitchen Operations Terminal</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold">
                AG Grid React
              </span>
            </h3>
            <p className="text-xs text-culinary-muted">
              Real-time ticket telemetry synchronized via SSE with consumer 2-phase escrow
            </p>
          </div>
        </div>

        {/* Accurate Synchronized Bay Capacity Pill */}
        <div className="flex flex-wrap items-center gap-2">
          {quarantinedCount > 0 && (
            <span className="px-2.5 py-1 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-800">
              {quarantinedCount} Quarantined
            </span>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-culinary-bg border border-culinary-border text-xs">
            <Armchair className="w-3.5 h-3.5 text-culinary-terracotta" />
            <span className="text-culinary-muted">Fast-Track High-Tops:</span>
            <span
              data-testid="bay-capacity-badge"
              className={`font-mono font-bold ${
                occupiedBays >= totalBays ? 'text-amber-800' : 'text-emerald-800'
              }`}
            >
              {occupiedBays} / {totalBays} Bays Active
            </span>
          </div>
        </div>
      </div>

      {/* AG Grid Canvas */}
      <div className="w-full h-[340px] rounded-2xl overflow-hidden border border-culinary-border">
        <AgGridReact<OrderTicket>
          theme={warmQuartzTheme}
          rowData={orders}
          getRowId={getRowId}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          animateRows={!reducedMotion}
          suppressColumnVirtualisation={true}
          rowHeight={64}
          headerHeight={42}
        />
      </div>

      <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-culinary-muted font-mono">
        <span>● Live SSE stream + gloved KDS station controls active</span>
        <span>{orders.length} Kitchen Tickets</span>
      </div>
    </div>
  );
}

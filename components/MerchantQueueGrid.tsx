'use client';

import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  ICellRendererParams,
  themeQuartz,
} from 'ag-grid-community';
import { OrderTicket, BayCapacity } from '@/lib/types';
import { ChefHat, CheckCircle2, Clock, AlertTriangle, ShieldCheck, Armchair } from 'lucide-react';

// Register AG Grid Community Modules
ModuleRegistry.registerModules([AllCommunityModule]);

const warmQuartzTheme = themeQuartz.withParams({
  backgroundColor: '#FFFFFF',
  headerBackgroundColor: '#FAF9F5',
  borderColor: '#EAE7DF',
  rowHoverColor: '#F5F3EF',
  headerTextColor: '#57534E',
  foregroundColor: '#1C1917',
  fontSize: 13,
});

interface MerchantQueueGridProps {
  orders: OrderTicket[];
  bayCapacity?: BayCapacity;
}

export function MerchantQueueGrid({ orders, bayCapacity }: MerchantQueueGridProps) {
  const columnDefs = useMemo<ColDef<OrderTicket>[]>(
    () => [
      {
        field: 'orderId',
        headerName: 'Ticket #',
        width: 100,
        cellRenderer: (params: ICellRendererParams<OrderTicket>) => (
          <span className="font-mono font-bold text-[#1C1917]">
            {params.value}
          </span>
        ),
      },
      {
        field: 'status',
        headerName: 'Escrow Status',
        width: 175,
        cellRenderer: (params: ICellRendererParams<OrderTicket>) => {
          const status = params.value;
          switch (status) {
            case 'CAPTURED':
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>CAPTURED / SETTLED</span>
                </span>
              );
            case 'AUTHORIZED':
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0070BA] border border-blue-300 text-xs font-bold animate-pulse">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0070BA]" />
                  <span>AUTHORIZED (HOLD)</span>
                </span>
              );
            case 'PROPOSED':
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-xs font-semibold">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>PROPOSED</span>
                </span>
              );
            case 'VOIDED':
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>VOIDED</span>
                </span>
              );
            default:
              return <span className="text-xs text-[#78716C]">{status}</span>;
          }
        },
      },
      {
        field: 'customerName',
        headerName: 'Guest',
        width: 130,
        cellRenderer: (params: ICellRendererParams<OrderTicket>) => (
          <span className="font-semibold text-[#1C1917]">
            {params.value}
          </span>
        ),
      },
      {
        headerName: 'Artisan Meal & Notes',
        flex: 1,
        minWidth: 180,
        valueGetter: (params) => params.data?.item.name,
        cellRenderer: (params: ICellRendererParams<OrderTicket>) => {
          const item = params.data?.item;
          const tweak = params.data?.selectedTweak;
          if (!item) return null;
          return (
            <div className="flex flex-col justify-center py-1">
              <span className="font-semibold text-[#1C1917] text-xs truncate">
                {item.name}
              </span>
              <span className="text-[11px] text-[#78716C] truncate">
                {item.merchantName} {tweak ? `• ${tweak}` : ''}
              </span>
            </div>
          );
        },
      },
      {
        field: 'cubbyOrBay',
        headerName: 'Station',
        width: 150,
        cellRenderer: (params: ICellRendererParams<OrderTicket>) => {
          const val = params.value || '';
          const isBay = val.startsWith('Bay #');
          return (
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                isBay
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-purple-50 text-purple-700 border border-purple-200'
              }`}
            >
              {isBay ? <Armchair className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
              <span>{val}</span>
            </span>
          );
        },
      },
      {
        field: 'status',
        headerName: 'Escrow Status',
        width: 180,
        cellRenderer: (params: ICellRendererParams<OrderTicket>) => {
          const status = params.value;
          switch (status) {
            case 'CAPTURED':
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>CAPTURED / SETTLED</span>
                </span>
              );
            case 'AUTHORIZED':
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0070BA] border border-blue-300 text-xs font-bold animate-pulse">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0070BA]" />
                  <span>AUTHORIZED (HOLD)</span>
                </span>
              );
            case 'PROPOSED':
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-xs font-semibold">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>PROPOSED</span>
                </span>
              );
            case 'VOIDED':
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>VOIDED</span>
                </span>
              );
            default:
              return <span className="text-xs text-[#78716C]">{status}</span>;
          }
        },
      },
      {
        field: 'totalAmount',
        headerName: 'Amount',
        width: 100,
        cellRenderer: (params: ICellRendererParams<OrderTicket>) => (
          <span className="font-mono font-bold text-[#1C1917]">
            ${Number(params.value ?? 0).toFixed(2)}
          </span>
        ),
      },
    ],
    []
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
    }),
    []
  );

  const occupiedBays = bayCapacity?.occupiedBays ?? 1;
  const totalBays = bayCapacity?.totalBays ?? 2;

  return (
    <div className="w-full culinary-panel rounded-3xl p-6 border border-[#EAE7DF] shadow-culinary">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-[#EAE7DF]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-[#1C1917] flex items-center gap-2">
              <span>Live Kitchen Operations Terminal</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
                AG Grid React
              </span>
            </h3>
            <p className="text-xs text-[#78716C]">
              Real-time ticket telemetry synchronized with consumer PayPal 2-phase authorization
            </p>
          </div>
        </div>

        {/* Capacity pill */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#FAF9F5] border border-[#EAE7DF] text-xs">
            <Armchair className="w-3.5 h-3.5 text-[#E05A38]" />
            <span className="text-[#78716C]">Fast-Track High-Tops:</span>
            <span
              className={`font-mono font-bold ${
                occupiedBays >= totalBays ? 'text-amber-700' : 'text-emerald-700'
              }`}
            >
              {occupiedBays} / {totalBays} Bays Active
            </span>
          </div>
        </div>
      </div>

      {/* AG Grid Canvas */}
      <div className="w-full h-[280px] rounded-2xl overflow-hidden border border-[#EAE7DF]">
        <AgGridReact
          theme={warmQuartzTheme}
          rowData={orders}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          animateRows={true}
          rowHeight={48}
          headerHeight={38}
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-[#78716C] font-mono">
        <span>● Auto-refreshes on PayPal authorization and &lt;50m arrival settlement</span>
        <span>{orders.length} Active Kitchen Orders</span>
      </div>
    </div>
  );
}

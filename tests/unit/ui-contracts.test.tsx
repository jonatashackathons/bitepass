import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MerchantQueueGrid } from '@/components/MerchantQueueGrid';
import { MENU_CATALOG } from '@/lib/catalog';
import { OrderTicket } from '@/lib/types';

describe('UI Contracts — Synchronized Bay Capacity & Deduplicated AG Grid KDS', () => {
  const sampleOrders: OrderTicket[] = [
    {
      orderId: 'ORD-1089',
      merchantId: 'merch_green_grains',
      customerName: 'Sarah Jenkins',
      item: MENU_CATALOG[1],
      totalAmountCents: 1380,
      totalAmount: 13.8,
      status: 'CAPTURED',
      fulfillmentStage: 'READY',
      cubbyOrBay: 'Bay #1',
      etaMinutes: 0,
      createdAt: Date.now() - 120_000,
      version: 2,
    },
  ];

  it('renders exact bayCapacity (0 / 2 vs 2 / 2) and deduplicates Escrow Status column header', async () => {
    const onAction = vi.fn();
    const { rerender } = render(
      <MerchantQueueGrid
        orders={sampleOrders}
        bayCapacity={{
          occupiedBays: 2,
          totalBays: 2,
          activeBayNames: ['Bay #1', 'Bay #2'],
        }}
        onOperatorAction={onAction}
      />
    );

    expect(screen.getByTestId('bay-capacity-badge')).toHaveTextContent(
      '2 / 2 Bays Active'
    );

    // Must render exactly ONE "Escrow Status" column header (fixing duplicate column bug)
    const escrowHeaders = await screen.findAllByText('Escrow Status');
    expect(escrowHeaders).toHaveLength(1);

    // Clicking "Clear Bay" invokes KDS CLEAR_STATION action
    const clearButton = await screen.findByRole('button', { name: /Clear Bay/i });
    fireEvent.click(clearButton);
    expect(onAction).toHaveBeenCalledWith('ORD-1089', 'CLEAR_STATION');

    rerender(
      <MerchantQueueGrid
        orders={[]}
        bayCapacity={{
          occupiedBays: 0,
          totalBays: 2,
          activeBayNames: [],
        }}
        onOperatorAction={onAction}
      />
    );

    expect(screen.getByTestId('bay-capacity-badge')).toHaveTextContent(
      '0 / 2 Bays Active'
    );
  });
});

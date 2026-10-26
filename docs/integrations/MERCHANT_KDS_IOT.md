# 🍳 Integration Guide: Merchant KDS, AG Grid & Smart Cubby IoT

> **Domain:** Kitchen Display Systems, AG Grid Observability & Smart Locker Hardware  
> **Master Graph Hub:** [README.md](../../README.md) &middot; [Architecture](../ARCHITECTURE.md) &middot; [Pitch Deck](../PITCH_DECK.md) &middot; [Gap Analysis](../GAP_ANALYSIS_ROADMAP.md)

---

## 1. Overview: The Merchant Kitchen Station

For food merchants, BitePass is not another chaotic third-party tablet chiming at the counter. It integrates directly into the line cooks' workflow:
1. **Pre-Allocated Capacity Bays:** High-top tables and heated pick-up cubbies are reserved **before** preparation begins.
2. **Real-Time Ticket Observability (AG Grid React v33):** The kitchen board visualizes live order statuses (`PROPOSED` $\to$ `AUTHORIZED` $\to$ `CAPTURED`).
3. **Automated Contactless Pickup Lockers:** Upon proximity capture, an IoT relay unlocks the customer's assigned cubby door without requiring cashier interaction.

---

## 2. Current Mock vs. Production Gap

| Feature | Current Working Demo | Production Commercial Deployment |
| :--- | :--- | :--- |
| **Grid Engine** | AG Grid React v33 Community with custom Quartz theme | AG Grid Enterprise with Server-Side Row Model, WebSockets, and Row Flashing |
| **POS Bridge** | In-memory Next.js store (`lib/mock-db.ts`) | Toast POS API, Square POS, Clover REST API, or Olo Cloud Dispatch |
| **Cubby Lockers** | Simulated cubby assignment (`Pickup Cubby #D`) | Physical heated cubby hardware (Apex Supply Chain / Minnow IoT) via MQTT / GPIO relay |
| **Kitchen Sync** | Client polling / shared state | Redis Pub/Sub $\to$ Server-Sent Events (SSE) / WebSockets |

---

## 3. Step-by-Step Production Implementation Guide

### Step 1: AG Grid Enterprise Configuration
In production, enable real-time row animations, cell flashing, and server-side filtering:
```typescript
// components/MerchantQueueGrid.tsx
import { AgGridReact } from 'ag-grid-react';
import { themeQuartz } from 'ag-grid-community';

const warmQuartzTheme = themeQuartz.withParams({
  backgroundColor: '#FFFFFF',
  headerBackgroundColor: '#FAF9F5',
  borderColor: '#EAE7DF',
  rowHoverColor: '#F5F3EF',
  headerTextColor: '#57534E',
  foregroundColor: '#1C1917',
  fontSize: 13,
});

export function MerchantQueueGrid({ orders }: { orders: OrderTicket[] }) {
  const columnDefs = [
    { field: 'orderId', headerName: 'Ticket #', width: 100 },
    {
      field: 'status',
      headerName: 'Escrow Status',
      width: 175,
      cellRenderer: StatusBadgeRenderer,
      enableCellChangeFlash: true, // Flashes green on CAPTURE
    },
    { field: 'customerName', headerName: 'Guest', width: 130 },
    { field: 'item.name', headerName: 'Artisan Meal & Notes', flex: 1 },
    { field: 'cubbyOrBay', headerName: 'Station', width: 150 },
    { field: 'totalAmount', headerName: 'Amount', width: 100 },
  ];

  return (
    <div style={{ height: 420, width: '100%' }}>
      <AgGridReact
        theme={warmQuartzTheme}
        rowData={orders}
        columnDefs={columnDefs}
        animateRows={true}
      />
    </div>
  );
}
```

### Step 2: Toast POS Kitchen Order Bridge
Forward authorized orders into the restaurant's existing Toast KDS printers/screens:
```typescript
// lib/integrations/toast-pos.ts
export async function pushOrderToToastKDS(order: OrderTicket) {
  const toastEndpoint = process.env.TOAST_API_URL + '/orders/v2';
  
  const payload = {
    diningOption: 'TAKE_OUT',
    promisedDate: new Date(Date.now() + order.etaMinutes * 60000).toISOString(),
    items: [
      {
        itemId: order.item.id,
        quantity: 1,
        specialInstructions: `BitePass Pickup: ${order.cubbyOrBay}`,
      },
    ],
    payments: [
      {
        type: 'CUSTOM',
        customPaymentType: 'BitePass PayPal Escrow',
        amount: order.totalAmount,
      },
    ],
  };

  await fetch(toastEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.TOAST_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}
```

### Step 3: Smart Cubby IoT Hardware Relay (MQTT)
When Phase 2 capture completes, dispatch an MQTT unlock command to the IoT locker:
```typescript
// lib/iot/cubby-controller.ts
import mqtt from 'mqtt';

const client = mqtt.connect(process.env.MQTT_BROKER_URL!);

export function unlockCubbyLocker(cubbyName: string, orderId: string) {
  const topic = `merchant/cafe-01/cubbies/${cubbyName}/unlock`;
  const message = JSON.stringify({
    orderId,
    timestamp: Date.now(),
    action: 'UNLOCK',
    pulseDurationMs: 5000, // Magnetic latch stays open 5 seconds
  });

  client.publish(topic, message, { qos: 1 });
}
```

---

## 4. Connected Graph

* 🏠 **Hub:** [README.md](../../README.md)
* 🏗️ **Architecture:** [docs/ARCHITECTURE.md](../ARCHITECTURE.md)
* 💳 **PayPal Escrow Integration:** [PAYPAL_ESCROW.md](PAYPAL_ESCROW.md)
* 🧠 **Gemini 4 Argon Reasoning:** [GEMINI_ARGON.md](GEMINI_ARGON.md)
* 📍 **Geofencing & Passes:** [MOBILE_GEOFENCING.md](MOBILE_GEOFENCING.md)
* 🗺️ **Roadmap & Checklist:** [docs/GAP_ANALYSIS_ROADMAP.md](../GAP_ANALYSIS_ROADMAP.md)

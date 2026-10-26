# 📍 Integration Guide: Mobile Geofencing & Contactless Passes

> **Domain:** Proximity Settlement, Background Geofencing & Apple/Google Passes  
> **Master Graph Hub:** [README.md](../../README.md) &middot; [Architecture](../ARCHITECTURE.md) &middot; [Pitch Deck](../PITCH_DECK.md) &middot; [Gap Analysis](../GAP_ANALYSIS_ROADMAP.md)

---

## 1. Overview: The Doorstep Proximity Trigger

The core magic of BitePass is that payment capture happens **hands-free when the user arrives at the cafe doorstep (< 50m)**.

This requires two integrated subsystems:
1. **Background Mobile Geofencing:** Accurate location monitoring with battery conservation.
2. **Contactless Wallet Pass:** Apple PassKit (`.pkpass`) and Google Wallet API integration for instant NFC or optical scanning at the pickup station.

---

## 2. Current Mock vs. Production Gap

| Feature | Current Working Demo | Production Commercial Deployment |
| :--- | :--- | :--- |
| **Location Source** | Simulation buttons / reactive React state | iOS CoreLocation `CLCircularGeofenceRegion` & Android Fused Location Provider |
| **Battery Impact** | Zero (in-memory simulation) | Low-power cell tower/WiFi beacons until within 200m; high accuracy GPS only within final 100m |
| **Pass Format** | In-app QR code & ticket ID | Native Apple Wallet (`.pkpass`) & Google Wallet API with NFC Tap-and-Go |
| **Anti-Spoofing** | None (client-reported) | Signed geofence telemetry token + cafe Bluetooth Low Energy (BLE) iBeacon verification |

---

## 3. Step-by-Step Production Implementation Guide

### Step 1: iOS CoreLocation Background Geofencing
Set up a 50m circular geofence region when an order is authorized:
```swift
// Swift / React Native Native Module: LocationManager.swift
import CoreLocation

class GeofenceService: NSObject, CLLocationManagerDelegate {
    let locationManager = CLLocationManager()
    
    func monitorCafeDoorstep(latitude: Double, longitude: Double, orderId: String) {
        let center = CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
        let region = CLCircularRegion(center: center, radius: 50.0, identifier: orderId)
        region.notifyOnEntry = true
        region.notifyOnExit = false
        
        locationManager.startMonitoring(for: region)
    }
    
    func locationManager(_ manager: CLLocationManager, didEnterRegion region: CLRegion) {
        // Post proximity arrival event to BitePass capture endpoint
        APIClient.executeDoorstepCapture(orderId: region.identifier)
    }
}
```

### Step 2: Apple Wallet Pass Generation (`.pkpass`)
When Phase 1 escrow is authorized, generate a dynamic `.pkpass` bundle and push it to the user's Apple Wallet:
```typescript
// lib/passes/apple-wallet.ts
import { Template } from '@walletpass/pass-js';
import fs from 'fs';

export async function generateBitePassWalletPass(order: OrderTicket) {
  const template = new Template('storeCard', {
    passTypeIdentifier: 'pass.com.bitepass.concierge',
    teamIdentifier: process.env.APPLE_TEAM_ID!,
    organizationName: 'BitePass',
    description: 'BitePass Autonomous Pickup Pass',
    foregroundColor: 'rgb(28, 25, 23)',
    backgroundColor: 'rgb(250, 249, 245)',
  });

  const pass = template.createPass({
    serialNumber: order.orderId,
    description: `${order.item.name} at ${order.item.merchantName}`,
  });

  pass.primaryFields.add({
    key: 'cubby',
    label: 'PICKUP CUBBY',
    value: order.cubbyOrBay,
  });

  pass.secondaryFields.add({
    key: 'item',
    label: 'MEAL',
    value: order.item.name,
  });

  pass.setBarcodes({
    message: `${order.orderId}-FASTPASS`,
    format: 'PKBarcodeFormatQR',
    messageEncoding: 'iso-8859-1',
  });

  // Attach cafe geofence coordinates to automatically display pass on lock screen upon arrival
  pass.locations = [
    {
      latitude: 37.7749,
      longitude: -122.4194,
      relevantText: `Your ${order.item.name} is ready in ${order.cubbyOrBay}!`,
    },
  ];

  return await pass.asBuffer();
}
```

---

## 4. Connected Graph

* 🏠 **Hub:** [README.md](../../README.md)
* 🏗️ **Architecture:** [docs/ARCHITECTURE.md](../ARCHITECTURE.md)
* 💳 **PayPal Escrow Integration:** [PAYPAL_ESCROW.md](PAYPAL_ESCROW.md)
* 🧠 **Gemini 4 Argon Reasoning:** [GEMINI_ARGON.md](GEMINI_ARGON.md)
* 🍳 **Merchant KDS & AG Grid:** [MERCHANT_KDS_IOT.md](MERCHANT_KDS_IOT.md)
* 🗺️ **Roadmap & Checklist:** [docs/GAP_ANALYSIS_ROADMAP.md](../GAP_ANALYSIS_ROADMAP.md)

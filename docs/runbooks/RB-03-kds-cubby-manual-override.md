# Runbook RB-03: KDS Doorstep Settlement & Quarantined Cubby Override

> **Severity:** SEV-3 (Storefront Fulfillment Continuity)  
> **Code Owners:** Storefront & KDS Operations ([components/MerchantQueueGrid.tsx](../../components/MerchantQueueGrid.tsx), [app/api/orders/[orderId]/route.ts](../../app/api/orders/[orderId]/route.ts))

---

## 1. Scenario A: Diner Cellular Dead-Zone at Cafe Doorstep

### Symptoms
Diner arrives inside the cafe with an `AUTHORIZED` order and shows their HMAC-signed `FASTPASS` offline QR (`BP1:<orderId>:<cents>:<mac>`), but their mobile device has no cellular signal to call `/api/v1/paypal/capture`.

### Operator Resolution (1 Tap on Merchant KDS)
1. Open `/merchant` ([app/merchant/page.tsx](../../app/merchant/page.tsx)) and locate the diner's row by `Order ID` (`#BP-...`) or Express Shelf Color code.
2. Tap **`Settle & Unlock`** (`SETTLE_AND_UNLOCK` action).
3. The KDS executes Phase 2 capture over the cafe's broadband connection (`PayPal-Request-Id: cap:<orderId>`) and transitions the ticket to **`CAPTURED / SETTLED`**.
4. Hand off the meal and tap **`Clear Bay`** (`CLEAR_STATION`) to return the bay/cubby to the active pool.

### CLI Fallback
```bash
curl -sS -X PATCH "${BITEPASS_BASE_URL:-http://localhost:3000}/api/v1/orders/${ORDER_ID}" \
  -H "x-merchant-kds-token: ${MERCHANT_KDS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"action":"SETTLE_AND_UNLOCK"}'
```

---

## 2. Scenario B: Quarantined Cubby / Bay Recovery

### Symptoms
A diner reported an empty cubby or allergen concern (`POST /api/v1/paypal/refund`), which automatically quarantined the station (`isQuarantined = true`) so no subsequent orders are routed to it.

### Operator Resolution
1. Physically inspect, sanitize, and clear the quarantined cubby/bay.
2. On `/merchant`, tap **`Restore Bay`** (`CLEAR_QUARANTINE`) on the quarantined row — or run:

```bash
curl -sS -X PATCH "${BITEPASS_BASE_URL:-http://localhost:3000}/api/v1/orders/${ORDER_ID}" \
  -H "x-merchant-kds-token: ${MERCHANT_KDS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"action":"CLEAR_QUARANTINE","stationCode":"Cubby #4"}'
```

---

## 3. Scenario C: Kitchen Prep Surge (`+5m Delay`)

Tapping **`+5m`** (`DELAY_5M`) adds 5 minutes to the order ETA **and** automatically re-opens a 60-second `$0.00` free-cancellation window (`graceExpiresAt = now + 60_000`) so diners with hard calendar constraints are never trapped in a `$5.00` restocking fee caused by kitchen latency.


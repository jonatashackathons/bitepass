# Runbook RB-01: Orphaned PayPal Escrow Holds & Stuck `CAPTURING` Sagas

> **Severity:** SEV-2 (Financial Hold Hygiene / Station Capacity Lock)  
> **Code Owners:** Payments & Fulfillment Platform ([lib/reconciler.ts](../../lib/reconciler.ts), [lib/paypal-client.ts](../../lib/paypal-client.ts))

---

## 1. Symptoms & Alert Triggers

* `GET /api/v1/health` reports `telemetry.alerts.voidRateAlert: true` or elevated `AUTHORIZED` / `CAPTURING` orders older than 30 minutes.
* A merchant station (`Bay #1`, `Cubby #3`) remains occupied by an abandoned `AUTHORIZED` hold past the 3-hour escrow SLA (`ESCROW_EXPIRY_DURATION_MS = 10_800_000`) or an interrupted `CAPTURING` transition.

## 2. Automated Saga Recovery (`POST /api/v1/internal/reconcile`)

BitePass executes deterministic 2-way reconciliation in [lib/reconciler.ts](../../lib/reconciler.ts):

1. **Stuck `CAPTURING` Recovery (`> 30s`):** Replays `captureAuthorization(authId, { idempotencyKey: "cap:<orderId>" })`. PayPal deduplicates on `PayPal-Request-Id` so the diner is **never** double-charged, and transitions the local ticket to `CAPTURED` (or `CAPTURE_FAILED` if declined).
2. **Expired `AUTHORIZED` Hold Reaper (`> 3h`):** Calls `voidAuthorization(authId, "expire:<orderId>")`, transitions the ticket to `EXPIRED`, and immediately releases the leased bay/cubby.

### Execute Immediate Reconciliation Sweep

```bash
curl -sS -X POST "${BITEPASS_BASE_URL:-http://localhost:3000}/api/v1/internal/reconcile" \
  -H "Authorization: Bearer ${MERCHANT_KDS_TOKEN}" \
  -H "Content-Type: application/json"
```

Expected response (`200 OK`):
```json
{
  "success": true,
  "report": {
    "scanned": 4,
    "expiredReapedIds": ["ORD-9410"],
    "capturingRecoveredIds": ["ORD-9412"],
    "capturingFailedIds": []
  }
}
```

## 3. Verification & Escalation

1. Verify `failedOrderIds` is empty (`[]`) and check structured JSON logs (`X-Trace-Id`) for `Reaped expired >3h PayPal escrow hold` or `Recovered stuck CAPTURING order`.
2. Confirm station availability via `GET /api/v1/orders` (`bayCapacity.occupiedBays` / `occupiedCubbies`).
3. If PayPal returns `AUTHORIZATION_ALREADY_CAPTURED`, replay the webhook event using [RB-02](RB-02-paypal-webhook-dlq-replay.md).

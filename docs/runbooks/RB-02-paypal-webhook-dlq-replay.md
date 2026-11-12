# Runbook RB-02: PayPal Webhook Signature Verification & DLQ Replay

> **Severity:** SEV-2 (Out-of-Band Payment State Drift)  
> **Code Owners:** Payments Platform ([app/api/webhooks/paypal/route.ts](../../app/api/webhooks/paypal/route.ts), [scripts/ops/replay-webhook.mjs](../../scripts/ops/replay-webhook.mjs))

---

## 1. Symptoms & Alert Triggers

* PayPal Developer Dashboard shows failed webhook deliveries (`401` signature failure or `5xx` transient timeout) to `/api/v1/webhooks/paypal`.
* An authorization voided, expired, captured, refunded, or merchant-revoked (`MERCHANT.PARTNER-CONSENT.REVOKED`) in PayPal has not updated local state.

## 2. Root-Cause Triage

1. **Signature Rejections (`401 PAYPAL_WEBHOOK_SIGNATURE_INVALID`):**
   * Confirm `PAYPAL_WEBHOOK_ID` in production matches the exact Webhook Listener ID configured in PayPal Live Dashboard (validated at startup by [lib/env.ts](../../lib/env.ts)).
   * Ensure reverse proxies preserve all `paypal-transmission-*` headers unmodified.
2. **Idempotency Guarantee:**
   * Every processed `event.id` is recorded under `webhook:${event.id}` in the `IdempotencyRecord` store. Replaying an already-processed webhook safely returns `{ "received": true, "idempotentReplay": true }`.

## 3. Deterministic Webhook Replay

Use [scripts/ops/replay-webhook.mjs](../../scripts/ops/replay-webhook.mjs) to replay a captured PayPal webhook JSON payload against staging/sandbox or verify webhook handling:

```bash
node scripts/ops/replay-webhook.mjs \
  --url "${BITEPASS_BASE_URL:-http://localhost:3000}/api/v1/webhooks/paypal" \
  --event PAYMENT.AUTHORIZATION.VOIDED \
  --auth-id AUTH-MOCK-101
```

Or replay a raw DLQ event file with original transmission headers:

```bash
node scripts/ops/replay-webhook.mjs \
  --url "${BITEPASS_BASE_URL}/api/v1/webhooks/paypal" \
  --file ./dlq-event.json
```

## 4. Verification

* Confirm HTTP `200 OK` with `"received": true`.
* Query `GET /api/v1/orders/<orderId>` with `x-merchant-kds-token` to verify terminal order status and station release.


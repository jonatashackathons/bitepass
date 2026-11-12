# Security Policy

## Supported Versions

| Version | Supported | Notes |
| :--- | :--- | :--- |
| `0.2.x` | Yes | Hardened Hexagonal Monolith (`/api/v1/*`, IDOR/RBAC guards, fail-closed PayPal v2) |
| `< 0.2.0` | No | Prototype baseline |

## Security Architecture Highlights

* **Zero Raw Payment Credentials (PCI-DSS SAQ-A):** BitePass never ingests PAN/CVV data. All payment holds, `$5.00` post-fire partial captures, voids, and refunds execute through [lib/paypal-client.ts](lib/paypal-client.ts) (`intent: "AUTHORIZE"`).
* **Fail-Closed Live Safety:** Startup validation in [lib/env.ts](lib/env.ts) blocks weak secrets, missing `PAYPAL_WEBHOOK_ID`, or sandbox credentials when `APP_ENV=staging|production` or `PAYPAL_ENV=live`, and disables mock fallbacks permanently.
* **IDOR & Session Integrity:** Signed `HttpOnly; SameSite=Lax` diner sessions (`bp_session`), strict order ownership verification (`assertOrderOwnershipOrMerchant` in [lib/security.ts](lib/security.ts)), CSRF `Origin`/`Sec-Fetch-Site` enforcement, and Merchant KDS token gating in [middleware.ts](middleware.ts).
* **Geofence Anti-Spoofing:** Server-side Haversine verification (`<=50m`), `<=15s` GPS freshness check, and `<=12 m/s` anti-teleportation velocity ceiling in [lib/validation.ts](lib/validation.ts).
* **Webhook Signature Verification:** Cryptographic PayPal signature verification via `/v1/notifications/verify-webhook-signature` before processing any webhook event in [app/api/webhooks/paypal/route.ts](app/api/webhooks/paypal/route.ts).

## Reporting a Vulnerability

Please **do not** open public GitHub issues for suspected security, payment-escrow, or IDOR vulnerabilities.

1. Email `security@bitepass.ai` with reproduction steps, affected endpoint (`/api/v1/...`), and trace ID (`X-Trace-Id` response header).
2. We acknowledge reports within **24 hours** and target remediation within **72 hours** for critical payment or authorization findings.
3. For live operational incidents, on-call engineers should follow the incident runbooks in [docs/runbooks/RB-01-orphaned-paypal-holds.md](docs/runbooks/RB-01-orphaned-paypal-holds.md), [docs/runbooks/RB-02-paypal-webhook-dlq-replay.md](docs/runbooks/RB-02-paypal-webhook-dlq-replay.md), and [docs/runbooks/RB-03-kds-cubby-manual-override.md](docs/runbooks/RB-03-kds-cubby-manual-override.md).


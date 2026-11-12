# Changelog

All notable changes to **BitePass** are documented in this file following [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and Semantic Versioning.

## [0.2.0] - 2026-11-12

### Added
- **Versioned API & OpenAPI 3.1 (`PROD-22`):** Added `/api/v1/*` routes, machine-readable OpenAPI 3.1 specification ([openapi/openapi.v1.json](openapi/openapi.v1.json)), and RFC 9745/8594 `Deprecation` + `Sunset` headers on legacy `/api/*` endpoints via [middleware.ts](middleware.ts).
- **Crash-Safe Escrow Reconciler (`PROD-05`):** Added [lib/reconciler.ts](lib/reconciler.ts) and `POST /api/v1/internal/reconcile` to recover interrupted `CAPTURING` sagas via idempotent `PayPal-Request-Id` replay and void orphaned holds older than the 3-hour SLA.
- **Geofence Kinematics & Anti-Spoofing (`PROD-07`):** Upgraded `verifyDoorstepProximity` in [lib/validation.ts](lib/validation.ts) with `<=15s` GPS freshness and `<=12 m/s` velocity ceiling checks.
- **Unit-Profitability Funnel Telemetry (`PROD-33`):** Added [lib/telemetry.ts](lib/telemetry.ts) tracking all 10 lifecycle events with real-time `net_contribution_margin_usd`, `llm_cost_usd`, and `void_zone` alerts.
- **Legal, Reg E & GDPR Erasure (`PROD-23`):** Added `/legal/terms`, `/legal/privacy`, Reg E pre-authorized capture disclosures, and `DELETE /api/v1/account/data` right-to-erasure anonymization.
- **Viral Growth & Zero-Hardware Express Shelf (`PROD-35`, `PROD-36`):** Added `?run_id=` coworker pickup run invite links, B2B work-email FastPass fee waivers, `.ics` calendar blocks, Express Shelf "Color-of-the-Day" badges, and HMAC-signed Wallet Pass export (`GET /api/v1/orders/[orderId]/wallet-pass`).
- **Operational Runbooks & Tooling (`PROD-21`, `PROD-29`, `PROD-30`):** Added incident runbooks (`RB-01`..`RB-03`), [scripts/ops/replay-webhook.mjs](scripts/ops/replay-webhook.mjs), [scripts/ops/post-deploy-smoke.mjs](scripts/ops/post-deploy-smoke.mjs), [scripts/check-docs-drift.mjs](scripts/check-docs-drift.mjs), split Playwright config ([playwright.demo.config.ts](playwright.demo.config.ts)), and GitHub Actions CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)).

### Changed
- **IDOR & Rate-Limit Hardening (`PROD-03`, `PROD-18`):** Enforced `assertOrderOwnershipOrMerchant` across order mutations/lookups, redacted raw PayPal `authId`/`captureId` from production diner payloads, added `10/min` `/api/agent` rate limits, `6000ms` Gemini SDK abort timeout, and single-active-hold mutex locking.
- **Gloved KDS Operations (`PROD-15`):** Added `Settle & Unlock` (`SETTLE_AND_UNLOCK`) KDS capture fallback, `Restore Bay` (`CLEAR_QUARANTINE`), `+5m` delay 60s consumer free-cancel reopen, and `MERCHANT.PARTNER-CONSENT.REVOKED` circuit breaker.
- **WCAG 2.1 AA & PWA Polish (`PROD-11`, `PROD-25`..`PROD-28`, `PROD-34`):** Enforced `>=44x44px` touch targets, `.focus-ring-on-dark`, `[ $0 | $1 | $2 | Custom ]` tip input, `BroadcastChannel` multi-tab sync, `app/global-error.tsx`, `app/manifest.ts`, `app/robots.ts`, and `app/sitemap.ts`.


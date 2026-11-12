# Contributing to BitePass

Thank you for contributing to **BitePass**! Please review [GEMINI.md](GEMINI.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before opening a pull request.

## 1. Local Development Setup

### Track 1: Zero-Docker Offline Mode (Fastest, < 60s)
```bash
cp .env.example .env
npm install
npm run dev
```
Runs at `http://localhost:3000` (`/` consumer concierge, `/merchant` KDS, `/demo` split judge console) using `STORAGE_DRIVER=memory` and deterministic mock fallbacks when API keys are omitted.

### Track 2: Full PostgreSQL + Prisma Parity
```bash
npm run dx:up
```
Verifies Docker Engine, boots `postgres:16-alpine`, runs Prisma migrations + deterministic catalog/station seeding, and launches Next.js.

## 2. Mandatory Coding Guardrails

1. **No Direct `process.env` Access:** Import `getEnv()` from [lib/env.ts](lib/env.ts). ESLint (`no-restricted-properties`) blocks raw `process.env` in `app/`, `components/`, and `lib/`.
2. **Integer-Cent Financial Math Only:** Compute all subtotals, basis-point taxes, tips, and `$5.00` COGS partial captures strictly in integer cents via [lib/pricing.ts](lib/pricing.ts).
3. **Consumer Bundle Isolation:** Never import `ag-grid-community` or `ag-grid-react` into consumer routes (`app/page.tsx`). Keep AG Grid isolated to `/merchant` and lazy-loaded `/demo`.
4. **Design Tokens & Accessibility:** Use semantic Tailwind tokens from [tailwind.config.ts](tailwind.config.ts) (`culinary-*`, `paypal-*`), maintain `>=12px` (`text-xs`) typography (`16px` `text-base` on text inputs), and keep touch targets `>=44x44px`.
5. **Portable Documentation Links:** Never commit `file://` or `/Users/...` OS paths in repository `.md` files.

## 3. Pre-PR Verification Gate

Every pull request must pass all automated checks locally before review:

```bash
npm run openapi:generate
npm run check:docs
npm run validate
npm run build
npm run test:e2e
```


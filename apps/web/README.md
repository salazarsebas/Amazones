# Amazones Web

Sprint 3 frontend foundation for human trading UX.

## Scope in this first pass

- Next.js App Router scaffold under `apps/web`
- warm-neutral token-based theme aligned with the Amazones design system
- homepage with product framing and featured markets
- market inventory page
- market detail page with visible probabilities and resolution policy
- agent workspace with draft creation wizard and detail view
- activation preflight feedback for agent configuration
- sponsored testnet wallet request flow for agent onboarding
- API-backed market loading with safe fallback data when the backend is offline

## Environment

- `AMAZONES_API_BASE_URL`
  - defaults to `http://localhost:3001`
  - used by server components to fetch market inventory from the backend

## Install

```bash
cd apps/web
bun install
```

## Run

```bash
cd apps/web
bun run dev
```

## Build

```bash
cd apps/web
bun run build
```

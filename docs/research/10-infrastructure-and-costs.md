# Infrastructure and Costs

## Scope
This document evaluates a zero-cost or near-zero-cost prototype stack for Amazones.

## Summary recommendation
- Frontend: **Next.js on Vercel Hobby**
- Backend API and workers: **Hono on CubePath**
- Primary database: **Supabase**
- Explicit non-selected alternative: **Neon**
- Order book / ephemeral state: **Upstash Redis**
- Cheapest resolution worker: **CubePath worker backed by Supabase and Redis**
- Explicit non-selected alternative host: **Railway**

## Chosen stack
The deployment stack Amazones should use is:
- **Vercel**
- **Supabase**
- **CubePath**

The following tools remain documented only as alternatives and are **not planned for use** in the current deployment design:
- **Neon**
- **Railway**

## Comparative table
| Tool | Purpose | Free tier / low-cost path | Limits noted | Verdict |
|---|---|---|---|---|
| Vercel Hobby | Next.js frontend, light API routes | Free forever | Hobby is intended for personal/small scale use; hard limits on CPU/invocations | Use for prototype frontend |
| CubePath | Backend API, matching engine, workers | User-supplied `$15` credits | Requires budget discipline and simple ops setup | Recommended backend host for MVP |
| Supabase | Postgres + auth/storage + realtime + edge functions | Free plan with 2 free projects | Free projects can pause; quotas are lower than paid tiers | Best database platform choice for MVP |
| Neon | Serverless Postgres | Free plan with limited monthly compute hours | Compute suspension if allowance is exceeded | Alternative only, not selected |
| Railway | Cheap app/db hosting | Trial and low monthly entry | Free trial becomes limited/free plan after credits | Alternative only, not selected |
| Upstash Redis | WebSocket / order book cache | Free tier | 256MB and 500K monthly commands on Redis free tier | Good for prototype ephemeral state |

## Resource: Vercel Hobby
### Description
Vercel Hobby is a clean default for the frontend and low-intensity edge/API work.

### How it works
- Connect repo, deploy automatically, use CDN, previews, and serverless/edge functions within usage caps.

### Pros for Amazones
- Excellent for Next.js frontend.
- Fast previews and low ops burden.

### Cons for Amazones
- Hobby is not for serious production scale.
- Heavy real-time API traffic can outgrow the included function budget quickly.

### Verdict
**Use.** Best zero-cost frontend starting point.

## Resource: CubePath
### Description
CubePath is a low-cost infrastructure provider with VPS and API-driven deployment.

### How it works
- Provision compute using its dashboard/API/CLI.

### Pros for Amazones
- Gives more control than pure serverless.
- Good fit for Hono API, matching engine, settlement worker, and resolution worker in one place.
- The available credit makes it a practical MVP backend choice.

### Cons for Amazones
- The public pricing/docs are less developer-opinionated than Vercel/Neon/Supabase.
- Requires slightly more operational discipline than deploying everything to Vercel.

### Verdict
**Use.** Make CubePath the default backend host for the MVP.

## Resource: Supabase
### Description
Supabase is the best fit if you want Postgres plus auth, storage, realtime, and edge functions in one product.

### How it works
- Managed Postgres with platform primitives around the database.

### Pros for Amazones
- Cleaner single-vendor prototype than combining plain Postgres with separate platform features.
- Realtime and Edge Functions can cover part of the websocket / worker story.
- Good fit for agent configs, market metadata, auth-adjacent records, and audit trails.

### Cons for Amazones
- Free projects can pause.
- Realtime is useful, but the matching engine should still be treated as a separate concern.

### Verdict
**Use.** Make Supabase the primary database choice for MVP.

## Resource: Neon
### Description
Neon remains a valid plain-Postgres alternative if the team later wants a more database-only platform.

### How it works
- Serverless Postgres with its own free-tier constraints and branching model.

### Pros for Amazones
- Good developer experience for plain Postgres.
- Reasonable fallback if Supabase platform features become unnecessary.

### Cons for Amazones
- Not the selected database for Amazones.
- Adds a less integrated platform choice for this project.

### Verdict
**Document only.** Keep as alternative reference, but do not use it in the planned stack.

## Resource: Railway
### Description
Railway remains a valid lightweight hosting alternative if deployment constraints change later.

### How it works
- Simple deploy flow for apps and workers with trial/usage-based pricing.

### Pros for Amazones
- Easy backend deployment.
- Reasonable fallback if CubePath becomes unavailable.

### Cons for Amazones
- Not the selected backend host for Amazones.
- Less aligned with the current low-cost plan than using the available CubePath credits.

### Verdict
**Document only.** Keep as alternative reference, but do not use it in the planned stack.

## Resource: Upstash Redis
### Description
Upstash Redis is a strong free-first fit for ephemeral order-book and websocket fanout state.

### How it works
- Serverless Redis with modest free limits.

### Pros for Amazones
- Good for quote cache, live depth snapshots, and WS session state.
- Much simpler than self-hosting Redis for a prototype.

### Cons for Amazones
- Free command limits can be hit quickly if every book mutation is broadcast naively.

### Verdict
**Use.** Good for prototype real-time state.

## Can everything run on Vercel?
Short answer: **not recommended**.

### Why
- Vercel is excellent for the frontend and stateless API routes.
- Vercel Functions do **not** support native persistent WebSocket connections, so a real-time order book cannot live there cleanly.
- A matching engine is stateful and latency-sensitive; serverless cold starts and execution limits are the wrong fit.

### Recommended split
- Vercel: frontend, marketing pages, stateless public routes
- Supabase: Postgres and platform features
- CubePath: Hono API, matching engine, resolution worker, queue consumers

## Oracle/resolution worker at zero cost
Recommended MVP approach:
- one cron-triggered or event-driven worker
- hosted on CubePath
- reads due markets from Postgres
- proposes optimistic resolutions
- watches disputes

This does not need a dedicated paid oracle stack for the prototype.

## Final recommendation
For the prototype:
- Vercel Hobby for frontend
- CubePath for backend API and workers
- Supabase for database and optional platform features
- Upstash Redis for ephemeral live state
- Keep Vercel focused on the frontend and keep stateful backend workloads on CubePath

This keeps the prototype effectively free while still leaving a clean path to paid upgrades.

## Explicit non-goals for deployment
Even though they remain documented as alternatives, Amazones should **not** use these in the planned MVP deployment:
- Neon
- Railway

## References
- https://vercel.com/pricing
- https://vercel.com/docs/accounts/plans/hobby
- https://vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections
- https://cubepath.com
- https://cubepath.com/calculator
- https://supabase.com/docs/guides/platform/billing-on-supabase
- https://supabase.com/docs/guides/functions/pricing
- https://upstash.com/docs/redis/overall/pricing

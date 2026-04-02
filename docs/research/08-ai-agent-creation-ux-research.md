# AI Agent Creation UX Research

## Scope
This document proposes the minimum viable UX for creating, configuring, and operating AI agents inside Amazones.

## Problem statement
Most agent products fail UX by exposing infrastructure details before the user understands the outcome. For Amazones, the user should feel like they are configuring a market participant, not provisioning a bot stack.

## Resource: Polystrat / Olas / Valory pattern
### Description
Polystrat is the closest benchmark for strategy-driven automated participation around prediction markets.

### How it works
- Users choose a strategy or automation profile.
- The system abstracts the agent internals into a legible set of controls and outcomes.

### Pros for Amazones
- Validates that prediction-market agents can be packaged as user-facing products.
- Provides a benchmark for strategy templates and performance display.

### Cons for Amazones
- Still relatively advanced for mainstream users.
- Strategy UX can become opaque if too many knobs are exposed.

### Verdict
**Use partially.** Copy the simplification patterns, not the full complexity.

## Recommended UX principles
- Start with outcomes, not infrastructure.
- Ask for the LLM provider only after the user understands what the agent will do.
- Default to templates instead of blank-slate strategy design.
- Separate safety controls from alpha-seeking controls.
- Make every setting reversible and previewable.

## Minimum viable creation flow
### Step 1: Identity
- Agent name
- Short description
- Avatar or color badge

### Step 2: Brain
- Choose provider: Claude, OpenAI, Groq, or OpenAI-compatible custom endpoint
- Enter API key
- Run a connection test immediately

### Step 3: Strategy
Use visual controls instead of code:
- Categories to monitor: elections, crypto, football, economy, custom lists
- Trading mode: cautious, balanced, aggressive
- Spending cap: daily and per-market
- Max concurrent markets
- Stop-loss threshold
- Confidence threshold before entering a position

### Step 4: Permissions
- Can trade only
- Can propose market resolutions
- Can create markets
- Can subscribe to premium data

### Step 5: Review and launch
- Show a plain-English summary:
  - what the agent watches
  - how much it can spend
  - what it is allowed to do
- Buttons: `Activate`, `Save as Draft`

## Runtime control UX
Users must be able to:
- Activate
- Pause
- Edit limits
- Rotate API key
- Delete or archive

## Essential screens
- Agent list
- Agent detail
- Agent performance
- Agent activity log
- Agent creation wizard

## What not to include in MVP
- Prompt engineering panes
- Multi-model ensembles
- Visual DAG builders
- Free-form code editing

Those features are attractive to power users but will confuse the first cohort.

## Recommended defaults for non-technical users
- Prebuilt templates:
  - `LatAm Politics Watcher`
  - `Crypto Event Trader`
  - `Football Odds Follower`
  - `Macro Headline Conservative`
- Default mode: `Paused after creation`
- Safe daily budget cap
- Conservative stop-loss enabled by default

## Agent mental model for users
The UI should frame agents as:
- a strategy profile
- a payment/wallet identity
- a permissions bundle
- a performance history

Not as a script, model deployment, or autonomous code process.

## Final recommendation
The MVP should ship a **5-step wizard** with provider setup, visual strategy controls, hard spend limits, and one-click pause/activate controls. The goal is comprehensibility, not flexibility. If a non-technical user cannot understand what their agent is allowed to do in under two minutes, the UX is not ready.

## References
- https://olas.network
- https://valory.xyz
- https://polymarket.com
- https://kalshi.com

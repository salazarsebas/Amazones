# Amazones Premium API Consumption

## Scope
This document closes the external-consumer documentation gap for the premium x402 surface.

## Supported Premium Endpoints
- `GET /v1/markets/:marketId/depth`
- `GET /v1/markets/:marketId/semantic`
- `GET /v1/agents/:agentId/analytics`
- `GET /v1/data/latam-election-pack`

## Development Flow
1. Make a request without `X-PAYMENT`.
2. Receive `402 Payment Required`.
3. Read `error.details.payment_required.payment_token`.
4. Retry the same request with `X-PAYMENT: <payment_token>`.
5. Receive `200 OK` with the premium payload.

## Example
```bash
curl -i http://localhost:3001/v1/markets/market-0001/depth
```

Retry with the returned token:

```bash
curl -i \
  -H "X-PAYMENT: <payment_token>" \
  http://localhost:3001/v1/markets/market-0001/depth
```

## Notes
- The current implementation is intentionally `development` grade.
- The HTTP contract is stable even though payment verification can later be swapped for a facilitator-backed implementation.
- Premium analytics are owner-readable with bearer auth and externally purchasable without owner auth.

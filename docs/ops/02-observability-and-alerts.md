# Amazones Observability and Alerts

## Runtime Surfaces
- `/healthz`: liveness plus high-level state counters
- `/readyz`: readiness gate for seeded markets or recovered snapshot state
- `/metrics`: Prometheus-style counters and gauges for API traffic and operational state

## Minimum Metrics To Watch
- `http_requests_total`
- `http_request_duration_ms_avg`
- `amazones_websocket_connections`
- `amazones_orders_total`
- `amazones_fills_total`
- `amazones_resolution_proposals_total`
- `amazones_audit_entries_total`
- `amazones_persistence_available`

## Alert Recommendations

### API availability
- Trigger if `/readyz` is non-200 for more than 2 minutes.

### Settlement degradation
- Trigger if `http_requests_total{path="/v1/orders",status="202"}` rises but `amazones_fills_total` stops moving during active traffic windows.

### Premium API failures
- Trigger if `http_requests_total` for premium endpoints shows sustained `402` or `5xx` spikes beyond expected commercial behavior.

### Worker regressions
- Trigger if resolution proposals accumulate while finalized proposal count remains flat past known challenge deadlines.

### Snapshot durability
Trigger if `amazones_persistence_available` is `0` in any environment expected to preserve state across restarts.

## Logging Contract
The API now emits one JSON log line per request containing:
- `trace_id`
- `method`
- `path`
- `status`
- `duration_ms`
- `emitted_at`

These logs are suitable for indexing in a standard log pipeline without requiring custom parsing of free-form text.

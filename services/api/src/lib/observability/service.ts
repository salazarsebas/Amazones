type CounterKey = string;

function labelKey(name: string, labels?: Record<string, string | number>): CounterKey {
  const serialized = labels
    ? Object.entries(labels)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => `${key}=${String(value)}`)
        .join(",")
    : "";
  return serialized ? `${name}|${serialized}` : name;
}

export class ObservabilityService {
  private readonly startedAt = Date.now();
  private readonly counters = new Map<CounterKey, number>();
  private readonly histograms = new Map<string, number[]>();
  private websocketConnections = 0;

  increment(name: string, labels?: Record<string, string | number>, value = 1): void {
    const key = labelKey(name, labels);
    this.counters.set(key, (this.counters.get(key) ?? 0) + value);
  }

  observe(name: string, value: number): void {
    const bucket = this.histograms.get(name) ?? [];
    bucket.push(value);
    this.histograms.set(name, bucket.slice(-250));
  }

  recordHttp(method: string, path: string, status: number, durationMs: number): void {
    this.increment("http_requests_total", { method, path, status });
    this.observe("http_request_duration_ms", durationMs);
  }

  openWebsocket(): void {
    this.websocketConnections += 1;
  }

  closeWebsocket(): void {
    this.websocketConnections = Math.max(0, this.websocketConnections - 1);
  }

  renderPrometheus(state: {
    markets: number;
    agents: number;
    orders: number;
    fills: number;
    proposals: number;
    auditEntries: number;
    persistenceAvailable: boolean;
  }): string {
    const lines: string[] = [
      "# HELP amazones_process_uptime_seconds Process uptime in seconds",
      "# TYPE amazones_process_uptime_seconds gauge",
      `amazones_process_uptime_seconds ${((Date.now() - this.startedAt) / 1000).toFixed(3)}`,
      "# HELP amazones_websocket_connections Current websocket connections",
      "# TYPE amazones_websocket_connections gauge",
      `amazones_websocket_connections ${this.websocketConnections}`,
      "# HELP amazones_markets_total Total known markets",
      "# TYPE amazones_markets_total gauge",
      `amazones_markets_total ${state.markets}`,
      "# HELP amazones_agents_total Total known agents",
      "# TYPE amazones_agents_total gauge",
      `amazones_agents_total ${state.agents}`,
      "# HELP amazones_orders_total Total stored orders",
      "# TYPE amazones_orders_total gauge",
      `amazones_orders_total ${state.orders}`,
      "# HELP amazones_fills_total Total stored fills",
      "# TYPE amazones_fills_total gauge",
      `amazones_fills_total ${state.fills}`,
      "# HELP amazones_resolution_proposals_total Total stored resolution proposals",
      "# TYPE amazones_resolution_proposals_total gauge",
      `amazones_resolution_proposals_total ${state.proposals}`,
      "# HELP amazones_audit_entries_total Total stored audit entries",
      "# TYPE amazones_audit_entries_total gauge",
      `amazones_audit_entries_total ${state.auditEntries}`,
      "# HELP amazones_persistence_available Whether a durable persistence backend is available",
      "# TYPE amazones_persistence_available gauge",
      `amazones_persistence_available ${state.persistenceAvailable ? 1 : 0}`,
    ];

    for (const [key, value] of this.counters.entries()) {
      const [name, rawLabels] = key.split("|");
      const renderedLabels = rawLabels
        ? `{${rawLabels
            .split(",")
            .map((entry) => {
              const [label, labelValue] = entry.split("=");
              return `${label}="${labelValue}"`;
            })
            .join(",")}}`
        : "";
      lines.push(`${name}${renderedLabels} ${value}`);
    }

    for (const [name, values] of this.histograms.entries()) {
      if (values.length === 0) {
        continue;
      }
      const sum = values.reduce((total, value) => total + value, 0);
      const avg = sum / values.length;
      lines.push(`# HELP ${name}_avg Rolling average for ${name}`);
      lines.push(`# TYPE ${name}_avg gauge`);
      lines.push(`${name}_avg ${avg.toFixed(3)}`);
    }

    return `${lines.join("\n")}\n`;
  }
}

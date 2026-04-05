export interface ResolutionPolicySnapshot {
  kind: "optimistic" | "reflector_numeric" | "band_numeric";
  challengePeriodHours: number;
}

export interface MarketSemanticMetadata {
  canonicalQuestion: string;
  tags: string[];
  locale: string;
  marketType: "binary";
  region: string;
  category: string;
}

export interface MarketSnapshot {
  id: string;
  title: string;
  description?: string;
  category?: string;
  status: "open" | "resolving" | "resolved";
  resolveTime: string;
  collateralAsset?: string;
  resolutionPolicy: ResolutionPolicySnapshot;
  latestOutcome?: "yes" | "no" | "invalid";
  semanticMetadata?: MarketSemanticMetadata;
}

export class InMemoryMarketCatalog {
  private readonly markets = new Map<string, MarketSnapshot>();

  seed(markets: MarketSnapshot[]): void {
    for (const market of markets) {
      this.markets.set(market.id, {
        ...market,
        description: market.description ?? "",
        category: market.category ?? "general",
        collateralAsset: market.collateralAsset ?? "USDC",
        semanticMetadata: market.semanticMetadata ?? {
          canonicalQuestion: market.title,
          tags: [market.id, market.category ?? "general"],
          locale: "en",
          marketType: "binary",
          region: "global",
          category: market.category ?? "general",
        },
      });
    }
  }

  exists(marketId: string): boolean {
    return this.markets.has(marketId);
  }

  get(marketId: string): MarketSnapshot | null {
    return this.markets.get(marketId) ?? null;
  }

  list(): MarketSnapshot[] {
    return [...this.markets.values()];
  }

  markResolving(marketId: string): void {
    const market = this.markets.get(marketId);
    if (!market) return;
    market.status = "resolving";
    this.markets.set(marketId, market);
  }

  markResolved(marketId: string, outcome: "yes" | "no" | "invalid"): void {
    const market = this.markets.get(marketId);
    if (!market) return;
    market.status = "resolved";
    market.latestOutcome = outcome;
    this.markets.set(marketId, market);
  }
}

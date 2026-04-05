import { API_BASE_URL } from "@/lib/api";
import type { Market } from "@/lib/types";

type BackendResolutionPolicy = {
  kind?: Market["resolution_policy"]["kind"];
  challengePeriodHours?: number;
};

type BackendMarketSummary = {
  id: string;
  title?: string;
  status?: Market["status"];
  resolution_policy?: BackendResolutionPolicy;
  resolve_time?: string;
};

type BackendMarketDetail = BackendMarketSummary & {
  latest_outcome?: Market["latest_outcome"];
};

const fallbackMarkets: Market[] = [
  {
    id: "market-0001",
    title: "Will Amazones ship V1 on Stellar testnet this quarter?",
    description:
      "Operational launch means a human user can authenticate, trade YES or NO, and see positions settle in testnet.",
    category: "product",
    status: "open",
    yes_price: 0.62,
    no_price: 0.38,
    collateral_asset: "USDC",
    close_time: "2026-06-30T18:00:00.000Z",
    created_at: "2026-04-04T00:00:00.000Z",
    volume_24h: "18450",
    liquidity: "52000",
    resolution_policy: {
      kind: "optimistic",
      source_urls: ["https://docs.amazones.app/policies/v1-launch"],
      resolution_time: "2026-07-01T12:00:00.000Z",
      challenge_period_hours: 48,
      resolver_bond_usdc: "250",
      challenger_bond_usdc: "500",
    },
    semantic_metadata: {
      canonical_question:
        "Will Amazones have a usable V1 prediction market on Stellar testnet before July 1, 2026?",
      tags: ["product", "stellar", "launch"],
      locale: "es-419",
      market_type: "binary",
    },
  },
  {
    id: "market-0002",
    title: "Will USDC volume on Stellar testnet exceed 1M simulated units this month?",
    description:
      "Tracks aggregate simulated volume across Amazones testnet trading activity and seed markets.",
    category: "ecosystem",
    status: "resolving",
    yes_price: 0.47,
    no_price: 0.53,
    collateral_asset: "USDC",
    close_time: "2026-04-29T16:00:00.000Z",
    created_at: "2026-04-02T00:00:00.000Z",
    volume_24h: "9200",
    liquidity: "41000",
    latest_outcome: null,
    resolution_policy: {
      kind: "optimistic",
      source_urls: ["https://stellar.expert/explorer/testnet"],
      resolution_time: "2026-05-01T12:00:00.000Z",
      challenge_period_hours: 48,
      resolver_bond_usdc: "250",
      challenger_bond_usdc: "500",
    },
    semantic_metadata: {
      canonical_question:
        "Will Amazones simulated USDC volume on Stellar testnet exceed one million units in April 2026?",
      tags: ["usdc", "volume", "stellar"],
      locale: "en",
      market_type: "binary",
    },
  },
];

function normalizeMarket(input: Partial<Market> & { id: string; title?: string }): Market {
  const yesPrice = Number(input.yes_price ?? 0.5);
  const noPrice = Number(input.no_price ?? 1 - yesPrice);

  return {
    id: input.id,
    title: input.title ?? input.semantic_metadata?.canonical_question ?? input.id,
    description: input.description ?? "",
    category: input.category ?? "uncategorized",
    status: input.status ?? "draft",
    yes_price: yesPrice,
    no_price: noPrice,
    collateral_asset: input.collateral_asset ?? "USDC",
    close_time: input.close_time,
    created_at: input.created_at,
    volume_24h: input.volume_24h ?? "0",
    liquidity: input.liquidity ?? "0",
    latest_outcome: input.latest_outcome ?? null,
    resolution_policy:
      input.resolution_policy ?? {
        kind: "optimistic",
        source_urls: [],
        resolution_time: new Date().toISOString(),
        challenge_period_hours: 48,
      },
    semantic_metadata: input.semantic_metadata,
  };
}

export async function getMarkets(): Promise<Market[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/markets`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return fallbackMarkets;
    }

    const payload = (await response.json()) as {
      items?: BackendMarketSummary[];
    };
    const items = Array.isArray(payload.items) ? payload.items : [];
    const markets = items.map((market) =>
      normalizeMarket({
        id: market.id,
        title: market.title,
        status: market.status,
        resolution_policy: market.resolution_policy
          ? {
              kind: market.resolution_policy.kind ?? "optimistic",
              source_urls: [],
              resolution_time:
                market.resolve_time ?? new Date(Date.now() + 86_400_000).toISOString(),
              challenge_period_hours:
                market.resolution_policy.challengePeriodHours ?? 48,
            }
          : undefined,
      }),
    );
    return markets.length > 0 ? markets : fallbackMarkets;
  } catch {
    return fallbackMarkets;
  }
}

export async function getMarketById(marketId: string): Promise<Market | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/markets/${marketId}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return fallbackMarkets.find((market) => market.id === marketId) ?? null;
    }

    const payload = (await response.json()) as BackendMarketDetail;
    return normalizeMarket({
      id: payload.id,
      title: payload.title,
      status: payload.status,
      latest_outcome: payload.latest_outcome,
      resolution_policy: payload.resolution_policy
        ? {
            kind: payload.resolution_policy.kind ?? "optimistic",
            source_urls: [],
            resolution_time:
              payload.resolve_time ?? new Date(Date.now() + 86_400_000).toISOString(),
            challenge_period_hours:
              payload.resolution_policy.challengePeriodHours ?? 48,
          }
        : undefined,
    });
  } catch {
    return fallbackMarkets.find((market) => market.id === marketId) ?? null;
  }
}

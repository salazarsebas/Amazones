export type MarketStatus =
  | "draft"
  | "open"
  | "closed"
  | "resolving"
  | "resolved"
  | "invalid";

export type ResolutionPolicy = {
  kind: "optimistic" | "reflector_numeric" | "band_numeric";
  source_urls: string[];
  resolution_time: string;
  challenge_period_hours: number;
  resolver_bond_usdc?: string;
  challenger_bond_usdc?: string;
};

export type Market = {
  id: string;
  title: string;
  description?: string;
  category: string;
  status: MarketStatus;
  yes_price: number;
  no_price: number;
  collateral_asset: string;
  close_time?: string;
  created_at?: string;
  volume_24h?: string;
  liquidity?: string;
  latest_outcome?: "yes" | "no" | "invalid" | null;
  resolution_policy: ResolutionPolicy;
  semantic_metadata?: {
    canonical_question?: string;
    tags?: string[];
    locale?: string;
    market_type?: string;
  };
};

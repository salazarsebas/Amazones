import Link from "next/link";

import { MarketStatusBadge } from "@/components/market-status-badge";
import { ProbabilityPill } from "@/components/probability-pill";
import type { Market } from "@/lib/types";

function formatCompactNumber(value?: string) {
  const number = Number(value ?? 0);
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(number);
}

function formatDate(value?: string) {
  if (!value) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function MarketCard({ market }: { market: Market }) {
  return (
    <article className="market-card">
      <div className="market-card-head">
        <span className="category-chip">{market.category}</span>
        <MarketStatusBadge status={market.status} />
      </div>

      <div className="market-card-body">
        <h2>{market.title}</h2>
        <p>{market.description || "Structured market with explicit resolution policy."}</p>
      </div>

      <div className="market-card-probabilities">
        <ProbabilityPill side="yes" value={market.yes_price} />
        <ProbabilityPill side="no" value={market.no_price} />
      </div>

      <dl className="market-meta-grid">
        <div>
          <dt>Liquidity</dt>
          <dd>{formatCompactNumber(market.liquidity)} USDC</dd>
        </div>
        <div>
          <dt>24h volume</dt>
          <dd>{formatCompactNumber(market.volume_24h)} USDC</dd>
        </div>
        <div>
          <dt>Closes</dt>
          <dd>{formatDate(market.close_time)}</dd>
        </div>
        <div>
          <dt>Resolution</dt>
          <dd>{market.resolution_policy.kind.replace("_", " ")}</dd>
        </div>
      </dl>

      <div className="market-card-footer">
        <Link className="button button-secondary" href={`/markets/${market.id}`}>
          Inspect market
        </Link>
        <Link className="button button-primary" href={`/markets/${market.id}`}>
          Trade YES / NO
        </Link>
      </div>
    </article>
  );
}

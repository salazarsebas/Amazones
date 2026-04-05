import Link from "next/link";
import { notFound } from "next/navigation";

import { MarketStatusBadge } from "@/components/market-status-badge";
import { ProbabilityPill } from "@/components/probability-pill";
import { TradeTicket } from "@/components/trade-ticket";
import { getMarketById } from "@/lib/markets";

function formatDate(value?: string) {
  if (!value) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function MarketDetailPage({
  params,
}: {
  params: Promise<{ marketId: string }>;
}) {
  const { marketId } = await params;
  const market = await getMarketById(marketId);

  if (!market) {
    notFound();
  }

  return (
    <div className="page-stack">
      <section className="shell-content section-stack section-top">
        <Link className="text-link" href="/markets">
          Back to markets
        </Link>

        <div className="detail-grid">
          <article className="detail-panel">
            <div className="market-card-head">
              <span className="category-chip">{market.category}</span>
              <MarketStatusBadge status={market.status} />
            </div>

            <div className="detail-copy">
              <h1>{market.title}</h1>
              <p>
                {market.description ||
                  "This market uses explicit terms and structured resolution rules so human traders can inspect assumptions before acting."}
              </p>
            </div>

            <div className="market-card-probabilities">
              <ProbabilityPill side="yes" value={market.yes_price} />
              <ProbabilityPill side="no" value={market.no_price} />
            </div>

            <dl className="market-meta-grid">
              <div>
                <dt>Close time</dt>
                <dd>{formatDate(market.close_time)}</dd>
              </div>
              <div>
                <dt>Resolve at</dt>
                <dd>{formatDate(market.resolution_policy.resolution_time)}</dd>
              </div>
              <div>
                <dt>Challenge window</dt>
                <dd>{market.resolution_policy.challenge_period_hours} hours</dd>
              </div>
              <div>
                <dt>Collateral</dt>
                <dd>{market.collateral_asset}</dd>
              </div>
            </dl>
          </article>

          <aside className="trade-ticket">
            <TradeTicket
              initialNoPrice={market.no_price}
              initialYesPrice={market.yes_price}
              marketId={market.id}
            />
          </aside>
        </div>

        <div className="detail-grid secondary">
          <section className="detail-panel">
            <span className="eyebrow">Resolution policy</span>
            <h2>How this market resolves</h2>
            <p>
              {market.resolution_policy.kind === "optimistic"
                ? "An initial resolver proposes an outcome, then a challenge window remains open before finalization."
                : "This market uses an oracle-backed numeric resolution source."}
            </p>
            <ul className="source-list">
              {market.resolution_policy.source_urls.map((source) => (
                <li key={source}>
                  <a href={source} rel="noreferrer" target="_blank">
                    {source}
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section className="detail-panel">
            <span className="eyebrow">Market state</span>
            <h2>Resolution status</h2>
            <p>
              Current state: <strong>{market.status}</strong>
              {market.status === "resolved" && market.latest_outcome
                ? ` with outcome ${market.latest_outcome.toUpperCase()}.`
                : "."}
            </p>
            <p>
              Challenge window: {market.resolution_policy.challenge_period_hours} hours
              after the initial proposal.
            </p>
          </section>

          <section className="detail-panel">
            <span className="eyebrow">Semantic metadata</span>
            <h2>Machine-readable context</h2>
            <p>{market.semantic_metadata?.canonical_question || market.title}</p>
            <div className="tag-row">
              {(market.semantic_metadata?.tags ?? []).map((tag) => (
                <span className="soft-tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

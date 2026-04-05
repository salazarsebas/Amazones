import Link from "next/link";

import { MarketCard } from "@/components/market-card";
import { getMarkets } from "@/lib/markets";

export default async function HomePage() {
  const markets = await getMarkets();
  const featuredMarkets = markets.slice(0, 2);

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div className="shell-content hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">Human trading UX</span>
            <h1>Calm trading surfaces for prediction markets on Stellar.</h1>
            <p>
              Amazones treats probability as a first-class object. Human users can
              inspect terms, understand risk, and act without fighting crypto-native
              UI noise.
            </p>

            <div className="hero-actions">
              <Link className="button button-primary" href="/markets">
                Browse markets
              </Link>
              <Link className="button button-secondary" href="/markets">
                View current probabilities
              </Link>
            </div>
          </div>

          <aside className="hero-stat-panel">
            <div>
              <span className="stat-label">Active markets</span>
              <strong>{markets.length}</strong>
            </div>
            <div>
              <span className="stat-label">Primary collateral</span>
              <strong>USDC on Stellar</strong>
            </div>
            <div>
              <span className="stat-label">Resolution model</span>
              <strong>Optimistic with challenge window</strong>
            </div>
          </aside>
        </div>
      </section>

      <section className="shell-content section-stack">
        <div className="section-header">
          <div>
            <span className="eyebrow">Featured markets</span>
            <h2>Built for clarity before speed.</h2>
          </div>
          <Link className="text-link" href="/markets">
            See all markets
          </Link>
        </div>

        <div className="market-grid">
          {featuredMarkets.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      </section>
    </div>
  );
}

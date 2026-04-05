import { MarketCard } from "@/components/market-card";
import { getMarkets } from "@/lib/markets";

export default async function MarketsPage() {
  const markets = await getMarkets();

  return (
    <div className="page-stack">
      <section className="shell-content section-stack section-top">
        <div className="section-header wide">
          <div>
            <span className="eyebrow">Market inventory</span>
            <h1>Trade probability, not interface complexity.</h1>
          </div>
          <p className="section-copy">
            Every market exposes its current implied probability, closing time, and
            resolution logic before the user gets to the trading decision.
          </p>
        </div>

        <div className="market-grid">
          {markets.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      </section>
    </div>
  );
}

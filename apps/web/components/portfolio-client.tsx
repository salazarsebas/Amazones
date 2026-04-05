"use client";

import { useEffect, useState } from "react";

import { useWallet } from "@/components/wallet-provider";
import { API_BASE_URL, parseApiResponse } from "@/lib/api";

type PortfolioResponse = {
  wallet_address: string;
  cash_balance_usdc: string;
  positions: Array<{
    market_id: string;
    yes_shares: number;
    no_shares: number;
    avg_yes_price: number;
    avg_no_price: number;
  }>;
  updated_at: string;
};

export function PortfolioClient() {
  const { walletAddress, ensureAuthenticated, isAuthenticated, isReady } = useWallet();
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isReady || !walletAddress || !isAuthenticated) {
      return;
    }

    let cancelled = false;

    async function loadPortfolio() {
      setIsLoading(true);
      setError(null);

      try {
        const accessToken = await ensureAuthenticated();
        const response = await fetch(`${API_BASE_URL}/v1/portfolio`, {
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        });
        const payload = await parseApiResponse<PortfolioResponse>(response);
        if (!cancelled) {
          setPortfolio(payload);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Failed to load portfolio.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadPortfolio();

    return () => {
      cancelled = true;
    };
  }, [ensureAuthenticated, isAuthenticated, isReady, walletAddress]);

  if (!isReady) {
    return <div className="detail-panel">Loading portfolio session…</div>;
  }

  if (!walletAddress || !isAuthenticated) {
    return (
      <div className="detail-panel">
        <span className="eyebrow">Portfolio</span>
        <h1>Connect a wallet to inspect positions.</h1>
        <p>
          This view uses the authenticated backend portfolio snapshot, so it stays
          aligned with the order engine instead of browser-local state.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="detail-panel">Loading current portfolio…</div>;
  }

  if (error) {
    return (
      <div className="detail-panel">
        <span className="eyebrow">Portfolio</span>
        <h1>Portfolio unavailable</h1>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="section-stack">
      <section className="detail-panel">
        <span className="eyebrow">Portfolio</span>
        <h1>Open positions</h1>
        <p className="wallet-address">{portfolio?.wallet_address}</p>
      </section>

      {portfolio && portfolio.positions.length > 0 ? (
        <div className="portfolio-grid">
          {portfolio.positions.map((position) => (
            <article className="market-card" key={position.market_id}>
              <div className="market-card-head">
                <span className="category-chip">Position</span>
                <span className="soft-tag">{position.market_id}</span>
              </div>

              <dl className="market-meta-grid">
                <div>
                  <dt>YES shares</dt>
                  <dd>{position.yes_shares.toFixed(2)}</dd>
                </div>
                <div>
                  <dt>NO shares</dt>
                  <dd>{position.no_shares.toFixed(2)}</dd>
                </div>
                <div>
                  <dt>Avg YES price</dt>
                  <dd>{position.avg_yes_price.toFixed(2)}</dd>
                </div>
                <div>
                  <dt>Avg NO price</dt>
                  <dd>{position.avg_no_price.toFixed(2)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      ) : (
        <section className="detail-panel">
          <span className="eyebrow">No positions</span>
          <h2>The wallet has not matched any fills yet.</h2>
          <p>
            Submit an order from a market page, or use a second wallet to cross the
            book and create the first position.
          </p>
        </section>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useWallet } from "@/components/wallet-provider";
import { API_BASE_URL, parseApiResponse } from "@/lib/api";
import type { Agent } from "@/lib/types";

export function AgentsClient() {
  const { ensureAuthenticated, isAuthenticated, isReady } = useWallet();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isReady || !isAuthenticated) {
      return;
    }

    let cancelled = false;

    async function loadAgents() {
      setIsLoading(true);
      setError(null);
      try {
        const accessToken = await ensureAuthenticated();
        const response = await fetch(`${API_BASE_URL}/v1/agents`, {
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        });
        const payload = await parseApiResponse<{ items: Agent[] }>(response);
        if (!cancelled) {
          setAgents(payload.items);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Failed to load agents.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadAgents();
    return () => {
      cancelled = true;
    };
  }, [ensureAuthenticated, isAuthenticated, isReady]);

  if (!isReady) {
    return <div className="detail-panel">Loading agent workspace…</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="detail-panel">
        <span className="eyebrow">Agents</span>
        <h1>Connect a wallet to manage agent drafts.</h1>
        <p>The agent product layer uses the same owner wallet auth model as trading.</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="detail-panel">Loading agents…</div>;
  }

  if (error) {
    return (
      <div className="detail-panel">
        <span className="eyebrow">Agents</span>
        <h1>Agent workspace unavailable</h1>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="section-stack">
      <div className="section-header wide">
        <div>
          <span className="eyebrow">Agent workspace</span>
          <h1>Create, activate, and pause automated strategies.</h1>
        </div>
        <Link className="button button-primary" href="/agents/new">
          Create agent
        </Link>
      </div>

      {agents.length > 0 ? (
        <div className="portfolio-grid">
          {agents.map((agent) => (
            <article className="market-card" key={agent.id}>
              <div className="market-card-head">
                <span className="category-chip">{agent.agent_type}</span>
                <span className={`status-badge status-${agent.status}`}>{agent.status}</span>
              </div>
              <div className="market-card-body">
                <h2>{agent.name}</h2>
                <p>{agent.description}</p>
              </div>
              <dl className="market-meta-grid">
                <div>
                  <dt>Provider</dt>
                  <dd>{agent.provider_kind}</dd>
                </div>
                <div>
                  <dt>Budget</dt>
                  <dd>{agent.risk_limits.dailyBudgetUsdc} USDC/day</dd>
                </div>
                <div>
                  <dt>Trade</dt>
                  <dd>{agent.permissions.trade ? "Enabled" : "Disabled"}</dd>
                </div>
                <div>
                  <dt>Premium</dt>
                  <dd>{agent.permissions.buyPremiumData ? "Enabled" : "Disabled"}</dd>
                </div>
              </dl>
              <div className="market-card-footer">
                <Link className="button button-secondary" href={`/agents/${agent.id}`}>
                  Inspect agent
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="detail-panel">
          <span className="eyebrow">No agents</span>
          <h2>No automation configured yet.</h2>
          <p>Create a draft first, then activate it once permissions and budget look right.</p>
        </div>
      )}
    </div>
  );
}

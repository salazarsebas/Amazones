"use client";

import { useEffect, useState } from "react";

import { useWallet } from "@/components/wallet-provider";
import { API_BASE_URL, parseApiResponse } from "@/lib/api";
import type { Agent } from "@/lib/types";

export function AgentDetailClient({ agentId }: { agentId: string }) {
  const { ensureAuthenticated, isAuthenticated, isReady } = useWallet();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  useEffect(() => {
    if (!isReady || !isAuthenticated) {
      return;
    }

    let cancelled = false;

    async function loadAgent() {
      setIsLoading(true);
      setError(null);
      try {
        const accessToken = await ensureAuthenticated();
        const response = await fetch(`${API_BASE_URL}/v1/agents/${agentId}`, {
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        });
        const payload = await parseApiResponse<Agent>(response);
        if (!cancelled) {
          setAgent(payload);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Failed to load agent.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadAgent();
    return () => {
      cancelled = true;
    };
  }, [agentId, ensureAuthenticated, isAuthenticated, isReady]);

  async function mutate(path: "pause" | "activate") {
    setIsMutating(true);
    setError(null);
    try {
      const accessToken = await ensureAuthenticated();
      const response = await fetch(`${API_BASE_URL}/v1/agents/${agentId}/${path}`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });
      const payload = await parseApiResponse<Agent>(response);
      setAgent(payload);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to update agent.");
    } finally {
      setIsMutating(false);
    }
  }

  if (!isReady) {
    return <div className="detail-panel">Loading agent detail…</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="detail-panel">
        <span className="eyebrow">Agent detail</span>
        <h1>Connect a wallet to inspect this agent.</h1>
      </div>
    );
  }

  if (isLoading) {
    return <div className="detail-panel">Loading agent detail…</div>;
  }

  if (error) {
    return (
      <div className="detail-panel">
        <span className="eyebrow">Agent detail</span>
        <h1>Agent detail unavailable</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="detail-panel">
        <span className="eyebrow">Agent detail</span>
        <h1>Agent not found.</h1>
      </div>
    );
  }

  return (
    <div className="section-stack">
      <div className="detail-grid">
        <section className="detail-panel">
          <div className="market-card-head">
            <span className="category-chip">{agent.agent_type}</span>
            <span className={`status-badge status-${agent.status}`}>{agent.status}</span>
          </div>
          <div className="detail-copy">
            <h1>{agent.name}</h1>
            <p>{agent.description}</p>
          </div>
          <dl className="market-meta-grid">
            <div>
              <dt>Agent wallet</dt>
              <dd className="mono-data">{agent.agent_wallet}</dd>
            </div>
            <div>
              <dt>Provider</dt>
              <dd>{agent.provider_kind}</dd>
            </div>
            <div>
              <dt>Provider ref</dt>
              <dd>{agent.provider_reference_status}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{new Date(agent.created_at).toLocaleString()}</dd>
            </div>
          </dl>
        </section>

        <aside className="trade-ticket">
          <span className="eyebrow">Operator controls</span>
          <h2>Pause and resume safely</h2>
          <p>
            Hard budgets stay enforced server-side. These controls only change whether the
            agent can act.
          </p>
          <div className="hero-actions">
            <button
              className="button button-secondary"
              disabled={isMutating || agent.status !== "active"}
              onClick={() => void mutate("pause")}
              type="button"
            >
              Pause
            </button>
            <button
              className="button button-primary"
              disabled={isMutating || (agent.status !== "draft" && agent.status !== "paused")}
              onClick={() => void mutate("activate")}
              type="button"
            >
              Activate
            </button>
          </div>
        </aside>
      </div>

      <div className="detail-grid secondary">
        <section className="detail-panel">
          <span className="eyebrow">Permissions</span>
          <h2>Execution scope</h2>
          <div className="tag-row">
            {Object.entries(agent.permissions).map(([key, enabled]) => (
              <span className={enabled ? "soft-tag" : "category-chip"} key={key}>
                {key}
              </span>
            ))}
          </div>
        </section>

        <section className="detail-panel">
          <span className="eyebrow">Limits</span>
          <h2>Budget guardrails</h2>
          <dl className="market-meta-grid">
            <div>
              <dt>Daily budget</dt>
              <dd>{agent.risk_limits.dailyBudgetUsdc} USDC</dd>
            </div>
            <div>
              <dt>Per-market budget</dt>
              <dd>{agent.risk_limits.perMarketBudgetUsdc} USDC</dd>
            </div>
            <div>
              <dt>Max positions</dt>
              <dd>{agent.risk_limits.maxOpenPositions}</dd>
            </div>
            <div>
              <dt>Aggressiveness</dt>
              <dd>{agent.strategy.aggressiveness ?? "balanced"}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}

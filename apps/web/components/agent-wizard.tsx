"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useWallet } from "@/components/wallet-provider";
import { API_BASE_URL, parseApiResponse } from "@/lib/api";
import type {
  Agent,
  AgentPermissions,
  AgentRiskLimits,
  AgentStrategy,
  AgentType,
  AgentValidationResult,
  ProviderKind,
  SponsoredWallet,
} from "@/lib/types";

const defaultPermissions: AgentPermissions = {
  trade: true,
  createMarkets: false,
  proposeResolutions: false,
  buyPremiumData: false,
};

const defaultRiskLimits: AgentRiskLimits = {
  dailyBudgetUsdc: 50,
  perMarketBudgetUsdc: 20,
  maxOpenPositions: 5,
};

const defaultStrategy: AgentStrategy = {
  categories: ["crypto"],
  regions: ["latam"],
  model: "",
  confidenceThreshold: 0.62,
  aggressiveness: "balanced",
  stopLossPct: 12,
};

export function AgentWizard() {
  const router = useRouter();
  const { ensureAuthenticated, isAuthenticated, walletAddress } = useWallet();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [agentWallet, setAgentWallet] = useState("");
  const [agentType, setAgentType] = useState<AgentType>("trader");
  const [providerKind, setProviderKind] = useState<ProviderKind>("claude");
  const [providerReference, setProviderReference] = useState("");
  const [strategy, setStrategy] = useState<AgentStrategy>(defaultStrategy);
  const [permissions, setPermissions] = useState<AgentPermissions>(defaultPermissions);
  const [riskLimits, setRiskLimits] = useState<AgentRiskLimits>(defaultRiskLimits);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<AgentValidationResult | null>(null);
  const [sponsoredWallet, setSponsoredWallet] = useState<SponsoredWallet | null>(null);

  const summary = useMemo(
    () => [
      `${name || "Unnamed agent"} watches ${strategy.categories.join(", ") || "selected categories"}.`,
      `Daily budget: ${riskLimits.dailyBudgetUsdc} USDC.`,
      `Permissions: ${Object.entries(permissions)
        .filter((entry) => entry[1])
        .map(([key]) => key)
        .join(", ") || "none"}.`,
    ],
    [name, permissions, riskLimits.dailyBudgetUsdc, strategy.categories],
  );

  async function runValidation(): Promise<AgentValidationResult> {
    const response = await fetch(`${API_BASE_URL}/v1/agents/validate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        provider_kind: providerKind,
        provider_reference: providerReference,
        strategy,
        permissions,
        risk_limits: riskLimits,
      }),
    });
    const payload = await parseApiResponse<AgentValidationResult>(response);
    setValidation(payload);
    return payload;
  }

  async function requestSponsoredWallet() {
    if (!isAuthenticated || !walletAddress) {
      setError("Connect a wallet before requesting a sponsored agent wallet.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const accessToken = await ensureAuthenticated();
      const response = await fetch(`${API_BASE_URL}/v1/agents/sponsored-wallet`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });
      const wallet = await parseApiResponse<SponsoredWallet>(response);
      setSponsoredWallet(wallet);
      setAgentWallet(wallet.public_key);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to request sponsored wallet.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function updatePermission<K extends keyof AgentPermissions>(key: K, value: boolean) {
    setPermissions((current) => ({ ...current, [key]: value }));
  }

  function updateStrategy<K extends keyof AgentStrategy>(key: K, value: AgentStrategy[K]) {
    setStrategy((current) => ({ ...current, [key]: value }));
  }

  function updateRisk<K extends keyof AgentRiskLimits>(key: K, value: AgentRiskLimits[K]) {
    setRiskLimits((current) => ({ ...current, [key]: value }));
  }

  async function handleCreate(status: "draft" | "active") {
    if (!isAuthenticated || !walletAddress) {
      setError("Connect a wallet before creating an agent.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (status === "active") {
        const nextValidation = await runValidation();
        if (!nextValidation.valid) {
          setError("Fix the activation issues before creating the agent as active.");
          setIsSubmitting(false);
          return;
        }
      }

      const accessToken = await ensureAuthenticated();
      const response = await fetch(`${API_BASE_URL}/v1/agents`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          agent_wallet: agentWallet,
          name,
          description,
          agent_type: agentType,
          provider_kind: providerKind,
          provider_reference: providerReference,
          status,
          strategy,
          permissions,
          risk_limits: riskLimits,
        }),
      });

      const agent = await parseApiResponse<Agent>(response);
      router.push(`/agents/${agent.id}`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to create agent.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="wizard-layout">
      <section className="detail-panel wizard-panel">
        <div className="wizard-progress">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              className={value === step ? "wizard-step active" : "wizard-step"}
              key={value}
              onClick={() => setStep(value)}
              type="button"
            >
              {value}
            </button>
          ))}
        </div>

        {step === 1 ? (
          <div className="section-stack">
            <span className="eyebrow">Step 1</span>
            <h1>Basic identity</h1>
            <label className="field">
              <span>Agent name</span>
              <input onChange={(event) => setName(event.target.value)} value={name} />
            </label>
            <label className="field">
              <span>Description</span>
              <textarea
                className="text-area"
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                value={description}
              />
            </label>
            <label className="field">
              <span>Agent wallet</span>
              <input
                onChange={(event) => setAgentWallet(event.target.value)}
                placeholder="G..."
                value={agentWallet}
              />
            </label>
            <button
              className="button button-secondary"
              disabled={isSubmitting}
              onClick={() => void requestSponsoredWallet()}
              type="button"
            >
              Request sponsored testnet wallet
            </button>
            {sponsoredWallet ? (
              <div className="success-panel neutral">
                <p>Sponsored wallet: {sponsoredWallet.public_key}</p>
                <p>Funding status: {sponsoredWallet.funding_status}</p>
                <p>Secret seed: {sponsoredWallet.secret_seed}</p>
                {sponsoredWallet.funding_detail ? <p>{sponsoredWallet.funding_detail}</p> : null}
                {sponsoredWallet.seeded_assets?.map((asset) => (
                  <p key={`${asset.asset_code}-${asset.asset_issuer}`}>
                    {asset.asset_code}: {asset.amount} ({asset.status})
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="section-stack">
            <span className="eyebrow">Step 2</span>
            <h1>Model provider</h1>
            <div className="segmented-control">
              {(["claude", "openai", "groq", "openai-compatible"] as ProviderKind[]).map((option) => (
                <button
                  className={providerKind === option ? "segmented-option active" : "segmented-option"}
                  key={option}
                  onClick={() => setProviderKind(option)}
                  type="button"
                >
                  {option}
                </button>
              ))}
            </div>
            <label className="field">
              <span>Provider reference</span>
              <input
                onChange={(event) => setProviderReference(event.target.value)}
                placeholder="API key or opaque reference"
                type="password"
                value={providerReference}
              />
            </label>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="section-stack">
            <span className="eyebrow">Step 3</span>
            <h1>Strategy builder</h1>
            <label className="field">
              <span>Categories</span>
              <input
                onChange={(event) =>
                  updateStrategy(
                    "categories",
                    event.target.value.split(",").map((value) => value.trim()).filter(Boolean),
                  )
                }
                value={strategy.categories.join(", ")}
              />
            </label>
            <label className="field">
              <span>Regions</span>
              <input
                onChange={(event) =>
                  updateStrategy(
                    "regions",
                    event.target.value.split(",").map((value) => value.trim()).filter(Boolean),
                  )
                }
                value={strategy.regions.join(", ")}
              />
            </label>
            <label className="field">
              <span>Model</span>
              <input
                onChange={(event) => updateStrategy("model", event.target.value)}
                value={strategy.model ?? ""}
              />
            </label>
            <label className="field">
              <span>Aggressiveness</span>
              <select
                className="select-field"
                onChange={(event) =>
                  updateStrategy("aggressiveness", event.target.value as AgentStrategy["aggressiveness"])
                }
                value={strategy.aggressiveness}
              >
                <option value="cautious">Cautious</option>
                <option value="balanced">Balanced</option>
                <option value="aggressive">Aggressive</option>
              </select>
            </label>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="section-stack">
            <span className="eyebrow">Step 4</span>
            <h1>Permissions and limits</h1>
            <div className="checkbox-grid">
              {([
                ["trade", "Trade markets"],
                ["createMarkets", "Create markets"],
                ["proposeResolutions", "Propose resolutions"],
                ["buyPremiumData", "Buy premium data"],
              ] as const).map(([key, label]) => (
                <label className="checkbox-card" key={key}>
                  <input
                    checked={permissions[key]}
                    onChange={(event) => updatePermission(key, event.target.checked)}
                    type="checkbox"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            <div className="market-meta-grid">
              <label className="field">
                <span>Daily budget USDC</span>
                <input
                  onChange={(event) => updateRisk("dailyBudgetUsdc", Number(event.target.value))}
                  type="number"
                  value={riskLimits.dailyBudgetUsdc}
                />
              </label>
              <label className="field">
                <span>Per-market budget USDC</span>
                <input
                  onChange={(event) => updateRisk("perMarketBudgetUsdc", Number(event.target.value))}
                  type="number"
                  value={riskLimits.perMarketBudgetUsdc}
                />
              </label>
              <label className="field">
                <span>Max open positions</span>
                <input
                  onChange={(event) => updateRisk("maxOpenPositions", Number(event.target.value))}
                  type="number"
                  value={riskLimits.maxOpenPositions}
                />
              </label>
            </div>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="section-stack">
            <span className="eyebrow">Step 5</span>
            <h1>Review and launch</h1>
            <div className="success-panel neutral">
              {summary.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>

            {error ? <p className="inline-error">{error}</p> : null}
            {validation ? (
              <div className="section-stack">
                <button
                  className="button button-secondary"
                  disabled={isSubmitting}
                  onClick={() => void runValidation()}
                  type="button"
                >
                  Re-run activation checks
                </button>
                {validation.issues.length > 0 ? (
                  <div className="section-stack">
                    {validation.issues.map((issue) => (
                      <p className={issue.severity === "error" ? "inline-error" : "eyebrow"} key={`${issue.field}-${issue.code}`}>
                        {issue.severity.toUpperCase()}: {issue.message}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p>No activation issues detected.</p>
                )}
              </div>
            ) : (
              <button
                className="button button-secondary"
                disabled={isSubmitting}
                onClick={() => void runValidation()}
                type="button"
              >
                Run activation checks
              </button>
            )}

            <div className="hero-actions">
              <button
                className="button button-secondary"
                disabled={isSubmitting}
                onClick={() => void handleCreate("draft")}
                type="button"
              >
                Create as draft
              </button>
              <button
                className="button button-primary"
                disabled={isSubmitting}
                onClick={() => void handleCreate("active")}
                type="button"
              >
                Create and activate
              </button>
            </div>
          </div>
        ) : null}

        <div className="wizard-nav">
          <button
            className="button button-secondary"
            disabled={step === 1}
            onClick={() => setStep((current) => current - 1)}
            type="button"
          >
            Back
          </button>
          <button
            className="button button-primary"
            disabled={step === 5}
            onClick={() => setStep((current) => current + 1)}
            type="button"
          >
            Continue
          </button>
        </div>
      </section>

      <aside className="trade-ticket">
        <span className="eyebrow">Live summary</span>
        <h2>{name || "Agent draft"}</h2>
        <p>{description || "No description yet."}</p>

        <dl className="market-meta-grid">
          <div>
            <dt>Provider</dt>
            <dd>{providerKind}</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>{agentType}</dd>
          </div>
          <div>
            <dt>Budget</dt>
            <dd>{riskLimits.dailyBudgetUsdc} USDC/day</dd>
          </div>
          <div>
            <dt>Owner</dt>
            <dd>{walletAddress ? "Connected" : "No wallet"}</dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}

"use client";

import { useState } from "react";

import { useWallet } from "@/components/wallet-provider";

export function WalletConnectionPanel() {
  const {
    walletAddress,
    isAuthenticated,
    isReady,
    connectWithSecret,
    createTestnetWallet,
    disconnect,
  } = useWallet();
  const [secretKey, setSecretKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdWallet, setCreatedWallet] = useState<{
    address: string;
    secretSeed: string;
    fundingStatus: "funded" | "pending_manual_funding";
    fundingDetail?: string;
  } | null>(null);
  const [showImport, setShowImport] = useState(false);

  async function handleConnect() {
    setIsSubmitting(true);
    setError(null);
    setCreatedWallet(null);

    try {
      await connectWithSecret(secretKey);
      setSecretKey("");
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Failed to connect wallet.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateWallet() {
    setIsSubmitting(true);
    setError(null);

    try {
      const nextWallet = await createTestnetWallet();
      setCreatedWallet({
        address: nextWallet.walletAddress,
        secretSeed: nextWallet.secretSeed,
        fundingStatus: nextWallet.fundingStatus,
        fundingDetail: nextWallet.fundingDetail,
      });
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Failed to create wallet.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isReady) {
    return <div className="wallet-panel compact">Loading wallet session…</div>;
  }

  if (walletAddress && isAuthenticated) {
    return (
      <div className="wallet-panel compact">
        <div>
          <span className="eyebrow">Connected wallet</span>
          <p className="wallet-address">{walletAddress}</p>
        </div>
        <button className="button button-secondary" onClick={disconnect} type="button">
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-panel">
      <div className="wallet-panel-copy">
        <span className="eyebrow">Testnet wallet</span>
        <h2>Start trading in one step</h2>
        <p>
          Create a funded Stellar testnet wallet and connect instantly. If you already
          have a secret seed, you can import it instead.
        </p>
      </div>

      {error ? <p className="inline-error">{error}</p> : null}

      {createdWallet ? (
        <div className="success-panel neutral">
          <span className="eyebrow">
            {createdWallet.fundingStatus === "funded"
              ? "Wallet funded"
              : "Wallet created"}
          </span>
          <p>Address: {createdWallet.address}</p>
          <p>Secret seed: {createdWallet.secretSeed}</p>
          {createdWallet.fundingStatus === "pending_manual_funding" ? (
            <p>
              Funding is still pending. {createdWallet.fundingDetail ?? "Retry Friendbot or fund manually."}
            </p>
          ) : (
            <p>Saved in this browser session. Keep the secret seed if you want to reuse the wallet.</p>
          )}
        </div>
      ) : null}

      <div className="wallet-panel-actions">
        <button
          className="button button-primary"
          disabled={isSubmitting}
          onClick={handleCreateWallet}
          type="button"
        >
          {isSubmitting ? "Creating wallet…" : "Create testnet wallet"}
        </button>
        <button
          className="button button-secondary"
          disabled={isSubmitting}
          onClick={() => setShowImport((current) => !current)}
          type="button"
        >
          {showImport ? "Hide import" : "Import existing wallet"}
        </button>
      </div>

      {showImport ? (
        <>
          <label className="field">
            <span>Secret key</span>
            <input
              onChange={(event) => setSecretKey(event.target.value)}
              placeholder="SB3..."
              type="password"
              value={secretKey}
            />
          </label>

          <button
            className="button button-secondary"
            disabled={isSubmitting || secretKey.trim().length === 0}
            onClick={handleConnect}
            type="button"
          >
            {isSubmitting ? "Connecting…" : "Connect wallet"}
          </button>
        </>
      ) : null}
    </div>
  );
}

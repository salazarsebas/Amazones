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

  async function handleConnect() {
    setIsSubmitting(true);
    setError(null);

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
      await createTestnetWallet();
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
        <h2>Authenticate before trading</h2>
        <p>
          This sprint uses a local testnet wallet session that signs the backend
          challenge and order intent directly in the browser.
        </p>
      </div>

      <label className="field">
        <span>Secret key</span>
        <input
          onChange={(event) => setSecretKey(event.target.value)}
          placeholder="SB3..."
          type="password"
          value={secretKey}
        />
      </label>

      {error ? <p className="inline-error">{error}</p> : null}

      <div className="wallet-panel-actions">
        <button
          className="button button-primary"
          disabled={isSubmitting || secretKey.trim().length === 0}
          onClick={handleConnect}
          type="button"
        >
          {isSubmitting ? "Connecting…" : "Connect existing wallet"}
        </button>
        <button
          className="button button-secondary"
          disabled={isSubmitting}
          onClick={handleCreateWallet}
          type="button"
        >
          Create local testnet wallet
        </button>
      </div>
    </div>
  );
}

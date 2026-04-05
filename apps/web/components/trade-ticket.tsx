"use client";

import { useMemo, useState } from "react";

import { useWallet } from "@/components/wallet-provider";
import { API_BASE_URL, parseApiResponse } from "@/lib/api";
import { canonicalOrderPayload, type OrderAction, type OrderSide } from "@/lib/trading";

type SubmittedOrderResponse = {
  order_id: string;
  market_id: string;
  status: string;
  accepted_at: string;
  fills: Array<{
    fill_id: string;
    price: number;
    shares: number;
    settlement_status: string;
    settlement_tx_hash: string;
  }>;
};

export function TradeTicket({
  marketId,
  initialYesPrice,
  initialNoPrice,
}: {
  marketId: string;
  initialYesPrice: number;
  initialNoPrice: number;
}) {
  const { walletAddress, ensureAuthenticated, signMessage, isAuthenticated } = useWallet();
  const [side, setSide] = useState<OrderSide>("yes");
  const [action, setAction] = useState<OrderAction>("buy");
  const [price, setPrice] = useState(initialYesPrice.toFixed(2));
  const [shares, setShares] = useState("10");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SubmittedOrderResponse | null>(null);

  const estimatedCost = useMemo(() => {
    const numericPrice = Number(price) || 0;
    const numericShares = Number(shares) || 0;
    return (numericPrice * numericShares).toFixed(2);
  }, [price, shares]);

  function applySuggestedPrice(nextSide: OrderSide) {
    setSide(nextSide);
    setPrice((nextSide === "yes" ? initialYesPrice : initialNoPrice).toFixed(2));
  }

  async function handleSubmit() {
    if (!walletAddress) {
      setError("Connect a wallet before sending an order.");
      return;
    }

    const numericPrice = Number(price);
    const numericShares = Number(shares);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0 || numericPrice >= 1) {
      setError("Price must be greater than 0 and less than 1.");
      return;
    }
    if (!Number.isFinite(numericShares) || numericShares <= 0) {
      setError("Shares must be positive.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const accessToken = await ensureAuthenticated();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const nonce = crypto.randomUUID();
      const clientOrderId = crypto.randomUUID();
      const payload = canonicalOrderPayload({
        marketId,
        walletAddress,
        side,
        action,
        price: numericPrice,
        shares: numericShares,
        expiresAt,
        nonce,
        clientOrderId,
      });
      const signature = await signMessage(payload);

      const response = await fetch(`${API_BASE_URL}/v1/orders`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          market_id: marketId,
          side,
          action,
          price: numericPrice,
          shares: numericShares,
          expires_at: expiresAt,
          nonce,
          client_order_id: clientOrderId,
          signature,
        }),
      });

      const submitted = await parseApiResponse<SubmittedOrderResponse>(response);
      setSuccess(submitted);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Failed to submit order.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="ticket-header">
        <span className="eyebrow">Trade ticket</span>
        <h2>Submit a signed order</h2>
      </div>

      <div className="segmented-control">
        <button
          className={side === "yes" ? "segmented-option active yes" : "segmented-option"}
          onClick={() => applySuggestedPrice("yes")}
          type="button"
        >
          YES
        </button>
        <button
          className={side === "no" ? "segmented-option active no" : "segmented-option"}
          onClick={() => applySuggestedPrice("no")}
          type="button"
        >
          NO
        </button>
      </div>

      <div className="segmented-control compact">
        <button
          className={action === "buy" ? "segmented-option active" : "segmented-option"}
          onClick={() => setAction("buy")}
          type="button"
        >
          Buy
        </button>
        <button
          className={action === "sell" ? "segmented-option active" : "segmented-option"}
          onClick={() => setAction("sell")}
          type="button"
        >
          Sell
        </button>
      </div>

      <label className="field">
        <span>Price</span>
        <input
          inputMode="decimal"
          onChange={(event) => setPrice(event.target.value)}
          step="0.01"
          type="number"
          value={price}
        />
      </label>

      <label className="field">
        <span>Shares</span>
        <input
          inputMode="decimal"
          min="1"
          onChange={(event) => setShares(event.target.value)}
          step="1"
          type="number"
          value={shares}
        />
      </label>

      <div className="ticket-summary">
        <div>
          <span className="summary-label">Estimated notional</span>
          <strong>{estimatedCost} USDC</strong>
        </div>
        <div>
          <span className="summary-label">Wallet state</span>
          <strong>{isAuthenticated ? "Authenticated" : "Not connected"}</strong>
        </div>
      </div>

      {error ? <p className="inline-error">{error}</p> : null}

      {success ? (
        <div className="success-panel">
          <span className="eyebrow">Order accepted</span>
          <p>Order ID: {success.order_id}</p>
          <p>Fills settled: {success.fills.length}</p>
        </div>
      ) : null}

      <button
        className={side === "yes" ? "button button-yes" : "button button-no"}
        disabled={isSubmitting}
        onClick={handleSubmit}
        type="button"
      >
        {isSubmitting ? "Submitting…" : `${action === "buy" ? "Buy" : "Sell"} ${side.toUpperCase()}`}
      </button>
    </>
  );
}

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { API_BASE_URL, parseApiResponse } from "@/lib/api";
import {
  createRandomSecretSeed,
  isValidSecretSeed,
  publicKeyFromSecret,
  signUtf8,
} from "@/lib/stellar-keys";
import {
  loadStoredWalletSession,
  saveStoredWalletSession,
  type StoredWalletSession,
} from "@/lib/wallet-storage";

type AuthChallengeResponse = {
  challenge_id: string;
  challenge_text: string;
  expires_at: string;
};

type AuthVerifyResponse = {
  access_token: string;
  expires_at: string;
  tier: string;
};

type WalletContextValue = {
  walletAddress: string | null;
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
  isAuthenticated: boolean;
  isReady: boolean;
  connectWithSecret: (secretKey: string) => Promise<void>;
  createTestnetWallet: () => Promise<void>;
  disconnect: () => void;
  ensureAuthenticated: () => Promise<string>;
  signMessage: (message: string) => Promise<string>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

function isExpired(value: string | null): boolean {
  if (!value) {
    return true;
  }

  return new Date(value).getTime() <= Date.now();
}

function assertSecretKey(secretKey: string): string {
  const trimmed = secretKey.trim();
  if (!isValidSecretSeed(trimmed)) {
    throw new Error("The provided secret key is not a valid Stellar secret seed.");
  }
  return trimmed;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredWalletSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setSession(loadStoredWalletSession());
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    saveStoredWalletSession(session);
  }, [isReady, session]);

  async function authenticate(secretKey: string) {
    const walletAddress = publicKeyFromSecret(secretKey);

    const challengeResponse = await fetch(`${API_BASE_URL}/v1/auth/challenge`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ wallet_address: walletAddress }),
    });
    const challenge = await parseApiResponse<AuthChallengeResponse>(challengeResponse);

    const verifyResponse = await fetch(`${API_BASE_URL}/v1/auth/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        challenge_id: challenge.challenge_id,
        wallet_address: walletAddress,
        signature: signUtf8(secretKey, challenge.challenge_text),
      }),
    });
    const verified = await parseApiResponse<AuthVerifyResponse>(verifyResponse);

    const nextSession: StoredWalletSession = {
      walletAddress,
      secretKey,
      accessToken: verified.access_token,
      accessTokenExpiresAt: verified.expires_at,
    };
    setSession(nextSession);
    return nextSession;
  }

  async function connectWithSecret(secretKey: string) {
    await authenticate(assertSecretKey(secretKey));
  }

  async function createTestnetWallet() {
    const secretKey = createRandomSecretSeed();
    await authenticate(secretKey);
  }

  function disconnect() {
    setSession(null);
  }

  async function ensureAuthenticated(): Promise<string> {
    if (!session) {
      throw new Error("Connect a wallet before trading.");
    }

    if (session.accessToken && !isExpired(session.accessTokenExpiresAt)) {
      return session.accessToken;
    }

    const refreshed = await authenticate(session.secretKey);
    if (!refreshed.accessToken) {
      throw new Error("Failed to refresh wallet authentication.");
    }
    return refreshed.accessToken;
  }

  async function signMessage(message: string) {
    if (!session) {
      throw new Error("Connect a wallet before signing.");
    }

    return signUtf8(session.secretKey, message);
  }

  const value = useMemo<WalletContextValue>(
    () => ({
      walletAddress: session?.walletAddress ?? null,
      accessToken: session?.accessToken ?? null,
      accessTokenExpiresAt: session?.accessTokenExpiresAt ?? null,
      isAuthenticated:
        !!session?.accessToken && !isExpired(session.accessTokenExpiresAt),
      isReady,
      connectWithSecret,
      createTestnetWallet,
      disconnect,
      ensureAuthenticated,
      signMessage,
    }),
    [isReady, session],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used inside WalletProvider");
  }
  return context;
}

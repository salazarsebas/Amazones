"use client";

export type StoredWalletSession = {
  walletAddress: string;
  secretKey: string;
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
};

const STORAGE_KEY = "amazones.testnet.wallet";

export function loadStoredWalletSession(): StoredWalletSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredWalletSession;
  } catch {
    return null;
  }
}

export function saveStoredWalletSession(session: StoredWalletSession | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

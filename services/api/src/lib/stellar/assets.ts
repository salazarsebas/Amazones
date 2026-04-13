import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Operation,
  TransactionBuilder,
} from "stellar-sdk";

import type { AppConfig } from "../../config";

export type TestnetSeededAssetResult = {
  asset_code: string;
  asset_issuer: string;
  asset_contract_id: string;
  amount: string;
  status: "seeded" | "skipped" | "pending_manual_distribution";
  detail?: string;
};

function buildSeedAsset(config: AppConfig): Asset | null {
  if (!config.TESTNET_SEED_ASSET_ISSUER_SECRET) {
    return null;
  }

  const issuer = Keypair.fromSecret(config.TESTNET_SEED_ASSET_ISSUER_SECRET);
  return new Asset(config.TESTNET_SEED_ASSET_CODE, issuer.publicKey());
}

function buildServer(config: AppConfig): Horizon.Server {
  return new Horizon.Server(config.STELLAR_HORIZON_URL);
}

function hasTrustline(
  account: Awaited<ReturnType<Horizon.Server["loadAccount"]>>,
  asset: Asset,
): boolean {
  return account.balances.some((balance) => {
    if (!("asset_code" in balance) || !("asset_issuer" in balance)) {
      return false;
    }

    return (
      balance.asset_code === asset.getCode() &&
      balance.asset_issuer === asset.getIssuer()
    );
  });
}

async function ensureTrustline(input: {
  config: AppConfig;
  asset: Asset;
  target: Keypair;
}): Promise<void> {
  const server = buildServer(input.config);
  const account = await server.loadAccount(input.target.publicKey());
  if (hasTrustline(account, input.asset)) {
    return;
  }

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: input.config.STELLAR_NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.changeTrust({
        asset: input.asset,
        limit: input.config.TESTNET_SEED_ASSET_TRUSTLINE_LIMIT,
      }),
    )
    .setTimeout(180)
    .build();

  transaction.sign(input.target);
  await server.submitTransaction(transaction);
}

async function distributeAsset(input: {
  config: AppConfig;
  asset: Asset;
  destination: string;
}): Promise<void> {
  const distributor = input.config.TESTNET_SEED_ASSET_DISTRIBUTOR_SECRET
    ? Keypair.fromSecret(input.config.TESTNET_SEED_ASSET_DISTRIBUTOR_SECRET)
    : null;

  if (!distributor) {
    throw new Error("TESTNET_SEED_ASSET_DISTRIBUTOR_SECRET is not configured");
  }

  const server = buildServer(input.config);
  const account = await server.loadAccount(distributor.publicKey());
  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: input.config.STELLAR_NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.payment({
        destination: input.destination,
        asset: input.asset,
        amount: input.config.TESTNET_SEED_ASSET_AMOUNT,
      }),
    )
    .setTimeout(180)
    .build();

  transaction.sign(distributor);
  await server.submitTransaction(transaction);
}

export function getConfiguredTestnetSeedAsset(config: AppConfig): {
  assetCode: string;
  assetIssuer: string;
  assetContractId: string;
} | null {
  const asset = buildSeedAsset(config);
  if (!asset) {
    return null;
  }

  return {
    assetCode: asset.getCode(),
    assetIssuer: asset.getIssuer() ?? "",
    assetContractId: asset.contractId(config.STELLAR_NETWORK_PASSPHRASE),
  };
}

export async function seedTestnetAssetForWallet(
  config: AppConfig,
  secretSeed: string,
): Promise<TestnetSeededAssetResult | null> {
  const asset = buildSeedAsset(config);
  if (!config.TESTNET_SEED_ASSET_ENABLED || !asset) {
    return null;
  }

  const assetContractId = asset.contractId(config.STELLAR_NETWORK_PASSPHRASE);
  const resultBase = {
    asset_code: asset.getCode(),
    asset_issuer: asset.getIssuer() ?? "",
    asset_contract_id: assetContractId,
    amount: config.TESTNET_SEED_ASSET_AMOUNT,
  } satisfies Omit<TestnetSeededAssetResult, "status" | "detail">;

  try {
    const target = Keypair.fromSecret(secretSeed);
    await ensureTrustline({
      config,
      asset,
      target,
    });
    await distributeAsset({
      config,
      asset,
      destination: target.publicKey(),
    });

    return {
      ...resultBase,
      status: "seeded",
    };
  } catch (error) {
    return {
      ...resultBase,
      status: "pending_manual_distribution",
      detail: error instanceof Error ? error.message : "Unknown Stellar asset distribution error",
    };
  }
}

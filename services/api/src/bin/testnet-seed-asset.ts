import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "stellar-sdk";

type Recipient = {
  address: string;
  secret?: string;
  label: string;
};

const config = {
  assetCode: process.env.TESTNET_SEED_ASSET_CODE ?? "USDA",
  assetAmount: process.env.TESTNET_SEED_ASSET_AMOUNT ?? "1000",
  distributorFloatAmount: process.env.TESTNET_SEED_ASSET_DISTRIBUTOR_FLOAT ?? "1000000",
  trustlineLimit: process.env.TESTNET_SEED_ASSET_TRUSTLINE_LIMIT ?? "1000000",
  friendbotUrl: process.env.STELLAR_FRIENDBOT_URL ?? "https://friendbot.stellar.org",
  horizonUrl: process.env.STELLAR_HORIZON_URL ?? "https://horizon-testnet.stellar.org",
  networkPassphrase: process.env.STELLAR_NETWORK_PASSPHRASE ?? Networks.TESTNET,
  configDir:
    process.env.STELLAR_CONFIG_DIR ??
    resolve(process.cwd(), "..", "deployments", "testnet", ".config", "stellar"),
  outputEnvFile:
    process.env.TESTNET_SEED_ASSET_OUTPUT_ENV_FILE ??
    resolve(process.cwd(), "..", "deployments", "testnet", "usda.env"),
};

const server = new Horizon.Server(config.horizonUrl);

function splitCsv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function keypairFromEnv(secretName: string): Keypair {
  const secret = process.env[secretName];
  return secret ? Keypair.fromSecret(secret) : Keypair.random();
}

async function fundViaFriendbot(address: string): Promise<void> {
  const url = new URL(config.friendbotUrl);
  url.searchParams.set("addr", address);
  const response = await fetch(url);
  const body = await response.text();

  if (response.ok || body.includes("createAccountAlreadyExist")) {
    return;
  }

  throw new Error(`Friendbot failed for ${address}: ${response.status} ${body}`);
}

function accountHasTrustline(
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

function readAssetBalance(
  account: Awaited<ReturnType<Horizon.Server["loadAccount"]>>,
  asset: Asset,
): number {
  const balance = account.balances.find((entry) => {
    if (!("asset_code" in entry) || !("asset_issuer" in entry) || !("balance" in entry)) {
      return false;
    }

    return (
      entry.asset_code === asset.getCode() &&
      entry.asset_issuer === asset.getIssuer()
    );
  });

  if (!balance || !("balance" in balance)) {
    return 0;
  }

  return Number(balance.balance);
}

async function submit(source: Keypair, operation: ReturnType<typeof Operation.changeTrust>): Promise<void>;
async function submit(source: Keypair, operation: ReturnType<typeof Operation.payment>): Promise<void>;
async function submit(source: Keypair, operation: ReturnType<typeof Operation.changeTrust | typeof Operation.payment>): Promise<void> {
  const account = await server.loadAccount(source.publicKey());
  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(operation)
    .setTimeout(180)
    .build();

  transaction.sign(source);
  await server.submitTransaction(transaction);
}

async function ensureTrustline(target: Keypair, asset: Asset): Promise<void> {
  const account = await server.loadAccount(target.publicKey());
  if (accountHasTrustline(account, asset)) {
    return;
  }

  await submit(
    target,
    Operation.changeTrust({
      asset,
      limit: config.trustlineLimit,
    }),
  );
}

async function pay(source: Keypair, asset: Asset, destination: string, amount: string): Promise<void> {
  await submit(
    source,
    Operation.payment({
      destination,
      asset,
      amount,
    }),
  );
}

function readIdentitySecret(name: string): string {
  return execFileSync(
    "stellar",
    ["keys", "secret", name, "--config-dir", config.configDir],
    { encoding: "utf8" },
  ).trim();
}

function readIdentityAddress(name: string): string {
  return execFileSync(
    "stellar",
    ["keys", "public-key", name, "--config-dir", config.configDir],
    { encoding: "utf8" },
  ).trim();
}

function loadRecipients(): Recipient[] {
  const recipients: Recipient[] = [];

  for (const identity of splitCsv(process.env.TESTNET_SEED_ASSET_TARGET_IDENTITIES)) {
    recipients.push({
      address: readIdentityAddress(identity),
      secret: readIdentitySecret(identity),
      label: identity,
    });
  }

  splitCsv(process.env.TESTNET_SEED_ASSET_TARGET_SECRETS).forEach((secret, index) => {
    const keypair = Keypair.fromSecret(secret);
    recipients.push({
      address: keypair.publicKey(),
      secret,
      label: `secret-${index + 1}`,
    });
  });

  splitCsv(process.env.TESTNET_SEED_ASSET_TARGET_ADDRESSES).forEach((address, index) => {
    recipients.push({
      address,
      label: `address-${index + 1}`,
    });
  });

  return recipients;
}

async function main() {
  const issuer = keypairFromEnv("TESTNET_SEED_ASSET_ISSUER_SECRET");
  const distributor = keypairFromEnv("TESTNET_SEED_ASSET_DISTRIBUTOR_SECRET");
  const asset = new Asset(config.assetCode, issuer.publicKey());
  const recipients = loadRecipients();

  await fundViaFriendbot(issuer.publicKey());
  await fundViaFriendbot(distributor.publicKey());
  await ensureTrustline(distributor, asset);

  const distributorAccount = await server.loadAccount(distributor.publicKey());
  const distributorBalance = readAssetBalance(distributorAccount, asset);
  const targetFloat = Number(config.distributorFloatAmount);
  if (distributorBalance < targetFloat) {
    await pay(
      issuer,
      asset,
      distributor.publicKey(),
      String(targetFloat - distributorBalance),
    );
  }

  for (const recipient of recipients) {
    if (recipient.secret) {
      await ensureTrustline(Keypair.fromSecret(recipient.secret), asset);
      await pay(distributor, asset, recipient.address, config.assetAmount);
      continue;
    }

    const account = await server.loadAccount(recipient.address);
    if (!accountHasTrustline(account, asset)) {
      throw new Error(
        `Recipient ${recipient.label} (${recipient.address}) does not trust ${config.assetCode}; provide its secret or create the trustline first`,
      );
    }

    await pay(distributor, asset, recipient.address, config.assetAmount);
  }

  const output = [
    `TESTNET_SEED_ASSET_ENABLED=true`,
    `TESTNET_SEED_ASSET_CODE=${config.assetCode}`,
    `TESTNET_SEED_ASSET_AMOUNT=${config.assetAmount}`,
    `TESTNET_SEED_ASSET_TRUSTLINE_LIMIT=${config.trustlineLimit}`,
    `TESTNET_SEED_ASSET_ISSUER_SECRET=${issuer.secret()}`,
    `TESTNET_SEED_ASSET_DISTRIBUTOR_SECRET=${distributor.secret()}`,
    `AMAZONES_USDA_ASSET=${config.assetCode}:${issuer.publicKey()}`,
    `AMAZONES_USDA_SAC=${asset.contractId(config.networkPassphrase)}`,
  ].join("\n");

  mkdirSync(dirname(config.outputEnvFile), { recursive: true });
  writeFileSync(config.outputEnvFile, `${output}\n`, "utf8");

  console.log(`Asset: ${config.assetCode}:${issuer.publicKey()}`);
  console.log(`SAC: ${asset.contractId(config.networkPassphrase)}`);
  console.log(`Distributor: ${distributor.publicKey()}`);
  console.log(`Recipients seeded: ${recipients.length}`);
  console.log(`Saved env: ${config.outputEnvFile}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

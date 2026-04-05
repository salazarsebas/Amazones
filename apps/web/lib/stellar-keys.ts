import base32 from "base32.js";
import nacl from "tweetnacl";

const VERSION_BYTES = {
  ed25519PublicKey: 6 << 3,
  ed25519SecretSeed: 18 << 3,
} as const;

function crc16xmodem(payload: Uint8Array): Uint8Array {
  let crc = 0x0000;

  for (const byte of payload) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return new Uint8Array([crc & 0xff, (crc >> 8) & 0xff]);
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
}

function encodeBase32(bytes: Uint8Array): string {
  return new base32.Encoder({ type: "rfc4648", lc: false })
    .write(bytes)
    .finalize()
    .replace(/=+$/g, "");
}

function decodeBase32(value: string): Uint8Array {
  const decoded = new base32.Decoder({ type: "rfc4648", lc: false })
    .write(value)
    .finalize();

  return Uint8Array.from(decoded);
}

function encodeCheck(versionByte: number, payload: Uint8Array): string {
  const versionPrefixed = new Uint8Array(1 + payload.length);
  versionPrefixed[0] = versionByte;
  versionPrefixed.set(payload, 1);

  const checksum = crc16xmodem(versionPrefixed);
  const encoded = new Uint8Array(versionPrefixed.length + checksum.length);
  encoded.set(versionPrefixed, 0);
  encoded.set(checksum, versionPrefixed.length);

  return encodeBase32(encoded);
}

function decodeCheck(versionByte: number, value: string): Uint8Array {
  const decoded = decodeBase32(value);

  if (decoded.length < 3) {
    throw new Error("Invalid StrKey payload.");
  }
  if (decoded[0] !== versionByte) {
    throw new Error("Unexpected StrKey version byte.");
  }

  const payload = decoded.slice(0, decoded.length - 2);
  const checksum = decoded.slice(decoded.length - 2);
  const expectedChecksum = crc16xmodem(payload);

  if (!equalBytes(checksum, expectedChecksum)) {
    throw new Error("Invalid StrKey checksum.");
  }

  return payload.slice(1);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function isValidSecretSeed(value: string): boolean {
  try {
    const decoded = decodeCheck(VERSION_BYTES.ed25519SecretSeed, value.trim());
    return decoded.length === 32;
  } catch {
    return false;
  }
}

export function publicKeyFromSecret(secretSeed: string): string {
  const seed = decodeCheck(VERSION_BYTES.ed25519SecretSeed, secretSeed.trim());
  const keyPair = nacl.sign.keyPair.fromSeed(seed);
  return encodeCheck(VERSION_BYTES.ed25519PublicKey, keyPair.publicKey);
}

export function signUtf8(secretSeed: string, message: string): string {
  const seed = decodeCheck(VERSION_BYTES.ed25519SecretSeed, secretSeed.trim());
  const keyPair = nacl.sign.keyPair.fromSeed(seed);
  return bytesToBase64(
    nacl.sign.detached(new TextEncoder().encode(message), keyPair.secretKey),
  );
}

export function createRandomSecretSeed(): string {
  const seed = crypto.getRandomValues(new Uint8Array(32));
  return encodeCheck(VERSION_BYTES.ed25519SecretSeed, seed);
}

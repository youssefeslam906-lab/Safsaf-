import type { EncryptedPayload, LockoutState } from '../types';

const PBKDF2_ITERATIONS = 150000;
const VERIFIER_MAGIC = 'YS_VAULT_VERIFIED_V2';

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function generateSalt(): string {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return bytesToBase64(salt);
}

export async function deriveMasterKey(
  passcode: string,
  saltBase64: string,
): Promise<CryptoKey> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto API is unavailable in this browser.');
  }

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passcode),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );

  const salt = base64ToBytes(saltBase64);

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptBytes(
  key: CryptoKey,
  plaintext: Uint8Array,
): Promise<EncryptedPayload> {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(plaintext),
  );

  return {
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(cipherBuffer)),
  };
}

export async function decryptBytes(
  key: CryptoKey,
  payload: EncryptedPayload,
): Promise<Uint8Array> {
  const iv = base64ToBytes(payload.iv);
  const cipher = base64ToBytes(payload.data);

  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(cipher),
  );

  return new Uint8Array(plainBuffer);
}

export async function encryptJson<T>(
  key: CryptoKey,
  value: T,
): Promise<EncryptedPayload> {
  const encoded = new TextEncoder().encode(JSON.stringify(value));
  return encryptBytes(key, encoded);
}

export async function decryptJson<T>(
  key: CryptoKey,
  payload: EncryptedPayload,
): Promise<T> {
  const plainBytes = await decryptBytes(key, payload);
  const jsonText = new TextDecoder().decode(plainBytes);
  return JSON.parse(jsonText) as T;
}

export async function createVerifier(
  key: CryptoKey,
): Promise<EncryptedPayload> {
  return encryptJson(key, {
    tag: VERIFIER_MAGIC,
    v: 2,
  });
}

export async function verifyKeyWithVerifier(
  key: CryptoKey,
  verifier: EncryptedPayload,
): Promise<boolean> {
  try {
    const parsed = await decryptJson<{ tag?: string; v?: number }>(
      key,
      verifier,
    );
    return parsed?.tag === VERIFIER_MAGIC && parsed?.v === 2;
  } catch {
    return false;
  }
}

export function evaluatePasscodeStrength(passcode: string): {
  score: 0 | 1 | 2 | 3;
  label: string;
} {
  if (passcode.length < 4) {
    return { score: 0, label: 'قصير جداً (4 أحرف أو أرقام على الأقل)' };
  }
  const hasLower = /[a-z]/.test(passcode);
  const hasUpper = /[A-Z]/.test(passcode);
  const hasDigit = /\d/.test(passcode);
  const hasSymbol = /[^A-Za-z0-9]/.test(passcode);
  const variety = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;

  if (passcode.length >= 10 && variety >= 3) {
    return { score: 3, label: 'قوي جداً' };
  }
  if (passcode.length >= 6 && variety >= 2) {
    return { score: 2, label: 'جيد' };
  }
  return { score: 1, label: 'مقبول (يفضّل المزج بين حروف وأرقام)' };
}

export function computeLockoutCooldownMs(failedAttempts: number): number {
  if (failedAttempts < 3) return 0;
  if (failedAttempts < 5) return 15_000;
  if (failedAttempts < 7) return 60_000;
  return 300_000;
}

export function getRemainingLockoutSeconds(state: LockoutState): number {
  const remaining = state.lockedUntil - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

/**
 * ZK-Vault Cryptographic Engine
 * ============================================================
 * All operations happen exclusively in volatile JS heap memory.
 * NO keys, NO master password, NO K_enc / K_auth are ever
 * written to localStorage / sessionStorage / IndexedDB.
 * ============================================================
 */

export interface DerivedKeys {
  K_enc: CryptoKey;   // AES-256-GCM encryption key  — STAYS IN RAM
  K_auth_hash: string; // SHA-256(K_auth) hex — sent to server for auth
}

export interface EncryptedBlob {
  ciphertext: string; // base64
  iv: string;         // base64 (96-bit nonce)
  auth_tag_included: true; // AES-GCM appends 128-bit auth tag automatically
}

// ─────────────────────────────────────────────
// CSPRNG Salt — 32 bytes from window.crypto
// ─────────────────────────────────────────────
export function generateSalt(): Uint8Array {
  const salt = new Uint8Array(32);
  window.crypto.getRandomValues(salt);
  return salt;
}

export function saltToHex(salt: Uint8Array): string {
  return Array.from(salt)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

// ─────────────────────────────────────────────
// Mock Argon2id Key Derivation
// In production: replace with argon2-wasm-pro or @noble/hashes
// Simulates: argon2id(password, salt) → 512-bit output
//            K_enc = first 256 bits, K_auth = last 256 bits
// ─────────────────────────────────────────────
export async function deriveKeys(
  masterPassword: string,
  saltHex: string,
  onProgress?: (phase: string) => void
): Promise<DerivedKeys> {
  onProgress?.("Initialising Argon2id WASM context…");

  // Simulate Argon2id computation time (300ms–700ms in real WASM)
  await new Promise((r) => setTimeout(r, 600));
  onProgress?.("Computing memory-hard hash (3 passes, 64 MiB)…");
  await new Promise((r) => setTimeout(r, 500));
  onProgress?.("Splitting 512-bit output → K_enc ⊕ K_auth…");
  await new Promise((r) => setTimeout(r, 200));

  // Deterministic mock: derive 512 bits via PBKDF2 (real impl uses argon2id WASM)
  const enc = new TextEncoder();
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(masterPassword),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const saltBytes = hexToUint8Array(saltHex);
  const bits512 = await window.crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes.buffer as ArrayBuffer, iterations: 100_000, hash: "SHA-256" },
    baseKey,
    512
  );

  // K_enc — first 256 bits → AES-256-GCM CryptoKey (non-extractable)
  const K_enc_bytes = bits512.slice(0, 32);
  const K_enc = await window.crypto.subtle.importKey(
    "raw",
    K_enc_bytes,
    { name: "AES-GCM", length: 256 },
    false,        // ← non-extractable: cannot be serialised out of heap
    ["encrypt", "decrypt"]
  );

  // K_auth — last 256 bits → SHA-256 hash sent to server
  const K_auth_bytes = bits512.slice(32, 64);
  const K_auth_hash_buf = await window.crypto.subtle.digest("SHA-256", K_auth_bytes);
  const K_auth_hash = Array.from(new Uint8Array(K_auth_hash_buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  onProgress?.("Key derivation complete.");

  return { K_enc, K_auth_hash };
}

// ─────────────────────────────────────────────
// AES-256-GCM Encryption
// ─────────────────────────────────────────────
export async function encryptCredential(
  plaintext: string,
  K_enc: CryptoKey
): Promise<EncryptedBlob> {
  const iv = new Uint8Array(12);
  window.crypto.getRandomValues(iv); // 96-bit nonce

  const enc = new TextEncoder();
  const ciphertextBuf = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: 128 },
    K_enc,
    enc.encode(plaintext)
  );

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertextBuf))),
    iv: btoa(String.fromCharCode(...iv)),
    auth_tag_included: true,
  };
}

// ─────────────────────────────────────────────
// AES-256-GCM Decryption
// ─────────────────────────────────────────────
export async function decryptCredential(
  blob: EncryptedBlob,
  K_enc: CryptoKey
): Promise<string> {
  const ciphertextBytes = Uint8Array.from(atob(blob.ciphertext), (c) => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(blob.iv), (c) => c.charCodeAt(0));

  let plaintextBuf: ArrayBuffer;
  try {
    plaintextBuf = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv, tagLength: 128 },
      K_enc,
      ciphertextBytes
    );
  } catch {
    throw new Error("AEAD_TAG_MISMATCH: Authentication tag verification failed. Possible tampering detected.");
  }

  return new TextDecoder().decode(plaintextBuf);
}

// ─────────────────────────────────────────────
// Secure Password Generator (CSPRNG)
// ─────────────────────────────────────────────
export interface GeneratorOptions {
  length: number;
  upper: boolean;
  lower: boolean;
  digits: boolean;
  symbols: boolean;
}

export function generatePassword(opts: GeneratorOptions): string {
  const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const LOWER = "abcdefghijklmnopqrstuvwxyz";
  const DIGITS = "0123456789";
  const SYMBOLS = "!@#$%^&*()-_=+[]{}|;:,.<>?";

  let charset = "";
  if (opts.upper) charset += UPPER;
  if (opts.lower) charset += LOWER;
  if (opts.digits) charset += DIGITS;
  if (opts.symbols) charset += SYMBOLS;
  if (charset.length === 0) charset = LOWER;

  const randomBytes = new Uint8Array(opts.length * 2);
  window.crypto.getRandomValues(randomBytes);

  let result = "";
  let i = 0;
  while (result.length < opts.length) {
    const byte = randomBytes[i++ % randomBytes.length];
    if (byte < 256 - (256 % charset.length)) {
      result += charset[byte % charset.length];
    }
  }
  return result;
}

// ─────────────────────────────────────────────
// Password Entropy Estimator
// ─────────────────────────────────────────────
export function calcEntropy(password: string): number {
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);
  let pool = 0;
  if (hasLower) pool += 26;
  if (hasUpper) pool += 26;
  if (hasDigit) pool += 10;
  if (hasSymbol) pool += 32;
  if (pool === 0) return 0;
  return Math.round(password.length * Math.log2(pool));
}

export function entropyLabel(bits: number): { label: string; color: string } {
  if (bits < 40) return { label: "Very Weak", color: "#ef4444" };
  if (bits < 60) return { label: "Weak", color: "#f97316" };
  if (bits < 80) return { label: "Fair", color: "#eab308" };
  if (bits < 100) return { label: "Strong", color: "#22c55e" };
  return { label: "Very Strong", color: "#06b6d4" };
}

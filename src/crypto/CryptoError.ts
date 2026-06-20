/**
 * CryptoError — Sealed error class for all cryptographic failures.
 * ================================================================
 * OWASP ASVS v4.0.3 §6.2.5:
 *   On any AEAD MAC verification failure the implementation MUST throw
 *   a fatal error and MUST NOT return partial or corrupted plaintexts.
 *
 * All cryptoEngine functions throw exclusively CryptoError (never the raw
 * DOMException from SubtleCrypto) so that callers can reliably distinguish
 * crypto failures from network / logic errors.
 *
 * Machine-readable codes
 * ──────────────────────
 *   AEAD_TAG_MISMATCH  AES-256-GCM authentication tag verification failed.
 *   INVALID_BLOB       Base64 ciphertext or IV is malformed / truncated.
 *   INVALID_IV         IV is not exactly 96 bits (12 bytes).
 *   DERIVATION_ERROR   Key derivation pipeline failed unexpectedly.
 *   ENCRYPT_ERROR      Encryption operation failed (e.g. invalid CryptoKey).
 */
export class CryptoError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "CryptoError";
    this.code = code;
    // Restore correct prototype chain after TypeScript transpilation.
    Object.setPrototypeOf(this, CryptoError.prototype);
  }

  /** Type-guard: returns true if the thrown value is a CryptoError. */
  static is(err: unknown): err is CryptoError {
    return err instanceof CryptoError;
  }
}

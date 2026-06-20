/**
 * memoryGuard — Active JS Heap Memory Destruction Utilities
 * ==========================================================
 * GDPR Art. 17 / CNDP Law 09-08 (Right to Erasure) — Privacy-by-Design:
 *   Cryptographic material must be actively overwritten before references
 *   are released to the JavaScript garbage collector.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ IMPORTANT — JavaScript String Immutability Caveat                       │
 * │                                                                         │
 * │ JS primitive strings (typeof === 'string') are IMMUTABLE. It is        │
 * │ architecturally impossible to zero-wipe a JS string value in the V8    │
 * │ heap. Strings such as K_auth_hash (hex) or credential passwords held   │
 * │ as string fields in React state are GC-eligible once all references     │
 * │ are dropped — but cannot be actively overwritten.                       │
 * │                                                                         │
 * │ The functions below wipe ONLY ArrayBuffer / Uint8Array objects, which   │
 * │ are the correct target for GDPR erasure of raw key material (K_enc      │
 * │ derivation intermediates, K_auth_bytes, PBKDF2/Argon2id output).       │
 * │                                                                         │
 * │ The CryptoKey object (K_enc) is non-extractable by construction:       │
 * │ its raw bytes are managed inside the browser SubtleCrypto HSM           │
 * │ boundary and are not accessible from JS. Setting the CryptoKey          │
 * │ reference to null removes the JS handle; the browser runtime disposes   │
 * │ the underlying key material per platform policy.                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

/**
 * secureWipe — Zero-fills an ArrayBuffer or Uint8Array in place.
 *
 * Call immediately after the buffer is no longer needed — before the
 * variable goes out of scope or is set to null — to prevent residual
 * key material from remaining in the JS heap until the next GC cycle.
 *
 * @param buf  The buffer to wipe. Null / undefined are silently ignored.
 */
export function secureWipe(buf: ArrayBuffer | Uint8Array | null | undefined): void {
  if (buf == null) return;

  if (buf instanceof Uint8Array) {
    buf.fill(0);
    return;
  }

  // ArrayBuffer: create a Uint8Array view and fill.
  new Uint8Array(buf).fill(0);
}

/**
 * secureWipeMultiple — Convenience wrapper that wipes an arbitrary number
 * of buffers in one call.  Accepts any mix of ArrayBuffer | Uint8Array.
 */
export function secureWipeMultiple(
  ...bufs: Array<ArrayBuffer | Uint8Array | null | undefined>
): void {
  for (const b of bufs) secureWipe(b);
}

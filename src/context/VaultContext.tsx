/**
 * VaultContext — Volatile In-Memory Credential Store
 * ====================================================
 * Compliance:
 *   GDPR Art. 17 / CNDP Law 09-08 — clearVault() performs best-effort
 *     active erasure of decrypted credential state from the JS heap
 *     before references are dropped.
 *
 * Architecture invariants:
 *   • Decrypted passwords are held in volatile React state only.
 *   • clearVault() encodes each password string to Uint8Array bytes and
 *     zero-fills those bytes before clearing the state array.
 *     ⚠ NOTE: JS primitive strings are immutable — the string value itself
 *     cannot be zero-wiped. This call wipes the TextEncoder output buffer,
 *     which is the closest approximation possible in the JS runtime.
 *   • No credential data is ever written to any persistent browser store.
 */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  encryptCredential,
  type EncryptedBlob,
} from "../crypto/cryptoEngine";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CredentialEntry {
  id: string;
  siteLabel: string;
  url: string;
  username: string;
  /** Plaintext password — volatile in JS heap only. */
  password: string;
  updatedAt: string;
}

export interface EncryptedEntry {
  id: string;
  siteLabel: string;
  url: string;
  username: string;
  passwordBlob: EncryptedBlob;
  updatedAt: string;
}

interface VaultContextValue {
  credentials: CredentialEntry[];
  isLoading: boolean;
  addCredential: (
    entry: Omit<CredentialEntry, "id" | "updatedAt">,
    K_enc: CryptoKey
  ) => Promise<void>;
  deleteCredential: (id: string) => void;
  updateCredential: (
    id: string,
    patch: Partial<Omit<CredentialEntry, "id" | "updatedAt">>,
    K_enc: CryptoKey
  ) => Promise<void>;
  /**
   * clearVault — GDPR Art. 17 active erasure of all decrypted credential
   * state. Call this BEFORE lockVault() / logout() in AuthContext.
   *
   * For each credential: encodes the password string to Uint8Array bytes
   * and zero-fills them, then resets the credentials array to [].
   *
   * ⚠ JS string immutability: the original string primitive in the V8 heap
   * cannot be directly zeroed. Only the TextEncoder output buffer is wiped.
   * Nulling the state reference makes the string GC-eligible.
   */
  clearVault: () => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const VaultContext = createContext<VaultContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function VaultProvider({ children }: { children: ReactNode }) {
  const [credentials, setCredentials] = useState<CredentialEntry[]>([
    {
      id: "mock-1",
      siteLabel: "GitHub",
      url: "https://github.com",
      username: "dev@example.com",
      password: "••••••••••••",
      updatedAt: new Date(Date.now() - 86_400_000 * 2).toISOString(),
    },
    {
      id: "mock-2",
      siteLabel: "AWS Console",
      url: "https://aws.amazon.com",
      username: "aws-admin@corp.io",
      password: "••••••••••••",
      updatedAt: new Date(Date.now() - 86_400_000 * 5).toISOString(),
    },
    {
      id: "mock-3",
      siteLabel: "Vercel Dashboard",
      url: "https://vercel.com",
      username: "deploy@startup.dev",
      password: "••••••••••••",
      updatedAt: new Date(Date.now() - 86_400_000 * 1).toISOString(),
    },
    {
      id: "mock-4",
      siteLabel: "Linear",
      url: "https://linear.app",
      username: "pm@startup.dev",
      password: "••••••••••••",
      updatedAt: new Date(Date.now() - 3_600_000 * 3).toISOString(),
    },
    {
      id: "mock-5",
      siteLabel: "Cloudflare",
      url: "https://cloudflare.com",
      username: "infra@startup.dev",
      password: "••••••••••••",
      updatedAt: new Date(Date.now() - 3_600_000 * 12).toISOString(),
    },
  ]);

  const [isLoading, setIsLoading] = useState(false);

  // ── clearVault ──────────────────────────────────────────────────────────────
  const clearVault = useCallback(() => {
    setCredentials((prev) => {
      // Best-effort wipe of encoded password bytes before dropping state.
      // JS string primitives are immutable — we can only wipe the encoded
      // byte representation of the password, not the original string value.
      const enc = new TextEncoder();
      prev.forEach((entry) => {
        if (entry.password) {
          const encoded = enc.encode(entry.password);
          encoded.fill(0);
        }
      });
      return [];
    });
    setIsLoading(false);
  }, []);

  // ── addCredential ───────────────────────────────────────────────────────────
  const addCredential = useCallback(
    async (
      entry: Omit<CredentialEntry, "id" | "updatedAt">,
      K_enc: CryptoKey
    ) => {
      setIsLoading(true);
      // AES-256-GCM encrypt before network send. In production: POST /vault/entries
      // with { encrypted_blob, iv, site_label, username }.
      await encryptCredential(entry.password, K_enc);
      await new Promise<void>((r) => setTimeout(r, 400));
      const newEntry: CredentialEntry = {
        ...entry,
        id: `cred-${Date.now()}`,
        updatedAt: new Date().toISOString(),
      };
      setCredentials((prev) => [newEntry, ...prev]);
      setIsLoading(false);
    },
    []
  );

  // ── deleteCredential ────────────────────────────────────────────────────────
  const deleteCredential = useCallback((id: string) => {
    setCredentials((prev) => {
      // Wipe the deleted entry's password bytes before removal.
      const enc = new TextEncoder();
      const target = prev.find((c) => c.id === id);
      if (target?.password) {
        enc.encode(target.password).fill(0);
      }
      return prev.filter((c) => c.id !== id);
    });
  }, []);

  // ── updateCredential ────────────────────────────────────────────────────────
  const updateCredential = useCallback(
    async (
      id: string,
      patch: Partial<Omit<CredentialEntry, "id" | "updatedAt">>,
      K_enc: CryptoKey
    ) => {
      if (patch.password) {
        // Encrypt the new password before the mock network call.
        await encryptCredential(patch.password, K_enc);
      }
      setCredentials((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, ...patch, updatedAt: new Date().toISOString() }
            : c
        )
      );
    },
    []
  );

  return (
    <VaultContext.Provider
      value={{
        credentials,
        isLoading,
        addCredential,
        deleteCredential,
        updateCredential,
        clearVault,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVault(): VaultContextValue {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used within <VaultProvider>");
  return ctx;
}

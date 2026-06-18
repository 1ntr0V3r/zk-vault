/**
 * VaultContext — In-Memory Credential Store
 * Credentials are decrypted on-the-fly and stored
 * in volatile React state only.
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

export interface CredentialEntry {
  id: string;
  siteLabel: string;
  url: string;
  username: string;
  password: string; // plaintext — volatile in heap
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
}

const VaultContext = createContext<VaultContextValue | null>(null);


export function VaultProvider({ children }: { children: ReactNode }) {
  const [credentials, setCredentials] = useState<CredentialEntry[]>([
    {
      id: "mock-1",
      siteLabel: "GitHub",
      url: "https://github.com",
      username: "dev@example.com",
      password: "••••••••••••",
      updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: "mock-2",
      siteLabel: "AWS Console",
      url: "https://aws.amazon.com",
      username: "aws-admin@corp.io",
      password: "••••••••••••",
      updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
      id: "mock-3",
      siteLabel: "Vercel Dashboard",
      url: "https://vercel.com",
      username: "deploy@startup.dev",
      password: "••••••••••••",
      updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
    {
      id: "mock-4",
      siteLabel: "Linear",
      url: "https://linear.app",
      username: "pm@startup.dev",
      password: "••••••••••••",
      updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    },
    {
      id: "mock-5",
      siteLabel: "Cloudflare",
      url: "https://cloudflare.com",
      username: "infra@startup.dev",
      password: "••••••••••••",
      updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const addCredential = useCallback(
    async (
      entry: Omit<CredentialEntry, "id" | "updatedAt">,
      K_enc: CryptoKey
    ) => {
      setIsLoading(true);
      // AES-256-GCM encryption before (mock) network send
      await encryptCredential(entry.password, K_enc);
      // In production: POST /vault with blob payload
      // Mock: store plaintext reference in volatile state
      await new Promise((r) => setTimeout(r, 400));
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

  const deleteCredential = useCallback((id: string) => {
    setCredentials((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const updateCredential = useCallback(
    async (
      id: string,
      patch: Partial<Omit<CredentialEntry, "id" | "updatedAt">>,
      K_enc: CryptoKey
    ) => {
      if (patch.password) {
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
      value={{ credentials, isLoading, addCredential, deleteCredential, updateCredential }}
    >
      {children}
    </VaultContext.Provider>
  );
}

export function useVault(): VaultContextValue {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used within <VaultProvider>");
  return ctx;
}

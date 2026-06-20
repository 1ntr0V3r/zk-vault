/**
 * AuthContext — Volatile Cryptographic Session Store
 * ====================================================
 * Compliance:
 *   GDPR Art. 17 / CNDP Law 09-08 — Active memory erasure of session keys
 *                                     on lockVault() / logout().
 *   OWASP ASVS §2.1.11            — Automatic re-authentication after
 *                                     30 minutes of user inactivity.
 *
 * Architecture invariants:
 *   • K_enc (CryptoKey) is non-extractable — its raw bytes are managed by
 *     the browser's SubtleCrypto HSM boundary, not accessible from JS.
 *     Setting the reference to null removes the JS handle; the runtime
 *     disposes the underlying key material per platform security policy.
 *   • K_auth_hash is a hex string — JS primitives are immutable; the
 *     reference is nulled so the string becomes GC-eligible.
 *   • jwt is a string — same immutability constraint applies.
 *   • No key or token material is written to localStorage, sessionStorage,
 *     IndexedDB, cookies, or any other persistent browser store.
 */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { type DerivedKeys } from "../crypto/cryptoEngine";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionUser {
  email: string;
  saltHex: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: SessionUser | null;
  jwt: string | null;        // Volatile — never persisted.
  K_enc: CryptoKey | null;  // Volatile — non-extractable, never persisted.
  K_auth_hash: string | null; // Volatile — never persisted.
}

interface AuthContextValue extends AuthState {
  /** Establish a new authenticated session with derived keys and JWT. */
  login: (user: SessionUser, keys: DerivedKeys, jwt: string) => void;
  /**
   * lockVault — semantic "Lock" action (e.g. screen-lock button).
   * Nulls all session references. Call clearVault() from VaultContext
   * BEFORE this to wipe plaintext credential state.
   */
  lockVault: () => void;
  /**
   * logout — semantic "Sign Out" action. Identical wipe sequence to
   * lockVault(); the distinction is purely UI/UX — both provide the same
   * security guarantee.
   */
  logout: () => void;
  /** Elapsed seconds since authentication. */
  sessionAge: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * OWASP ASVS §2.1.11: Re-authenticate after 30 minutes of inactivity.
 * Triggers lockVault() automatically on idle timeout.
 */
const IDLE_LOCK_MS = 30 * 60 * 1_000;

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    jwt: null,
    K_enc: null,
    K_auth_hash: null,
  });

  const [sessionAge, setSessionAge] = useState(0);

  // Session clock (1-second tick while authenticated).
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Idle auto-lock timer.
  const idleLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Stable ref to lockVault so the idle timer closure never captures stale state.
  const lockVaultRef = useRef<() => void>(() => {});

  // ── Core wipe helper ────────────────────────────────────────────────────────
  const _clearSessionState = useCallback(() => {
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    if (idleLockTimerRef.current) {
      clearTimeout(idleLockTimerRef.current);
      idleLockTimerRef.current = null;
    }
    // Drop all references — K_enc (CryptoKey) and jwt / K_auth_hash (strings)
    // become GC-eligible. CryptoKey raw bytes are managed by SubtleCrypto;
    // strings are immutable primitives — reference nulling is the only option.
    setState({
      isAuthenticated: false,
      user: null,
      jwt: null,
      K_enc: null,
      K_auth_hash: null,
    });
    setSessionAge(0);
  }, []);

  // ── lockVault ───────────────────────────────────────────────────────────────
  const lockVault = useCallback(() => {
    _clearSessionState();
  }, [_clearSessionState]);

  // Keep the stable ref in sync with the latest lockVault callback.
  useEffect(() => {
    lockVaultRef.current = lockVault;
  }, [lockVault]);

  // ── logout ──────────────────────────────────────────────────────────────────
  // Identical wipe to lockVault. UI distinguishes "Lock" vs "Sign Out"
  // for UX clarity; the security guarantee is equivalent.
  const logout = useCallback(() => {
    _clearSessionState();
  }, [_clearSessionState]);

  // ── login ───────────────────────────────────────────────────────────────────
  const login = useCallback(
    (user: SessionUser, keys: DerivedKeys, jwt: string) => {
      setState({
        isAuthenticated: true,
        user,
        jwt,
        K_enc: keys.K_enc,
        K_auth_hash: keys.K_auth_hash,
      });
      setSessionAge(0);
      sessionTimerRef.current = setInterval(
        () => setSessionAge((a) => a + 1),
        1_000
      );
    },
    []
  );

  // ── Idle auto-lock timer ────────────────────────────────────────────────────
  // OWASP ASVS §2.1.11: Reset idle timer on every user interaction.
  // Lock the vault if IDLE_LOCK_MS elapses without activity.
  const resetIdleTimer = useCallback(() => {
    if (idleLockTimerRef.current) clearTimeout(idleLockTimerRef.current);
    idleLockTimerRef.current = setTimeout(() => {
      lockVaultRef.current();
    }, IDLE_LOCK_MS);
  }, []);

  useEffect(() => {
    if (!state.isAuthenticated) return;

    const onActivity = () => resetIdleTimer();
    window.addEventListener("mousemove", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity, { passive: true });
    window.addEventListener("pointerdown", onActivity, { passive: true });
    resetIdleTimer(); // Start the idle clock immediately on login.

    return () => {
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("pointerdown", onActivity);
      if (idleLockTimerRef.current) clearTimeout(idleLockTimerRef.current);
    };
  }, [state.isAuthenticated, resetIdleTimer]);

  return (
    <AuthContext.Provider value={{ ...state, login, lockVault, logout, sessionAge }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

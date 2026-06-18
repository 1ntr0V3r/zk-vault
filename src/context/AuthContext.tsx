/**
 * AuthContext — Volatile Session Store
 * ======================================================
 * All cryptographic material (K_enc, JWT, K_auth_hash)
 * lives ONLY in React heap memory. No Web Storage access.
 * ======================================================
 */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { type DerivedKeys } from "../crypto/cryptoEngine";

export interface SessionUser {
  email: string;
  saltHex: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: SessionUser | null;
  jwt: string | null;             // Volatile — never persisted
  K_enc: CryptoKey | null;       // Volatile — never persisted
  K_auth_hash: string | null;    // Volatile — never persisted
}

interface AuthContextValue extends AuthState {
  login: (user: SessionUser, keys: DerivedKeys, jwt: string) => void;
  logout: () => void;
  sessionAge: number; // seconds since login
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    jwt: null,
    K_enc: null,
    K_auth_hash: null,
  });

  const [sessionAge, setSessionAge] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      timerRef.current = setInterval(
        () => setSessionAge((a) => a + 1),
        1000
      );
    },
    []
  );

  const logout = useCallback(() => {
    // Zero out session — keys discarded from heap on next GC
    setState({
      isAuthenticated: false,
      user: null,
      jwt: null,
      K_enc: null,
      K_auth_hash: null,
    });
    setSessionAge(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, sessionAge }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

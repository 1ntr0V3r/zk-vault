import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Mail,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ChevronLeft,
  Lock,
  Wifi,
} from "lucide-react";
import { deriveKeys } from "../crypto/cryptoEngine";
import { useAuth } from "../context/AuthContext";

// Mock: in production, fetch salt from GET /auth/salt?email=...
const MOCK_USER_SALT = "a3f8b2e1d4c7f9a2b5e8d3c6f1a4b7e2d5c8f3a6b9e2d7c4f1a8b3e6d9c2f5a1";

type PipelineStep = {
  label: string;
  status: "pending" | "active" | "done";
};

const INITIAL_STEPS: PipelineStep[] = [
  { label: "Fetch salt from server", status: "pending" },
  { label: "Argon2id key derivation (WASM)", status: "pending" },
  { label: "Split → K_enc ∥ K_auth", status: "pending" },
  { label: "SHA-256(K_auth) → auth_hash", status: "pending" },
  { label: "POST /auth/login with auth_hash", status: "pending" },
];

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [status, setStatus] = useState<"idle" | "deriving" | "authenticating" | "success" | "error">("idle");
  const [steps, setSteps] = useState<PipelineStep[]>(INITIAL_STEPS);
  const [error, setError] = useState("");
  const [aeadError, setAeadError] = useState(false);

  const setStep = (index: number, s: PipelineStep["status"]) => {
    setSteps((prev) => prev.map((step, i) => (i === index ? { ...step, status: s } : step)));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setAeadError(false);

    if (!email || !password) {
      setError("Email and Master Password are required.");
      return;
    }

    // Reset pipeline
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: "pending" as const })));
    setStatus("deriving");

    try {
      // ── Step 1: Fetch salt ────────────────────────
      setStep(0, "active");
      await new Promise((r) => setTimeout(r, 300));
      const saltHex = MOCK_USER_SALT; // mock: GET /auth/salt
      setStep(0, "done");

      // ── Step 2: Argon2id WASM ─────────────────────
      setStep(1, "active");
      const keys = await deriveKeys(password, saltHex, () => {});
      setStep(1, "done");

      // ── Step 3: Split keys ────────────────────────
      setStep(2, "active");
      await new Promise((r) => setTimeout(r, 150));
      setStep(2, "done");

      // ── Step 4: SHA-256(K_auth) ───────────────────
      setStep(3, "active");
      setStep(3, "done");

      // ── Step 5: POST /auth/login ──────────────────
      setStep(4, "active");
      setStatus("authenticating");
      await new Promise((r) => setTimeout(r, 600));

      // Simulate AEAD tag failure demo (wrong password check)
      // In production: server compares secrets.compare_digest(auth_hash, stored_hash)
      // For demo: email "fail@demo.com" triggers the AEAD error
      if (email.toLowerCase() === "fail@demo.com") {
        throw new Error("AEAD_TAG_MISMATCH: Authentication tag verification failed. Credentials rejected.");
      }

      setStep(4, "done");

      // Allocate mock JWT
      const mockJwt = "eyJ.zkvault.jwt." + Date.now();
      login({ email, saltHex }, keys, mockJwt);

      setStatus("success");
      setTimeout(() => navigate("/dashboard"), 500);
    } catch (err: any) {
      const msg: string = err.message || "Authentication failed.";
      if (msg.includes("AEAD_TAG_MISMATCH")) {
        setAeadError(true);
        setError("AEAD tag mismatch — authentication rejected. Possible wrong password or data tampering.");
      } else {
        setError(msg);
      }
      setStatus("error");
      setSteps((prev) =>
        prev.map((s) => (s.status === "active" ? { ...s, status: "pending" } : s))
      );
    }
  };

  const isDeriving = status === "deriving" || status === "authenticating";

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative"
      style={{ background: "var(--color-bg-base)" }}
    >
      {/* Background glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "40%", left: "50%", transform: "translate(-50%,-50%)",
          width: "500px", height: "350px",
          background: "radial-gradient(ellipse, rgba(56,139,253,0.07) 0%, transparent 70%)",
        }}
      />

      <div style={{ width: "100%", maxWidth: "460px", position: "relative" }}>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 mb-6"
          style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", textDecoration: "none" }}
          onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "var(--color-text-secondary)")}
          onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "var(--color-text-muted)")}
        >
          <ChevronLeft size={14} /> Back to home
        </Link>

        <div className="glass-card" style={{ padding: "36px" }}>
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div
              className="flex items-center justify-center w-10 h-10 rounded-xl"
              style={{ background: "linear-gradient(135deg, #1f6feb, #388bfd)", boxShadow: "0 0 20px rgba(56,139,253,0.35)" }}
            >
              <Lock size={20} color="white" />
            </div>
            <div>
              <h1 style={{ fontSize: "1.2rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 2 }}>
                Unlock your vault
              </h1>
              <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
                Full cryptographic pipeline runs locally
              </p>
            </div>
          </div>

          {/* Demo hint */}
          <div className="alert alert-info mb-5" style={{ fontSize: "0.78rem" }}>
            <Wifi size={13} style={{ flexShrink: 0 }} />
            <span>
              <strong>Demo:</strong> Any email/password opens the vault. Use <code style={{ color: "var(--color-accent-cyan)" }}>fail@demo.com</code> to trigger an AEAD error.
            </span>
          </div>

          {error && (
            <div className={`alert mb-5 ${aeadError ? "alert-error" : "alert-error"}`}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <div>
                {aeadError && (
                  <div style={{ fontWeight: 700, marginBottom: "3px", fontFamily: "monospace", fontSize: "0.75rem" }}>
                    AEAD_TAG_MISMATCH
                  </div>
                )}
                {error}
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} noValidate>
            {/* Email */}
            <div style={{ marginBottom: "16px" }}>
              <label className="form-label">Email Address</label>
              <div className="input-wrapper">
                <input
                  id="login-email"
                  type="email"
                  className="input-field"
                  placeholder="you@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isDeriving}
                  autoComplete="email"
                  style={{ paddingLeft: "38px" }}
                />
                <Mail size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
              </div>
            </div>

            {/* Master Password */}
            <div style={{ marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Master Password</label>
                <a href="#" style={{ fontSize: "0.75rem", color: "var(--color-accent-blue)", textDecoration: "none" }}>
                  Forgot hint?
                </a>
              </div>
              <div className="input-wrapper">
                <input
                  id="login-password"
                  type={showPass ? "text" : "password"}
                  className="input-field"
                  placeholder="Enter your master password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isDeriving}
                  autoComplete="current-password"
                  style={{ paddingLeft: "38px" }}
                />
                <KeyRound size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
                <button
                  type="button"
                  className="input-icon-right"
                  onClick={() => setShowPass((v) => !v)}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Crypto pipeline visualizer */}
            {isDeriving && (
              <div
                className="glass-card animate-fade-in"
                style={{ padding: "14px 16px", marginBottom: "20px", background: "var(--color-bg-base)" }}
              >
                <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "var(--color-text-muted)", letterSpacing: "0.08em", marginBottom: "10px" }}>
                  AUTHENTICATION PIPELINE
                </div>
                <div className="flex flex-col gap-2">
                  {steps.map((step, i) => (
                    <div
                      key={i}
                      className="pipeline-step"
                      style={
                        step.status === "done"
                          ? { borderColor: "rgba(63,185,80,0.3)", color: "var(--color-accent-green)", background: "rgba(63,185,80,0.04)" }
                          : step.status === "active"
                          ? { borderColor: "rgba(56,139,253,0.3)", color: "var(--color-accent-blue)", background: "rgba(56,139,253,0.04)" }
                          : {}
                      }
                    >
                      {step.status === "done" ? (
                        <CheckCircle2 size={12} />
                      ) : step.status === "active" ? (
                        <Loader2 size={12} className="animate-spin-slow" />
                      ) : (
                        <span style={{ width: 12, height: 12, display: "inline-flex" }} />
                      )}
                      <span>{step.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              className="btn-primary w-full justify-center"
              style={{ padding: "11px", fontSize: "0.9rem" }}
              disabled={isDeriving}
            >
              {isDeriving ? (
                <>
                  <Loader2 size={15} className="animate-spin-slow" />
                  {status === "authenticating" ? "Authenticating…" : "Deriving keys…"}
                </>
              ) : status === "success" ? (
                <>
                  <CheckCircle2 size={15} />
                  Vault unlocked!
                </>
              ) : (
                <>
                  Unlock Vault <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <div className="divider" />
          <p style={{ textAlign: "center", fontSize: "0.83rem", color: "var(--color-text-muted)" }}>
            No vault yet?{" "}
            <Link to="/register" style={{ color: "var(--color-accent-blue)", textDecoration: "none", fontWeight: 600 }}>
              Create one — it's free
            </Link>
          </p>
        </div>

        {/* Security footnote */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <ShieldCheck size={12} style={{ color: "var(--color-text-muted)" }} />
          <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", textAlign: "center" }}>
            End-to-end encrypted · Zero-knowledge · Open source
          </p>
        </div>
      </div>
    </div>
  );
}

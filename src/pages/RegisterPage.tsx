import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  Mail,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ChevronLeft,
  KeyRound,
} from "lucide-react";
import {
  generateSalt,
  saltToHex,
  deriveKeys,
} from "../crypto/cryptoEngine";
import { useAuth } from "../context/AuthContext";


function PasswordStrengthBar({ password }: { password: string }) {
  const len = password.length;
  let strength = 0;
  if (len >= 8) strength++;
  if (len >= 14) strength++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;

  const labels = ["", "Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
  const colors = ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4"];

  if (!password) return null;

  return (
    <div style={{ marginTop: "8px" }}>
      <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: "3px",
              borderRadius: "2px",
              background: i <= strength ? colors[strength] : "var(--color-border-emphasis)",
              transition: "all 0.2s ease",
            }}
          />
        ))}
      </div>
      {strength > 0 && (
        <span style={{ fontSize: "0.7rem", color: colors[strength] }}>
          {labels[strength]}
        </span>
      )}
    </div>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [status, setStatus] = useState<"idle" | "deriving" | "success" | "error">("idle");
  const [pipelinePhase, setPipelinePhase] = useState("");
  const [pipelineLog, setPipelineLog] = useState<string[]>([]);
  const [error, setError] = useState("");

  const passwordMatch = confirm.length > 0 && password === confirm;
  const passwordMismatch = confirm.length > 0 && password !== confirm;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password || !confirm) {
      setError("All fields are required.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 12) {
      setError("Master Password must be at least 12 characters.");
      return;
    }

    setStatus("deriving");
    setPipelineLog([]);

    try {
      // Step 1: Generate 32-byte CSPRNG salt
      const salt = generateSalt();
      const saltHex = saltToHex(salt);
      setPipelineLog((l) => [...l, "✓ 32-byte CSPRNG salt generated: " + saltHex.slice(0, 16) + "…"]);

      // Step 2-5: Derive keys (mock Argon2id)
      const keys = await deriveKeys(password, saltHex, (phase) => {
        setPipelinePhase(phase);
        setPipelineLog((l) => [...l, "› " + phase]);
      });

      // Mock: POST /auth/register with { email, saltHex, auth_hash }
      // Server stores: email, saltHex, SHA-256(K_auth) — NEVER K_enc or password
      await new Promise((r) => setTimeout(r, 400));
      setPipelineLog((l) => [...l, "✓ Account registered. Proceeding to vault…"]);

      // Mock JWT allocation
      const mockJwt = "eyJ.mock.token." + Date.now();
      login({ email, saltHex }, keys, mockJwt);

      setStatus("success");
      setTimeout(() => navigate("/dashboard"), 600);
    } catch (err: any) {
      setError(err.message || "Registration failed.");
      setStatus("error");
    }
  };

  const isDeriving = status === "deriving";

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative"
      style={{ background: "var(--color-bg-base)" }}
    >
      {/* Background glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "30%", left: "50%", transform: "translate(-50%,-50%)",
          width: "600px", height: "400px",
          background: "radial-gradient(ellipse, rgba(56,139,253,0.08) 0%, transparent 70%)",
        }}
      />

      <div style={{ width: "100%", maxWidth: "480px", position: "relative" }}>
        {/* Back link */}
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
              <ShieldCheck size={20} color="white" />
            </div>
            <div>
              <h1 style={{ fontSize: "1.2rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 2 }}>
                Create your vault
              </h1>
              <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
                Keys derived locally. Server stays blind.
              </p>
            </div>
          </div>

          {/* Security notice */}
          <div className="alert alert-info mb-6" style={{ fontSize: "0.78rem" }}>
            <Lock size={13} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              Your Master Password is <strong>never transmitted</strong>. Only SHA-256(K_auth) reaches our servers.
            </span>
          </div>

          {error && (
            <div className="alert alert-error mb-5">
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} noValidate>
            {/* Email */}
            <div style={{ marginBottom: "16px" }}>
              <label className="form-label">Email Address</label>
              <div className="input-wrapper">
                <input
                  id="register-email"
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
            <div style={{ marginBottom: "16px" }}>
              <label className="form-label">Master Password</label>
              <div className="input-wrapper">
                <input
                  id="register-password"
                  type={showPass ? "text" : "password"}
                  className="input-field"
                  placeholder="≥ 12 characters, high entropy"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isDeriving}
                  autoComplete="new-password"
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
              <PasswordStrengthBar password={password} />
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: "24px" }}>
              <label className="form-label">Confirm Master Password</label>
              <div className="input-wrapper">
                <input
                  id="register-confirm"
                  type={showConfirm ? "text" : "password"}
                  className="input-field"
                  placeholder="Re-enter master password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={isDeriving}
                  autoComplete="new-password"
                  style={{
                    paddingLeft: "38px",
                    borderColor: passwordMatch
                      ? "var(--color-accent-green)"
                      : passwordMismatch
                      ? "var(--color-accent-red)"
                      : undefined,
                  }}
                />
                <Lock size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
                <button
                  type="button"
                  className="input-icon-right"
                  onClick={() => setShowConfirm((v) => !v)}
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {passwordMatch && (
                <p style={{ fontSize: "0.72rem", color: "var(--color-accent-green)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                  <CheckCircle2 size={11} /> Passwords match
                </p>
              )}
              {passwordMismatch && (
                <p style={{ fontSize: "0.72rem", color: "var(--color-accent-red)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                  <AlertCircle size={11} /> Passwords do not match
                </p>
              )}
            </div>

            {/* Crypto pipeline log */}
            {isDeriving && (
              <div
                className="glass-card animate-fade-in"
                style={{ padding: "14px 16px", marginBottom: "20px", background: "var(--color-bg-base)" }}
              >
                <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "var(--color-text-muted)", letterSpacing: "0.08em", marginBottom: "8px" }}>
                  DERIVATION PIPELINE
                </div>
                {pipelineLog.map((line, i) => (
                  <div
                    key={i}
                    className="mono"
                    style={{ fontSize: "0.72rem", color: "var(--color-accent-blue)", marginBottom: "3px" }}
                  >
                    {line}
                  </div>
                ))}
                {pipelinePhase && (
                  <div className="flex items-center gap-2 mt-2">
                    <Loader2 size={12} className="animate-spin-slow" style={{ color: "var(--color-accent-blue)" }} />
                    <span className="mono" style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)" }}>
                      {pipelinePhase}
                    </span>
                  </div>
                )}
              </div>
            )}

            <button
              id="register-submit"
              type="submit"
              className="btn-primary w-full justify-center"
              style={{ padding: "11px", fontSize: "0.9rem" }}
              disabled={isDeriving}
            >
              {isDeriving ? (
                <>
                  <Loader2 size={15} className="animate-spin-slow" />
                  Deriving keys locally…
                </>
              ) : status === "success" ? (
                <>
                  <CheckCircle2 size={15} />
                  Vault created! Entering…
                </>
              ) : (
                <>
                  Create Secure Vault <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <div className="divider" />
          <p style={{ textAlign: "center", fontSize: "0.83rem", color: "var(--color-text-muted)" }}>
            Already have a vault?{" "}
            <Link to="/login" style={{ color: "var(--color-accent-blue)", textDecoration: "none", fontWeight: 600 }}>
              Open it here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

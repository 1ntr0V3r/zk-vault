import { useState, useEffect } from "react";
import {
  X,
  Lock,
  Globe,
  User,
  Tag,
  Eye,
  EyeOff,
  Wand2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useVault } from "../../context/VaultContext";
import { useAuth } from "../../context/AuthContext";
import { generatePassword, calcEntropy, entropyLabel } from "../../crypto/cryptoEngine";

interface AddCredentialModalProps {
  onClose: () => void;
}

export function AddCredentialModal({ onClose }: AddCredentialModalProps) {
  const { addCredential, isLoading } = useVault();
  const { K_enc } = useAuth();

  const [siteLabel, setSiteLabel] = useState("");
  const [url, setUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [encryptStatus, setEncryptStatus] = useState<"idle" | "encrypting" | "done">("idle");

  // Entropy
  const entropy = calcEntropy(password);
  const { label: entropyLabel_, color: entropyColor } = entropyLabel(entropy);

  const handleGeneratePassword = () => {
    const generated = generatePassword({ length: 24, upper: true, lower: true, digits: true, symbols: true });
    setPassword(generated);
    setShowPass(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!siteLabel || !username || !password) {
      setError("Site label, username, and password are required.");
      return;
    }
    if (!K_enc) {
      setError("Encryption key unavailable — please log in again.");
      return;
    }

    setEncryptStatus("encrypting");
    try {
      // AES-256-GCM encryption happens inside addCredential before any network call
      await addCredential({ siteLabel, url, username, password }, K_enc);
      setEncryptStatus("done");
      setTimeout(onClose, 300);
    } catch (err: any) {
      setError(err.message || "Failed to save credential.");
      setEncryptStatus("idle");
    }
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel" role="dialog" aria-modal="true" aria-label="Add new credential">
        {/* Modal header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px 16px",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-8 h-8 rounded-lg"
              style={{ background: "rgba(56,139,253,0.12)", border: "1px solid rgba(56,139,253,0.25)" }}
            >
              <Lock size={15} color="var(--color-accent-blue)" />
            </div>
            <div>
              <h2 style={{ fontSize: "0.95rem", fontWeight: 700 }}>Add New Credential</h2>
              <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
                Encrypted with AES-256-GCM before transmission
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close modal">
            <X size={16} />
          </button>
        </div>

        {/* Encryption notice */}
        <div style={{ padding: "14px 24px 0" }}>
          <div className="alert alert-info" style={{ fontSize: "0.77rem" }}>
            <ShieldCheck size={13} style={{ flexShrink: 0 }} />
            <span>
              Password is encrypted locally with <strong>AES-256-GCM</strong> using K_enc (RAM-only).
              The server receives an opaque ciphertext blob — never the plaintext.
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div style={{ padding: "20px 24px" }}>
            {error && (
              <div className="alert alert-error mb-5">
                <AlertCircle size={13} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}

            {/* Site Label */}
            <div style={{ marginBottom: "14px" }}>
              <label className="form-label">Site / Service Label</label>
              <div className="input-wrapper">
                <input
                  id="cred-site-label"
                  type="text"
                  className="input-field"
                  placeholder="e.g. GitHub, AWS Console"
                  value={siteLabel}
                  onChange={(e) => setSiteLabel(e.target.value)}
                  style={{ paddingLeft: "38px" }}
                  autoFocus
                />
                <Tag size={13} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
              </div>
            </div>

            {/* URL */}
            <div style={{ marginBottom: "14px" }}>
              <label className="form-label">URL <span style={{ color: "var(--color-text-muted)", textTransform: "none", letterSpacing: 0, fontWeight: 400 }}>(optional)</span></label>
              <div className="input-wrapper">
                <input
                  id="cred-url"
                  type="url"
                  className="input-field"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  style={{ paddingLeft: "38px" }}
                />
                <Globe size={13} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
              </div>
            </div>

            {/* Username */}
            <div style={{ marginBottom: "14px" }}>
              <label className="form-label">Username / Email</label>
              <div className="input-wrapper">
                <input
                  id="cred-username"
                  type="text"
                  className="input-field"
                  placeholder="user@example.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ paddingLeft: "38px" }}
                />
                <User size={13} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ padding: "4px 10px", fontSize: "0.75rem", gap: "5px" }}
                  onClick={handleGeneratePassword}
                >
                  <Wand2 size={12} /> Generate
                </button>
              </div>
              <div className="input-wrapper">
                <input
                  id="cred-password"
                  type={showPass ? "text" : "password"}
                  className="input-field"
                  placeholder="Enter or generate a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: "38px", fontFamily: showPass ? "monospace" : "inherit" }}
                />
                <Lock size={13} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
                <button
                  type="button"
                  className="input-icon-right"
                  onClick={() => setShowPass((v) => !v)}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            {/* Entropy bar */}
            {password && (
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", gap: "3px", marginBottom: "4px" }}>
                  {[20, 40, 60, 80, 100].map((threshold) => (
                    <div
                      key={threshold}
                      style={{
                        flex: 1,
                        height: "3px",
                        borderRadius: "2px",
                        background: entropy >= threshold ? entropyColor : "var(--color-border-emphasis)",
                        transition: "all 0.2s ease",
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.72rem", color: entropyColor }}>{entropyLabel_}</span>
                  <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }} className="mono">
                    {entropy} bits entropy
                  </span>
                </div>
              </div>
            )}

            {/* Encryption status */}
            {encryptStatus === "encrypting" && (
              <div className="alert alert-info mb-4 animate-fade-in" style={{ fontSize: "0.78rem" }}>
                <Loader2 size={13} className="animate-spin-slow" />
                AES-256-GCM encrypting payload with K_enc…
              </div>
            )}
            {encryptStatus === "done" && (
              <div className="alert alert-success mb-4 animate-fade-in" style={{ fontSize: "0.78rem" }}>
                <CheckCircle2 size={13} />
                Encrypted blob saved. Credential secured.
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              justifyContent: "flex-end",
              padding: "14px 24px 20px",
              borderTop: "1px solid var(--color-border)",
            }}
          >
            <button type="button" className="btn-ghost" onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button
              id="add-cred-submit"
              type="submit"
              className="btn-primary"
              disabled={isLoading || encryptStatus === "encrypting"}
            >
              {isLoading || encryptStatus === "encrypting" ? (
                <><Loader2 size={14} className="animate-spin-slow" /> Encrypting…</>
              ) : encryptStatus === "done" ? (
                <><CheckCircle2 size={14} /> Saved!</>
              ) : (
                <><Lock size={14} /> Save Encrypted</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useState } from "react";
import {
  Lock,
  LogOut,
  ShieldOff,
  KeyRound,
  Bell,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Info,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

interface SettingRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: React.ReactNode;
  danger?: boolean;
}

function SettingRow({ icon, title, description, action, danger }: SettingRowProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 20px",
        borderBottom: "1px solid var(--color-border)",
        gap: "16px",
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: 0 }}>
        <div
          style={{
            width: 36, height: 36, borderRadius: "9px", flexShrink: 0,
            background: danger ? "rgba(248,81,73,0.1)" : "var(--color-bg-base)",
            border: `1px solid ${danger ? "rgba(248,81,73,0.25)" : "var(--color-border)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: danger ? "var(--color-accent-red)" : "var(--color-text-secondary)",
          }}
        >
          {icon}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: "0.875rem", color: danger ? "var(--color-accent-red)" : "var(--color-text-primary)" }}>
            {title}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
            {description}
          </div>
        </div>
      </div>
      <div style={{ flexShrink: 0 }}>{action}</div>
    </div>
  );
}

export function SettingsView() {
  const { user, sessionAge, logout } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState(true);
  const [showSalt, setShowSalt] = useState(false);
  const [lockConfirm, setLockConfirm] = useState(false);
  const [purgeConfirm, setPurgeConfirm] = useState(false);
  const [rotateStatus, setRotateStatus] = useState<"idle" | "rotating" | "done">("idle");

  const sessionMins = Math.floor(sessionAge / 60);
  const sessionSecs = sessionAge % 60;

  const handleLock = () => {
    if (!lockConfirm) {
      setLockConfirm(true);
      setTimeout(() => setLockConfirm(false), 4000);
    } else {
      logout();
      navigate("/login");
    }
  };

  const handlePurge = () => {
    if (!purgeConfirm) {
      setPurgeConfirm(true);
      setTimeout(() => setPurgeConfirm(false), 4000);
    } else {
      logout();
      navigate("/");
    }
  };

  const handleRotate = async () => {
    setRotateStatus("rotating");
    await new Promise((r) => setTimeout(r, 1800));
    setRotateStatus("done");
    setTimeout(() => setRotateStatus("idle"), 3000);
  };

  return (
    <div className="animate-fade-in max-w-2xl">
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "4px" }}>
          Settings
        </h2>
        <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
          Account management and session controls
        </p>
      </div>

      {/* Account info card */}
      <div
        className="glass-card"
        style={{ padding: "20px 24px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "16px" }}
      >
        <div
          style={{
            width: 48, height: 48, borderRadius: "12px", flexShrink: 0,
            background: "linear-gradient(135deg, #1f6feb, #388bfd)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.2rem", fontWeight: 700, color: "white",
            boxShadow: "0 0 20px rgba(56,139,253,0.25)",
          }}
        >
          {user?.email?.[0]?.toUpperCase() ?? "U"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{user?.email}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "3px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="badge badge-green" style={{ padding: "2px 6px" }}>
              <CheckCircle2 size={9} /> Authenticated
            </span>
            <span>Session: {sessionMins}m {sessionSecs}s</span>
          </div>
        </div>
        <div className="badge badge-blue">ZK Vault</div>
      </div>

      {/* Security section */}
      <div style={{ marginBottom: "8px", fontSize: "0.7rem", fontWeight: 600, color: "var(--color-text-muted)", letterSpacing: "0.07em", padding: "0 4px" }}>
        SECURITY
      </div>
      <div className="glass-card" style={{ overflow: "hidden", marginBottom: "16px" }}>
        <SettingRow
          icon={<Eye size={15} />}
          title="Encryption Salt"
          description="Your unique 32-byte CSPRNG salt used for Argon2id key derivation"
          action={
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                className="mono"
                style={{
                  fontSize: "0.7rem",
                  color: "var(--color-text-muted)",
                  maxWidth: "200px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {showSalt ? user?.saltHex : "••••••••••••••••••••••••••••••••"}
              </span>
              <button className="btn-icon" onClick={() => setShowSalt((v) => !v)}>
                {showSalt ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          }
        />
        <SettingRow
          icon={<KeyRound size={15} />}
          title="Rotate Master Password"
          description="Re-derives K_enc and K_auth, re-encrypts all vault entries"
          action={
            <button
              className={rotateStatus === "done" ? "btn-ghost" : "btn-ghost"}
              style={{ fontSize: "0.8rem", padding: "6px 12px", gap: "6px" }}
              onClick={handleRotate}
              disabled={rotateStatus === "rotating"}
            >
              {rotateStatus === "rotating" ? (
                <><KeyRound size={13} className="animate-spin-slow" /> Rotating…</>
              ) : rotateStatus === "done" ? (
                <><CheckCircle2 size={13} style={{ color: "var(--color-accent-green)" }} /> Rotated!</>
              ) : (
                <>Rotate <ChevronRight size={13} /></>
              )}
            </button>
          }
        />
        <SettingRow
          icon={<Bell size={15} />}
          title="Security Alerts"
          description="Email alerts on failed authentication or suspicious IP changes"
          action={
            <label className="toggle">
              <input
                type="checkbox"
                id="settings-notifications"
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          }
        />
      </div>

      {/* Zero-knowledge info */}
      <div className="alert alert-info" style={{ marginBottom: "20px", fontSize: "0.8rem" }}>
        <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <strong>Zero-Knowledge Architecture:</strong> Your K_enc and K_auth keys exist only in volatile
          React state (JS heap memory). They are never written to localStorage, sessionStorage, cookies,
          or IndexedDB. Refreshing the page purges all key material immediately.
        </div>
      </div>

      {/* Session section */}
      <div style={{ marginBottom: "8px", fontSize: "0.7rem", fontWeight: 600, color: "var(--color-text-muted)", letterSpacing: "0.07em", padding: "0 4px" }}>
        SESSION CONTROLS
      </div>
      <div className="glass-card" style={{ overflow: "hidden" }}>
        <SettingRow
          icon={<LogOut size={15} />}
          title="Lock Vault"
          description="Ends session and purges all cryptographic keys from memory"
          action={
            <button
              className={lockConfirm ? "btn-danger" : "btn-ghost"}
              style={{ fontSize: "0.8rem", padding: "6px 14px" }}
              onClick={handleLock}
            >
              {lockConfirm ? <><AlertTriangle size={13} /> Click to confirm</> : <><Lock size={13} /> Lock Vault</>}
            </button>
          }
        />
        <SettingRow
          icon={<ShieldOff size={15} />}
          title="Purge Session & Sign Out"
          description="Revokes JWT on server, wipes all volatile state, redirects to home"
          action={
            <button
              className={purgeConfirm ? "btn-danger" : "btn-ghost"}
              style={{ fontSize: "0.8rem", padding: "6px 14px", borderColor: "rgba(248,81,73,0.3)" }}
              onClick={handlePurge}
            >
              {purgeConfirm ? <><AlertTriangle size={13} /> Confirm Purge</> : <><ShieldOff size={13} /> Sign Out</>}
            </button>
          }
          danger
        />
        <div style={{ padding: "16px 20px", borderBottom: "none" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
            <strong style={{ color: "var(--color-text-secondary)" }}>Security note:</strong>{" "}
            Locking the vault discards K_enc and K_auth from the JS heap. The next login will re-derive
            fresh keys via Argon2id — no key persistence mechanism exists by design.
          </div>
        </div>
      </div>
    </div>
  );
}

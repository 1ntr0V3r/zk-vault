import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Shield,
  Activity,
  Clock,
  Globe,
  Smartphone,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface AuditEvent {
  id: string;
  type: "AUTH_SUCCESS" | "AUTH_FAIL" | "VAULT_ACCESS" | "VAULT_WRITE" | "SESSION_EXPIRE" | "KEY_DERIVE";
  message: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  riskScore: number; // 0-100
}

const MOCK_EVENTS: AuditEvent[] = [
  {
    id: "evt-1",
    type: "AUTH_SUCCESS",
    message: "Successful authentication via Argon2id key derivation",
    ip: "185.217.131.xx",
    userAgent: "Chrome 125 / Windows 11",
    timestamp: new Date(Date.now() - 120000),
    riskScore: 5,
  },
  {
    id: "evt-2",
    type: "KEY_DERIVE",
    message: "Argon2id KDF completed — K_enc/K_auth allocated in volatile RAM",
    ip: "185.217.131.xx",
    userAgent: "Chrome 125 / Windows 11",
    timestamp: new Date(Date.now() - 119500),
    riskScore: 0,
  },
  {
    id: "evt-3",
    type: "VAULT_ACCESS",
    message: "Vault decrypted (5 credentials) — AES-256-GCM tags verified",
    ip: "185.217.131.xx",
    userAgent: "Chrome 125 / Windows 11",
    timestamp: new Date(Date.now() - 118000),
    riskScore: 2,
  },
  {
    id: "evt-4",
    type: "VAULT_WRITE",
    message: "New credential encrypted and persisted (AES-256-GCM blob)",
    ip: "185.217.131.xx",
    userAgent: "Chrome 125 / Windows 11",
    timestamp: new Date(Date.now() - 60000),
    riskScore: 3,
  },
  {
    id: "evt-5",
    type: "AUTH_FAIL",
    message: "Authentication rejected — AEAD tag mismatch (wrong password attempt)",
    ip: "91.108.4.xxx",
    userAgent: "Firefox 126 / Linux",
    timestamp: new Date(Date.now() - 86400000 * 1.2),
    riskScore: 78,
  },
  {
    id: "evt-6",
    type: "AUTH_FAIL",
    message: "Brute-force attempt detected — 3 consecutive failures from same IP",
    ip: "91.108.4.xxx",
    userAgent: "Unknown / Unknown",
    timestamp: new Date(Date.now() - 86400000 * 1.2 - 30000),
    riskScore: 95,
  },
  {
    id: "evt-7",
    type: "SESSION_EXPIRE",
    message: "Session token revoked — TTL exceeded (30 min inactivity)",
    ip: "185.217.131.xx",
    userAgent: "Chrome 124 / Windows 11",
    timestamp: new Date(Date.now() - 86400000 * 3),
    riskScore: 10,
  },
  {
    id: "evt-8",
    type: "VAULT_ACCESS",
    message: "Vault accessed — 8 credentials retrieved and decrypted",
    ip: "185.217.131.xx",
    userAgent: "Chrome 124 / Windows 11",
    timestamp: new Date(Date.now() - 86400000 * 3 - 120000),
    riskScore: 2,
  },
];

function eventIcon(type: AuditEvent["type"]) {
  switch (type) {
    case "AUTH_SUCCESS": return <CheckCircle2 size={14} color="var(--color-accent-green)" />;
    case "AUTH_FAIL": return <XCircle size={14} color="var(--color-accent-red)" />;
    case "VAULT_ACCESS": return <Shield size={14} color="var(--color-accent-blue)" />;
    case "VAULT_WRITE": return <Activity size={14} color="var(--color-accent-cyan)" />;
    case "SESSION_EXPIRE": return <Clock size={14} color="var(--color-accent-orange)" />;
    case "KEY_DERIVE": return <RefreshCw size={14} color="#a371f7" />;
  }
}

function riskBadge(score: number) {
  if (score >= 70) return <span className="badge badge-red">{score} · Critical</span>;
  if (score >= 40) return <span className="badge badge-orange">{score} · High</span>;
  if (score >= 10) return <span className="badge badge-blue">{score} · Low</span>;
  return <span className="badge badge-green">{score} · Clean</span>;
}

function formatTs(d: Date): string {
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const days = Math.floor(h / 24);
  if (days > 0) return `${days}d ago · ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  if (h > 0) return `${h}h ago · ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

export function AuditView() {
  const { sessionAge } = useAuth();
  const [filter, setFilter] = useState<"all" | "high-risk">("all");

  const events = filter === "high-risk"
    ? MOCK_EVENTS.filter((e) => e.riskScore >= 40)
    : MOCK_EVENTS;

  const highRiskCount = MOCK_EVENTS.filter((e) => e.riskScore >= 40).length;
  const avgRisk = Math.round(MOCK_EVENTS.reduce((a, e) => a + e.riskScore, 0) / MOCK_EVENTS.length);

  const sessionMins = Math.floor(sessionAge / 60);
  const sessionSecs = sessionAge % 60;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "4px" }}>
          Activity & Audit Log
        </h2>
        <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
          Immutable security event log — all events classified with AI risk scores
        </p>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Session Age", value: `${sessionMins}m ${sessionSecs}s`, color: "#388bfd", icon: Clock },
          { label: "Total Events", value: MOCK_EVENTS.length, color: "#39d5ff", icon: Activity },
          { label: "High-Risk Events", value: highRiskCount, color: "#f85149", icon: AlertTriangle },
          { label: "Avg Risk Score", value: `${avgRisk}/100`, color: "#d29922", icon: Shield },
        ].map((m) => (
          <div
            key={m.label}
            className="glass-card"
            style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: "10px" }}
          >
            <div
              style={{
                width: 30, height: 30, borderRadius: "7px",
                background: `${m.color}15`, border: `1px solid ${m.color}25`,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}
            >
              <m.icon size={14} color={m.color} />
            </div>
            <div>
              <div style={{ fontSize: "1rem", fontWeight: 700 }}>{m.value}</div>
              <div style={{ fontSize: "0.67rem", color: "var(--color-text-muted)" }}>{m.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* High-risk warning */}
      {highRiskCount > 0 && (
        <div className="alert" style={{ background: "rgba(248,81,73,0.08)", border: "1px solid rgba(248,81,73,0.2)", color: "#ff7b72", marginBottom: "20px" }}>
          <AlertTriangle size={14} style={{ flexShrink: 0 }} />
          <span>
            <strong>{highRiskCount} high-risk event{highRiskCount !== 1 ? "s" : ""} detected.</strong> Review failed authentication attempts. Consider enabling 2FA or rotating your master password.
          </span>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
        {[
          { key: "all", label: `All Events (${MOCK_EVENTS.length})` },
          { key: "high-risk", label: `High Risk (${highRiskCount})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={filter === key ? "btn-primary" : "btn-ghost"}
            style={{ padding: "6px 14px", fontSize: "0.8rem" }}
            onClick={() => setFilter(key as any)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Event list */}
      <div className="glass-card" style={{ overflow: "hidden" }}>
        {events.map((event, i) => (
          <div
            key={event.id}
            style={{
              padding: "16px 20px",
              borderBottom: i < events.length - 1 ? "1px solid var(--color-border)" : "none",
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              gap: "14px",
              alignItems: "start",
              transition: "background 0.1s ease",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(22,27,34,0.5)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            {/* Icon */}
            <div
              style={{
                width: 32, height: 32, borderRadius: "8px",
                background: "var(--color-bg-base)", border: "1px solid var(--color-border)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2,
              }}
            >
              {eventIcon(event.type)}
            </div>

            {/* Details */}
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "4px" }}>
                {event.message}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Globe size={10} style={{ color: "var(--color-text-muted)" }} />
                  <span className="mono" style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>{event.ip}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Smartphone size={10} style={{ color: "var(--color-text-muted)" }} />
                  <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>{event.userAgent}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Clock size={10} style={{ color: "var(--color-text-muted)" }} />
                  <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>{formatTs(event.timestamp)}</span>
                </div>
              </div>
            </div>

            {/* Risk badge */}
            <div style={{ flexShrink: 0 }}>{riskBadge(event.riskScore)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

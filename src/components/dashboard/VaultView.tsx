import { useState } from "react";
import {
  Plus,
  Search,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Globe,
  Clock,
  Shield,
  CheckCircle2,
  Lock,
  ExternalLink,
} from "lucide-react";
import { useVault } from "../../context/VaultContext";
import { AddCredentialModal } from "./AddCredentialModal";

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

function FaviconPlaceholder({ label }: { label: string }) {
  const colors = [
    "#388bfd", "#39d5ff", "#3fb950", "#f97316", "#a371f7", "#f85149", "#d29922",
  ];
  const color = colors[label.charCodeAt(0) % colors.length];
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: "8px",
        background: `${color}20`,
        border: `1px solid ${color}35`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.75rem",
        fontWeight: 700,
        color,
        flexShrink: 0,
      }}
    >
      {label.charAt(0).toUpperCase()}
    </div>
  );
}

export function VaultView() {
  const { credentials, deleteCredential } = useVault();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = credentials.filter(
    (c) =>
      c.siteLabel.toLowerCase().includes(search.toLowerCase()) ||
      c.username.toLowerCase().includes(search.toLowerCase()) ||
      c.url.toLowerCase().includes(search.toLowerCase())
  );

  const toggleVisibility = (id: string) => {
    setVisibleIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const copyPassword = async (id: string, password: string) => {
    await navigator.clipboard.writeText(password);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="animate-fade-in" style={{ height: "100%" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "2px" }}>
            Vault
          </h2>
          <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
            {credentials.length} encrypted credential{credentials.length !== 1 ? "s" : ""} · All decrypted in local RAM
          </p>
        </div>
        <button
          id="vault-add-credential"
          className="btn-primary"
          onClick={() => setShowModal(true)}
        >
          <Plus size={15} /> Add Credential
        </button>
      </div>

      {/* Search */}
      <div className="input-wrapper" style={{ marginBottom: "20px" }}>
        <input
          id="vault-search"
          type="text"
          className="input-field"
          placeholder="Search by site, username, or URL…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: "38px" }}
        />
        <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Total Credentials", value: credentials.length, icon: Lock, color: "#388bfd" },
          { label: "Encrypted at Rest", value: "100%", icon: Shield, color: "#3fb950" },
          { label: "Plaintext in RAM", value: `${credentials.length}`, icon: CheckCircle2, color: "#39d5ff" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="glass-card"
            style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px" }}
          >
            <div
              style={{
                width: 32, height: 32, borderRadius: "8px",
                background: `${stat.color}15`, border: `1px solid ${stat.color}25`,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}
            >
              <stat.icon size={15} color={stat.color} />
            </div>
            <div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>{stat.value}</div>
              <div style={{ fontSize: "0.68rem", color: "var(--color-text-muted)" }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Credentials table */}
      <div className="glass-card" style={{ overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "60px 24px", textAlign: "center" }}>
            <Lock size={32} style={{ color: "var(--color-text-muted)", margin: "0 auto 12px" }} />
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
              {search ? "No credentials match your search." : "Your vault is empty. Add your first credential."}
            </p>
            {!search && (
              <button className="btn-primary" style={{ marginTop: "16px" }} onClick={() => setShowModal(true)}>
                <Plus size={14} /> Add First Credential
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Username</th>
                  <th>Password</th>
                  <th>Last Updated</th>
                  <th style={{ width: 100, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((cred) => {
                  const visible = visibleIds.has(cred.id);
                  const copied = copiedId === cred.id;
                  return (
                    <tr key={cred.id}>
                      {/* Service */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <FaviconPlaceholder label={cred.siteLabel} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{cred.siteLabel}</div>
                            {cred.url && (
                              <a
                                href={cred.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  fontSize: "0.72rem",
                                  color: "var(--color-text-muted)",
                                  textDecoration: "none",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "3px",
                                }}
                                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--color-accent-blue)")}
                                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)")}
                              >
                                <Globe size={10} />
                                {cred.url.replace(/^https?:\/\//, "").slice(0, 28)}
                                <ExternalLink size={9} />
                              </a>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Username */}
                      <td>
                        <span className="mono" style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                          {cred.username}
                        </span>
                      </td>

                      {/* Password */}
                      <td>
                        <span
                          className="mono"
                          style={{
                            fontSize: "0.8rem",
                            letterSpacing: visible ? "0.02em" : "0.1em",
                            color: visible ? "var(--color-text-primary)" : "var(--color-text-muted)",
                          }}
                        >
                          {visible ? cred.password : "••••••••••••"}
                        </span>
                      </td>

                      {/* Timestamp */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                          <Clock size={11} style={{ color: "var(--color-text-muted)" }} />
                          <span style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
                            {formatRelativeTime(cred.updatedAt)}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ display: "flex", gap: "4px", justifyContent: "flex-end" }}>
                          <button
                            className="btn-icon"
                            title={visible ? "Hide password" : "Reveal password"}
                            onClick={() => toggleVisibility(cred.id)}
                          >
                            {visible ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                          <button
                            className="btn-icon"
                            title="Copy password"
                            onClick={() => copyPassword(cred.id, cred.password)}
                            style={copied ? { borderColor: "var(--color-accent-green)", color: "var(--color-accent-green)" } : {}}
                          >
                            {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                          </button>
                          <button
                            className="btn-icon"
                            title="Delete credential"
                            onClick={() => deleteCredential(cred.id)}
                            style={{ borderColor: "rgba(248,81,73,0.3)", color: "var(--color-accent-red)" }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && <AddCredentialModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

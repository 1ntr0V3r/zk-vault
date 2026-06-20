import React, { useState } from "react";
import { useNavigate, Routes, Route, useLocation } from "react-router-dom";
import {
  ShieldCheck,
  Lock,
  Wand2,
  Activity,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  Cpu,
  Circle,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useVault } from "../context/VaultContext";
import { VaultView } from "../components/dashboard/VaultView";
import { GeneratorView } from "../components/dashboard/GeneratorView";
import { AuditView } from "../components/dashboard/AuditView";
import { SettingsView } from "../components/dashboard/SettingsView";

type NavItem = {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  badge?: string;
};

const NAV_ITEMS: NavItem[] = [
  { id: "vault", label: "Vault", icon: Lock, path: "/dashboard" },
  { id: "generator", label: "Generator", icon: Wand2, path: "/dashboard/generator" },
  { id: "audit", label: "Activity", icon: Activity, path: "/dashboard/audit", badge: "2" },
  { id: "settings", label: "Settings", icon: Settings, path: "/dashboard/settings" },
];

function SessionTimer({ sessionAge }: { sessionAge: number }) {
  const mins = Math.floor(sessionAge / 60);
  const secs = sessionAge % 60;
  const isWarning = sessionAge > 25 * 60; // warn after 25 min

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 10px",
        background: isWarning ? "rgba(210,153,34,0.1)" : "var(--color-bg-base)",
        border: `1px solid ${isWarning ? "rgba(210,153,34,0.3)" : "var(--color-border)"}`,
        borderRadius: "6px",
        fontSize: "0.72rem",
        fontFamily: "monospace",
        color: isWarning ? "var(--color-accent-orange)" : "var(--color-text-muted)",
      }}
    >
      {isWarning && <AlertTriangle size={10} />}
      <Circle size={6} style={{ fill: "var(--color-accent-green)", color: "var(--color-accent-green)" }} />
      {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, lockVault, logout, sessionAge } = useAuth();
  const { clearVault } = useVault();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  /**
   * handleLogout — GDPR / CNDP coordinated wipe sequence.
   *
   * Order is critical:
   *   1. clearVault()  — zero-encodes and drops all decrypted credential state.
   *   2. lockVault()   — nulls K_enc (CryptoKey ref), jwt, K_auth_hash, stops timers.
   *   3. navigate()    — redirect after wipe so no component re-renders with stale data.
   */
  const handleLogout = () => {
    clearVault();
    lockVault();
    navigate("/login");
  };

  /**
   * handleSignOut — full "Sign Out" path; semantically identical security wipe
   * to lockVault but navigates to the landing page and (in production) sends
   * the JWT to POST /api/v1/auth/logout for server-side JTI revocation.
   */
  const handleSignOut = () => {
    clearVault();
    logout();
    navigate("/");
  };

  // Suppress unused variable lint — handleSignOut is available for future use
  void handleSignOut;

  const isActive = (path: string) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };

  const SidebarContent = () => (
    <>
      {/* Brand */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          padding: "0 4px",
          marginBottom: "28px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: 32, height: 32, borderRadius: "8px",
              background: "linear-gradient(135deg, #1f6feb, #388bfd)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 0 16px rgba(56,139,253,0.35)",
            }}
          >
            <ShieldCheck size={16} color="white" />
          </div>
          {!collapsed && (
            <span style={{ fontWeight: 700, fontSize: "0.95rem", letterSpacing: "-0.02em" }}>
              ZK<span style={{ color: "var(--color-accent-blue)" }}>Vault</span>
            </span>
          )}
        </div>
        {!collapsed && (
          <button
            className="btn-icon"
            style={{ width: 28, height: 28 }}
            onClick={() => setCollapsed(true)}
            title="Collapse sidebar"
          >
            <ChevronLeft size={14} />
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1 }}>
        <div style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--color-text-muted)", letterSpacing: "0.08em", marginBottom: "8px", paddingLeft: collapsed ? 0 : "4px", textAlign: collapsed ? "center" : "left" }}>
          {!collapsed && "NAVIGATION"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.id}
                className={`nav-item ${active ? "active" : ""}`}
                style={{
                  justifyContent: collapsed ? "center" : "flex-start",
                  width: "100%",
                  border: "1px solid",
                  borderColor: active ? "rgba(56,139,253,0.2)" : "transparent",
                  position: "relative",
                }}
                onClick={() => {
                  navigate(item.path);
                  setMobileOpen(false);
                }}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={16} />
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && item.badge && (
                  <span
                    style={{
                      marginLeft: "auto",
                      background: "var(--color-accent-red)",
                      color: "white",
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      padding: "1px 5px",
                      borderRadius: "10px",
                      minWidth: "18px",
                      textAlign: "center",
                    }}
                  >
                    {item.badge}
                  </span>
                )}
                {collapsed && item.badge && (
                  <span
                    style={{
                      position: "absolute",
                      top: 4, right: 4,
                      width: 8, height: 8,
                      background: "var(--color-accent-red)",
                      borderRadius: "50%",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Session info */}
      {!collapsed && (
        <div
          style={{
            padding: "12px",
            background: "var(--color-bg-base)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            marginBottom: "12px",
          }}
        >
          <div style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--color-text-muted)", letterSpacing: "0.07em", marginBottom: "8px" }}>
            ACTIVE SESSION
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user?.email}
          </div>
          <SessionTimer sessionAge={sessionAge} />
          <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "5px" }}>
            <Cpu size={10} style={{ color: "var(--color-accent-green)" }} />
            <span style={{ fontSize: "0.65rem", color: "var(--color-text-muted)" }}>
              K_enc in volatile RAM · Never persisted
            </span>
          </div>
        </div>
      )}

      {/* Lock & Sign Out — GDPR wipe sequence: clearVault → lockVault */}
      <button
        className="nav-item"
        style={{
          width: "100%",
          justifyContent: collapsed ? "center" : "flex-start",
          color: "var(--color-accent-red)",
          borderColor: "rgba(248,81,73,0.15)",
          background: "rgba(248,81,73,0.04)",
        }}
        onClick={handleLogout}
        title={collapsed ? "Lock & Sign Out" : undefined}
      >
        <LogOut size={15} />
        {!collapsed && <span>Lock &amp; Sign Out</span>}
      </button>

      {/* Expand button when collapsed */}
      {collapsed && (
        <button
          className="btn-icon"
          style={{ width: "100%", marginTop: "8px" }}
          onClick={() => setCollapsed(false)}
          title="Expand sidebar"
        >
          <ChevronRight size={14} />
        </button>
      )}
    </>
  );

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "var(--color-bg-base)",
      }}
    >
      {/* ── SIDEBAR (desktop) ───────────────────────── */}
      <aside
        style={{
          width: collapsed ? 64 : 240,
          minWidth: collapsed ? 64 : 240,
          height: "100vh",
          background: "var(--color-bg-surface)",
          borderRight: "1px solid var(--color-border)",
          display: "flex",
          flexDirection: "column",
          padding: "20px 12px",
          transition: "width 0.2s ease, min-width 0.2s ease",
          overflowY: "auto",
          overflowX: "hidden",
          position: "relative",
          zIndex: 10,
        }}
        className="hidden md:flex"
      >
        <SidebarContent />
      </aside>

      {/* ── MOBILE SIDEBAR OVERLAY ──────────────────── */}
      {mobileOpen && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 40,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setMobileOpen(false)}
        >
          <aside
            style={{
              width: 260, height: "100%",
              background: "var(--color-bg-surface)",
              borderRight: "1px solid var(--color-border)",
              display: "flex", flexDirection: "column",
              padding: "20px 12px",
              animation: "slideUp 0.2s ease",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ── MAIN CONTENT ────────────────────────────── */}
      <main style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
        {/* Mobile topbar */}
        <div
          className="flex md:hidden items-center justify-between"
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--color-border)",
            background: "var(--color-bg-surface)",
            position: "sticky",
            top: 0,
            zIndex: 30,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: 28, height: 28, borderRadius: "7px",
                background: "linear-gradient(135deg, #1f6feb, #388bfd)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <ShieldCheck size={14} color="white" />
            </div>
            <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>
              ZK<span style={{ color: "var(--color-accent-blue)" }}>Vault</span>
            </span>
          </div>
          <button className="btn-icon" onClick={() => setMobileOpen(true)}>
            <Menu size={16} />
          </button>
        </div>

        {/* Top bar (desktop) */}
        <div
          className="hidden md:flex items-center justify-between"
          style={{
            padding: "14px 28px",
            borderBottom: "1px solid var(--color-border)",
            background: "var(--color-bg-surface)",
            position: "sticky",
            top: 0,
            zIndex: 20,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <h1 style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
              {NAV_ITEMS.find((n) => isActive(n.path))?.label ?? "Dashboard"}
            </h1>
            <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
              Secure Vault · {user?.email}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <SessionTimer sessionAge={sessionAge} />
            <div className="badge badge-green">
              <ShieldCheck size={9} /> ZK Active
            </div>
          </div>
        </div>

        {/* Page content */}
        <div style={{ padding: "28px", flex: 1 }}>
          <Routes>
            <Route path="/" element={<VaultView />} />
            <Route path="/generator" element={<GeneratorView />} />
            <Route path="/audit" element={<AuditView />} />
            <Route path="/settings" element={<SettingsView />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

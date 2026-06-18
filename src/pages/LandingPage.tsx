import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ShieldCheck,
  Lock,
  Server,
  Cpu,
  GitBranch,
  ChevronRight,
  Menu,
  X,
  CheckCircle2,
  ArrowRight,
  Star,
} from "lucide-react";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
];

const FEATURES = [
  {
    icon: Cpu,
    tag: "ARGON2ID · WASM",
    title: "Client-Side Derivation",
    description:
      "Your Master Password never leaves your device. Argon2id WASM computes K_enc and K_auth locally in volatile RAM — the server receives only a SHA-256 fingerprint of K_auth, never the raw key material.",
    accent: "#388bfd",
    glow: "rgba(56,139,253,0.15)",
  },
  {
    icon: Lock,
    tag: "AES-256-GCM",
    title: "Authenticated Encryption",
    description:
      "Every credential is sealed with AES-256-GCM before leaving your browser. The 128-bit authentication tag guarantees both total confidentiality and tamper detection — any bit-flip invalidates the blob.",
    accent: "#39d5ff",
    glow: "rgba(57,213,255,0.12)",
  },
  {
    icon: Server,
    tag: "ZERO-KNOWLEDGE",
    title: "Blind Orchestration",
    description:
      "The server stores only opaque ciphertext blobs and never participates in key derivation. Even a full database breach exposes nothing — your plaintext is structurally invisible to the infrastructure.",
    accent: "#3fb950",
    glow: "rgba(63,185,80,0.12)",
  },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Enter Master Password", desc: "Your password is processed locally. No transmission to any server." },
  { step: "02", title: "Argon2id Derives Keys", desc: "512-bit output split into K_enc (encryption) and K_auth (authentication)." },
  { step: "03", title: "AES-256-GCM Encrypts", desc: "Credentials encrypted with authenticated encryption before any network call." },
  { step: "04", title: "Opaque Blob Stored", desc: "Server receives and stores only ciphertext — structurally blind to plaintexts." },
];

const PRICING = [
  {
    tier: "Community",
    price: "Free",
    period: "forever",
    features: ["Unlimited credentials", "Client-side encryption", "Browser extension", "1 device sync"],
    cta: "Get Started Free",
    highlighted: false,
  },
  {
    tier: "Professional",
    price: "$4",
    period: "/ month",
    features: ["Everything in Community", "Unlimited device sync", "Priority support", "Advanced audit logs", "Secure sharing"],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    tier: "Enterprise",
    price: "Custom",
    period: "pricing",
    features: ["Everything in Professional", "SSO / SAML integration", "Self-hosted option", "SLA guarantee", "Dedicated support"],
    cta: "Contact Sales",
    highlighted: false,
  },
];

export function LandingPage() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg-base)", color: "var(--color-text-primary)" }}>
      {/* ── NAVBAR ─────────────────────────────────────── */}
      <header
        className="fixed top-0 left-0 right-0 z-40 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(10,12,16,0.92)" : "transparent",
          backdropFilter: scrolled ? "blur(16px)" : "none",
          borderBottom: scrolled ? "1px solid var(--color-border)" : "1px solid transparent",
        }}
      >
        <nav className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2.5 no-underline" style={{ textDecoration: "none" }}>
            <div
              className="flex items-center justify-center w-8 h-8 rounded-lg"
              style={{ background: "linear-gradient(135deg, #1f6feb, #388bfd)", boxShadow: "0 0 16px rgba(56,139,253,0.4)" }}
            >
              <ShieldCheck size={16} color="white" />
            </div>
            <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>
              ZK<span style={{ color: "var(--color-accent-blue)" }}>Vault</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                  color: "var(--color-text-secondary)",
                  textDecoration: "none",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.color = "var(--color-text-primary)";
                  (e.target as HTMLElement).style.background = "var(--color-bg-elevated)";
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.color = "var(--color-text-secondary)";
                  (e.target as HTMLElement).style.background = "transparent";
                }}
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="hidden md:flex items-center gap-2">
            <button className="btn-ghost" style={{ padding: "7px 16px" }} onClick={() => navigate("/login")}>
              Login
            </button>
            <button className="btn-primary" style={{ padding: "7px 16px" }} onClick={() => navigate("/register")}>
              Get Started Free <ChevronRight size={14} />
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden btn-icon"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </nav>

        {/* Mobile menu */}
        {mobileOpen && (
          <div
            className="md:hidden animate-slide-down"
            style={{
              background: "var(--color-bg-surface)",
              borderBottom: "1px solid var(--color-border)",
              padding: "12px 24px 20px",
            }}
          >
            {NAV_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="block"
                style={{
                  padding: "10px 0",
                  color: "var(--color-text-secondary)",
                  textDecoration: "none",
                  fontSize: "0.9rem",
                  borderBottom: "1px solid var(--color-border)",
                }}
                onClick={() => setMobileOpen(false)}
              >
                {l.label}
              </a>
            ))}
            <div className="flex flex-col gap-2 mt-4">
              <button className="btn-ghost w-full justify-center" onClick={() => navigate("/login")}>
                Login
              </button>
              <button className="btn-primary w-full justify-center" onClick={() => navigate("/register")}>
                Get Started Free
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ── HERO ───────────────────────────────────────── */}
      <section
        className="relative flex flex-col items-center justify-center text-center px-6 pt-36 pb-28 overflow-hidden"
        style={{ minHeight: "100vh" }}
      >
        {/* Background glow blobs */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "15%", left: "50%", transform: "translate(-50%,-50%)",
            width: "700px", height: "400px",
            background: "radial-gradient(ellipse at center, rgba(31,111,235,0.12) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            top: "60%", left: "15%",
            width: "300px", height: "300px",
            background: "radial-gradient(circle, rgba(57,213,255,0.06) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            top: "50%", right: "10%",
            width: "250px", height: "250px",
            background: "radial-gradient(circle, rgba(63,185,80,0.06) 0%, transparent 70%)",
          }}
        />

        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 mb-8 animate-fade-in"
          style={{
            padding: "5px 14px 5px 8px",
            background: "rgba(56,139,253,0.08)",
            border: "1px solid rgba(56,139,253,0.2)",
            borderRadius: "100px",
          }}
        >
          <span className="badge badge-blue">Open Source</span>
          <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
            End-to-end encrypted · Zero-knowledge architecture
          </span>
        </div>

        {/* Headline */}
        <h1
          className="animate-fade-in"
          style={{
            fontSize: "clamp(2.2rem, 6vw, 4rem)",
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            maxWidth: "820px",
            marginBottom: "20px",
          }}
        >
          Credential security powered by{" "}
          <span className="gradient-text">mathematical sovereignty.</span>
        </h1>

        {/* Subheadline */}
        <p
          className="animate-fade-in"
          style={{
            fontSize: "clamp(1rem, 2.5vw, 1.2rem)",
            color: "var(--color-text-secondary)",
            maxWidth: "640px",
            lineHeight: 1.7,
            marginBottom: "36px",
          }}
        >
          An open-source, end-to-end encrypted, Zero-Knowledge platform that keeps your secrets{" "}
          <strong style={{ color: "var(--color-text-primary)" }}>completely invisible to the server.</strong>
        </p>

        {/* CTA row */}
        <div className="flex flex-wrap items-center justify-center gap-3 animate-fade-in" style={{ marginBottom: "64px" }}>
          <button
            className="btn-primary"
            style={{ padding: "12px 28px", fontSize: "0.95rem" }}
            onClick={() => navigate("/register")}
          >
            Get Started Free <ArrowRight size={16} />
          </button>
          <button
            className="btn-ghost"
            style={{ padding: "12px 24px", fontSize: "0.95rem" }}
            onClick={() => navigate("/login")}
          >
            <Lock size={15} /> Open Vault
          </button>
          <a
            href="https://GitBranch.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost"
            style={{ padding: "12px 24px", fontSize: "0.95rem" }}
          >
            <GitBranch size={15} /> View Source
          </a>
        </div>

        {/* Mini crypto pipeline preview */}
        <div
          className="glass-card animate-fade-in max-w-2xl w-full"
          style={{ padding: "20px 24px", textAlign: "left" }}
        >
          <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--color-text-muted)", letterSpacing: "0.08em", marginBottom: "12px" }}>
            CRYPTOGRAPHIC PIPELINE — CLIENT SIDE ONLY
          </div>
          <div className="flex flex-col gap-2">
            {[
              { label: "masterPassword + salt → Argon2id(WASM)", color: "#388bfd", done: true },
              { label: "512-bit KDF output → split(K_enc ∥ K_auth)", color: "#39d5ff", done: true },
              { label: "SHA-256(K_auth) → auth_hash sent to /auth/login", color: "#3fb950", done: true },
              { label: "K_enc + 96-bit nonce → AES-256-GCM(credential)", color: "#f97316", done: false },
            ].map((item, i) => (
              <div
                key={i}
                className="pipeline-step"
                style={item.done ? { borderColor: `${item.color}40`, color: item.color, background: `${item.color}08` } : {}}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: item.color, flexShrink: 0, display: "inline-block" }} />
                <span className="mono" style={{ color: item.done ? item.color : "var(--color-text-muted)" }}>
                  {item.label}
                </span>
                {item.done && <CheckCircle2 size={13} style={{ marginLeft: "auto", flexShrink: 0 }} />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURE GRID ──────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="badge badge-blue inline-flex mb-4">Core Architecture</div>
            <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.5rem)", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "12px" }}>
              Built on cryptographic first principles
            </h2>
            <p style={{ color: "var(--color-text-secondary)", fontSize: "1rem", maxWidth: "520px", margin: "0 auto" }}>
              Every design decision is driven by the constraint that the server must never be trusted with sensitive data.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="glass-card"
                style={{
                  padding: "28px",
                  transition: "all 0.25s ease",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.borderColor = `${f.accent}40`;
                  el.style.boxShadow = `0 0 30px ${f.glow}`;
                  el.style.transform = "translateY(-4px)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.borderColor = "var(--color-border)";
                  el.style.boxShadow = "none";
                  el.style.transform = "translateY(0)";
                }}
              >
                <div
                  className="flex items-center justify-center w-12 h-12 rounded-xl mb-5"
                  style={{ background: `${f.accent}15`, border: `1px solid ${f.accent}30` }}
                >
                  <f.icon size={22} color={f.accent} />
                </div>
                <div
                  className="badge mb-3"
                  style={{
                    background: `${f.accent}10`,
                    color: f.accent,
                    border: `1px solid ${f.accent}25`,
                  }}
                >
                  {f.tag}
                </div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "10px", letterSpacing: "-0.01em" }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", lineHeight: 1.7 }}>
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6" style={{ background: "var(--color-bg-surface)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="badge badge-blue inline-flex mb-4">Protocol Flow</div>
            <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.5rem)", fontWeight: 700, letterSpacing: "-0.02em" }}>
              How zero-knowledge works
            </h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((s, i) => (
              <div key={s.step} className="relative">
                {i < HOW_IT_WORKS.length - 1 && (
                  <div
                    className="hidden md:block absolute top-6 left-[60%] right-[-40%] h-px"
                    style={{ background: "linear-gradient(to right, var(--color-border), transparent)" }}
                  />
                )}
                <div
                  className="glass-card"
                  style={{ padding: "24px", height: "100%" }}
                >
                  <div
                    className="mono mb-4"
                    style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-accent-blue)", opacity: 0.4 }}
                  >
                    {s.step}
                  </div>
                  <h4 style={{ fontWeight: 700, marginBottom: "8px", fontSize: "0.95rem" }}>{s.title}</h4>
                  <p style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="badge badge-blue inline-flex mb-4">Pricing</div>
            <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.5rem)", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "12px" }}>
              Simple, transparent pricing
            </h2>
            <p style={{ color: "var(--color-text-secondary)" }}>
              All plans include full client-side encryption. No backdoors. No exceptions.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {PRICING.map((p) => (
              <div
                key={p.tier}
                className={p.highlighted ? "glass-card-elevated" : "glass-card"}
                style={{
                  padding: "32px",
                  position: "relative",
                  boxShadow: p.highlighted ? "0 0 40px rgba(56,139,253,0.12), 0 0 0 1px rgba(56,139,253,0.25)" : "none",
                  borderColor: p.highlighted ? "rgba(56,139,253,0.35)" : "var(--color-border)",
                }}
              >
                {p.highlighted && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 badge badge-blue"
                    style={{ padding: "4px 12px" }}
                  >
                    <Star size={10} fill="currentColor" /> Most Popular
                  </div>
                )}
                <div style={{ marginBottom: "8px", fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {p.tier}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "20px" }}>
                  <span style={{ fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-0.03em" }}>{p.price}</span>
                  <span style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>{p.period}</span>
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px 0" }}>
                  {p.features.map((feat) => (
                    <li key={feat} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", fontSize: "0.875rem", color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)" }}>
                      <CheckCircle2 size={14} color="var(--color-accent-green)" />
                      {feat}
                    </li>
                  ))}
                </ul>
                <button
                  className={p.highlighted ? "btn-primary w-full justify-center" : "btn-ghost w-full justify-center"}
                  onClick={() => navigate("/register")}
                >
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────── */}
      <footer style={{ background: "var(--color-bg-surface)", borderTop: "1px solid var(--color-border)", padding: "40px 24px" }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center w-7 h-7 rounded-md"
              style={{ background: "linear-gradient(135deg, #1f6feb, #388bfd)" }}
            >
              <ShieldCheck size={14} color="white" />
            </div>
            <span style={{ fontWeight: 700, color: "var(--color-text-primary)" }}>
              ZK<span style={{ color: "var(--color-accent-blue)" }}>Vault</span>
            </span>
          </div>
          <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
            © 2026 ZKVault. Open-source, end-to-end encrypted. No telemetry. No backdoors.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", textDecoration: "none" }}>Privacy</a>
            <a href="#" style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", textDecoration: "none" }}>Terms</a>
            <a href="https://GitBranch.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-text-muted)" }}>
              <GitBranch size={16} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

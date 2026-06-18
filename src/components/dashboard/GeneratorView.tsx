import { useState, useCallback } from "react";
import {
  RefreshCw,
  Copy,
  CheckCircle2,
  Sliders,
  Info,
} from "lucide-react";
import {
  generatePassword,
  calcEntropy,
  entropyLabel,
  type GeneratorOptions,
} from "../../crypto/cryptoEngine";

export function GeneratorView() {
  const [opts, setOpts] = useState<GeneratorOptions>({
    length: 24,
    upper: true,
    lower: true,
    digits: true,
    symbols: true,
  });

  const [password, setPassword] = useState(() =>
    generatePassword({ length: 24, upper: true, lower: true, digits: true, symbols: true })
  );
  const [copied, setCopied] = useState(false);

  const entropy = calcEntropy(password);
  const { label: eLabel, color: eColor } = entropyLabel(entropy);

  const regenerate = useCallback(() => {
    setPassword(generatePassword(opts));
    setCopied(false);
  }, [opts]);

  const handleOptChange = (key: keyof GeneratorOptions, value: boolean | number) => {
    const next = { ...opts, [key]: value };
    setOpts(next);
    setPassword(generatePassword(next));
    setCopied(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const charsetSize = (opts.upper ? 26 : 0) + (opts.lower ? 26 : 0) + (opts.digits ? 10 : 0) + (opts.symbols ? 32 : 0);

  const TOGGLES: { key: keyof GeneratorOptions; label: string; example: string }[] = [
    { key: "upper", label: "Uppercase", example: "A–Z" },
    { key: "lower", label: "Lowercase", example: "a–z" },
    { key: "digits", label: "Digits", example: "0–9" },
    { key: "symbols", label: "Symbols", example: "!@#…" },
  ];

  return (
    <div className="animate-fade-in max-w-2xl">
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "4px" }}>
          Password Generator
        </h2>
        <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
          All randomness from <code style={{ color: "var(--color-accent-cyan)", fontFamily: "monospace" }}>window.crypto.getRandomValues()</code> — cryptographically secure.
        </p>
      </div>

      {/* Generated password display */}
      <div className="glass-card" style={{ padding: "24px", marginBottom: "20px" }}>
        <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "var(--color-text-muted)", letterSpacing: "0.08em", marginBottom: "12px" }}>
          GENERATED PASSWORD
        </div>

        {/* Password field */}
        <div
          style={{
            padding: "16px 20px",
            background: "var(--color-bg-base)",
            border: "1px solid var(--color-border-emphasis)",
            borderRadius: "8px",
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontSize: "1rem",
            letterSpacing: "0.08em",
            wordBreak: "break-all",
            lineHeight: 1.6,
            color: "var(--color-text-primary)",
            minHeight: "60px",
            marginBottom: "14px",
          }}
        >
          {password}
        </div>

        {/* Entropy bar */}
        <div style={{ marginBottom: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ fontSize: "0.75rem", color: eColor, fontWeight: 600 }}>{eLabel}</span>
            <span className="mono" style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
              {entropy} bits · charset {charsetSize} · len {opts.length}
            </span>
          </div>
          <div style={{ height: "4px", background: "var(--color-border-emphasis)", borderRadius: "2px", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                borderRadius: "2px",
                width: `${Math.min(100, (entropy / 128) * 100)}%`,
                background: eColor,
                transition: "all 0.3s ease",
              }}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            id="generator-copy"
            className={copied ? "btn-ghost" : "btn-primary"}
            style={{ flex: 1, justifyContent: "center", padding: "9px" }}
            onClick={handleCopy}
          >
            {copied ? <><CheckCircle2 size={14} /> Copied!</> : <><Copy size={14} /> Copy to Clipboard</>}
          </button>
          <button
            id="generator-regenerate"
            className="btn-ghost"
            style={{ padding: "9px 14px" }}
            onClick={regenerate}
            title="Regenerate"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Options */}
      <div className="glass-card" style={{ padding: "24px" }}>
        <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "var(--color-text-muted)", letterSpacing: "0.08em", marginBottom: "20px", display: "flex", alignItems: "center", gap: "6px" }}>
          <Sliders size={12} />
          GENERATOR OPTIONS
        </div>

        {/* Length slider */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Length</span>
            <span
              className="mono"
              style={{
                padding: "2px 10px",
                background: "rgba(56,139,253,0.1)",
                border: "1px solid rgba(56,139,253,0.2)",
                borderRadius: "4px",
                fontSize: "0.8rem",
                color: "var(--color-accent-blue)",
                fontWeight: 700,
              }}
            >
              {opts.length}
            </span>
          </div>
          <input
            id="generator-length"
            type="range"
            min={8}
            max={128}
            value={opts.length}
            onChange={(e) => handleOptChange("length", Number(e.target.value))}
            style={{
              background: `linear-gradient(to right, var(--color-accent-blue-dim) 0%, var(--color-accent-blue-dim) ${((opts.length - 8) / 120) * 100}%, var(--color-border-emphasis) ${((opts.length - 8) / 120) * 100}%, var(--color-border-emphasis) 100%)`,
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
            <span style={{ fontSize: "0.68rem", color: "var(--color-text-muted)" }}>8</span>
            <span style={{ fontSize: "0.68rem", color: "var(--color-text-muted)" }}>128</span>
          </div>
        </div>

        {/* Character class toggles */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {TOGGLES.map(({ key, label, example }) => (
            <div
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                background: opts[key as keyof typeof opts] ? "rgba(56,139,253,0.04)" : "var(--color-bg-base)",
                border: "1px solid",
                borderColor: opts[key as keyof typeof opts] ? "rgba(56,139,253,0.2)" : "var(--color-border)",
                borderRadius: "8px",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>{label}</span>
                <span
                  className="mono badge"
                  style={{
                    fontSize: "0.68rem",
                    background: "var(--color-bg-base)",
                    color: "var(--color-text-muted)",
                    border: "1px solid var(--color-border)",
                    padding: "2px 6px",
                  }}
                >
                  {example}
                </span>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  id={`generator-${key}`}
                  checked={!!opts[key as keyof typeof opts]}
                  onChange={(e) => handleOptChange(key, e.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          ))}
        </div>

        {/* Info note */}
        <div className="alert alert-info" style={{ marginTop: "20px", fontSize: "0.77rem" }}>
          <Info size={13} style={{ flexShrink: 0 }} />
          <span>
            Rejection sampling ensures uniform distribution across the full charset — no modulo bias.
          </span>
        </div>
      </div>
    </div>
  );
}

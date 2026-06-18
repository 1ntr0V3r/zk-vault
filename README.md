# ZKVault — Zero-Knowledge Password Manager

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4)](https://tailwindcss.com/)

> **Credential security powered by mathematical sovereignty.**  
> An open-source, end-to-end encrypted, Zero-Knowledge platform that keeps your secrets completely invisible to the server.

---

## Architecture

```
CLIENT (React SPA)                         SERVER (Flask / SQLCipher)
┌─────────────────────────────────┐        ┌──────────────────────────┐
│  Master Password (input)        │        │                          │
│       │                         │        │  Stores:                 │
│       ▼                         │        │  ├─ email                │
│  Argon2id WASM (local RAM)      │        │  ├─ salt_hex (32 bytes)  │
│       │ 512-bit output           │        │  ├─ SHA-256(K_auth)      │
│       ├─► K_enc (256 bits)      │        │  └─ AES-GCM blob         │
│       └─► K_auth (256 bits)     │        │                          │
│              │                  │        │  NEVER stores:           │
│              ▼                  │        │  ✗ Master Password       │
│        SHA-256(K_auth) ─────────┼───────►│  ✗ K_enc                │
│                                 │        │  ✗ K_auth                │
│  Credentials ──► AES-256-GCM ──┼───────►│  ✗ Plaintext             │
│  (plaintext)    (K_enc + nonce) │        │                          │
└─────────────────────────────────┘        └──────────────────────────┘
        Keys live in volatile JS heap only — never persisted
```

---

## Features

### 🔐 Cryptographic Security
- **Argon2id WASM** — memory-hard KDF (mocked with PBKDF2 locally; swap with `argon2-wasm-pro` for production)
- **AES-256-GCM** — authenticated encryption via native Web Crypto API (128-bit AEAD tag)
- **CSPRNG** — all random values from `window.crypto.getRandomValues()`
- **Zero Persistence** — `K_enc`, `K_auth`, and the Master Password never touch `localStorage`, `sessionStorage`, `IndexedDB`, or cookies

### 🖥️ Pages & Components

| Route | Description |
|-------|-------------|
| `/` | Landing page — hero, feature grid, pricing, protocol explainer |
| `/register` | Registration — CSPRNG salt generation + live Argon2id pipeline UI |
| `/login` | Login — 5-step crypto pipeline visualizer + AEAD error simulation |
| `/dashboard` | Vault view — searchable credential table with eye/copy/delete |
| `/dashboard/generator` | Password generator — CSPRNG, sliders, entropy meter |
| `/dashboard/audit` | Security event log — risk scores, session timer |
| `/dashboard/settings` | Account settings — salt reveal, key rotation, lock/purge |

### 🎨 Design System
- **Dark Mode** — deep slate (`#0a0c10`) base with crisp borders and blue accents
- **Premium Aesthetics** — glassmorphism cards, micro-animations, gradient text
- **Typography** — Inter (UI) + JetBrains Mono (code/crypto values)
- **Icons** — Lucide React (`Lock`, `ShieldCheck`, `Key`, `Cpu`, `Server`)

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/yourname/zk-vault.git
cd zk-vault

# Install dependencies
npm install

# Start development server
npm run dev

# Production build
npm run build
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

**Demo credentials:** Any email/password unlocks the vault.  
Use `fail@demo.com` to trigger a live **AEAD tag mismatch** error.

---

## Project Structure

```
src/
├── crypto/
│   └── cryptoEngine.ts       # Argon2id KDF, AES-256-GCM, CSPRNG, entropy
├── context/
│   ├── AuthContext.tsx        # Volatile session store (heap-only)
│   └── VaultContext.tsx       # In-memory credential store
├── components/
│   ├── ProtectedRoute.tsx     # JWT-gated route guard
│   └── dashboard/
│       ├── VaultView.tsx          # Credential table (search, toggle, copy)
│       ├── GeneratorView.tsx      # CSPRNG password generator
│       ├── AuditView.tsx          # Security event log
│       ├── SettingsView.tsx       # Account & session controls
│       └── AddCredentialModal.tsx # AES-256-GCM encrypt-on-save modal
├── pages/
│   ├── LandingPage.tsx        # Marketing landing page
│   ├── LoginPage.tsx          # Auth + crypto pipeline UI
│   ├── RegisterPage.tsx       # Register + CSPRNG salt generation
│   └── DashboardPage.tsx      # Sidebar shell + nested routing
├── index.css                  # Full design system (CSS custom props)
├── App.tsx                    # React Router v6 routes
└── main.tsx                   # App entry point
```

---

## Security Model

### What the server NEVER receives
- Master Password (plaintext)
- `K_enc` — the AES-256 encryption key
- `K_auth` — the raw authentication key
- Any credential plaintext

### What the server receives
- `email` — account identifier
- `salt_hex` — 32-byte CSPRNG salt (used to reproduce Argon2id on login)
- `SHA-256(K_auth)` — one-way fingerprint for server-side auth verification
- AES-256-GCM ciphertext blobs (opaque — structurally unreadable without `K_enc`)

### Key Lifecycle
```
Login → Argon2id → K_enc (RAM) → used for decrypt → session ends → GC purges
                 → K_auth → SHA-256 → sent to server → K_auth discarded
```

---

## Replacing the Mock KDF

To use real Argon2id in production, install `argon2-wasm-pro` and replace `deriveKeys()` in [`cryptoEngine.ts`](src/crypto/cryptoEngine.ts):

```typescript
import argon2 from 'argon2-wasm-pro';

const result = await argon2.hash({
  pass: masterPassword,
  salt: hexToUint8Array(saltHex),
  type: argon2.ArgonType.Argon2id,
  mem: 65536,   // 64 MiB
  time: 3,
  parallelism: 1,
  hashLen: 64,
});
// result.hash is your 512-bit output → split into K_enc ∥ K_auth
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript 5 |
| Build | Vite 8 |
| Styling | Tailwind CSS v4 |
| Routing | React Router v6 |
| Icons | Lucide React |
| Crypto | Web Crypto API (AES-GCM, SHA-256, PBKDF2) |
| Fonts | Inter · JetBrains Mono (Google Fonts) |

---

## License

MIT © 2026 ZKVault Contributors

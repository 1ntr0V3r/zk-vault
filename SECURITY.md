# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| `main` branch | ✅ Active |
| Older commits | ❌ No support |

## Reporting a Vulnerability

**Please do NOT open a public GitHub issue for security vulnerabilities.**

Instead, use [GitHub's private security advisory feature](../../security/advisories/new) to report vulnerabilities privately. This prevents attackers from exploiting the issue before a fix is released.

### What to include in your report

1. **Description** — A clear explanation of the vulnerability
2. **Impact** — What an attacker can achieve (e.g. key material leakage, plaintext exposure)
3. **Steps to reproduce** — Minimal reproduction case
4. **Affected components** — e.g. `cryptoEngine.ts`, `AuthContext.tsx`, login flow
5. **Suggested fix** — Optional, but appreciated

## Scope of Security Concerns

We are especially interested in bugs that compromise the **Zero-Knowledge guarantee**:

- `K_enc` or `K_auth` key material leaking outside volatile JS heap
- Master Password transmitted to server (in any form)
- Credential plaintext stored in `localStorage`, `sessionStorage`, `IndexedDB`, or cookies
- AES-256-GCM authentication tag bypass
- CSPRNG substitution with a weak random source
- Nonce reuse in AES-GCM encryption
- JWT leakage or session fixation

## Response Timeline

| Stage | Timeframe |
|-------|-----------|
| Initial acknowledgement | 48 hours |
| Severity assessment | 5 business days |
| Fix and disclosure | 30 days (critical: 7 days) |

## Out of Scope

- Theoretical attacks without a concrete PoC
- Issues requiring physical access to the user's device
- Browser bugs outside our control

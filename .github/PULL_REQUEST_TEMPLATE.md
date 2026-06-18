## Summary
<!-- 1-2 sentences explaining what this PR does -->

## Type of change
- [ ] 🐛 Bug fix
- [ ] ✨ New feature
- [ ] 🔐 Security fix / cryptographic change
- [ ] 🎨 UI / design change
- [ ] ♻️ Refactor
- [ ] 📝 Documentation

## Changes made
<!-- List the key files and what changed in each -->
- `src/crypto/cryptoEngine.ts` — 
- `src/pages/` — 
- `src/components/` — 

## Security checklist
<!-- Required for any crypto-adjacent changes -->
- [ ] No cryptographic keys (`K_enc`, `K_auth`) written to `localStorage` / `sessionStorage` / `IndexedDB`
- [ ] No Master Password transmitted to the server (even encrypted)
- [ ] New keys created as non-extractable `CryptoKey` objects where possible
- [ ] CSPRNG (`window.crypto.getRandomValues`) used for all random values
- [ ] AES-GCM nonce is unique per encryption operation
- [ ] Auth tag verified before returning plaintext

## Screenshots
<!-- If UI changes, include before/after screenshots -->

## Testing
- [ ] TypeScript: `npx tsc --noEmit` passes with 0 errors
- [ ] Production build: `npm run build` succeeds
- [ ] Manual smoke test on Login / Register / Vault / Generator / Audit

## Related issues
Closes #

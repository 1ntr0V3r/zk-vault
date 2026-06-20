-- =============================================================================
-- Vault-Service Database Schema
-- SQLCipher-encrypted SQLite (pysqlcipher3 in production).
-- =============================================================================
-- Compliance:
--   ISO/IEC 27001 A.10.1.1  — Encryption at rest (SQLCipher AES-256).
--   GDPR Art. 25 / CNDP Law 09-08 — Data minimisation: server stores ONLY
--     opaque AES-256-GCM ciphertext blobs. The server is architecturally
--     incapable of reading the plaintext content of any vault entry.
--   OWASP A01:2021 — Broken Access Control: user_id FK enforces row-level
--     ownership; all queries are scoped to the verified JWT sub claim.
-- =============================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS vault_entries (
    id              TEXT      PRIMARY KEY,           -- UUID v4
    user_id         TEXT      NOT NULL,              -- FK to auth_service.users.user_id
    -- Opaque AES-256-GCM ciphertext (base64). The server cannot interpret this.
    encrypted_blob  TEXT      NOT NULL,
    -- 96-bit AES-GCM nonce (base64). Unique per encryption operation.
    iv              TEXT      NOT NULL,
    -- Unencrypted metadata (site label and username are not confidential
    -- in the current threat model; encrypt these if required by policy).
    site_label      TEXT      NOT NULL DEFAULT '',
    username        TEXT      NOT NULL DEFAULT '',
    created_at      DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Enforce OWASP A01 ownership lookup performance.
CREATE INDEX IF NOT EXISTS idx_vault_entries_user_id ON vault_entries(user_id);

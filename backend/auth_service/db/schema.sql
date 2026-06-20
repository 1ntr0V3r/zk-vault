-- =============================================================================
-- Auth-Service Database Schema
-- SQLCipher-encrypted SQLite (pysqlcipher3 in production).
-- =============================================================================
-- Compliance:
--   ISO/IEC 27001 A.10.1.1 — Encryption of data at rest (SQLCipher AES-256).
--   GDPR Art. 25 / CNDP Law 09-08 — Data minimisation: server stores
--     ONLY email, salt_hex, and auth_hash_stored (SHA-256 of K_auth).
--     The master password and K_enc are NEVER stored server-side.
-- =============================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    user_id          TEXT      PRIMARY KEY,           -- UUID v4
    email            TEXT      NOT NULL UNIQUE,
    -- 32-byte CSPRNG salt used by the client for Argon2id key derivation.
    salt_hex         TEXT      NOT NULL,
    -- hex( SHA-256( K_auth ) ) — the only credential derivative stored.
    -- The raw K_auth and master password are NEVER stored anywhere server-side.
    auth_hash_stored TEXT      NOT NULL,
    created_at       DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

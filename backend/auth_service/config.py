"""
auth_service/config.py — Environment-driven configuration.

All secrets are injected via environment variables. NEVER hardcode key material.

Required environment variables:
  AUTH_DB_KEY         — SQLCipher database encryption key (AES-256).
  AUTH_DB_PATH        — Path to the SQLCipher database file.
  RS256_PRIVATE_KEY   — PEM-encoded RSA-2048 private key for JWT signing.
  RS256_PUBLIC_KEY    — PEM-encoded RSA-2048 public key for JWT verification.
  REDIS_URL           — Redis connection URL (e.g. redis://:password@host:6379/0).
  SALT_ORACLE_KEY_HEX — 32-byte hex key used to generate dummy salts for
                         unregistered emails (prevents user enumeration).

Optional:
  FLASK_SECRET_KEY    — Flask session secret (default: auto-generated, ephemeral).
  JWT_ACCESS_TTL      — JWT lifetime in seconds (default: 3600).
"""

import os
import secrets


class Config:
    # ── Flask ─────────────────────────────────────────────────────────────────
    SECRET_KEY: str = os.environ.get("FLASK_SECRET_KEY") or secrets.token_hex(32)
    DEBUG: bool = False
    TESTING: bool = False
    JSON_SORT_KEYS: bool = False

    # ── Database (SQLCipher) ─────────────────────────────────────────────────
    AUTH_DB_KEY: str = os.environ["AUTH_DB_KEY"]
    AUTH_DB_PATH: str = os.environ.get("AUTH_DB_PATH", "auth.db")

    # ── JWT (RS256) ───────────────────────────────────────────────────────────
    RS256_PRIVATE_KEY: str = os.environ["RS256_PRIVATE_KEY"]
    RS256_PUBLIC_KEY: str = os.environ["RS256_PUBLIC_KEY"]
    JWT_ACCESS_TTL: int = int(os.environ.get("JWT_ACCESS_TTL", "3600"))

    # ── Redis ─────────────────────────────────────────────────────────────────
    REDIS_URL: str = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

    # ── Anti-enumeration oracle key ───────────────────────────────────────────
    # Used to produce a stable but fake salt for unregistered email lookups.
    # Must be a 32-byte (64 hex char) random value, stable across restarts.
    SALT_ORACLE_KEY: bytes = bytes.fromhex(
        os.environ.get(
            "SALT_ORACLE_KEY_HEX",
            # Development fallback ONLY — replace with a real secret in production.
            "0" * 64,
        )
    )


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


_CONFIG_MAP = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
}


def get_config() -> type[Config]:
    env = os.environ.get("FLASK_ENV", "development")
    return _CONFIG_MAP.get(env, DevelopmentConfig)

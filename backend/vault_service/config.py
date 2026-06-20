"""
vault_service/config.py — Environment-driven configuration.

Required environment variables:
  VAULT_DB_KEY       — SQLCipher database encryption key (AES-256).
  VAULT_DB_PATH      — Path to the SQLCipher database file.
  RS256_PUBLIC_KEY   — PEM-encoded RSA-2048 public key (SAME key pair as
                        auth-service) for JWT verification.
  REDIS_URL          — Redis connection URL.
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
    VAULT_DB_KEY: str = os.environ["VAULT_DB_KEY"]
    VAULT_DB_PATH: str = os.environ.get("VAULT_DB_PATH", "vault.db")

    # ── JWT (RS256 — verify only, no private key needed here) ─────────────────
    RS256_PUBLIC_KEY: str = os.environ["RS256_PUBLIC_KEY"]

    # ── Redis ─────────────────────────────────────────────────────────────────
    REDIS_URL: str = os.environ.get("REDIS_URL", "redis://localhost:6379/0")


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

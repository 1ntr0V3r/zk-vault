"""
vault_service/app.py — Flask Application Factory
=================================================
Usage:
    export FLASK_APP=vault_service.app:create_app
    export FLASK_ENV=development
    flask run --port 5002
"""

import os
import sqlite3
from pathlib import Path

import redis
from flask import Flask

from .config import get_config
from .routes.vault import vault_bp


def _init_db(app: Flask) -> None:
    """
    Initialise the SQLCipher vault database and apply the schema.

    ISO/IEC 27001 A.10.1.1 — Encryption at rest via SQLCipher AES-256.
    """
    use_cipher = os.environ.get("USE_SQLCIPHER", "true").lower() != "false"

    if use_cipher:
        try:
            from pysqlcipher3 import dbapi2 as sqlcipher  # type: ignore

            conn = sqlcipher.connect(app.config["VAULT_DB_PATH"])
            conn.execute(f"PRAGMA key = '{app.config['VAULT_DB_KEY']}'")
            conn.execute("PRAGMA cipher_page_size = 4096")
            conn.execute("PRAGMA kdf_iter = 64000")
            conn.execute("PRAGMA cipher_hmac_algorithm = HMAC_SHA512")
            conn.execute("PRAGMA cipher_kdf_algorithm = PBKDF2_HMAC_SHA512")
        except ImportError:
            app.logger.warning(
                "pysqlcipher3 not installed — falling back to unencrypted sqlite3. "
                "DO NOT use this configuration in production."
            )
            conn = sqlite3.connect(app.config["VAULT_DB_PATH"])
    else:
        conn = sqlite3.connect(app.config["VAULT_DB_PATH"])

    conn.row_factory = sqlite3.Row
    schema_path = Path(__file__).parent / "db" / "schema.sql"
    conn.executescript(schema_path.read_text())
    conn.commit()
    app.extensions["db"] = conn


def _init_redis(app: Flask) -> None:
    """Connect to Redis and store the client in app.extensions."""
    r = redis.StrictRedis.from_url(
        app.config["REDIS_URL"],
        decode_responses=True,
        socket_connect_timeout=5,
        socket_timeout=5,
        retry_on_timeout=True,
    )
    r.ping()
    app.extensions["redis"] = r


def create_app() -> Flask:
    """
    Vault-Service Flask application factory.

    Registers vault Blueprint at /api/v1/vault.
    Applies OWASP A05 security response headers on every response.
    """
    app = Flask(__name__)
    app.config.from_object(get_config()())

    _init_db(app)
    _init_redis(app)

    app.register_blueprint(vault_bp)

    # ── OWASP A05 — Security response headers ─────────────────────────────────
    @app.after_request
    def set_security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Strict-Transport-Security"] = (
            "max-age=63072000; includeSubDomains; preload"
        )
        response.headers["Cache-Control"] = "no-store"
        response.headers["Pragma"] = "no-cache"
        response.headers.pop("Server", None)
        return response

    return app

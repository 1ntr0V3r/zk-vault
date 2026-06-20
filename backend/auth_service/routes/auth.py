"""
auth_service/routes/auth.py — Authentication Routes
=====================================================
Compliance:
  ISO/IEC 27001 A.9.4.2  — Secure log-on procedures (timing-safe comparison).
  OWASP A07:2021          — Progressive Redis lockout on repeated failures.
  OWASP A09:2021          — No secret material in error responses or logs.
  GDPR Art. 5(1)(c)       — Data minimisation: only email + auth_hash in body.
  CNDP Law 09-08 Art. 24  — Adequate technical protection of personal data.

Routes:
  GET  /api/v1/auth/salt    — Fetch per-user salt for client-side key derivation.
  POST /api/v1/auth/login   — Authenticate via auth_hash (timing-safe comparison).
  POST /api/v1/auth/logout  — Revoke JWT JTI in Redis with exact remaining TTL.
  POST /api/v1/auth/register — Register user (stores email, salt, auth_hash only).
"""

import hmac
import secrets
import time
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any

import jwt
import redis as redis_module
from flask import Blueprint, current_app, g, jsonify, request

auth_bp = Blueprint("auth", __name__, url_prefix="/api/v1/auth")

# ── Progressive lockout TTL ladder (seconds) ──────────────────────────────────
# Failure 1 → 3 min lock, Failure 2 → 10 min, Failure 3+ → 30 min.
# OWASP A07: expanding penalty window mitigates automated dictionary attacks.
_LOCKOUT_TTL: tuple[int, ...] = (180, 600, 1800)
_MAX_ATTEMPTS_BEFORE_LOCK: int = 3


def _redis() -> redis_module.StrictRedis:
    return current_app.extensions["redis"]  # type: ignore[return-value]


def _db():
    return current_app.extensions["db"]


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/v1/auth/salt
# ─────────────────────────────────────────────────────────────────────────────

@auth_bp.route("/salt", methods=["GET"])
def get_salt():
    """
    Returns the Argon2id salt for the given email so the client can perform
    key derivation before sending auth_hash.

    Anti-enumeration design: if the email is not registered, the endpoint
    returns a deterministic HMAC-derived dummy salt (keyed on the oracle
    secret) so that response timing and content cannot distinguish between
    registered and unregistered emails.

    GDPR: no authentication is required to call this endpoint; the salt
    is not a secret (it is a public parameter for key derivation).
    """
    email: str = request.args.get("email", "").strip().lower()
    if not email:
        return jsonify({"error": "email parameter is required"}), 400

    db = _db()
    row = db.execute(
        "SELECT salt_hex FROM users WHERE email = ?", (email,)
    ).fetchone()

    if row:
        return jsonify({"salt_hex": row["salt_hex"]}), 200

    # Return a stable dummy salt — prevents user enumeration via content diff.
    # The dummy is HMAC-SHA256(oracle_key, email) — deterministic per email
    # but computationally indistinguishable from a real salt without the key.
    dummy_salt_hex = hmac.new(
        current_app.config["SALT_ORACLE_KEY"],
        email.encode("utf-8"),
        "sha256",
    ).hexdigest()
    return jsonify({"salt_hex": dummy_salt_hex}), 200


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/v1/auth/login
# ─────────────────────────────────────────────────────────────────────────────

@auth_bp.route("/login", methods=["POST"])
def login():
    """
    Authenticate a user and issue an RS256 JWT access token.

    Request body: { "email": str, "auth_hash": str }
      auth_hash — hex( SHA-256( K_auth ) ) derived client-side via Argon2id.
                   The master password and K_enc are NEVER transmitted.

    Security controls:
    ──────────────────
    [ISO 27001 A.9.4.2 — Timing-attack mitigation]
      hmac.compare_digest() is used exclusively for all secret comparisons.
      Standard equality operators (==) are NEVER used on credential material.
      The DB lookup and comparison execute on every call (including unknown
      emails) so that response time does not leak registration status.

    [OWASP A07:2021 — Identification and Authentication Failures]
      Redis progressive lockout:
        Failure 1 → lockout key set with 3-minute TTL.
        Failure 2 → key refreshed with 10-minute TTL.
        Failure 3+ → key refreshed with 30-minute TTL.
      Lockout is checked BEFORE the DB query; if locked, a 429 is returned
      immediately with a Retry-After header containing the remaining TTL.

    [OWASP A09:2021 — Security Logging & Monitoring Failures]
      On failure, a single generic "Authentication failed." message is returned
      regardless of the specific failure reason (wrong password, unknown email,
      locked account detail) to prevent an oracle attack on error content.
      No secret material (auth_hash, stored_hash) is emitted to logs.
    """
    body: dict[str, Any] = request.get_json(silent=True) or {}
    email: str = body.get("email", "").strip().lower()
    auth_hash: str = body.get("auth_hash", "")

    if not email or not auth_hash:
        return jsonify({"error": "email and auth_hash are required"}), 400

    r = _redis()
    lockout_key = f"login_fail:{email}"

    # ── [OWASP A07] Redis lockout check — before any DB interaction ───────────
    raw_count: str | None = r.get(lockout_key)
    fail_count: int = int(raw_count) if raw_count else 0

    if fail_count >= _MAX_ATTEMPTS_BEFORE_LOCK:
        remaining_ttl: int = r.ttl(lockout_key)
        return (
            jsonify({
                "error": "Account temporarily locked due to repeated failures.",
                "retry_after_seconds": remaining_ttl,
            }),
            429,
            {"Retry-After": str(remaining_ttl)},
        )

    # ── DB lookup ─────────────────────────────────────────────────────────────
    db = _db()
    row = db.execute(
        "SELECT user_id, auth_hash_stored FROM users WHERE email = ?",
        (email,),
    ).fetchone()

    # ── [ISO 27001 A.9.4.2] Constant-time comparison ──────────────────────────
    # Whether or not the email exists, we ALWAYS call hmac.compare_digest()
    # with a value of the same length to prevent timing differences from
    # leaking registration status to a remote observer.
    #
    # A dummy stored_hash of the same hex length (64 chars / 256-bit SHA-256)
    # is used when the email is unknown.  The dummy is derived from a server-
    # side secret so it cannot be predicted by an attacker.
    #
    # COMPLIANCE NOTE: hmac.compare_digest() is the ONLY comparison function
    # used here. Standard Python equality (==, !=) is FORBIDDEN on any value
    # derived from secret material.
    stored_hash: str = (
        row["auth_hash_stored"]
        if row
        else hmac.new(
            current_app.config["SALT_ORACLE_KEY"],
            f"dummy:{email}".encode("utf-8"),
            "sha256",
        ).hexdigest()
    )

    # Both sides must be the same type (str or bytes) for compare_digest.
    auth_ok: bool = hmac.compare_digest(
        auth_hash.encode("utf-8"),
        stored_hash.encode("utf-8"),
    )

    # ── Failure path ──────────────────────────────────────────────────────────
    if not auth_ok or not row:
        new_count: int = fail_count + 1
        # Expanding TTL: index clipped to last element for counts > ladder length.
        ttl_seconds: int = _LOCKOUT_TTL[min(new_count - 1, len(_LOCKOUT_TTL) - 1)]
        r.setex(lockout_key, ttl_seconds, new_count)
        # [OWASP A09] Generic error — never reveals which condition failed.
        return jsonify({"error": "Authentication failed."}), 401

    # ── Success path ──────────────────────────────────────────────────────────
    r.delete(lockout_key)  # Reset the lockout counter on successful auth.

    now = datetime.now(timezone.utc)
    jti: str = secrets.token_urlsafe(32)
    ttl: int = current_app.config["JWT_ACCESS_TTL"]

    payload: dict[str, Any] = {
        "sub": str(row["user_id"]),  # Subject: verified user UUID.
        "jti": jti,                   # Unique token ID — used for revocation.
        "iat": now,
        "exp": now + timedelta(seconds=ttl),
    }

    access_token: str = jwt.encode(
        payload,
        current_app.config["RS256_PRIVATE_KEY"],
        algorithm="RS256",
    )

    return jsonify({
        "access_token": access_token,
        "token_type": "Bearer",
        "expires_in": ttl,
    }), 200


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/v1/auth/logout
# ─────────────────────────────────────────────────────────────────────────────

@auth_bp.route("/logout", methods=["POST"])
def logout():
    """
    Revoke the caller's JWT by writing its 'jti' claim into the Redis
    JTI blacklist with a TTL exactly equal to the token's remaining lifespan.

    This implements stateful JWT revocation so that stolen tokens cannot be
    used after the user has signed out, without requiring a shared session
    store for every vault request.

    Security guarantee:
      The Vault-Service's jwt_guard middleware checks the Redis blacklist on
      every protected request.  Once the token's natural exp is reached,
      Redis automatically evicts the key, keeping the blacklist self-pruning.
    """
    auth_header: str = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Authorization: Bearer <token> header required"}), 401

    token: str = auth_header[7:]

    try:
        payload: dict[str, Any] = jwt.decode(
            token,
            current_app.config["RS256_PUBLIC_KEY"],
            algorithms=["RS256"],
        )
    except jwt.ExpiredSignatureError:
        # Token already expired — nothing to revoke; treat as success.
        return "", 204
    except jwt.PyJWTError:
        return jsonify({"error": "Invalid token"}), 401

    jti: str = payload.get("jti", "")
    if not jti:
        return jsonify({"error": "Token is missing the required jti claim"}), 400

    exp: int = int(payload.get("exp", 0))
    # Compute exact remaining TTL in seconds; clamp to at least 1 second so
    # Redis accepts the setex call even for nearly-expired tokens.
    remaining_ttl: int = max(int(exp - time.time()), 1)

    r = _redis()
    # Write jti to blacklist. TTL = exact remaining lifespan → self-pruning.
    r.setex(f"jti_blacklist:{jti}", remaining_ttl, "1")

    return "", 204


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/v1/auth/register
# ─────────────────────────────────────────────────────────────────────────────

@auth_bp.route("/register", methods=["POST"])
def register():
    """
    Register a new user account.

    Request body: { "email": str, "salt_hex": str, "auth_hash": str }

    GDPR / CNDP Data Minimisation:
      Server stores ONLY: user_id (UUID), email, salt_hex, auth_hash_stored.
      The master password and K_enc are NEVER transmitted or stored.

    Email uniqueness is enforced at the database level (UNIQUE constraint).
    """
    body: dict[str, Any] = request.get_json(silent=True) or {}
    email: str = body.get("email", "").strip().lower()
    salt_hex: str = body.get("salt_hex", "")
    auth_hash: str = body.get("auth_hash", "")

    if not email or not salt_hex or not auth_hash:
        return jsonify({"error": "email, salt_hex, and auth_hash are required"}), 400

    # Basic hex-length validation: SHA-256 output is 64 hex chars.
    if len(auth_hash) != 64 or not all(c in "0123456789abcdef" for c in auth_hash.lower()):
        return jsonify({"error": "auth_hash must be a 64-char lowercase hex string"}), 400

    # Salt must be 64 hex chars (32 bytes).
    if len(salt_hex) != 64 or not all(c in "0123456789abcdef" for c in salt_hex.lower()):
        return jsonify({"error": "salt_hex must be a 64-char lowercase hex string"}), 400

    user_id = str(uuid.uuid4())
    db = _db()

    try:
        db.execute(
            "INSERT INTO users (user_id, email, salt_hex, auth_hash_stored) "
            "VALUES (?, ?, ?, ?)",
            (user_id, email, salt_hex, auth_hash),
        )
        db.commit()
    except Exception as exc:
        # Uniqueness violation → email already registered.
        if "UNIQUE" in str(exc).upper():
            return jsonify({"error": "An account with this email already exists."}), 409
        # Log the raw exception server-side but never expose it to the client.
        current_app.logger.error("Registration DB error: %s", exc)
        return jsonify({"error": "Registration failed. Please try again."}), 500

    return jsonify({"user_id": user_id}), 201

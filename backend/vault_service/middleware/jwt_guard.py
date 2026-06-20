"""
vault_service/middleware/jwt_guard.py — RS256 JWT Guard Decorator
=================================================================
Compliance:
  OWASP A01:2021 — Broken Access Control mitigation.
    Every vault route is protected by @require_jwt. The decorator:
      1. Extracts the Bearer token from the Authorization header.
      2. Verifies the RS256 signature and expiry using the public key.
      3. Checks the token's 'jti' claim against the Redis JTI blacklist
         (populated by POST /api/v1/auth/logout in auth-service).
      4. Binds the verified 'sub' claim to Flask's g.user_id so downstream
         route handlers can enforce row-level ownership without re-decoding.

  ISO/IEC 27001 A.9.4.1 — Information access restriction.
    The decorator gates every vault endpoint; there is no bypass path.

  GDPR Art. 32 / CNDP Law 09-08 — Appropriate technical measures.
    Expired and tampered tokens are rejected before any DB interaction.

Usage:
    from vault_service.middleware.jwt_guard import require_jwt

    @vault_bp.route("/entries", methods=["GET"])
    @require_jwt
    def list_entries():
        user_id = g.user_id  # Verified JWT sub claim.
        ...
"""

import time
from functools import wraps
from typing import Any, Callable

import jwt
import redis as redis_module
from flask import current_app, g, jsonify, request


def require_jwt(f: Callable) -> Callable:
    """
    Route decorator that enforces RS256 JWT authentication and JTI revocation.

    On success, binds to Flask request context:
      g.user_id  — verified JWT 'sub' claim (UUID string).
      g.jti      — JWT 'jti' claim (used for audit / further revocation checks).

    On failure, returns one of:
      401  — Missing header / invalid / expired / tampered token.
      401  — Token has been revoked (jti found in Redis blacklist).
    """
    @wraps(f)
    def decorated_function(*args: Any, **kwargs: Any):
        # ── 1. Extract Bearer token ───────────────────────────────────────────
        auth_header: str = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return (
                jsonify({"error": "Authorization: Bearer <token> header is required"}),
                401,
            )

        token: str = auth_header[7:]

        # ── 2. Verify RS256 signature and standard claims ─────────────────────
        try:
            payload: dict[str, Any] = jwt.decode(
                token,
                current_app.config["RS256_PUBLIC_KEY"],
                algorithms=["RS256"],
                # PyJWT verifies 'exp' automatically when present.
                options={"require": ["sub", "jti", "exp", "iat"]},
            )
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired. Please re-authenticate."}), 401
        except jwt.MissingRequiredClaimError as exc:
            return jsonify({"error": f"Token is missing required claim: {exc}"}), 401
        except jwt.InvalidTokenError:
            # Covers: invalid signature, malformed token, algorithm mismatch.
            return jsonify({"error": "Token is invalid or has been tampered with."}), 401

        jti: str = payload["jti"]
        sub: str = payload["sub"]

        # Guard against empty claims that passed the require check.
        if not jti or not sub:
            return jsonify({"error": "Token contains empty required claims."}), 401

        # ── 3. JTI Revocation: Redis blacklist check ──────────────────────────
        # Check BEFORE any database interaction to prevent revoked tokens from
        # triggering any downstream processing.
        r: redis_module.StrictRedis = current_app.extensions["redis"]  # type: ignore
        if r.exists(f"jti_blacklist:{jti}"):
            return jsonify({"error": "Token has been revoked. Please re-authenticate."}), 401

        # ── 4. Bind verified claims to Flask request context ──────────────────
        # g.user_id is the single source of truth for ownership checks in routes.
        # Route handlers MUST NOT trust any user_id from the request body or URL
        # parameters — only g.user_id (derived from the verified JWT sub claim).
        g.user_id = sub
        g.jti = jti

        return f(*args, **kwargs)

    return decorated_function

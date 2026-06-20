"""
vault_service/routes/vault.py — Vault CRUD Routes
==================================================
Compliance:
  OWASP A01:2021 — Broken Access Control:
    Every route is protected by @require_jwt (RS256 JWT verification + JTI
    revocation check). All database queries are double-scoped: first by the
    entry primary key, then by user_id = g.user_id (verified JWT sub claim).
    An explicit ownership check raises 403 Forbidden before any mutation.

  GDPR Art. 5(1)(c) / CNDP Law 09-08 — Data Minimisation:
    The server stores ONLY opaque AES-256-GCM ciphertext (encrypted_blob)
    and the 96-bit IV. The server is architecturally incapable of decrypting
    or logging the plaintext content of any vault entry.
    Structured application logs MUST NOT include encrypted_blob values.

  GDPR Art. 17 / CNDP Art. 24 — Right to Erasure:
    DELETE /entries/<id> permanently removes the row. No soft-delete or
    audit retention of the encrypted payload is performed.

Routes (all require Authorization: Bearer <RS256-JWT>):
  GET    /api/v1/vault/entries           — List all entries for authenticated user.
  POST   /api/v1/vault/entries           — Create a new opaque vault entry.
  PATCH  /api/v1/vault/entries/<id>      — Replace encrypted_blob + iv for an entry.
  DELETE /api/v1/vault/entries/<id>      — Permanently erase an entry.
"""

import uuid
from typing import Any

from flask import Blueprint, current_app, g, jsonify, request

from ..middleware.jwt_guard import require_jwt

vault_bp = Blueprint("vault", __name__, url_prefix="/api/v1/vault")


def _db():
    return current_app.extensions["db"]


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/v1/vault/entries
# ─────────────────────────────────────────────────────────────────────────────

@vault_bp.route("/entries", methods=["GET"])
@require_jwt
def list_entries():
    """
    Return all vault entries belonging to the authenticated user.

    OWASP A01: Query is scoped exclusively to g.user_id (verified JWT sub).
    GDPR Data Minimisation: encrypted_blob is returned as-is; the server
      never decrypts it. Structured logs must not include blob values.
    """
    db = _db()
    rows = db.execute(
        "SELECT id, encrypted_blob, iv, site_label, username, updated_at "
        "FROM vault_entries "
        "WHERE user_id = ?",
        (g.user_id,),
    ).fetchall()

    return jsonify([
        {
            "id":             row["id"],
            "encrypted_blob": row["encrypted_blob"],
            "iv":             row["iv"],
            "site_label":     row["site_label"],
            "username":       row["username"],
            "updated_at":     row["updated_at"],
        }
        for row in rows
    ]), 200


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/v1/vault/entries
# ─────────────────────────────────────────────────────────────────────────────

@vault_bp.route("/entries", methods=["POST"])
@require_jwt
def create_entry():
    """
    Persist a new opaque vault entry for the authenticated user.

    Request body:
      encrypted_blob — base64 AES-256-GCM ciphertext (required).
      iv             — base64 96-bit nonce (required).
      site_label     — plaintext site name (optional metadata).
      username       — plaintext username (optional metadata).

    GDPR Data Minimisation: the server treats encrypted_blob as an opaque
      byte sequence. No decryption attempt is made or possible (the server
      never possesses K_enc). encrypted_blob MUST NOT appear in any log.

    OWASP A01: user_id is taken exclusively from g.user_id (verified JWT
      sub claim) — NEVER from the request body.
    """
    body: dict[str, Any] = request.get_json(silent=True) or {}
    encrypted_blob: str = body.get("encrypted_blob", "")
    iv: str = body.get("iv", "")
    site_label: str = body.get("site_label", "")
    username: str = body.get("username", "")

    if not encrypted_blob or not iv:
        return jsonify({"error": "encrypted_blob and iv are required"}), 400

    entry_id = str(uuid.uuid4())
    db = _db()
    db.execute(
        "INSERT INTO vault_entries (id, user_id, encrypted_blob, iv, site_label, username) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (entry_id, g.user_id, encrypted_blob, iv, site_label, username),
    )
    db.commit()

    # Log entry creation without the blob (GDPR data minimisation in logs).
    current_app.logger.info(
        "Vault entry created: id=%s user_id=%s site_label=%s",
        entry_id,
        g.user_id,
        site_label or "(unlabelled)",
    )

    return jsonify({"id": entry_id}), 201


# ─────────────────────────────────────────────────────────────────────────────
# PATCH /api/v1/vault/entries/<entry_id>
# ─────────────────────────────────────────────────────────────────────────────

@vault_bp.route("/entries/<entry_id>", methods=["PATCH"])
@require_jwt
def update_entry(entry_id: str):
    """
    Replace the encrypted_blob and IV for an existing vault entry.

    OWASP A01 — Broken Access Control mitigation:
      Step 1: Fetch ONLY the user_id FK from the target row.
      Step 2: Compare the fetched user_id against g.user_id using a strict
              equality check. If they differ, raise 403.
      Step 3: The UPDATE query additionally filters by user_id = g.user_id
              as a defence-in-depth measure (double ownership enforcement).

    A 404 is returned when the entry does not exist; a 403 when it exists but
    belongs to a different user. This intentionally reveals existence to the
    legitimate owner (since they must know their own entry IDs) while
    preventing cross-user probing.
    """
    db = _db()
    row = db.execute(
        "SELECT user_id FROM vault_entries WHERE id = ?",
        (entry_id,),
    ).fetchone()

    if not row:
        return jsonify({"error": "Vault entry not found."}), 404

    # OWASP A01 — Strict ownership enforcement: verified JWT sub vs DB FK.
    if row["user_id"] != g.user_id:
        return jsonify({"error": "Forbidden: you do not own this vault entry."}), 403

    body: dict[str, Any] = request.get_json(silent=True) or {}
    encrypted_blob: str = body.get("encrypted_blob", "")
    iv: str = body.get("iv", "")

    if not encrypted_blob or not iv:
        return jsonify({"error": "encrypted_blob and iv are required"}), 400

    # Defence-in-depth: WHERE clause includes user_id to prevent TOCTOU attacks.
    db.execute(
        "UPDATE vault_entries "
        "SET encrypted_blob = ?, iv = ?, updated_at = CURRENT_TIMESTAMP "
        "WHERE id = ? AND user_id = ?",
        (encrypted_blob, iv, entry_id, g.user_id),
    )
    db.commit()

    return jsonify({"id": entry_id}), 200


# ─────────────────────────────────────────────────────────────────────────────
# DELETE /api/v1/vault/entries/<entry_id>
# ─────────────────────────────────────────────────────────────────────────────

@vault_bp.route("/entries/<entry_id>", methods=["DELETE"])
@require_jwt
def delete_entry(entry_id: str):
    """
    Permanently erase a vault entry.

    OWASP A01 — Ownership enforced with a two-step pattern identical to PATCH.
    GDPR Art. 17 / CNDP Law 09-08 — Right to Erasure:
      The row is hard-deleted (no soft-delete, no tombstone). The encrypted
      blob is irrecoverably removed from the SQLCipher database. There is no
      server-side backup of individual entry content by design.
    """
    db = _db()
    row = db.execute(
        "SELECT user_id FROM vault_entries WHERE id = ?",
        (entry_id,),
    ).fetchone()

    if not row:
        return jsonify({"error": "Vault entry not found."}), 404

    # OWASP A01 — Strict ownership enforcement.
    if row["user_id"] != g.user_id:
        return jsonify({"error": "Forbidden: you do not own this vault entry."}), 403

    # Defence-in-depth: WHERE clause includes user_id.
    db.execute(
        "DELETE FROM vault_entries WHERE id = ? AND user_id = ?",
        (entry_id, g.user_id),
    )
    db.commit()

    current_app.logger.info(
        "Vault entry deleted (GDPR erasure): id=%s user_id=%s",
        entry_id,
        g.user_id,
    )

    return "", 204

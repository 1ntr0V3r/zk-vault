"""
backend/keygen.py — Development RS256 Key Pair Generator
=========================================================
⚠  DEVELOPMENT USE ONLY. Generated keys are written to backend/keys/.
   In production, keys MUST be injected via environment variables or a
   secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.) and
   MUST NOT be committed to version control.

Usage:
    python backend/keygen.py

Output files:
    backend/keys/rs256_private.pem  — RSA-2048 PKCS#8 private key (PEM).
    backend/keys/rs256_public.pem   — RSA-2048 SubjectPublicKeyInfo PEM.
    backend/keys/.env.example       — Paste-ready environment variable block.

Set environment variables in production:
    export RS256_PRIVATE_KEY="$(cat backend/keys/rs256_private.pem)"
    export RS256_PUBLIC_KEY="$(cat backend/keys/rs256_public.pem)"
"""

from __future__ import annotations

import sys
from pathlib import Path

try:
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
except ImportError:
    print(
        "ERROR: 'cryptography' package is not installed.\n"
        "Run: pip install cryptography",
        file=sys.stderr,
    )
    sys.exit(1)


def generate_rsa_keypair(key_size: int = 2048) -> tuple[str, str]:
    """
    Generate an RSA key pair and return (private_pem, public_pem).

    Key size: 2048 bits minimum per NIST SP 800-131A Rev. 2 (through 2030).
              Use 4096 bits for long-lived keys.
    """
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=key_size,
    )

    private_pem: str = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("utf-8")

    public_pem: str = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode("utf-8")

    return private_pem, public_pem


def main() -> None:
    keys_dir = Path(__file__).parent / "keys"
    keys_dir.mkdir(exist_ok=True)

    print("Generating RSA-2048 key pair for RS256 JWT signing…")
    private_pem, public_pem = generate_rsa_keypair(key_size=2048)

    private_path = keys_dir / "rs256_private.pem"
    public_path = keys_dir / "rs256_public.pem"
    env_path = keys_dir / ".env.example"

    private_path.write_text(private_pem)
    public_path.write_text(public_pem)

    # Set restrictive permissions on the private key (Unix only).
    try:
        import stat
        private_path.chmod(stat.S_IRUSR | stat.S_IWUSR)  # 0o600
    except (OSError, AttributeError):
        pass  # Windows — handled by NTFS ACLs.

    env_content = (
        "# ⚠ DEVELOPMENT ONLY — DO NOT COMMIT TO VERSION CONTROL\n"
        "# Replace with secrets manager values in production.\n\n"
        f'RS256_PRIVATE_KEY="{private_pem.strip()}"\n\n'
        f'RS256_PUBLIC_KEY="{public_pem.strip()}"\n\n'
        "# Auth-service SQLCipher key (generate with: python -c \"import secrets; print(secrets.token_hex(32))\")\n"
        "AUTH_DB_KEY=REPLACE_WITH_RANDOM_32_BYTE_HEX\n\n"
        "# Vault-service SQLCipher key\n"
        "VAULT_DB_KEY=REPLACE_WITH_RANDOM_32_BYTE_HEX\n\n"
        "# Anti-enumeration oracle key (64 hex chars)\n"
        "SALT_ORACLE_KEY_HEX=REPLACE_WITH_RANDOM_64_CHAR_HEX\n\n"
        "# Redis URL\n"
        "REDIS_URL=redis://localhost:6379/0\n"
    )
    env_path.write_text(env_content)

    print(f"✓ Private key written to: {private_path}  (permissions: 600)")
    print(f"✓ Public key written to:  {public_path}")
    print(f"✓ .env.example written to: {env_path}")
    print()
    print("⚠  Add backend/keys/rs256_private.pem to .gitignore immediately.")
    print("⚠  Never commit private key material to version control.")


if __name__ == "__main__":
    main()

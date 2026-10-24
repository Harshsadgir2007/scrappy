"""
File storage utilities with Fernet encryption (and graceful fallback).

License and material quality certificate files uploaded by companies are encrypted
at rest using Fernet symmetric encryption and stored in the uploads/ directory.
"""

import os
import uuid
from pathlib import Path

try:
    from cryptography.fernet import Fernet
    HAS_FERNET = True
except ImportError:
    HAS_FERNET = False

from app.config import settings


def _get_fernet():
    """Return a Fernet instance initialised with the configured key if available."""
    if not HAS_FERNET:
        return None
    try:
        return Fernet(settings.ENCRYPTION_KEY.encode("utf-8"))
    except Exception:
        return None


def ensure_upload_dir() -> None:
    """Create the uploads and certificates directory if it doesn't exist."""
    for d in [settings.UPLOAD_DIR, settings.CERTIFICATES_DIR]:
        try:
            d.mkdir(parents=True, exist_ok=True)
        except Exception:
            pass


def encrypt_and_save(file_bytes: bytes, filename: str, subfolder: str | None = None) -> str:
    """Encrypt file content and persist it to the uploads directory.

    A UUID prefix is added to the filename to avoid collisions.
    """
    ensure_upload_dir()

    fernet = _get_fernet()
    encrypted = fernet.encrypt(file_bytes) if fernet else file_bytes

    safe_name = f"{uuid.uuid4().hex}_{filename}"
    target_dir = settings.CERTIFICATES_DIR if subfolder == "certificates" else settings.UPLOAD_DIR
    try:
        target_dir.mkdir(parents=True, exist_ok=True)
    except Exception:
        target_dir = Path("/tmp/uploads")
        target_dir.mkdir(parents=True, exist_ok=True)

    dest = target_dir / safe_name
    dest.write_bytes(encrypted)
    return str(dest)


def decrypt_and_read(file_path: str) -> bytes:
    """Read an encrypted file from disk and return the decrypted bytes."""
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    fernet = _get_fernet()
    data = path.read_bytes()
    if fernet:
        try:
            return fernet.decrypt(data)
        except Exception:
            return data
    return data

"""
File storage utilities with Fernet encryption.

License and material quality certificate files uploaded by companies are encrypted
at rest using Fernet symmetric encryption and stored in the uploads/ directory.
"""

import os
import uuid
from pathlib import Path

from cryptography.fernet import Fernet

from app.config import settings


def _get_fernet() -> Fernet:
    """Return a Fernet instance initialised with the configured key."""
    return Fernet(settings.ENCRYPTION_KEY.encode("utf-8"))


def ensure_upload_dir() -> None:
    """Create the uploads and certificates directory if it doesn't exist."""
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    settings.CERTIFICATES_DIR.mkdir(parents=True, exist_ok=True)


def encrypt_and_save(file_bytes: bytes, filename: str, subfolder: str | None = None) -> str:
    """Encrypt file content and persist it to the uploads directory.

    A UUID prefix is added to the filename to avoid collisions.

    Args:
        file_bytes: Raw bytes of the file to store.
        filename: Original filename (used for extension detection).
        subfolder: Optional subfolder within uploads (e.g. 'certificates').

    Returns:
        The relative path (from the backend root) to the stored file.
    """
    ensure_upload_dir()

    fernet = _get_fernet()
    encrypted = fernet.encrypt(file_bytes)

    # Unique storage name: <uuid>_<original_filename>
    safe_name = f"{uuid.uuid4().hex}_{filename}"
    target_dir = settings.CERTIFICATES_DIR if subfolder == "certificates" else settings.UPLOAD_DIR
    target_dir.mkdir(parents=True, exist_ok=True)
    dest = target_dir / safe_name

    dest.write_bytes(encrypted)
    return str(dest)


def decrypt_and_read(file_path: str) -> bytes:
    """Read an encrypted file from disk and return the decrypted bytes.

    Args:
        file_path: Absolute or relative path to the encrypted file.

    Returns:
        The original (decrypted) file bytes.

    Raises:
        FileNotFoundError: If the file does not exist.
        cryptography.fernet.InvalidToken: If decryption fails.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    fernet = _get_fernet()
    encrypted = path.read_bytes()
    return fernet.decrypt(encrypted)

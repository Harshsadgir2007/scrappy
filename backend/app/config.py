"""
Application configuration settings.

Uses environment variables with sensible defaults for development.
In production, set these via .env file or environment variables.
"""

import os
import secrets
from pathlib import Path

from dotenv import load_dotenv

# Load .env file if present
load_dotenv()

# Base directory of the backend project
BASE_DIR = Path(__file__).resolve().parent.parent


class Settings:
    """Central configuration for the Scrappy backend."""

    # ── Database ────────────────────────────────────────────────────────
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./scrappy.db")

    # ── JWT ─────────────────────────────────────────────────────────────
    JWT_SECRET_KEY: str = os.getenv(
        "JWT_SECRET_KEY",
        secrets.token_urlsafe(64),  # Auto-generated if not set
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30          # 30 minutes
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7             # 7 days

    # ── File uploads ────────────────────────────────────────────────────
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    MAX_UPLOAD_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB

    # ── Encryption (Fernet) for license files ───────────────────────────
    # Generate a persistent key and store in .env for production.
    ENCRYPTION_KEY: str = os.getenv(
        "ENCRYPTION_KEY",
        "6kfjYKM-PWu6aYvF_T6ijEdKUphdcLxIrSHe6ZN3Cnw=",
    )

    # ── CORS ────────────────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = ["*"]


settings = Settings()

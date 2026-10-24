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

# Detect serverless runtime (Vercel / AWS Lambda)
IS_SERVERLESS = bool(os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"))

if IS_SERVERLESS:
    tmp_path = Path("/tmp")
    tmp_db_file = tmp_path / "pragyan.db"
    if not tmp_db_file.exists():
        for candidate in [BASE_DIR / "pragyan.db", BASE_DIR.parent / "pragyan.db", BASE_DIR / "scrappy.db", BASE_DIR.parent / "scrappy.db"]:
            if candidate.exists():
                import shutil
                try:
                    shutil.copy(str(candidate), str(tmp_db_file))
                except Exception:
                    pass
                break
    DEFAULT_DB_URL = f"sqlite:///{tmp_db_file}"
    DEFAULT_UPLOAD_DIR = tmp_path / "uploads"
    DEFAULT_CERTS_DIR = tmp_path / "uploads" / "certificates"
else:
    DEFAULT_DB_URL = "sqlite:///./pragyan.db"
    DEFAULT_UPLOAD_DIR = BASE_DIR / "uploads"
    DEFAULT_CERTS_DIR = BASE_DIR / "uploads" / "certificates"


class Settings:
    """Central configuration for the Scrappy backend."""

    # ── Database ────────────────────────────────────────────────────────
    DATABASE_URL: str = os.getenv("DATABASE_URL", DEFAULT_DB_URL)

    # ── JWT ─────────────────────────────────────────────────────────────
    JWT_SECRET_KEY: str = os.getenv(
        "JWT_SECRET_KEY",
        secrets.token_urlsafe(64),  # Auto-generated if not set
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

    # ── File uploads ────────────────────────────────────────────────────
    UPLOAD_DIR: Path = DEFAULT_UPLOAD_DIR
    CERTIFICATES_DIR: Path = DEFAULT_CERTS_DIR
    MAX_UPLOAD_SIZE_BYTES: int = int(os.getenv("MAX_UPLOAD_SIZE_BYTES", str(10 * 1024 * 1024)))  # 10 MB

    # ── Encryption (Fernet) for license & test certificate files ─────────
    ENCRYPTION_KEY: str = os.getenv(
        "ENCRYPTION_KEY",
        "6kfjYKM-PWu6aYvF_T6ijEdKUphdcLxIrSHe6ZN3Cnw=",
    )

    # ── Subscription & Commission Business Constants ────────────────────
    ANNUAL_SUBSCRIPTION_FEE: float = 2500.0  # INR 2,500 / year / company
    COMMISSION_THRESHOLD: float = 500000.0   # Strict threshold > INR 5,00,000
    COMMISSION_RATE: float = 0.005           # 0.5% total
    BUYER_COMMISSION_RATE: float = 0.0025    # 0.25%
    SELLER_COMMISSION_RATE: float = 0.0025   # 0.25%

    # ── Payment Gateway Integration ─────────────────────────────────────
    RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "rzp_test_scrappy_key")
    RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "scrappy_razorpay_secret")
    PAYMENT_GATEWAY_MODE: str = os.getenv("PAYMENT_GATEWAY_MODE", "test")

    # ── CORS ────────────────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = ["*"]


settings = Settings()

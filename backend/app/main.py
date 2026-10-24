"""
Scrappy — Industrial Waste & Scrap Exchange Platform.

FastAPI application entry point. Configures CORS, registers routers,
and initializes database tables and quality requirements on startup.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.utils.file_storage import ensure_upload_dir

# Import routers
from app.routers import (
    admin,
    auth,
    companies,
    inventory,
    marketplace,
    materials,
    notifications,
    quality,
    subscriptions,
    trades,
)

# Import models so Base.metadata knows about all tables
import app.models  # noqa: F401
from app.services.quality_service import seed_default_quality_requirements


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle for the FastAPI application."""
    # ── Startup ─────────────────────────────────────────────────────
    Base.metadata.create_all(bind=engine)
    ensure_upload_dir()

    # Seed default material testing requirements
    db = SessionLocal()
    try:
        seed_default_quality_requirements(db)
    finally:
        db.close()

    yield
    # ── Shutdown ────────────────────────────────────────────────────


app = FastAPI(
    title="Scrappy — Industrial Waste & Scrap Exchange",
    description=(
        "Platform for connecting industrial waste generators with "
        "potential consumers, enabling efficient by-product exchange "
        "and promoting circular economy practices."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS middleware ────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register routers ───────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(companies.router)
app.include_router(materials.router)
app.include_router(marketplace.router)
app.include_router(inventory.router)
app.include_router(trades.router)
app.include_router(notifications.router)
app.include_router(subscriptions.router)
app.include_router(quality.router)
app.include_router(admin.router)


@app.get("/", tags=["Health"])
def health_check():
    """Root health-check endpoint."""
    return {"status": "ok", "service": "Scrappy Backend", "version": "1.0.0"}

"""
Scrappy — Industrial Waste & Scrap Exchange Platform.

FastAPI application entry point. Configures CORS, registers routers,
and creates database tables on startup (dev convenience).
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
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
    trades,
)

# Import models so Base.metadata knows about all tables
import app.models  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle for the FastAPI application."""
    # ── Startup ─────────────────────────────────────────────────────
    # Create all tables (dev convenience — Alembic handles migrations in production).
    Base.metadata.create_all(bind=engine)

    # Ensure the uploads directory exists
    ensure_upload_dir()

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

# ── CORS middleware (allow all for development) ─────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
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
app.include_router(admin.router)


@app.get("/", tags=["Health"])
def health_check():
    """Root health-check endpoint."""
    return {"status": "ok", "service": "Scrappy Backend", "version": "1.0.0"}

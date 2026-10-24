import os
import sys
import shutil
import traceback
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, PlainTextResponse

# Create the primary FastAPI application immediately
app = FastAPI(title="Scrappy Serverless API")

initialization_error = None
db_status = {}

try:
    API_DIR = Path(__file__).resolve().parent
    if str(API_DIR) not in sys.path:
        sys.path.insert(0, str(API_DIR))

    # Safe /tmp SQLite initialization
    tmp_dir = Path("/tmp")
    tmp_db = tmp_dir / "pragyan.db"
    tmp_uploads = tmp_dir / "uploads" / "certificates"
    try:
        tmp_uploads.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass

    if not tmp_db.exists():
        for candidate in [
            API_DIR / "pragyan.db",
            API_DIR.parent / "backend" / "pragyan.db",
            API_DIR.parent / "pragyan.db",
        ]:
            if candidate.exists():
                try:
                    shutil.copy2(str(candidate), str(tmp_db))
                    db_status["copied_from"] = str(candidate)
                    break
                except Exception as e:
                    db_status["copy_error"] = str(e)

    db_status["tmp_db_exists"] = tmp_db.exists()
    db_status["tmp_db_size"] = tmp_db.stat().st_size if tmp_db.exists() else 0

    os.environ["DATABASE_URL"] = f"sqlite:///{tmp_db}"
    os.environ["UPLOAD_DIR"] = str(tmp_dir / "uploads")
    os.environ["CERTIFICATES_DIR"] = str(tmp_uploads)

    # Import the main backend app
    from app.main import app as backend_app

    # Mount all backend routes into this app
    for route in backend_app.routes:
        app.routes.append(route)

except Exception as e:
    initialization_error = traceback.format_exc()


@app.get("/api/test")
@app.get("/test")
def test_endpoint():
    return {
        "status": "online",
        "message": "Scrappy Python Serverless Engine on Vercel is active",
        "initialization_error": bool(initialization_error),
        "db": db_status
    }


@app.get("/api/error")
@app.get("/error")
def error_endpoint():
    if initialization_error:
        return PlainTextResponse(initialization_error, status_code=500)
    return PlainTextResponse("No initialization error recorded! Backend imported cleanly.", status_code=200)

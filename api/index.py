import os
import sys
import shutil
import traceback
from pathlib import Path

# Resolve directory paths so app package is discovered
API_DIR = Path(__file__).resolve().parent
if str(API_DIR) not in sys.path:
    sys.path.insert(0, str(API_DIR))

# Serverless environment: AWS Lambda/Vercel /tmp is the only writable directory
tmp_dir = Path("/tmp")
tmp_db = tmp_dir / "pragyan.db"
tmp_uploads = tmp_dir / "uploads" / "certificates"
try:
    tmp_uploads.mkdir(parents=True, exist_ok=True)
except Exception:
    pass

# Copy pre-seeded database to writable /tmp on cold start if not already there
if not tmp_db.exists() or tmp_db.stat().st_size == 0:
    for candidate in [
        API_DIR / "pragyan.db",
        API_DIR.parent / "backend" / "pragyan.db",
        API_DIR.parent / "pragyan.db",
        API_DIR.parent / "api" / "pragyan.db",
    ]:
        if candidate.exists() and candidate.stat().st_size > 0:
            try:
                shutil.copy2(str(candidate), str(tmp_db))
                break
            except Exception as e:
                print(f"Error copying db: {e}")

os.environ["DATABASE_URL"] = f"sqlite:///{tmp_db}"
os.environ["UPLOAD_DIR"] = str(tmp_dir / "uploads")
os.environ["CERTIFICATES_DIR"] = str(tmp_uploads)

try:
    from app.main import app
    
    @app.middleware("http")
    async def catch_exceptions_middleware(request, call_next):
        try:
            return await call_next(request)
        except Exception as e:
            tb = traceback.format_exc()
            from starlette.responses import PlainTextResponse
            return PlainTextResponse(f"BACKEND_RUNTIME_EXCEPTION:\n{tb}", status_code=500)

except Exception as err:
    import traceback
    err_tb = traceback.format_exc()
    from starlette.applications import Starlette
    from starlette.responses import PlainTextResponse
    from starlette.routing import Route

    async def fallback_route(request):
        return PlainTextResponse(f"BACKEND_IMPORT_ERROR:\n{err_tb}", status_code=500)

    app = Starlette(routes=[Route("/{path:path}", fallback_route, methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])])

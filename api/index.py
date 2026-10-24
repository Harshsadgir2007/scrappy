import os
import sys
import shutil
import traceback
from pathlib import Path

# Set up paths so app package is discoverable
API_DIR = Path(__file__).resolve().parent
ROOT_DIR = API_DIR.parent
for p in [str(API_DIR), str(ROOT_DIR), str(ROOT_DIR / "backend")]:
    if p not in sys.path:
        sys.path.insert(0, p)

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
        ROOT_DIR / "backend" / "pragyan.db",
        ROOT_DIR / "pragyan.db",
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
os.environ["VERCEL"] = "1"

# Import live FastAPI app
from app.main import app as fastapi_app

# Path-fixing ASGI middleware to handle Vercel rewrites seamlessly
class VercelPathMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope.get("type") == "http":
            path = scope.get("path", "")
            if path in ["/api/index.py", "/api/index", "/api"]:
                headers = dict(scope.get("headers", []))
                matched_path = headers.get(b"x-matched-path", b"").decode("utf-8", errors="ignore")
                if matched_path and matched_path not in ["/api/index.py", "/api/index"]:
                    scope["path"] = matched_path
        await self.app(scope, receive, send)

app = VercelPathMiddleware(fastapi_app)
handler = app

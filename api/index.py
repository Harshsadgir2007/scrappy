import os
import sys
import shutil
from pathlib import Path

# Resolve project paths
API_DIR = Path(__file__).resolve().parent
ROOT_DIR = API_DIR.parent
BACKEND_DIR = ROOT_DIR / "backend"

for p in [str(BACKEND_DIR), str(ROOT_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

# Serverless environment handling: Copy pre-seeded database to writable /tmp
tmp_dir = Path("/tmp")
tmp_db = tmp_dir / "pragyan.db"
tmp_uploads = tmp_dir / "uploads" / "certificates"
tmp_uploads.mkdir(parents=True, exist_ok=True)

if not tmp_db.exists():
    for candidate in [
        ROOT_DIR / "pragyan.db",
        BACKEND_DIR / "pragyan.db",
        ROOT_DIR / "scrappy.db",
        BACKEND_DIR / "scrappy.db",
    ]:
        if candidate.exists():
            try:
                shutil.copy(str(candidate), str(tmp_db))
                break
            except Exception:
                pass

os.environ["DATABASE_URL"] = f"sqlite:///{tmp_db}"
os.environ["UPLOAD_DIR"] = str(tmp_dir / "uploads")
os.environ["CERTIFICATES_DIR"] = str(tmp_uploads)

# Import the live FastAPI app
from app.main import app

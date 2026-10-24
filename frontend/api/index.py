import os
import sys
import shutil
from pathlib import Path

# Resolve directory paths
API_DIR = Path(__file__).resolve().parent
if str(API_DIR) not in sys.path:
    sys.path.insert(0, str(API_DIR))

# Serverless environment handling: Copy pre-seeded database to writable /tmp
tmp_dir = Path("/tmp")
tmp_db = tmp_dir / "pragyan.db"
tmp_uploads = tmp_dir / "uploads" / "certificates"
tmp_uploads.mkdir(parents=True, exist_ok=True)

if not tmp_db.exists():
    for candidate in [
        API_DIR / "pragyan.db",
        API_DIR.parent / "pragyan.db",
        API_DIR.parent.parent / "pragyan.db",
        API_DIR.parent.parent / "backend" / "pragyan.db",
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

# Import the FastAPI app directly from app.main
from app.main import app

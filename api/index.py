import sys
import os
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.end_headers()
            self.wfile.write(b"=== VERCEL PYTHON DIAGNOSTIC PROBE ===\n")
            self.wfile.write(f"Python: {sys.version}\n".encode("utf-8"))
            self.wfile.write(f"CWD: {os.getcwd()}\n".encode("utf-8"))
            self.wfile.write(f"Path: {self.path}\n\n".encode("utf-8"))

            self.wfile.write(b"--- PACKAGE IMPORTS ---\n")
            for mod in [
                "fastapi",
                "uvicorn",
                "pydantic",
                "pydantic_settings",
                "email_validator",
                "sqlalchemy",
                "jwt",
                "bcrypt",
                "cryptography",
                "dotenv"
            ]:
                try:
                    m = __import__(mod)
                    ver = getattr(m, "__version__", "installed")
                    self.wfile.write(f"  [+] {mod}: {ver}\n".encode("utf-8"))
                except Exception as e:
                    self.wfile.write(f"  [-] {mod}: FAILED -> {e}\n".encode("utf-8"))

            self.wfile.write(b"\n--- DIRECTORY CONTENTS ---\n")
            self.wfile.write(f"  Root: {os.listdir('.')}\n".encode("utf-8"))
            if os.path.exists("api"):
                self.wfile.write(f"  api/: {os.listdir('api')}\n".encode("utf-8"))

            self.wfile.write(b"\n--- APP IMPORT TEST ---\n")
            try:
                api_dir = os.path.join(os.getcwd(), "api")
                if api_dir not in sys.path:
                    sys.path.insert(0, api_dir)
                import app.main
                self.wfile.write(b"  [+] import app.main: SUCCESSFUL!\n")
            except Exception as e:
                import traceback
                self.wfile.write(f"  [-] import app.main FAILED:\n{traceback.format_exc()}\n".encode("utf-8"))

        except Exception as outer_err:
            import traceback
            self.wfile.write(f"\nCRITICAL_ERROR:\n{traceback.format_exc()}".encode("utf-8"))

    def do_POST(self):
        return self.do_GET()

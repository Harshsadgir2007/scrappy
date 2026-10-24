import sys
import os
import json
import traceback
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        diag = {
            "python": sys.version,
            "cwd": os.getcwd(),
            "path": self.path,
            "files_here": os.listdir("."),
        }
        
        # Test imports step by step
        try:
            import fastapi
            diag["fastapi"] = fastapi.__version__
        except Exception:
            diag["fastapi_error"] = traceback.format_exc()
            
        try:
            import pydantic
            diag["pydantic"] = pydantic.__version__
        except Exception:
            diag["pydantic_error"] = traceback.format_exc()

        try:
            import email_validator
            diag["email_validator"] = "ok"
        except Exception:
            diag["email_validator_error"] = traceback.format_exc()

        try:
            # Add current dir to path and test app import
            if os.getcwd() not in sys.path:
                sys.path.insert(0, os.getcwd())
            api_dir = os.path.dirname(os.path.abspath(__file__))
            if api_dir not in sys.path:
                sys.path.insert(0, api_dir)
            import app.main
            diag["app_main"] = "ok"
        except Exception:
            diag["app_main_error"] = traceback.format_exc()

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(diag, indent=2).encode('utf-8'))

    def do_POST(self):
        return self.do_GET()

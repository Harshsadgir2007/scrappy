import sys
import os
import json
import traceback
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain; charset=utf-8')
        self.end_headers()
        
        try:
            vc_file = "vc__handler__python.py"
            if os.path.exists(vc_file):
                with open(vc_file, "r", encoding="utf-8", errors="ignore") as f:
                    self.wfile.write(f"=== {vc_file} ===\n".encode())
                    self.wfile.write(f.read().encode())
            else:
                self.wfile.write(b"vc__handler__python.py NOT FOUND\n")
        except Exception as e:
            self.wfile.write(f"Error reading vc handler: {e}\n".encode())

    def do_POST(self):
        return self.do_GET()

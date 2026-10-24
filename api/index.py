import sys
import os
import inspect
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain; charset=utf-8')
        self.end_headers()
        
        try:
            import vercel_runtime.vc_init as vc_init
            src = inspect.getsource(vc_init)
            self.wfile.write(f"=== vercel_runtime.vc_init ===\n{src}".encode())
        except Exception as e:
            self.wfile.write(f"Error inspecting vc_init: {e}\n".encode())

    def do_POST(self):
        return self.do_GET()

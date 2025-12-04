#!/usr/bin/env python3
"""
Simple HTTP server with CORS support for serving audio files
"""
import http.server
import socketserver
import os
from urllib.parse import urlparse

class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # Change to the test-music directory
        os.chdir(os.path.join(os.path.dirname(__file__)))
        super().__init__(*args, **kwargs)
    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'ngrok-skip-browser-warning, Content-Type')
        self.send_header('Access-Control-Max-Age', '3600')
        # Add ngrok skip header response (optional, helps with ngrok warning)
        self.send_header('ngrok-skip-browser-warning', 'true')
        super().end_headers()

    def do_OPTIONS(self):
        """Handle preflight OPTIONS request"""
        self.send_response(200)
        self.end_headers()

    def log_message(self, format, *args):
        """Override to reduce log noise"""
        return

if __name__ == '__main__':
    PORT = 8000
    Handler = CORSRequestHandler
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Server running on http://localhost:{PORT}")
        print(f"Serving directory: test-music")
        httpd.serve_forever()


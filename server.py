#!/usr/bin/env python3
import http.server
import socketserver
import os
import webbrowser
from pathlib import Path

# Change to the project directory
os.chdir(Path(__file__).parent)

# Define the handler
class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

# Set up the server
PORT = 8000
Handler = MyHTTPRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Server running at http://localhost:{PORT}")
    print(f"Preview available at: http://localhost:{PORT}/preview.html")
    
    # Try to open the browser automatically
    try:
        webbrowser.open(f'http://localhost:{PORT}/preview.html')
    except:
        pass
    
    httpd.serve_forever()

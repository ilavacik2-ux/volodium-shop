#!/usr/bin/env python3
"""
Volodium Parfum - High-Performance Local Dev Server
Multithreaded HTTP server with zero-cache headers for instant mobile and desktop previews.
"""

import os
import sys
import socket
from http.server import HTTPServer, SimpleHTTPRequestHandler
from socketserver import ThreadingMixIn

PORT = 3000
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class ThreadingSimpleServer(ThreadingMixIn, HTTPServer):
    allow_reuse_address = True
    daemon_threads = True

class NoCacheDevHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def end_headers(self):
        # Force fresh content during development
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def log_message(self, format, *args):
        # Clean brief console logging
        sys.stderr.write(f"[{self.log_date_time_string()}] {args[0]} {args[1]}\n")

def get_wifi_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'

def run():
    wifi_ip = get_wifi_ip()
    server_address = ('0.0.0.0', PORT)
    httpd = ThreadingSimpleServer(server_address, NoCacheDevHandler)
    
    print("\n" + "═"*60)
    print("✨ VOLODIUM PARFUM — LIFESTYLE ATELIER DEV SERVER")
    print("═"*60)
    print(f"👉 Local (Mac):    http://localhost:{PORT}")
    print(f"👉 Local (127):    http://127.0.0.1:{PORT}")
    print(f"👉 Mobile (Wi-Fi): http://{wifi_ip}:{PORT}")
    print("═"*60)
    print(f"📂 Root Directory: {BASE_DIR}")
    print("⚡ Multithreading:  ACTIVE (concurrent assets)")
    print("🔄 Cache Policy:    NO-CACHE (live edits appear instantly)")
    print("═"*60 + "\n")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Dev server stopped cleanly.")
        httpd.server_close()

if __name__ == '__main__':
    run()

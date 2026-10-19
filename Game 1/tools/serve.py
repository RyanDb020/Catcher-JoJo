"""Lokale webserver voor het testen van de game (zonder cache).

Gebruik (vanuit de map "Game 1"):
    python tools/serve.py          -> http://localhost:8000
    python tools/serve.py 5517     -> andere poort

Anders dan "python -m http.server" zegt deze server tegen de browser dat
hij niets mag bewaren. Zo zie je na elke wijziging meteen de nieuwe code.
"""
import functools
import http.server
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get("PORT", 8000))
    handler = functools.partial(NoCacheHandler, directory=ROOT)
    with http.server.ThreadingHTTPServer(("127.0.0.1", port), handler) as server:
        print(f"JoJo Catcher draait op http://localhost:{port}  (Ctrl+C om te stoppen)")
        server.serve_forever()

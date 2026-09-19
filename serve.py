"""Static file server for the Wardog Range page.

Serves this directory on 127.0.0.1:<port>, so Caddy can expose it at
http://wardog-range.localhost/. This is the local path only -- the public site
at https://wardogs.dudgy.net/ is served by Vercel and does not touch this
machine. Port comes from C:\\projects\\homepanel\\ports.toml
(`ports get wardog-range`) -- do not hardcode a different one.

Serves index.html, which is generated: run `python build.py` first.
"""

import http.server
import os
import socketserver
import sys

DEFAULT_PORT = 4120
ROOT = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        # The page is edited in place and pushed straight to the tunnel, so a
        # cached copy is always the wrong copy.
        self.send_header("Cache-Control", "no-cache, must-revalidate")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("%s %s\n" % (self.log_date_time_string(), fmt % args))
        sys.stderr.flush()


class Server(socketserver.ThreadingTCPServer):
    # Fail loudly if something already holds the port rather than stealing it.
    allow_reuse_address = False
    daemon_threads = True


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PORT
    with Server(("127.0.0.1", port), Handler) as httpd:
        sys.stderr.write("wardog-range: serving %s on 127.0.0.1:%d\n" % (ROOT, port))
        sys.stderr.flush()
        httpd.serve_forever()


if __name__ == "__main__":
    main()

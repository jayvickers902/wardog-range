"""Static file server for the Wardog Range page.

Serves this directory on 127.0.0.1:<port>, so Caddy can expose it at
http://wardog-range.localhost/. The Cloudflare tunnel `wardogs` forwards
https://wardogs.dudgy.net/ here too, so whatever is in this directory is the
public site -- rebuilding index.html publishes it (README, "Serving").
Port comes from the ports registry (`ports get wardog-range`)
-- do not hardcode a different one.

Serves index.html, which is generated: run `python build.py` first.
"""

import http.server
import os
import socketserver
import sys
import urllib.parse

DEFAULT_PORT = 4120
ROOT = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        # The page is edited in place and pushed straight to the tunnel, so a
        # cached copy is always the wrong copy. Map imagery is the exception:
        # the page asks for it as maps/...?v=<hash of every map file>, and a
        # recut changes the hash, so one of those URLs never changes what it
        # returns. Marking it immutable lets browsers keep it and lets
        # Cloudflare's edge answer for it without coming back down the tunnel.
        split = urllib.parse.urlsplit(self.path)
        if split.path.startswith("/maps/") and "v=" in split.query:
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        else:
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
    # The default backlog is 5. A map download opens a dozen or more
    # connections at once, and every one past the backlog came back to the
    # player as a 502 from the tunnel.
    request_queue_size = 128


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PORT
    with Server(("127.0.0.1", port), Handler) as httpd:
        sys.stderr.write("wardog-range: serving %s on 127.0.0.1:%d\n" % (ROOT, port))
        sys.stderr.flush()
        httpd.serve_forever()


if __name__ == "__main__":
    main()

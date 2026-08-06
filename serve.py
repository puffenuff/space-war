import functools
import http.server

Handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory="space-war")
http.server.ThreadingHTTPServer(("0.0.0.0", 8420), Handler).serve_forever()

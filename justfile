run:
    #!/usr/bin/env python3
    from http.server import SimpleHTTPRequestHandler, test

    # Disables caching so browsers do not mix stale and updated ES modules across reloads.
    class Fresh(SimpleHTTPRequestHandler):
        def end_headers(self):
            self.send_header('Cache-Control', 'no-store')
            super().end_headers()

        def send_error(self, code, message=None, explain=None):
            if code != 404:
                return super().send_error(code, message, explain)
            with open('404.html', 'rb') as page:
                body = page.read()
            self.send_response(404)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            if self.command != 'HEAD':
                self.wfile.write(body)

    test(Fresh, port=3333, bind='127.0.0.1')

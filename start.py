import http.server
import socketserver
import webbrowser
import threading
import time
import os

PORT = 0
# Ensure we serve the directory where the script is located
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def start_server():
    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            assigned_port = httpd.server_address[1]
            print(f"Serving TwistRouting UI at http://localhost:{assigned_port}")
            # Save the port so the main thread can use it for webbrowser
            global ACTUAL_PORT
            ACTUAL_PORT = assigned_port
            httpd.serve_forever()
    except OSError as e:
        print(f"Error starting server: {e}")
        os._exit(1)

ACTUAL_PORT = None

if __name__ == "__main__":
    print("Starting local server...")
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    
    # Wait until the port is assigned
    while ACTUAL_PORT is None:
        time.sleep(0.1)
    
    url = f"http://localhost:{ACTUAL_PORT}"
    print(f"Opening browser to {url} ...")
    webbrowser.open(url)
    
    print("Press Ctrl+C to stop the server.")
    try:
        # Keep the main thread alive so the daemon thread keeps running
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nServer stopped.")

"""deploy-next.py — deploy the A.8 TypeScript side build ALONGSIDE the live app.

Side-by-side cutover-free deploy (see docs/TYPESCRIPT-WASM-REPORT.md §A.8):
uploads ONLY the built Vite artifacts to the site root, so the new app is
reachable at  https://<host>/index.next.html  while the live `index.htm` (and its
service worker / `js/` shell) stay exactly as they are. Nothing here touches the
live deploy path — `uploadftp.py` remains the tool for the production app.

Layout produced on the server:
    /index.next.html          ← built entry (references ./assets/…)
    /assets/index.next-<hash>.js
    /Routes/**                ← SHARED, already on the server (deployed by uploadftp.py)

Run:
    npm run build      # produce dist/  (relative base, content-hashed)
    python3 deploy-next.py

Reuses the same .env (FTP_HOST/USER/PASS) and Explicit-FTPS connection as
uploadftp.py. Reversible: delete /index.next.html + /assets on the server to undo.
"""

import os
import sys
import ftplib

DIST_DIR = 'dist'


def load_env():
    env_vars = {}
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    env_vars[key] = value.strip('"\'')
    return env_vars


def collect_dist(dist_path):
    """Every file under dist/, as (local_abs, remote_rel) with the dist/ prefix
    stripped so it lands at the site root (dist/index.next.html → /index.next.html)."""
    out = []
    for root, dirs, files in os.walk(dist_path):
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        for name in files:
            local = os.path.join(root, name)
            remote_rel = os.path.relpath(local, dist_path).replace(os.sep, '/')
            out.append((local, remote_rel))
    return out


def ensure_remote_dir(ftp, remote_dir):
    """Create nested remote directories as needed, starting from root."""
    ftp.cwd('/')
    if not remote_dir:
        return
    for part in remote_dir.split('/'):
        if not part:
            continue
        try:
            ftp.mkd(part)
        except ftplib.error_perm:
            pass  # already exists
        ftp.cwd(part)


def main():
    project_dir = os.path.dirname(os.path.abspath(__file__))
    dist_path = os.path.join(project_dir, DIST_DIR)
    if not os.path.isdir(dist_path):
        print(f"No {DIST_DIR}/ found. Run `npm run build` first.")
        sys.exit(1)

    files = collect_dist(dist_path)
    if not any(r == 'index.next.html' for _, r in files):
        print(f"{DIST_DIR}/index.next.html missing — did the build succeed?")
        sys.exit(1)

    env = load_env()
    FTP_HOST = env.get('FTP_HOST', '') or "twist.like.audio"
    FTP_USER = env.get('FTP_USER', '')
    FTP_PASS = env.get('FTP_PASS', '')

    print(f"Connecting to FTP server {FTP_HOST} (Explicit FTPS) as {FTP_USER}...")
    try:
        ftp = ftplib.FTP_TLS(FTP_HOST)
        ftp.login(user=FTP_USER, passwd=FTP_PASS)
        ftp.prot_p()
        print("Login successful! Deploying side build (index.next.html + assets/)...")

        # assets first, then the entry HTML, so the page never references a
        # not-yet-uploaded bundle during the brief upload window.
        files.sort(key=lambda fr: (fr[1] == 'index.next.html', fr[1]))
        for local, remote_rel in files:
            remote_dir, filename = os.path.split(remote_rel)
            ensure_remote_dir(ftp, remote_dir)
            print(f"Uploading {remote_rel}...")
            with open(local, 'rb') as f:
                ftp.storbinary(f'STOR {filename}', f)

        ftp.quit()
        print("Side build deployed → /index.next.html (live app untouched).")
    except Exception as e:
        print(f"FTP Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

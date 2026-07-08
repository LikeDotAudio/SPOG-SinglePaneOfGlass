"""deploy.py — build the TypeScript app and deploy it (TS-only, no legacy js/).

This is the single production deploy. It supersedes the old `uploadftp.py`
(js/ shell + JSON app) and `deploy-next.py` (side build). See the A.8 cutover in
docs/TYPESCRIPT-WASM-REPORT.md.

What it does, over one Explicit-FTPS connection:
  1. `npm run build`               → dist/ (content-hashed bundle + entry HTML)
  2. refresh Routes/** index.json  → the TS app discovers the data tree from these
                                      manifests on any static host (see
                                      src/platform/discovery.ts). This is the ONLY
                                      JSON that ships: routing DATA, not app code.
  3. upload:
        dist/<entry>.html  → /index.htm     (the site's DEFAULT document — this is
                                             the cutover: the root URL now serves
                                             the TypeScript app)
        dist/assets/**     → /assets/**      (stale /assets cleared first, since
                                             the bundle filename is content-hashed)
        Routes/**          → /Routes/**      (data + manifests)
  4. remove the retired legacy app from the server: js/ and the dev
     index.next.html entry (sw.js is deliberately KEPT — see LEGACY_REMOTE).

Routes upload is incremental by default (git diff); the small app bundle is always
re-uploaded. When the working tree is CLEAN (nothing to commit), the incremental
diff is empty, so the deploy pushes the FULL Routes tree instead of skipping — a
committed state always publishes everything. `--all` forces a full push regardless.

Run:
    python3 deploy.py            # CUTOVER: publish as /index.htm + delete legacy js/
    python3 deploy.py --next     # SIDE-BY-SIDE: publish as /index.next.html, leave the
                                 #   live /index.htm + js/ untouched (safe until parity)
    python3 deploy.py --all      # also upload the ENTIRE Routes tree (use on first
                                 #   cutover, or after committing files never deployed)
    python3 deploy.py --no-build # deploy the existing dist/ without rebuilding
    python3 deploy.py --no-clean # skip removing the legacy js/ shell from the server
    python3 deploy.py --fresh    # MIRROR: full upload (implies --all), then walk the
                                 #   whole server and delete every file this deploy
                                 #   didn't produce (dead bundles, retired icons/PNGs,
                                 #   moved Routes folders…). Dot-entries (.htaccess,
                                 #   .well-known) are never touched.

Uses .env for FTP_HOST / FTP_USER / FTP_PASS (Explicit FTPS).

The helpers live in the `deploy/` package (env, build, manifests, routes, ftp,
mqtt_stamp); this file keeps the CLI + orchestration only.
"""

import os
import sys
import subprocess
import ftplib

from deploy.constants import DIST_DIR, REMOTE_ENTRY, LEGACY_REMOTE
from deploy.env import load_env
from deploy.build import run_build, find_entry, collect_app_files
from deploy.manifests import generate_manifests
from deploy.routes import is_tree_clean, get_changed_routes, get_all_routes
from deploy.ftp import upload_file, remote_rmtree, fresh_sweep
from deploy.mqtt_stamp import publish_build_stamp


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    sys.path.insert(0, script_dir) # ensure it finds the deploy module
    args = sys.argv[1:]
    fresh = '--fresh' in args
    force_all = fresh or any(a in ('--all', '-a', 'full') for a in args)
    no_build = '--no-build' in args
    no_clean = '--no-clean' in args
    # Side-by-side: publish to /index.next.html and leave the live /index.htm + js/
    # UNTOUCHED (no cutover, no /assets wipe, no legacy removal). This is the safe
    # deploy to use until the TS build reaches parity.
    side_by_side = '--next' in args
    remote_entry = 'index.next.html' if side_by_side else REMOTE_ENTRY

    # 1) Build.
    if not no_build:
        try:
            run_build(project_dir)
        except subprocess.CalledProcessError:
            print("Build failed — aborting deploy.")
            sys.exit(1)

    dist_path = os.path.join(project_dir, DIST_DIR)
    entry = find_entry(dist_path) if os.path.isdir(dist_path) else None
    if not entry:
        print(f"No built entry HTML in {DIST_DIR}/. Run `npm run build` first.")
        sys.exit(1)
    app_files = collect_app_files(dist_path, entry, remote_entry)

    # 2) Manifests + Routes upload set.
    generate_manifests(project_dir)
    if force_all:
        print("Full Routes upload requested (--all).")
        routes_upload, routes_delete = get_all_routes(project_dir), []
    else:
        routes_upload, routes_delete = get_changed_routes(project_dir)
        if not routes_upload and not routes_delete:
            # A clean working tree (nothing to commit) makes the incremental git
            # diff empty — but the committed data still needs to reach the server.
            # So when there's nothing to commit, push EVERYTHING (full Routes tree)
            # rather than skipping. A DIRTY tree with no *Routes* changes genuinely
            # has no data to send, so that stays a no-op.
            if is_tree_clean(project_dir):
                print("Nothing to commit — pushing the full Routes tree.")
                routes_upload, routes_delete = get_all_routes(project_dir), []
            else:
                print("No Routes changes — data already on server (use --all to force).")

    # 3) Connect + deploy.
    env = load_env()
    FTP_HOST = env.get('FTP_HOST', '') or "spog.like.audio"
    FTP_USER = env.get('FTP_USER', '')
    FTP_PASS = env.get('FTP_PASS', '')

    print(f"Connecting to {FTP_HOST} (Explicit FTPS) as {FTP_USER}...")
    try:
        ftp = ftplib.FTP_TLS(FTP_HOST)
        ftp.login(user=FTP_USER, passwd=FTP_PASS)
        ftp.prot_p()
        print("Login successful.")

        # App: clear stale hashed assets (cutover only — side-by-side keeps /assets
        # so the live app's logos and any other bundle survive), upload the new
        # bundle, then the entry HTML LAST so the page never references a
        # not-yet-uploaded bundle.
        if not side_by_side:
            print("Clearing stale /assets...")
            remote_rmtree(ftp, 'assets')
        print(f"Deploying app ({len(app_files)} file(s)); {entry} → /{remote_entry}:")
        for local, remote in sorted(app_files, key=lambda lr: (lr[1] == remote_entry, lr[1])):
            upload_file(ftp, local, remote)

        # Data.
        if routes_upload:
            print(f"Uploading {len(routes_upload)} Routes file(s):")
            for rel in sorted(routes_upload):
                upload_file(ftp, os.path.join(project_dir, rel), rel)
        for rel in routes_delete:
            print(f"Deleting remote {rel}...")
            try:
                ftp.cwd('/')
                ftp.delete(rel)
            except ftplib.error_perm as e:
                print(f"  could not delete {rel}: {e}")

        # Cleanup: remove the retired legacy js/ app from the server (cutover only).
        if not no_clean and not side_by_side:
            print("Removing retired legacy app (js/, dev entry — sw.js kept as kill-switch):")
            for path in LEGACY_REMOTE:
                remote_rmtree(ftp, path)

        # Fresh mirror: everything current is uploaded above — anything left on
        # the server that this deploy didn't produce is dead. Sweep it.
        if fresh and not side_by_side:
            print("Fresh sweep — deleting server files this deploy didn't produce:")
            expected = {remote for _, remote in app_files} | set(routes_upload)
            fresh_sweep(ftp, expected)

        ftp.quit()

        # Announce the deploy on the bus (retained; best-effort).
        publish_build_stamp(project_dir)

        if side_by_side:
            print(f"\nSide-by-side deploy complete → https://{FTP_HOST}/index.next.html "
                  f"(live https://{FTP_HOST}/ + js/ untouched).")
        else:
            print(f"\nDeploy complete → https://{FTP_HOST}/  now serves the TypeScript app.")
    except Exception as e:
        print(f"FTP Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

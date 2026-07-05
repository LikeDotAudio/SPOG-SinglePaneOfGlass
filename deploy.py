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
"""

import os
import sys
import json
import subprocess
import ftplib

DIST_DIR = 'dist'
MANIFEST_ROOTS = ['Routes']          # folders that get an index.json manifest
REMOTE_ENTRY = 'index.htm'           # site default document (the cutover target)

# Legacy artifacts to remove from the server on deploy (the retired js/ app).
# NOTE: sw.js is intentionally KEPT — it's now a kill-switch worker that evicts the
# old cache-first SW from returning browsers. Deleting it would strand those clients
# on the stale cache (a 404 on the SW update check does NOT unregister it).
LEGACY_REMOTE = ['js', 'index.next.html']


# ── .env ────────────────────────────────────────────────────────────────────
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


# ── build ─────────────────────────────────────────────────────────────────--
def run_build(project_dir):
    print("Building TypeScript app (npm run build)...")
    subprocess.run(['npm', 'run', 'build'], cwd=project_dir, check=True)


def find_entry(dist_path):
    """The built entry HTML at the dist/ root (index.next.html or index.html)."""
    for name in ('index.next.html', 'index.html'):
        if os.path.isfile(os.path.join(dist_path, name)):
            return name
    return None


def collect_app_files(dist_path, entry_name, remote_entry):
    """Files under dist/ as (local_abs, remote_rel). The entry HTML is remapped to
    `remote_entry` (/index.htm for a cutover, /index.next.html side-by-side);
    everything else keeps its dist-relative path."""
    out = []
    for root, dirs, files in os.walk(dist_path):
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        for name in files:
            local = os.path.join(root, name)
            rel = os.path.relpath(local, dist_path).replace(os.sep, '/')
            remote = remote_entry if rel == entry_name else rel
            out.append((local, remote))
    return out


# ── manifests (routing DATA discovery) ───────────────────────────────────────
# ICON-face tile folders (assets/icons/*; legacy Routes/*/icons): UPLOADED like any asset, but hidden
# from the discovery manifests so the app never renders them as categories.
# (Legacy dot-named variants kept for back-compat with older checkouts.)
ICON_ASSET_DIRS = {'icons', '.icons', '.icon'}


def write_manifest(dirpath):
    """Write index.json listing this folder's immediate children (dirs end '/')."""
    entries = []
    for name in sorted(os.listdir(dirpath)):
        if name == 'index.json' or name.startswith('.') or name in ICON_ASSET_DIRS:
            continue
        full = os.path.join(dirpath, name)
        if os.path.isdir(full):
            entries.append(name + '/')
        elif name.lower().endswith('.json'):
            entries.append(name)
    with open(os.path.join(dirpath, 'index.json'), 'w') as f:
        json.dump(entries, f, indent=2)
        f.write('\n')


def generate_manifests(project_dir):
    """Create an index.json in every folder under the manifest roots (icon asset
    folders excluded — they carry tiles, not routing data)."""
    count = 0
    for root in MANIFEST_ROOTS:
        root_path = os.path.join(project_dir, root)
        if not os.path.isdir(root_path):
            continue
        for dirpath, dirnames, _ in os.walk(root_path):
            dirnames[:] = [d for d in dirnames if not d.startswith('.') and d not in ICON_ASSET_DIRS]
            write_manifest(dirpath)
            count += 1
    print(f"Generated {count} manifest(s).")


# ── Routes upload set (incremental) ──────────────────────────────────────────
def _under_roots(rel_path):
    parts = rel_path.split('/')
    if parts[0] not in MANIFEST_ROOTS:
        return False
    # Dot segments never upload — except the legacy dot-named icon folders.
    return not any(p.startswith('.') and p not in ICON_ASSET_DIRS for p in parts)


def is_tree_clean(project_dir):
    """True if `git status` reports nothing to commit (a clean working tree)."""
    result = subprocess.run(
        ['git', '-C', project_dir, 'status', '--porcelain'],
        capture_output=True, text=True, check=True
    )
    return not result.stdout.strip()


def get_changed_routes(project_dir):
    """(to_upload, to_delete) for Routes/** only, from git status.

    Handles -z porcelain including renames/copies (two NUL-separated paths).
    """
    result = subprocess.run(
        # -uall: list every untracked FILE — the default collapses an untracked
        # directory (e.g. a fresh .icons/) into one dir entry, which then fails
        # the isfile() check and silently uploads nothing from it.
        ['git', '-C', project_dir, 'status', '--porcelain', '-z', '-uall'],
        capture_output=True, text=True, check=True
    )
    tokens = result.stdout.split('\0')
    to_upload, to_delete = [], []
    i = 0
    while i < len(tokens):
        entry = tokens[i]
        if not entry:
            i += 1
            continue
        status = entry[:2]
        path = entry[3:]
        if 'R' in status or 'C' in status:
            orig = tokens[i + 1] if i + 1 < len(tokens) else ''
            i += 2
            if orig and _under_roots(orig):
                to_delete.append(orig)
            if _under_roots(path) and os.path.isfile(os.path.join(project_dir, path)):
                to_upload.append(path)
            continue
        i += 1
        if not _under_roots(path):
            continue
        if 'D' in status:
            to_delete.append(path)
        elif os.path.isfile(os.path.join(project_dir, path)):
            to_upload.append(path)
    return to_upload, to_delete


def get_all_routes(project_dir):
    """Every file under the manifest roots (relative paths)."""
    out = []
    for root in MANIFEST_ROOTS:
        root_path = os.path.join(project_dir, root)
        for dirpath, dirs, files in os.walk(root_path):
            dirs[:] = [d for d in dirs if not d.startswith('.') or d in ICON_ASSET_DIRS]
            for name in files:
                if name.startswith('.'):
                    continue
                out.append(os.path.relpath(os.path.join(dirpath, name), project_dir)
                           .replace(os.sep, '/'))
    return out


# ── FTP helpers ──────────────────────────────────────────────────────────────
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


def upload_file(ftp, local, remote_rel):
    remote_dir, filename = os.path.split(remote_rel)
    ensure_remote_dir(ftp, remote_dir)
    print(f"  ↑ {remote_rel}")
    with open(local, 'rb') as f:
        ftp.storbinary(f'STOR {filename}', f)


def remote_list(ftp, path):
    """[(name, is_dir)] children of /<path>. Dot-entries are skipped — server
    config (.htaccess, .well-known/) is never ours to manage. Prefers MLSD;
    falls back to NLST + a cwd probe on servers without it."""
    try:
        return [(name, facts.get('type') == 'dir')
                for name, facts in ftp.mlsd(path or '')
                if not name.startswith('.') and facts.get('type') not in ('cdir', 'pdir')]
    except (ftplib.error_perm, AttributeError):
        pass
    try:
        ftp.cwd('/')
        if path:
            ftp.cwd(path)
        names = ftp.nlst()
    except ftplib.error_perm:
        return []
    out = []
    for n in names:
        base = n.rsplit('/', 1)[-1]
        if base in ('', '.', '..') or base.startswith('.'):
            continue
        child = f"{path}/{base}" if path else base
        try:
            ftp.cwd('/')
            ftp.cwd(child)
            out.append((base, True))
        except ftplib.error_perm:
            out.append((base, False))
    return out


def fresh_sweep(ftp, expected):
    """Delete every remote file not in `expected` (remote-relative paths), then
    prune directories left empty. The upload runs FIRST, so everything current
    is already on the server — whatever this removes is dead by definition."""
    removed = 0

    def walk(path):
        nonlocal removed
        for name, is_dir in remote_list(ftp, path):
            rel = f"{path}/{name}" if path else name
            if is_dir:
                walk(rel)
                if not remote_list(ftp, rel):        # emptied → prune
                    try:
                        ftp.cwd('/')
                        ftp.rmd(rel)
                        print(f"  ✗ {rel}/")
                        removed += 1
                    except ftplib.error_perm as e:
                        print(f"  could not remove {rel}/: {e}")
            elif rel not in expected:
                try:
                    ftp.cwd('/')
                    ftp.delete(rel)
                    print(f"  ✗ {rel}")
                    removed += 1
                except ftplib.error_perm as e:
                    print(f"  could not delete {rel}: {e}")

    walk('')
    print(f"Fresh sweep: {removed} dead entr{'y' if removed == 1 else 'ies'} removed.")


def remote_rmtree(ftp, path):
    """Delete a remote file or directory tree at /<path>. Silent if absent."""
    # Directory? (can we cwd into it?)
    try:
        ftp.cwd('/')
        ftp.cwd(path)
    except ftplib.error_perm:
        # Not a directory — try to delete as a file.
        try:
            ftp.cwd('/')
            ftp.delete(path)
            print(f"  ✗ {path}")
        except ftplib.error_perm:
            pass  # doesn't exist
        return
    # Directory: recurse into children (basename of each nlst entry), then rmd.
    try:
        children = ftp.nlst()
    except ftplib.error_perm:
        children = []
    for child in children:
        base = child.rsplit('/', 1)[-1]
        if base in ('', '.', '..'):
            continue
        remote_rmtree(ftp, f"{path}/{base}")
    ftp.cwd('/')
    try:
        ftp.rmd(path)
        print(f"  ✗ {path}/")
    except ftplib.error_perm as e:
        print(f"  could not remove {path}/: {e}")


# ── main ─────────────────────────────────────────────────────────────────────

# ---- MQTT build stamp (audit §8 W4a) -----------------------------------------
# After a successful upload, publish a retained SPOG/system/build stamp so every
# open console learns a new build exists (the app pulses its version badge).
# BEST-EFFORT ONLY: a down broker must never fail a deploy. The house broker
# speaks WebSockets on 9001 (no raw-TCP 1883 listener), so paho must use the
# websockets transport.
MQTT_HOST = os.environ.get('TWIST_MQTT_HOST', '44.44.44.163')
MQTT_PORT = int(os.environ.get('TWIST_MQTT_PORT', '9001'))
MQTT_USER = os.environ.get('TWIST_MQTT_USER', 'guest')
MQTT_PASS = os.environ.get('TWIST_MQTT_PASS', 'guest')


def routes_hash(project_dir):
    """A stable digest of the Routes tree (paths + sizes) for the build stamp."""
    import hashlib
    h = hashlib.sha1()
    for rel in sorted(get_all_routes(project_dir)):
        try:
            size = os.path.getsize(os.path.join(project_dir, rel))
        except OSError:
            size = -1
        h.update(f"{rel}:{size};".encode())
    return h.hexdigest()[:16]


def publish_build_stamp(project_dir):
    build_id = None
    try:
        with open(os.path.join(project_dir, DIST_DIR, 'build-id.json')) as f:
            build_id = json.load(f)
    except OSError:
        pass
    if not build_id:
        print("No dist/build-id.json — skipping MQTT build stamp.")
        return
    payload = json.dumps({
        'buildId': build_id,
        'routesHash': routes_hash(project_dir),
        'ts': int(__import__('time').time() * 1000),
    })
    try:
        import paho.mqtt.publish as mqtt_publish
        mqtt_publish.single(
            'SPOG/system/build', payload, retain=True, qos=0,
            hostname=MQTT_HOST, port=MQTT_PORT, transport='websockets',
            auth={'username': MQTT_USER, 'password': MQTT_PASS},
        )
        print(f"MQTT build stamp published → SPOG/system/build ({build_id.get('short', '?')})")
    except Exception as e:   # noqa: BLE001 — best-effort by design
        print(f"MQTT build stamp skipped ({e.__class__.__name__}: {e}) — consoles won't auto-announce this deploy.")


def main():
    project_dir = os.path.dirname(os.path.abspath(__file__))
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
    FTP_HOST = env.get('FTP_HOST', '') or "twist.like.audio"
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

"""Build the TypeScript app and collect the dist/ upload set."""

import os
import subprocess


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

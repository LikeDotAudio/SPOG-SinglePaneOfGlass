"""The Routes/** upload set: incremental (git diff) or full, plus a tree digest."""

import os
import subprocess

from deploy.constants import MANIFEST_ROOTS, ICON_ASSET_DIRS


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

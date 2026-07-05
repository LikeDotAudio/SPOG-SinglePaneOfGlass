"""Explicit-FTPS helpers: upload, directory creation, listing, and removal."""

import os
import ftplib


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

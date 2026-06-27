import os
import subprocess
import ftplib

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

# Files and directories to never upload, even if changed
IGNORE = {'.git', '.env', '__pycache__', 'deploy.py', 'start.py', 'uploadftp.py',
          'node_modules', 'package.json', 'package-lock.json', 'test_puppeteer.js'}

def is_ignored(rel_path):
    parts = rel_path.split('/')
    return any(p in IGNORE or p.startswith('.') for p in parts)

def get_changed_files(project_dir):
    """Return (to_upload, to_delete) relative paths from git status."""
    result = subprocess.run(
        ['git', '-C', project_dir, 'status', '--porcelain', '-z'],
        capture_output=True, text=True, check=True
    )
    to_upload = []
    to_delete = []
    # -z output is NUL-separated; renames carry two paths but we keep it simple
    for entry in result.stdout.split('\0'):
        if not entry:
            continue
        status = entry[:2]
        path = entry[3:]
        if is_ignored(path):
            continue
        # 'D' in either column means the file was deleted locally
        if 'D' in status:
            to_delete.append(path)
        else:
            # Modified, added, untracked, renamed, etc.
            if os.path.isfile(os.path.join(project_dir, path)):
                to_upload.append(path)
    return to_upload, to_delete

def get_all_files(project_dir):
    """Return every non-ignored file (relative paths) by walking the tree."""
    all_files = []
    for root, dirs, files in os.walk(project_dir):
        # Prune ignored directories so we don't descend into them
        dirs[:] = [d for d in dirs if d not in IGNORE and not d.startswith('.')]
        for name in files:
            rel = os.path.relpath(os.path.join(root, name), project_dir)
            if not is_ignored(rel):
                all_files.append(rel)
    return all_files

def ensure_remote_dir(ftp, remote_dir):
    """Create nested remote directories as needed, starting from root."""
    if not remote_dir:
        return
    ftp.cwd('/')
    for part in remote_dir.split('/'):
        if not part:
            continue
        try:
            ftp.mkd(part)
        except ftplib.error_perm:
            pass  # Directory already exists
        ftp.cwd(part)

def upload_to_ftp():
    env = load_env()

    # Fallback to twist.like.audio if FTP_HOST is empty, since ftp.tandaphonic.com didn't resolve
    FTP_HOST = env.get('FTP_HOST', '') or "twist.like.audio"
    FTP_USER = env.get('FTP_USER', '')
    FTP_PASS = env.get('FTP_PASS', '')

    project_dir = os.path.dirname(os.path.abspath(__file__))

    to_upload, to_delete = get_changed_files(project_dir)
    if not to_upload and not to_delete:
        # Nothing changed — upload the whole project instead.
        print("No changes detected — uploading everything.")
        to_upload = get_all_files(project_dir)

    print(f"Connecting to FTP server {FTP_HOST} (Explicit FTPS) as {FTP_USER}...")
    try:
        ftp = ftplib.FTP_TLS(FTP_HOST)
        ftp.login(user=FTP_USER, passwd=FTP_PASS)
        ftp.prot_p()  # Switch to secure data connection
        print("Login successful!")

        for rel_path in to_upload:
            remote_dir, filename = os.path.split(rel_path)
            ensure_remote_dir(ftp, remote_dir)
            local_item = os.path.join(project_dir, rel_path)
            print(f"Uploading {rel_path}...")
            with open(local_item, 'rb') as f:
                ftp.storbinary(f'STOR {filename}', f)

        for rel_path in to_delete:
            print(f"Deleting remote {rel_path}...")
            try:
                ftp.cwd('/')
                ftp.delete(rel_path)
            except ftplib.error_perm as e:
                print(f"  Could not delete {rel_path}: {e}")

        ftp.quit()
        print("Upload complete!")

    except Exception as e:
        print(f"FTP Error: {e}")

if __name__ == "__main__":
    upload_to_ftp()

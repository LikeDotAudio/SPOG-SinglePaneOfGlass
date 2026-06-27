import os
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

def upload_to_ftp():
    env = load_env()
    
    # Fallback to twist.like.audio if FTP_HOST is empty, since ftp.tandaphonic.com didn't resolve
    FTP_HOST = env.get('FTP_HOST', '') or "twist.like.audio"
    FTP_USER = env.get('FTP_USER', '')
    FTP_PASS = env.get('FTP_PASS', '')

    print(f"Connecting to FTP server {FTP_HOST} (Explicit FTPS) as {FTP_USER}...")
    try:
        ftp = ftplib.FTP_TLS(FTP_HOST)
        ftp.login(user=FTP_USER, passwd=FTP_PASS)
        ftp.prot_p() # Switch to secure data connection
        print("Login successful!")
        
        # Files and directories to ignore during upload
        ignore = ['.git', '.env', '__pycache__', 'deploy.py', 'start.py', 'uploadftp.py', 'node_modules', 'package.json', 'package-lock.json', 'test_puppeteer.js']
        
        def upload_dir(local_path, remote_path):
            try:
                ftp.mkd(remote_path)
            except ftplib.error_perm:
                pass # Directory already exists
            
            ftp.cwd(remote_path)
            
            for item in os.listdir(local_path):
                if item in ignore or item.startswith('.'):
                    continue
                    
                local_item = os.path.join(local_path, item)
                
                if os.path.isdir(local_item):
                    upload_dir(local_item, item)
                    ftp.cwd('..')
                else:
                    print(f"Uploading {local_item}...")
                    with open(local_item, 'rb') as f:
                        ftp.storbinary(f'STOR {item}', f)
                        
        print("Starting upload of project files...")
        
        # The script uploads from the directory it is in
        project_dir = os.path.dirname(os.path.abspath(__file__))
        os.chdir(project_dir)
        
        # Start by ensuring we are in the root directory '/'
        ftp.cwd('/')
        upload_dir('.', '/')
        
        ftp.quit()
        print("Upload complete!")
        
    except Exception as e:
        print(f"FTP Error: {e}")

if __name__ == "__main__":
    upload_to_ftp()

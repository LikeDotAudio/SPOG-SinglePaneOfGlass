import os
import ftplib
import glob

# Simple function to parse the .env file without needing external libraries
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
    
    host = env.get('FTP_HOST', '')
    user = env.get('FTP_USER', '')
    passwd = env.get('FTP_PASS', '')
    
    if not host:
        print("Please set your FTP_HOST in the .env file before running!")
        return
        
    print(f"Connecting to FTP server {host}...")
    try:
        ftp = ftplib.FTP(host)
        ftp.login(user=user, passwd=passwd)
        print("Login successful!")
        
        # Files to ignore during upload
        ignore = ['.git', '.env', '__pycache__', 'deploy.py', 'start.py']
        
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
                        
        # Start upload from current directory to root of FTP
        print("Starting upload...")
        upload_dir('.', '/')
        
        ftp.quit()
        print("Upload complete!")
        
    except Exception as e:
        print(f"FTP Error: {e}")

if __name__ == "__main__":
    upload_to_ftp()

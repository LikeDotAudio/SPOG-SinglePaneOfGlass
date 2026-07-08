"""Read FTP credentials from the project-root .env (Explicit FTPS)."""

import os


def load_env():
    env_vars = {}
    # .env lives at the project root — the parent of this package directory.
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    env_vars[key] = value.strip('"\'')
    return env_vars

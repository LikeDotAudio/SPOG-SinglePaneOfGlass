"""deploy — the TS-only production deploy, split into focused modules.

The CLI entry point is the top-level ``deploy.py``; this package holds its
pure helpers (env, build, manifests, routes, ftp, mqtt_stamp) plus the shared
module-level constants (``deploy.constants``). Importing this package has no
side effects — no network, no build, no filesystem writes.
"""

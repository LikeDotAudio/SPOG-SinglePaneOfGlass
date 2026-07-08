"""Shared module-level constants for the deploy package.

Kept in one place so both the CLI entry (deploy.py) and the submodules can
import them without a circular dependency.
"""

DIST_DIR = 'dist'
MANIFEST_ROOTS = ['Routes']          # folders that get an index.json manifest
REMOTE_ENTRY = 'index.htm'           # site default document (the cutover target)

# Legacy artifacts to remove from the server on deploy (the retired js/ app).
# NOTE: sw.js is intentionally KEPT — it's now a kill-switch worker that evicts the
# old cache-first SW from returning browsers. Deleting it would strand those clients
# on the stale cache (a 404 on the SW update check does NOT unregister it).
LEGACY_REMOTE = ['js', 'index.next.html']

# ICON-face tile folders (assets/icons/*; legacy Routes/*/icons): UPLOADED like any asset, but hidden
# from the discovery manifests so the app never renders them as categories.
# (Legacy dot-named variants kept for back-compat with older checkouts.)
ICON_ASSET_DIRS = {'icons', '.icons', '.icon'}

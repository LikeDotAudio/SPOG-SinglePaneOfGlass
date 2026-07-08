"""Generate the Routes/** index.json manifests (routing DATA discovery).

The TS app discovers the data tree from these manifests on any static host
(see src/platform/discovery.ts). This is the ONLY JSON that ships: routing
DATA, not app code.
"""

import os
import json

from deploy.constants import MANIFEST_ROOTS, ICON_ASSET_DIRS


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

#!/usr/bin/env node
// File-size tripwire — enforces the project's 200-line rule (docs/Audit/File-Size-Modularity-Audit.md).
// Scans committed source (src/, assets/) + top-level scripts; fails if any non-allowlisted
// file exceeds MAX_LINES. The allowlist grandfathers not-yet-split files and shrinks each phase —
// when it reaches [] the rule is fully enforced. Run: `node scripts/check-file-size.mjs`.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const MAX_LINES = 200;
const SCAN_DIRS = ['src', 'assets'];
const SCAN_FILES = ['deploy.py'];
const EXT = /\.(ts|mts|js|mjs|py)$/;
const SKIP_DIR = /(^|\/)(node_modules|\.git|dist|build|archive|\.claude)(\/|$)/;

// Files still awaiting their split. Delete entries as they drop under 200.
// Keep sorted; a file removed here that regrows past 200 will fail the build.
const ALLOWLIST = new Set([
  'src/editors/vision-mixer/index.ts',
  'src/editors/meter-input/index.ts',
  'src/editors/meter-input/live-input.ts',
  'src/ui/console/authoring.ts',
  'deploy.py',
  'src/editors/camera-control/index.ts',
  'src/ui/sources/pools.ts',
  'src/editors/clock/index.ts',
  'src/ui/console/matrix.ts',
  'src/ui/console/router-view.ts',
  'src/editors/timer/index.ts',
  'src/ui/console/colour-scheme.ts',
  'src/editors/stagebox-input/view.ts',
  'src/ui/console/chat-dock.ts',
  'src/ui/console/dest-fixtures.ts',
  'assets/icons/sources/make-icons.mjs',
  'assets/icons/destinations/make-icons.mjs',
  'src/editors/audio-positioner/index.ts',
  'src/ui/console/captains-log.ts',
  'src/app/main.ts',
  'src/ui/console/mqtt-tree.ts',
  'src/editors/audio-monitor/view.ts',
  'src/editors/timer/engine.ts',
  'src/editors/graphics-engine/templates.ts',
  'src/editors/ifb/view.ts',
  'src/ui/sources/panel.ts',
  'src/editors/audio-mixer/view.ts',
  'src/editors/signal-conditioner/index.ts',
  'src/editors/wysiwyg/view.ts',
  'src/editors/multi-viewer/index.ts',
  'src/editors/camera-control/controls.ts',
  'src/platform/mqtt/client.ts',
  'src/editors/iso-recorder/index.ts',
  'src/editors/person/index.ts',
]);

function walk(dir, out) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const full = join(dir, e.name);
    const rel = relative(ROOT, full);
    if (SKIP_DIR.test(rel)) continue;
    if (e.isDirectory()) walk(full, out);
    else if (EXT.test(e.name)) out.push(full);
  }
}

const files = [];
for (const d of SCAN_DIRS) walk(join(ROOT, d), files);
for (const f of SCAN_FILES) { try { statSync(join(ROOT, f)); files.push(join(ROOT, f)); } catch { /* absent */ } }

const offenders = [];
for (const f of files) {
  const lines = readFileSync(f, 'utf8').split('\n').length;
  if (lines > MAX_LINES) offenders.push({ rel: relative(ROOT, f), lines });
}
offenders.sort((a, b) => b.lines - a.lines);

const blocking = offenders.filter((o) => !ALLOWLIST.has(o.rel));
const grandfathered = offenders.filter((o) => ALLOWLIST.has(o.rel));

if (grandfathered.length) {
  console.log(`\n${grandfathered.length} grandfathered file(s) still over ${MAX_LINES} (allowlisted):`);
  for (const o of grandfathered) console.log(`  ${String(o.lines).padStart(5)}  ${o.rel}`);
}

if (blocking.length) {
  console.error(`\n✗ ${blocking.length} file(s) exceed ${MAX_LINES} lines and are NOT allowlisted:`);
  for (const o of blocking) console.error(`  ${String(o.lines).padStart(5)}  ${o.rel}`);
  console.error('\nSplit them (see docs/Audit/File-Size-Modularity-Audit.md) or add to the allowlist.');
  process.exit(1);
}

console.log(`\n✓ All scanned files within ${MAX_LINES} lines${grandfathered.length ? ` (${grandfathered.length} grandfathered)` : ''}.`);

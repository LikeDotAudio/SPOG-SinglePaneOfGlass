// @ts-nocheck — build-only config, run by esbuild (not tsc); uses Node built-ins
// (`node:child_process`/`node:fs`) whose types (@types/node) aren't installed.
import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Build stamp shown in the bottom-corner byline. Computed fresh on every `vite
// build` (so it changes on every deploy): the CHANGELOG version + build time + git
// commit + a "(uncommitted)" marker when the working tree is dirty.
function buildId(): { short: string; full: string } {
  const iso = new Date().toISOString();
  const date = iso.slice(0, 10), hm = iso.slice(11, 16);
  let ver = '';
  try { ver = readFileSync('CHANGELOG.md', 'utf8').match(/##\s*\[(v\d+)\]/)?.[1] ?? ''; } catch { /* no changelog */ }
  let hash = '', dirty = false;
  const git = (a: string): string => execSync(a, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  try { hash = git('git rev-parse --short HEAD'); } catch { /* not a repo */ }
  try {
    // Ignore vite's own temp config file (`vite.config.ts.timestamp-*.mjs`), which
    // exists in the tree while this very config is being evaluated — else every
    // build would falsely read as dirty.
    dirty = git('git status --porcelain').split('\n')
      .some((l) => l.trim() && !/vite\.config\.[jt]s\.timestamp-/.test(l));
  } catch { /* ignore */ }
  return {
    short: [ver, `${date} ${hm}Z`].filter(Boolean).join(' · '),
    full: [ver, `${date} ${hm} UTC`, hash && `git ${hash}${dirty ? ' (uncommitted)' : ''}`].filter(Boolean).join(' · '),
  };
}

// The A.8 side build. Project root stays the repo root so the dev server serves
// the SHARED `Routes/**` JSON (and the existing LCARS CSS) to the new app exactly
// as the live `js/` app sees them — data and styling are never forked (see A.8).
//
// Entry is `index.next.htm` so the live `index.htm` is untouched until cutover.
export default defineConfig({
  root: '.',
  // Relative base: the built index.next.html references ./assets/… so the bundle
  // works dropped at the site root next to Routes/ (side-by-side with index.htm),
  // regardless of mount path. App data fetches (Routes/…) are already relative.
  base: './',
  define: { __BUILD_ID__: JSON.stringify(buildId()) },
  server: { open: '/index.next.html' },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Two entry HTMLs: the console (remapped to /index.htm on deploy) and the
    // standalone MQTT diagnostic tree (kept as /twist-mqtt-tree.html).
    rollupOptions: { input: { main: 'index.next.html', tree: 'twist-mqtt-tree.html' } },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
  },
});

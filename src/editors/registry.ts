// src/editors/registry — auto-registration (M2).
//
// Every `src/editors/<name>/index.ts` default-exports one EditorPlugin. The glob
// collects them at build time — so adding an editor is "drop a folder", with ZERO
// edits here or in app boot (contrast: the legacy main.js hand-listed 14 imports).
//
// Dispatch is first-match-wins in a STABLE order (path-sorted), so overlapping
// regexes (signal vs signaling, light vs on-air) resolve deterministically. The
// dispatch test in P6 locks this down.

import type { EditorPlugin } from './types.js';

const modules = import.meta.glob<{ default: EditorPlugin }>('./*/index.ts', { eager: true });

export const PLUGINS: EditorPlugin[] = Object.keys(modules)
  .sort()
  .map((k) => modules[k]!.default)
  .filter((p): p is EditorPlugin => !!p && typeof p.match === 'function');

/** The editor that handles a twist name, or null for the generic matrix fallback. */
export function pluginFor(twistName: string): EditorPlugin | null {
  return PLUGINS.find((p) => p.match(twistName)) ?? null;
}

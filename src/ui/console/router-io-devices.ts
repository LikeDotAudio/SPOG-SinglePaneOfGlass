// src/ui/console/router-io-devices — P3 of the 1990s import: author NEW source
// devices from the Sources tab. Each Origin not already in the catalog becomes a
// source-leaf DRAFT under Routes/Sources/009_Imported/, registered in that folder's
// (and the root Sources) manifest draft, then the ingress panel is re-rendered in
// place so the devices appear + are routable — WITHOUT a reload (routes are DOM‑only
// and a reload would wipe them). See docs/Audit/1990s-View-Import-Export-Audit.md §7.4.

import { getDraft, putDraft } from '../../platform/routes-store.js';
import { fetchJSON } from '../../platform/discovery.js';
import { slugId } from '../sources/format.js';
import { renderSourcesPanel } from '../sources/panel.js';
import { wireSourceNodes } from '../sources/interact.js';
import { gatherSenderNodes, splitParent } from './router-view-gather.js';
import { norm, columnMap, type Sheet } from './router-io-sheet.js';

const FOLDER = '009_Imported';
const ROOT = 'Routes/Sources/index.json';
const DIR = `Routes/Sources/${FOLDER}/`;

export interface DeviceResult { created: number; names: string[] }

interface Group { color: string; status: string; video: string[]; audio: string[] }

/** Create source-leaf drafts for every Origin in the Sources sheet not already in the
 *  live catalog. Returns how many devices were authored (0 = nothing new). */
export async function authorDevices(srcSheet: Sheet): Promise<DeviceResult> {
  const col = columnMap(srcSheet);
  const existing = new Set<string>();
  gatherSenderNodes().forEach((_labels, origin) => existing.add(norm(origin)));

  const groups = new Map<string, Group>();
  for (const r of srcSheet.rows) {
    const origin = col(r, 'Origin').trim(), feed = col(r, 'Feed').trim();
    if (!origin || !feed || existing.has(norm(origin))) continue;
    let g = groups.get(origin);
    if (!g) { g = { color: col(r, 'Color').trim(), status: col(r, 'Status').trim(), video: [], audio: [] }; groups.set(origin, g); }
    (col(r, 'Type').trim().toLowerCase() === 'audio' ? g.audio : g.video).push(feed);   // control ⇒ video
  }
  if (!groups.size) return { created: 0, names: [] };

  // The leaf's `name` is set to the FULL origin so the panel-computed lineage (origin
  // = name at a category root) matches the sheet exactly and routes resolve.
  const manifest = getDraft<string[]>(DIR + 'index.json') ?? [];
  const names: string[] = [];
  let i = manifest.length + 1;
  for (const [origin, g] of groups) {
    const base = slugId(splitParent(origin)[1] || origin) || 'device';
    const mk = (suffix: string, extra: Record<string, unknown>): void => {
      const file = `${String(i).padStart(3, '0')}_${base}${suffix}.json`;
      putDraft(DIR + file, { id: `imported-${slugId(origin)}${suffix}`, name: origin, color: g.color || '#8FA9C8', status: g.status || 'OK', ...extra });
      manifest.push(file); i++;
    };
    // Split media so the person heuristic (video[] AND items[] on one leaf) never fires;
    // both leaves share `name`=origin, so gatherSenderNodes merges them under one origin.
    if (g.video.length) mk(g.audio.length ? '-v' : '', { kind: 'video', extraClass: 'video-imported', video: g.video });
    if (g.audio.length) mk(g.video.length ? '-a' : '', { extraClass: 'audio-imported', items: g.audio });
    names.push(origin);
  }
  putDraft(DIR + 'index.json', manifest);

  // Register the folder in the root Sources manifest (preserving every existing entry).
  const root = getDraft<string[]>(ROOT) ?? await fetchJSON<string[]>(ROOT) ?? [];
  if (!root.some((e) => e.replace(/\/$/, '') === FOLDER)) { root.push(`${FOLDER}/`); putDraft(ROOT, root); }

  await refreshSourcesPanel();
  return { created: names.length, names };
}

/** Re-render the ingress panel in place (new drafts appear; DOM routes untouched). */
async function refreshSourcesPanel(): Promise<void> {
  const ingress = document.querySelector<HTMLElement>('.ingress-panel');
  if (!ingress) return;
  ingress.innerHTML = '';
  await renderSourcesPanel(ingress, () => wireSourceNodes(ingress));
  wireSourceNodes(ingress);
}

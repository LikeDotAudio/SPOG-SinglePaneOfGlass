// src/ui/console/destinations — the destination side of the console. Ports
// js/productions.js renderPrograms (a production → a program row of twist
// drop-targets) and js/app.js addDestinationTree (Routes/Destinations/** →
// nested footer groups + lazily-loaded tabs). Twists are the crosspoints sources
// route into (wired by ui/console/matrix.ts).
import { listDirectory, fetchJSON, type Entry } from '../../platform/discovery.js';
import { isFaultStatus } from '../../domain/routing-core/index.js';
import type { Production, TwistConfig } from '../../model/index.js';
import { DEST_TAB_COLORS, DEST_GROUP_COLORS, paletteAt, rgbAt } from '../palette.js';
import { stripOrder, monoEmoji, faultTag } from '../sources/format.js';
import { Footer, type GroupHandle } from './footer.js';
import { initializeTwists, type OpenEditor } from './matrix.js';
import { pluginFor } from '../../editors/registry.js';
import { decorateRoom } from './authoring.js';
import { mountDestFixtures } from './dest-fixtures.js';
import { applyScope } from './auth-panel.js';

const twistName = (t: string | TwistConfig): string => (typeof t === 'string' ? t : t.name);

const acceptColor: Record<string, string> = { video: '#CC99CC', audio: '#FF9C63', both: '#CC99CC', camera: '#6FC8F0' };

/** Render one production into its tab-content pane (#tab-<id>). `srcUrl` is the file
 *  the room was loaded from — threaded so the authoring layer can draft edits back
 *  to it (audit §7). */
export function renderPrograms(pgm: Production, pane: HTMLElement, openEditor?: OpenEditor, srcUrl?: string): void {
  const pgmTwists = pgm.twists ?? ['Processing', 'Recording', 'Switcher', 'Audio Mixer', 'Intercom'];
  const titleText = pgm.parentName ? `${pgm.parentName.toUpperCase()} — ${pgm.name}` : pgm.name;
  const faulted = isFaultStatus(pgm.status);
  const pColor = pgm.color ?? '#ffaa00';

  const rows: Record<string, string> = {};
  const rowOrder: string[] = [];
  let bigHtml = '';
  pgmTwists.forEach((t, ti) => {
    const name = twistName(t);
    const plugin = pluginFor(name);
    let cfgAttr = '', rowKey: string | null = null;
    let lcars: string = pColor;
    if (typeof t === 'object') {
      cfgAttr = `data-config='${JSON.stringify(t).replace(/'/g, '&#39;')}'`;
      if (t.accepts && acceptColor[t.accepts]) lcars = acceptColor[t.accepts] as string;
      rowKey = t.row || (t.monitor ? 'monitors' : null);
      if (rowKey === 'remotes') lcars = '#64C8A0';   // signal-conditioner green, distinct from camera blue
      if (rowKey === 'graphics') lcars = '#39D353';   // graphics engines — green, horizontal small row
    }
    const isSmall = !!rowKey;
    // Big (function) twists flow ~3-across (≈⅓ width) and wrap horizontally;
    // small (row) twists share their row equally.
    const sizing = isSmall ? 'flex: 1 1 0; min-width: 0;' : 'flex: 1 1 30%; min-width: 240px; max-width: 33%;';
    // Production-level (and, via the same path, floor-room + person-level) hover
    // tip authored in the room JSON, plus the floor/category it sits under. Both
    // ride to the editor on the twist element and feed ui/tip's expectation tip.
    const prodTipAttr = pgm.tip ? ` data-prod-tip='${JSON.stringify(pgm.tip).replace(/'/g, '&#39;')}'` : '';
    const prodFloorAttr = pgm.parentName ? ` data-prod-floor="${pgm.parentName.replace(/"/g, '&quot;')}"` : '';
    const capAttr = plugin && plugin.requiredCaps ? ` data-cap="${plugin.requiredCaps.join(' ')}"` : '';
    const prodAttrs = `data-prod-id="${pgm.id}" data-prod-name="${(titleText || '').replace(/"/g, '&quot;')}"${prodTipAttr}${prodFloorAttr}${capAttr}`;
    const matrixId = `${pgm.id}-${name.replace(/\s+/g, '-').toLowerCase()}`;
    const twistHtml = `
      <div class="twist-container${isSmall ? ' monitor-twist' : ''}" data-twist-index="${ti}" ${cfgAttr} ${prodAttrs} style="--lcars-color: ${lcars}; ${sizing}">
        <div class="twist-title">${monoEmoji(name)}${name}</div>
        <div class="twist-lip" title="Fold / unfold strand"></div>
        <div class="twist-foldbar" title="Fold / unfold strand"></div>
        <div class="matrix-container" id="${matrixId}"></div>
        <svg class="dna-helix" viewBox="0 0 100 100" preserveAspectRatio="none" style="width: 100%; height: 0; display: block; margin-top: 0;"></svg>
      </div>`;
    if (isSmall && rowKey) { if (!(rowKey in rows)) { rows[rowKey] = ''; rowOrder.push(rowKey); } rows[rowKey] += twistHtml; }
    else bigHtml += twistHtml;
  });

  const wrapGroup = (name: string, content: string, extraClass: string = '') => {
    const count = (content.match(/twist-container/g) || []).length;
    return `
      <details class="twist-group ${extraClass}" open style="width: 100%; margin-bottom: 6px; background: rgba(0,0,0,0.2); border-radius: 8px; padding: 4px;">
        <summary style="cursor: pointer; padding: 4px 8px; font-weight: bold; color: ${pColor}; user-select: none; font-size: 0.85em; letter-spacing: 1px; display: flex; align-items: center; gap: 8px;">
          <span style="flex:1;">${name.toUpperCase()} <span style="opacity:0.5; font-weight:normal;">(${count})</span></span>
        </summary>
        <div class="monitor-row ${extraClass}" style="margin-top: 8px;">${content}</div>
      </details>`;
  };

  let html = `
    <div class="program-row${faulted ? ' fault' : ''}" style="--prod-color: ${pColor}; position: relative; overflow: hidden; padding: 0; margin-bottom: 10px; flex: 1 1 auto;">
      <div class="program-title" style="background: ${pColor};">${monoEmoji(titleText)}${titleText}${faulted ? ' ' : ''}${faultTag(pgm.status)}</div>
      <div class="program-body" style="display: flex; flex-direction: column; gap: 6px; align-items: flex-start; width: 100%; padding: 8px;">`;
  if (rows['cameras']) html += wrapGroup('CAMERAS', rows['cameras'], 'camera-row');
  if (rows['remotes']) html += wrapGroup('REMOTES', rows['remotes'], 'remote-row');
  if (bigHtml) {
    html += `
      <details class="twist-group" open style="width: 100%; margin-bottom: 6px; background: rgba(0,0,0,0.2); border-radius: 8px; padding: 4px;">
        <summary style="cursor: pointer; padding: 4px 8px; font-weight: bold; color: ${pColor}; user-select: none; font-size: 0.85em; letter-spacing: 1px;">
          PRIMARY <span style="opacity:0.5; font-weight:normal;">(${(bigHtml.match(/twist-container/g) || []).length})</span>
        </summary>
        <div style="display:flex;flex-wrap:wrap;gap:6px;width:100%;align-items:flex-start;margin-top:8px;">${bigHtml}</div>
      </details>`;
  }
  rowOrder.forEach((k) => { if (k !== 'cameras' && k !== 'remotes') html += wrapGroup(k, rows[k]!); });
  html += `</div></div>`;
  pane.innerHTML = html;
  initializeTwists(pane, openEditor);
  // Every destination carries the standing fixtures (clock, chrono landing spot,
  // per-destination chat log), regardless of its authored twists. Guarded so a
  // fixture failure can never take down the room's twist render.
  const body = pane.querySelector('.program-body');
  if (body instanceof HTMLElement) {
    try { mountDestFixtures(body, pgm, openEditor, faulted); }
    catch (e) { console.error('dest-fixtures mount failed', e); }
  }
  // Authoring affordances (hidden unless EDIT LAYOUT is on); rerender re-runs this
  // render with the mutated Production, so edits paint immediately.
  decorateRoom(pane, pgm, srcUrl, () => renderPrograms(pgm, pane, openEditor, srcUrl));
  applyScope(pane);
}

/** Populate a destination category folder: subfolders → nested footer groups, *.json → lazy tabs. */
export async function addDestinationTree(
  baseUrl: string, parentGroup: GroupHandle | null, groupColorRgb: string, parentName: string | undefined, openEditor?: OpenEditor,
): Promise<void> {
  const { dirs, files } = await listDirectory(baseUrl);
  if (files.length) {
    const ns = baseUrl.replace(/[^a-zA-Z0-9]/g, '-');
    files.forEach((f: Entry, i: number) => {
      const fileName = decodeURIComponent(f.href).replace(/\.json$/i, '');
      const id = ns + '--' + fileName.replace(/[^a-zA-Z0-9]+/g, '-');
      const color = paletteAt(DEST_TAB_COLORS, i);
      Footer.addTab({ id, name: stripOrder(fileName).toUpperCase() }, {
        group: parentGroup, active: false, color,
        onActivate: () => {
          void fetchJSON<Production>(baseUrl + f.href).then((data) => {
            if (!data) return;
            data.id = id;
            // Unified person model: its destination twists live under `kit`.
            if (!data.twists && data.kit?.twists) data.twists = data.kit.twists;
            if (parentName) data.parentName = parentName;
            data.color = color;
            const pane = document.getElementById('tab-' + id);
            if (pane) renderPrograms(data, pane, openEditor, baseUrl + f.href);
          });
        },
      });
    });
  }
  await Promise.all(dirs.map((dir: Entry) => {
    const sub = Footer.addGroup(stripOrder(dir.name).toUpperCase(), { parent: parentGroup, color: groupColorRgb, collapsed: true });
    return addDestinationTree(baseUrl + dir.href, sub, groupColorRgb, stripOrder(dir.name), openEditor);
  }));
}

/** Build the whole destinations footer from Routes/Destinations/**. */
export async function buildDestinations(openEditor?: OpenEditor): Promise<void> {
  const destDir = await listDirectory('Routes/Destinations/');
  await Promise.all(destDir.dirs.map((cat: Entry, di: number) => {
    const colorRgb = rgbAt(DEST_GROUP_COLORS, di);
    const catGroup = Footer.addGroup(stripOrder(cat.name).toUpperCase(), { color: colorRgb, collapsed: true });
    return addDestinationTree('Routes/Destinations/' + cat.href, catGroup, colorRgb, undefined, openEditor);
  }));
  // People: ONE unified model — the destinations console projects `kit{}` twists
  // from the canonical Routes/People tree (same files the sources panel reads).
  const pColor = rgbAt(DEST_GROUP_COLORS, destDir.dirs.length);
  const peopleGroup = Footer.addGroup('PEOPLE', { color: pColor, collapsed: true });
  await addDestinationTree('Routes/People/', peopleGroup, pColor, undefined, openEditor);
}

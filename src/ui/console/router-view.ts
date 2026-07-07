// src/ui/console/router-view — the "1990s VIEW": an interactive router crosspoint
// grid styled after classic Minesweeper. Port of js/router-view.js.
//
// Rows = SENDERS (source feeds grouped by box → parent); columns = RECEIVERS
// (destination twists grouped by production → parent). A sunken/flagged cell is a
// live route. Click a crosspoint to make/break it (via placeSourceInTwist / drop-
// zone removal); click a group header to fold; hover lights the row+column. URL
// route at #/1990s (?src/&dst/&s/&r).
//
// This module is the ORCHESTRATOR: it owns the entry point, builds the RVState
// (the shared, mutable grid state), wires the DOM/hash and delegates the heavy
// lifting to flat siblings — router-view-styles (CSS), router-view-gather (pure
// DOM readers) and router-view-grid (grid build + click/hover handlers).
import { addStyles } from '../dom.js';
import { getPrefs } from '../../platform/prefs.js';
import { RV_CSS } from './router-view-styles.js';
import { gatherSenderNodes, loadAllSources, loadAllDest, type RVState } from './router-view-gather.js';
import { buildGrid, saveCollapsed, onBodyClick, onBodyOver, clearHl } from './router-view-grid.js';
import { exportWorkbook, exportCsv, importWorkbook } from './router-io.js';

const ROUTE = '#/1990s';

export function initRouterView(): void {
  // Collapse choices are seat memory — hydrated from prefs, saved on every toggle.
  const rc = getPrefs().ui.routerCollapsed;
  // The one shared mutable grid state, threaded by reference to every part. The
  // five DOM refs (fs/fr/body/tgSrc/tgDst) are populated by build() — until then
  // they are undefined, exactly as the original unassigned `let`s were.
  const st: RVState = {
    overlay: null,
    fs: undefined as unknown as HTMLInputElement,
    fr: undefined as unknown as HTMLInputElement,
    body: undefined as unknown as HTMLElement,
    tgSrc: undefined as unknown as HTMLElement,
    tgDst: undefined as unknown as HTMLElement,
    showAllSrc: false, showAllDst: false, prevHash: null, syncing: false,
    rowCollapsed: new Set<string>(rc?.row ?? []),
    colCollapsed: new Set<string>(rc?.col ?? []),
    rowPlan: null, colPlan: null, crossSet: new Set<string>(), hlNodes: [],
  };

  function buildHash(): string {
    const p: string[] = [];
    if (st.showAllSrc) p.push('src=1'); if (st.showAllDst) p.push('dst=1');
    if (st.fs.value.trim()) p.push('s=' + encodeURIComponent(st.fs.value.trim()));
    if (st.fr.value.trim()) p.push('r=' + encodeURIComponent(st.fr.value.trim()));
    return ROUTE + (p.length ? '?' + p.join('&') : '');
  }
  function parseHash(): { src: boolean; dst: boolean; s: string; r: string } | null {
    const h = location.hash || '';
    if (h !== ROUTE && h.indexOf(ROUTE + '?') !== 0) return null;
    const q = new URLSearchParams(h.indexOf('?') >= 0 ? h.slice(h.indexOf('?') + 1) : '');
    return { src: q.get('src') === '1', dst: q.get('dst') === '1', s: q.get('s') || '', r: q.get('r') || '' };
  }
  function writeHash(): void { st.syncing = true; history.replaceState(null, '', buildHash()); st.syncing = false; }

  async function applyToggles(src: boolean, dst: boolean): Promise<void> {
    st.showAllSrc = src; st.showAllDst = dst;
    st.tgSrc.classList.toggle('on', src); st.tgSrc.textContent = src ? '✓ ALL SOURCES' : 'ALL SOURCES';
    st.tgDst.classList.toggle('on', dst); st.tgDst.textContent = dst ? '✓ ALL DESTINATIONS' : 'ALL DESTINATIONS';
    if (src) await loadAllSources();
    if (dst) await loadAllDest();
    // Collapse to the TOP layer (Studio / Facility) when showing everything, so the
    // grid opens as a compact overview the op drills into.
    st.rowCollapsed.clear();
    if (src) [...gatherSenderNodes().keys()].forEach((o) => st.rowCollapsed.add('r:' + (o.split(' — ')[0]?.trim() || o)));
    st.colCollapsed.clear();
    if (dst) document.querySelectorAll<HTMLElement>('.twist-container').forEach((tw) => {
      const cat = tw.dataset.prodCat || (tw.dataset.prodName || '').split(' — ')[0]?.trim();
      if (cat) st.colCollapsed.add('c:' + cat);
    });
    saveCollapsed(st);
  }

  function build(): HTMLElement {
    addStyles('router-view-styles', RV_CSS);
    if (st.overlay) return st.overlay;
    const overlay = document.createElement('div');
    st.overlay = overlay;
    overlay.className = 'rv-overlay';
    overlay.innerHTML = `
      <div class="rv-win">
        <div class="rv-titlebar">▣ 1990s VIEW — Router.exe<span class="rv-x" title="Close">×</span></div>
        <div class="rv-bar">
          <input data-fsender placeholder="find sender…">
          <input data-freceiver placeholder="find receiver…">
          <button class="rv-tg" data-tgsrc>ALL SOURCES</button>
          <button class="rv-tg" data-tgdst>ALL DESTINATIONS</button>
          <button class="rv-tg" data-export title="Export Sources + Destinations as hierarchical JSON (parents nested)">⭳ EXPORT JSON</button>
          <button class="rv-tg" data-csv title="Export each tab as a CSV">⭳ CSV</button>
          <button class="rv-tg" data-import title="Import JSON (or legacy .xml/.csv) and apply its routes + new devices">⭱ IMPORT</button>
          <input type="file" data-importfile accept=".json,.xml,.csv,application/json,text/csv,application/xml" style="display:none">
          <span class="rv-count"></span>
          <span class="rv-help">click a crosspoint to make/break · a group cell to SALVO · a header to fold</span>
        </div>
        <div class="rv-body"></div>
      </div>`;
    document.body.appendChild(overlay);
    st.fs = overlay.querySelector<HTMLInputElement>('[data-fsender]')!;
    st.fr = overlay.querySelector<HTMLInputElement>('[data-freceiver]')!;
    st.body = overlay.querySelector<HTMLElement>('.rv-body')!;
    st.tgSrc = overlay.querySelector<HTMLElement>('[data-tgsrc]')!;
    st.tgDst = overlay.querySelector<HTMLElement>('[data-tgdst]')!;
    const onFilter = (): void => { buildGrid(st); writeHash(); };
    st.fs.addEventListener('input', onFilter);
    st.fr.addEventListener('input', onFilter);
    st.tgSrc.addEventListener('click', () => { void (async () => { await applyToggles(!st.showAllSrc, st.showAllDst); buildGrid(st); writeHash(); })(); });
    st.tgDst.addEventListener('click', () => { void (async () => { await applyToggles(st.showAllSrc, !st.showAllDst); buildGrid(st); writeHash(); })(); });
    st.body.addEventListener('click', (e) => onBodyClick(st, e));
    st.body.addEventListener('mouseover', (e) => onBodyOver(st, e));
    st.body.addEventListener('mouseleave', () => clearHl(st));
    // Import / export the whole grid as a two‑tab workbook (see router-io).
    overlay.querySelector('[data-export]')?.addEventListener('click', () => { void exportWorkbook(); });
    overlay.querySelector('[data-csv]')?.addEventListener('click', () => { void exportCsv(); });
    const fileInput = overlay.querySelector<HTMLInputElement>('[data-importfile]');
    overlay.querySelector('[data-import]')?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', () => { void (async () => {
      const f = fileInput.files?.[0]; if (!f) return;
      const mode = confirm('Replace ALL current routes to match the file?\n\nOK = Replace · Cancel = Merge (add only)') ? 'replace' : 'merge';
      try {
        const s = await importWorkbook(await f.text(), mode);
        buildGrid(st);
        alert(`Import complete.\n\n${s.created} new device(s) created\n${s.added} route(s) added\n${s.removed} removed\n${s.rejected.length} rejected (caps/accepts)\n${s.unmatched.length} unmatched device(s).`);
      } catch (err) { alert('Import failed: ' + (err as Error).message); }
      fileInput.value = '';
    })(); });
    overlay.querySelector('.rv-x')?.addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && st.overlay?.classList.contains('open')) close(); });
    return overlay;
  }

  function open(): void {
    if (!(location.hash === ROUTE || location.hash.indexOf(ROUTE + '?') === 0)) {
      st.prevHash = location.hash; location.hash = ROUTE;
    } else void show(parseHash());
  }
  function close(): void {
    const ov = build(); ov.classList.remove('open');
    st.syncing = true; history.replaceState(null, '', st.prevHash || (location.pathname + location.search)); st.syncing = false;
    st.prevHash = null;
  }
  async function show(state: { src: boolean; dst: boolean; s: string; r: string } | null): Promise<void> {
    const ov = build();
    if (state) { st.fs.value = state.s; st.fr.value = state.r; await applyToggles(state.src, state.dst); }
    buildGrid(st);
    ov.classList.add('open');
  }
  function onHashChange(): void {
    if (st.syncing) return;
    const st2 = parseHash();
    if (st2) void show(st2);
    else st.overlay?.classList.remove('open');
  }

  // mount the launcher button + hash listener
  addStyles('router-view-styles', RV_CSS);
  if (!document.querySelector('.rv-btn')) {
    const btn = document.createElement('button');
    btn.className = 'rv-btn'; btn.textContent = '1990s VIEW';
    btn.title = 'Router crosspoint matrix (opens #/1990s)';
    btn.addEventListener('click', open);
    // Dock beside the CREATED-BY credit line when present, else fall back to the
    // body corner. Moving it here frees the bottom corner for the chat launcher.
    (document.querySelector('.credit-row') ?? document.body).appendChild(btn);
  }
  window.addEventListener('hashchange', onHashChange);
  if (parseHash()) { build(); void show(parseHash()); }
}

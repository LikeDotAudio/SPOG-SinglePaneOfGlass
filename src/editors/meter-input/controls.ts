// src/editors/meter-input/controls — event wiring for the control bar. Split from
// index.ts: preset selection, SENS sensitivity, the layout inspector popup and the
// source buttons (Test Pattern / Capture Tab / Load File / URL) + the status line.
import { el, addStyles } from '../../ui/dom.js';
import type { LiveInput } from './live-input.js';
import type { EditDetector } from './edit-detector.js';
import type { ToolbarRefs } from './toolbar.js';
import type { Disposer } from '../../ui/timers.js';
import { buildTsgGallery } from '../../ui/tsg-gallery.js';
import { patternById } from '../../domain/tsg/index.js';

export interface SensRef { v: number; }
export type SetStat = (t: string, warn?: boolean) => void;

export interface ControlDeps {
  host: HTMLElement;
  li: LiveInput;
  editDetector: EditDetector;
  applyPreset: (name: string) => void;
  cardMap: Record<string, HTMLElement>;
  sens: SensRef;              // shared edit-detection threshold (RAF reads sens.v)
  tb: ToolbarRefs;
  dispose: Disposer;          // editor lifecycle bag — the TSG selector ticker rides here
}

const TSG_POP_CSS = `
.mi-tsgpop{position:absolute;z-index:60;left:8px;top:96px;right:8px;max-height:62%;
  overflow:auto;padding:12px;background:rgba(6,11,20,.97);border:1px solid #2c4a6e;
  border-radius:10px;box-shadow:0 10px 40px rgba(0,0,0,.6);display:none;}
.mi-tsgpop.open{display:block;}
.mi-tsgpop-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
.mi-tsgpop-h b{font:700 12px/1 var(--lcars-font,'Antonio',sans-serif);letter-spacing:2px;color:#8fa9c8;}
.mi-tsgpop-x{cursor:pointer;color:#9fb6cc;font:700 16px/1 sans-serif;padding:0 6px;}`;

// Wire every control-bar interaction and return `setStat` so the render loop can
// still surface source-status messages (e.g. a tainted cross-origin warning).
export function wireControls(deps: ControlDeps): SetStat {
  const { host, li, editDetector, applyPreset, cardMap, sens, tb, dispose } = deps;
  const { bBars, bTsg, bCap, bFile, url, bUrl, file, pDef, pAud, pVid, pCol, pLum, sSub, sNorm, sHard, bLayout, stat } = tb;

  const presetBtns: Array<[HTMLElement, string]> = [[pDef, 'default'], [pAud, 'audio'], [pVid, 'video'], [pCol, 'colour'], [pLum, 'luma']];
  const selectPreset = (name: string): void => { applyPreset(name); presetBtns.forEach(([b, n]) => b.classList.toggle('on', n === name)); };
  presetBtns.forEach(([b, n]) => b.addEventListener('click', () => selectPreset(n)));
  applyPreset('default');

  // SENS — how big a luminance jump counts as an edit (higher = only hard cuts).
  const sensBtns: Array<[HTMLElement, number]> = [[sSub, 0.22], [sNorm, 0.35], [sHard, 0.5]];
  sensBtns.forEach(([b, thr]) => b.addEventListener('click', () => { sens.v = thr; sensBtns.forEach(([bb]) => bb.classList.toggle('on', bb === b)); }));

  // Layout inspector — the LAYOUT pill toggles a readout of each visible card's
  // [x, y, w, h], formatted as a preset object (handy for authoring new presets).
  const layoutPop = el('div', { class: 'mi-layout' });
  bLayout.addEventListener('click', () => {
    const shown = layoutPop.classList.toggle('open');
    if (!shown) return;
    const lines = Object.entries(cardMap)
      .filter(([, card]) => card.style.display !== 'none')
      .map(([key, card]) => `  ${key}: [${card.offsetLeft}, ${card.offsetTop}, ${card.offsetWidth}, ${card.offsetHeight}],`);
    const text = `{\n${lines.join('\n')}\n}`;
    layoutPop.textContent = text;
    // Copy the layout to the clipboard so it can be pasted straight into a preset.
    navigator.clipboard?.writeText(text).catch(() => {});
  });
  host.append(layoutPop);

  const setStat: SetStat = (t, warn = false) => { stat.textContent = t; stat.style.color = warn ? '#ff6a6a' : '#e6a13a'; };
  const clearOnPGM = (): void => { bBars.classList.remove('on'); bTsg.classList.remove('on'); };
  bBars.addEventListener('click', () => {
    li.useBars(); li.setTsgPattern(null); bTsg.classList.remove('on'); bBars.classList.add('on');
    editDetector.reset(); setStat('source: test pattern (SMPTE colour bars)');
  });

  // ── TSG selector: launch the shared Test Signal Generator picker (SMPTE / EBU /
  //    ITU / VESA, SDR + HDR). Choosing a pattern makes it the ANALYZED SOURCE so
  //    every scope measures it. Built lazily on first open, then toggled. ──
  addStyles('mi-tsgpop', TSG_POP_CSS);
  let tsgPop: HTMLElement | null = null;
  const openTsg = (): void => {
    if (!tsgPop) {
      const gallery = buildTsgGallery({
        selected: li.tsgPattern() ?? undefined,
        onPick: (p) => {
          li.useBars(); li.setTsgPattern(p.id);
          bBars.classList.remove('on'); bTsg.classList.add('on'); editDetector.reset();
          setStat(`source: TSG · ${p.name} (${p.group})`);
          tsgPop?.classList.remove('open');
        },
        dispose,
      });
      const close = el('span', { class: 'mi-tsgpop-x', title: 'close' }, ['✕']);
      close.addEventListener('click', () => tsgPop?.classList.remove('open'));
      tsgPop = el('div', { class: 'mi-tsgpop' }, [
        el('div', { class: 'mi-tsgpop-h' }, [el('b', {}, ['Test Signal Generator']), close]),
        gallery.root,
      ]);
      host.append(tsgPop);
    }
    tsgPop.classList.toggle('open');
  };
  bTsg.addEventListener('click', openTsg);
  bCap.addEventListener('click', () => {
    li.captureTab().then(() => { clearOnPGM(); editDetector.reset(); setStat('source: captured tab (real pixels + audio)'); })
      .catch((e: Error) => setStat('capture cancelled: ' + e.message, true));
  });
  bFile.addEventListener('click', () => file.click());
  file.addEventListener('change', () => {
    const f = file.files?.[0]; if (!f) return;
    li.useMedia(URL.createObjectURL(f), false).then(() => { clearOnPGM(); editDetector.reset(); setStat('source: file · ' + f.name); })
      .catch((e: Error) => setStat('load failed: ' + e.message, true));
  });
  bUrl.addEventListener('click', () => {
    const u = url.value.trim(); if (!u) return;
    li.useMedia(u, true).then(() => { clearOnPGM(); editDetector.reset(); setStat('source: url'); })
      .catch((e: Error) => setStat('load failed: ' + e.message, true));
  });

  return setStat;
}

// src/editors/meter-input/toolbar — the control bar DOM. Split from index.ts:
// builds the SOURCE + PRESETS + SENS pills, the URL/file inputs, the LAYOUT pill
// and the status line, and assembles them into the `.mi-bar` element. Pure DOM —
// the event wiring lives in ./controls.
import { el } from '../../ui/dom.js';

export interface ToolbarRefs {
  bar: HTMLElement;
  bBars: HTMLElement; bTsg: HTMLElement; bCap: HTMLElement; bFile: HTMLElement; url: HTMLInputElement; bUrl: HTMLElement; file: HTMLInputElement;
  pDef: HTMLElement; pAud: HTMLElement; pVid: HTMLElement; pCol: HTMLElement; pLum: HTMLElement;
  sSub: HTMLElement; sNorm: HTMLElement; sHard: HTMLElement;
  bLayout: HTMLElement; stat: HTMLElement;
}

export function buildToolbar(): ToolbarRefs {
  const bBars = el('button', { class: 'mi-pill on' }, ['▦ Test Pattern']);
  const bTsg = el('button', { class: 'mi-pill' }, ['◈ TSG ▾']);
  const bCap = el('button', { class: 'mi-pill' }, ['⧉ Capture Tab']);
  const bFile = el('button', { class: 'mi-pill' }, ['▶ Load File']);
  const url = el('input', { class: 'mi-url', type: 'text', placeholder: '…CORS .mp4/.webm URL' });
  const bUrl = el('button', { class: 'mi-pill' }, ['Load URL']);
  const file = el('input', { type: 'file', accept: 'video/*', style: 'display:none' });
  const pDef = el('button', { class: 'mi-pill on' }, ['✦ Default']);
  const pAud = el('button', { class: 'mi-pill' }, ['♪ Audio']);
  const pVid = el('button', { class: 'mi-pill' }, ['▤ All Video']);
  const pCol = el('button', { class: 'mi-pill' }, ['◉ Colour']);
  const pLum = el('button', { class: 'mi-pill' }, ['◂ Luma']);
  const sSub = el('button', { class: 'mi-pill' }, ['Subtle']);
  const sNorm = el('button', { class: 'mi-pill on' }, ['Normal']);
  const sHard = el('button', { class: 'mi-pill' }, ['Hard']);
  const bLayout = el('button', { class: 'mi-pill' }, ['▦ Layout']);
  const stat = el('span', { class: 'mi-stat' }, ['source: test pattern (SMPTE colour bars)']);

  const grp = (cls: string, label: string, btns: HTMLElement[]): HTMLElement =>
    el('div', { class: `mi-grp ${cls}` }, [el('span', { class: 'mi-grp-lbl' }, [label]), el('div', { class: 'mi-grp-btns' }, btns)]);
  const bar = el('div', { class: 'mi-bar' }, [
    // SOURCE + PRESETS sit side-by-side, each dropping its buttons downward.
    // (The editor's name is already in the overlay top bar — no title tab here.)
    el('div', { class: 'mi-bar-row mi-bar-groups' }, [
      grp('mi-grp-src', 'Source', [bBars, bTsg, bCap, bFile, url, bUrl, file]),
      grp('mi-grp-pre', 'Presets', [pDef, pAud, pVid, pCol, pLum]),
      bLayout,
    ]),
    el('div', { class: 'mi-bar-row mi-bar-stat' }, [stat]),
  ]);

  return { bar, bBars, bTsg, bCap, bFile, url, bUrl, file, pDef, pAud, pVid, pCol, pLum, sSub, sNorm, sHard, bLayout, stat };
}

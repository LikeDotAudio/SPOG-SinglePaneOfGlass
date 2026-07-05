// src/ui/console/dest-fixtures-shared — shared chrome for the destination fixtures.
//
// CSS, the seven-seg readout + self-terminating rAF loop, the card wrapper, and
// synthTwist (the mount seam that hands renderPrograms's openEditor a synthetic
// twist — the graphics-suite roadmap plugs new editors in here). Consumed by the
// clock / counters / chat siblings and the dest-fixtures orchestrator.

import { el, ctx2d } from '../dom.js';
import { drawSegString } from '../seven-seg.js';
import type { Production } from '../../model/index.js';

export const CSS = `
.dfx{display:flex;flex-wrap:wrap;gap:10px;width:100%;margin-top:8px;}
.dfx-card{background:#0a080d;border:1px solid #241a26;border-radius:12px;padding:8px 10px;
  display:flex;flex-direction:column;gap:6px;min-width:230px;flex:1 1 230px;}
.dfx-head{font:800 10px 'Courier New',monospace;letter-spacing:2px;color:#C864C8;text-transform:uppercase;
  display:flex;align-items:center;gap:8px;}
.dfx-sub{font:700 8px 'Courier New',monospace;letter-spacing:1px;color:#6b7686;text-transform:uppercase;}
.dfx-cvs{display:block;background:#000;border-radius:8px;width:100%;height:auto;}
.dfx-cvs.tap{cursor:pointer;}
.dfx-chrono{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;}
.dfx-ccol{display:flex;flex-direction:column;gap:8px;flex:1 1 210px;min-width:0;}
.dfx-swcol{flex:1 0 130px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;}
.dfx-swcol .dfx-wlab{text-align:center;line-height:1.5;}
.dfx-crow{display:flex;align-items:center;gap:6px;}
.dfx-crow .dfx-cvs{flex:1;min-width:0;}
.dfx-clab{font:800 11px 'Courier New',monospace;color:#C864C8;width:14px;text-align:center;}
.dfx-mrow{display:flex;gap:4px;}
.dfx-mini{border:none;border-radius:6px;padding:5px 7px;cursor:pointer;
  font:800 10px 'Courier New',monospace;background:#16233d;color:#bcd3ee;}
.dfx-mini.run{background:#e33;color:#150404;}
.dfx-watch{flex:0 0 auto;display:block;cursor:pointer;}
.dfx-wlab{font:700 8px 'Courier New',monospace;letter-spacing:1px;color:#6b7686;text-transform:uppercase;}
.dfx-chat{display:flex;flex-direction:column;gap:6px;}
.dfx-log{height:96px;overflow:auto;background:#050506;border:1px solid #201620;border-radius:8px;padding:6px;
  display:flex;flex-direction:column;gap:3px;font:600 10px 'Courier New',monospace;color:#cdd6e6;}
.dfx-msg{line-height:1.3;word-break:break-word;}
.dfx-who{font-weight:800;color:#C864C8;}
.dfx-msg.self .dfx-who{color:#9fe0b0;}
.dfx-t{color:#5a6472;}
.dfx-row{display:flex;gap:6px;}
.dfx-in{flex:1;min-width:0;background:#0a0a0d;border:1px solid #241a26;border-radius:7px;padding:6px 8px;
  color:#e7d3ea;font:600 11px 'Courier New',monospace;}
.dfx-in:focus{outline:none;border-color:#C864C8;}
.dfx-send{border:none;border-radius:7px;padding:6px 12px;cursor:pointer;
  font:800 10px 'Courier New',monospace;letter-spacing:1px;background:#7a1f2a;color:#ffe;}
@keyframes dfx-blink{0%,49.9%{opacity:1;}50%,100%{opacity:.12;}}
.dfx-blink{animation:dfx-blink 1s infinite;}
`;

export const pad = (n: number): string => String(n).padStart(2, '0');
export const hms = (ms: number): string => {
  const t = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(t / 3600) % 100)}:${pad(Math.floor(t / 60) % 60)}:${pad(t % 60)}`;
};

export const dpr = Math.min(window.devicePixelRatio || 1, 3);
export function readout(W: number, H: number): { cvs: HTMLCanvasElement; draw: (s: string) => void } {
  const cvs = el('canvas', { class: 'dfx-cvs' });
  cvs.width = W * dpr; cvs.height = H * dpr;
  cvs.style.maxWidth = W + 'px';
  const g = ctx2d(cvs); if (g) g.scale(dpr, dpr);
  return { cvs, draw: (s: string): void => { if (g) drawSegString(g, W, H, s, 'seg', 'red', '#000'); } };
}

/** A frame loop that stops itself once the node has left the document. */
export function animate(node: Node, frame: () => void): void {
  const tick = (): void => { if (!document.contains(node)) return; frame(); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}

export function card(title: string, body: Node, sub?: string): HTMLElement {
  const head = el('div', { class: 'dfx-head' }, sub ? [title, el('span', { class: 'dfx-sub' }, [sub])] : [title]);
  return el('div', { class: 'dfx-card' }, [head, body]);
}

/** A detached twist element carrying the room's identity, so renderPrograms's
 *  openEditor dispatches to the right editor exactly as a real twist would. */
export function synthTwist(pgm: Production, name: string): HTMLElement {
  const titleText = pgm.parentName ? `${pgm.parentName.toUpperCase()} — ${pgm.name}` : pgm.name;
  const t = el('div', { class: 'twist-container', dataset: { prodId: pgm.id, prodName: titleText } });
  if (pgm.parentName) t.dataset.prodFloor = pgm.parentName;
  if (pgm.color) t.style.setProperty('--lcars-color', pgm.color);
  if (pgm.tip) t.dataset.prodTip = JSON.stringify(pgm.tip);
  t.append(el('div', { class: 'twist-title' }, [name]));
  return t;
}

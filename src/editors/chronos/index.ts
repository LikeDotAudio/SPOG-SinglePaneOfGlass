// src/editors/chronos — the CHRONOS graphic set (a graphics source).
//
// A dual chronometer (Channel A + Channel B) plus the local time-of-day, rendered
// as big broadcast readouts on black — the Masterclock rack-panel look. Each face
// is CONFIGURABLE on two axes: FONT (authentic seven-segment vs Arial) and COLOR
// (red vs white). Opened when a CHRONOS feed (extraClass:"chronos-source") is
// routed onto a twist, or a twist is literally named "Chronos".
//
// The A/B chronos are count-up stopwatches with START/STOP + RESET (a minimal
// transport — the RC1000 audit's timer-core promotes this to a full up/down count
// engine later). LOCAL is time-of-day. Drawing is self-contained canvas: a real
// 7-segment digit renderer (lit + ghost segments, per real LED displays) and an
// Arial fallback, so the same time string reads either way.

import type { EditorPlugin } from '../types.js';
import { el, addStyles, ctx2d } from '../../ui/dom.js';
import { drawSegString, type SegFont, type SegColor } from '../../ui/seven-seg.js';

const CSS = `
.cr{display:flex;flex-direction:column;gap:12px;height:100%;min-height:0;color:#dfe8f5;}
.cr-bar{display:flex;flex-wrap:wrap;gap:14px;align-items:center;}
.cr-bar h4{margin:0;color:#C864C8;font:700 11px 'Courier New',monospace;letter-spacing:2px;text-transform:uppercase;}
.cr-grp{display:inline-flex;align-items:center;gap:6px;font:700 10px 'Courier New',monospace;letter-spacing:1px;color:#8aa;text-transform:uppercase;}
.cr-seg{display:inline-flex;border:1px solid #3a2b46;border-radius:9px;overflow:hidden;}
.cr-btn{font:800 11px 'Courier New',monospace;letter-spacing:1px;text-transform:uppercase;padding:7px 13px;border:none;
  background:#1a1220;color:#c9b6d6;cursor:pointer;}
.cr-btn.on{background:#C864C8;color:#160a18;}
.cr-list{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:14px;padding:2px;}
.cr-card{background:#000;border:1px solid #1c1c22;border-radius:12px;padding:10px 12px;
  display:flex;flex-direction:column;gap:8px;}
.cr-head{display:flex;align-items:center;gap:10px;}
.cr-name{font:800 11px 'Courier New',monospace;letter-spacing:2px;color:#7d8ba0;text-transform:uppercase;}
.cr-face{width:100%;height:auto;display:block;}
.cr-xport{display:inline-flex;gap:6px;margin-left:auto;}
.cr-tbtn{font:800 10px 'Courier New',monospace;letter-spacing:1px;text-transform:uppercase;padding:6px 12px;border:none;
  border-radius:8px;background:#16233d;color:#bcd3ee;cursor:pointer;}
.cr-tbtn.run{background:#e33;color:#150404;}
`;

// Faces (seven-segment + Arial, red/white on black) come from the shared
// `ui/seven-seg` renderer — the same read-out the RC1000 timer editor draws.
type Font = SegFont;
type Color = SegColor;
const drawFace = drawSegString;

// ---- time model -------------------------------------------------------------
const pad = (n: number): string => String(n).padStart(2, '0');
/** ms → HH:MM:SS (clamped to a 2-digit hour like the RC1000's 99h ceiling). */
function fmt(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600) % 100, m = Math.floor(total / 60) % 60, s = total % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
function localTime(): string {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

interface Chrono { id: 'A' | 'B'; label: string; ms: number; running: boolean; }
interface Display { kind: 'chrono' | 'local'; label: string; chrono?: Chrono; }

/** Which displays to show, from the routed feed labels (defaults to A + B + LOCAL). */
function deriveDisplays(sources: ReadonlyArray<{ label: string }>): Display[] {
  const chronoA: Chrono = { id: 'A', label: 'CHRONO A', ms: 0, running: false };
  const chronoB: Chrono = { id: 'B', label: 'CHRONO B', ms: 0, running: false };
  const A: Display = { kind: 'chrono', label: 'CHRONO A', chrono: chronoA };
  const B: Display = { kind: 'chrono', label: 'CHRONO B', chrono: chronoB };
  const L: Display = { kind: 'local', label: 'LOCAL TIME' };
  const wantAll = sources.length === 0 || sources.some((s) => /set|chronos/i.test(s.label));
  if (wantAll) return [A, B, L];
  const out: Display[] = [];
  for (const s of sources) {
    if (/local|time/i.test(s.label)) out.push(L);
    else if (/\bb\b|chrono b/i.test(s.label)) out.push(B);
    else if (/\ba\b|chrono a/i.test(s.label)) out.push(A);
  }
  return out.length ? out : [A, B, L];
}

const plugin: EditorPlugin = {
  id: 'chronos',
  title: 'CHRONOS · DUAL CHRONO + LOCAL',
  order: 7,
  blurb: 'Chronos graphic set — dual A/B chronometers + local time on configurable seven-segment or Arial faces (red/white on black).',
  match: (n) => /chrono/i.test(n),
  render(host, ctx) {
    addStyles('twist-editor-chronos', CSS);
    const displays = deriveDisplays(ctx.sources);

    let font: Font = 'seg';
    let color: Color = 'red';

    // ---- style controls ----
    const mkSeg = (opts: Array<[string, () => void, boolean]>): HTMLElement => {
      const box = el('div', { class: 'cr-seg' });
      const btns = opts.map(([label, onClick, active]) => {
        const b = el('button', { class: `cr-btn${active ? ' on' : ''}` }, [label]);
        b.addEventListener('click', () => { onClick(); box.querySelectorAll('.cr-btn').forEach((x) => x.classList.remove('on')); b.classList.add('on'); });
        return b;
      });
      box.append(...btns);
      return box;
    };
    const fontCtl = mkSeg([
      ['7-SEG', () => { font = 'seg'; ctx.services.publishParam?.('style.font', font, { throttle: false }); }, true],
      ['ARIAL', () => { font = 'arial'; ctx.services.publishParam?.('style.font', font, { throttle: false }); }, false],
    ]);
    const colorCtl = mkSeg([
      ['RED', () => { color = 'red'; ctx.services.publishParam?.('style.color', color, { throttle: false }); }, true],
      ['WHITE', () => { color = 'white'; ctx.services.publishParam?.('style.color', color, { throttle: false }); }, false],
    ]);

    // ---- display cards ----
    const list = el('div', { class: 'cr-list' });
    const W = 780, H = 150;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const faces = displays.map((disp) => {
      const cvs = el('canvas', { class: 'cr-face' }) as HTMLCanvasElement;
      cvs.width = W * dpr; cvs.height = H * dpr;
      const g = ctx2d(cvs);
      if (g) g.scale(dpr, dpr);
      const head = el('div', { class: 'cr-head' }, [el('span', { class: 'cr-name' }, [disp.label])]);
      if (disp.chrono) {
        const c = disp.chrono;
        const runBtn = el('button', { class: 'cr-tbtn' }, ['▶ Start']);
        const rstBtn = el('button', { class: 'cr-tbtn' }, ['⟲ Reset']);
        const reflectRun = (): void => {
          runBtn.classList.toggle('run', c.running);
          runBtn.textContent = c.running ? '⏸ Stop' : '▶ Start';
        };
        runBtn.addEventListener('click', () => { c.running = !c.running; reflectRun(); ctx.services.publishParam?.(`run.${c.id}`, c.running, { throttle: false }); });
        rstBtn.addEventListener('click', () => { c.ms = 0; c.running = false; reflectRun(); ctx.services.publishParam?.(`run.${c.id}`, false, { throttle: false }); });
        head.append(el('div', { class: 'cr-xport' }, [runBtn, rstBtn]));
      }
      list.append(el('div', { class: 'cr-card' }, [head, cvs]));
      return { disp, g };
    });

    host.append(el('div', { class: 'cr' }, [
      el('div', { class: 'cr-bar' }, [
        el('h4', {}, ['Chronos']),
        el('div', { class: 'cr-grp' }, ['Font', fontCtl]),
        el('div', { class: 'cr-grp' }, ['Colour', colorCtl]),
      ]),
      list,
    ]));

    // ---- MQTT surface (style + per-chrono run) ----
    ctx.services.advertiseParams?.([
      { name: 'style.font', type: 'string', writable: true },
      { name: 'style.color', type: 'string', writable: true },
      { name: 'run.A', type: 'bool', writable: true },
      { name: 'run.B', type: 'bool', writable: true },
    ]);
    ctx.services.onParam?.('style.font', (v) => { if (v === 'seg' || v === 'arial') { font = v; fontCtl.querySelectorAll('.cr-btn').forEach((b, i) => b.classList.toggle('on', (i === 0) === (v === 'seg'))); } });
    ctx.services.onParam?.('style.color', (v) => { if (v === 'red' || v === 'white') { color = v; colorCtl.querySelectorAll('.cr-btn').forEach((b, i) => b.classList.toggle('on', (i === 0) === (v === 'red'))); } });
    ctx.services.publishParam?.('style.font', font, { throttle: false });
    ctx.services.publishParam?.('style.color', color, { throttle: false });

    // ---- rAF: advance running chronos + redraw every face ----
    let last = performance.now();
    ctx.dispose.raf(() => {
      const now = performance.now();
      const dt = now - last; last = now;
      for (const f of faces) {
        if (f.disp.chrono?.running) f.disp.chrono.ms += dt;
        if (!f.g) continue;
        const str = f.disp.kind === 'local' ? localTime() : fmt(f.disp.chrono?.ms ?? 0);
        drawFace(f.g, W, H, str, font, color);
      }
    });
  },
};

export default plugin;

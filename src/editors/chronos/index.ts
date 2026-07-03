// src/editors/chronos — the CHRONOS graphic set (a graphics source).
//
// A rack of broadcast timer cards on black. Chronos is split into two orthogonal
// halves (see shared.ts):
//   • CONTROLLERS (controllers.ts) — the timing engines: count-up chronometers, a
//     count-down egg timer, the local wall clock. Each owns a millisecond value +
//     transport (start/stop/reset) and advances itself each frame.
//   • DISPLAYS (displays/*.ts) — the visual read-outs, collected here with
//     import.meta.glob so adding one is "drop a file". A display renders ONE
//     controller's value, so any card can be shown as a digital LED read-out, a
//     classic analog stopwatch, or a wind-up egg timer via its per-card picker.
//
// Opened when a CHRONOS feed (extraClass:"chronos-source") is routed onto a twist,
// or a twist is literally named "Chronos". Self-contained: controllers are seeded
// from the routed feed labels and driven off the browser clock via rAF.

import type { EditorPlugin } from '../types.js';
import { el, addStyles, ctx2d } from '../../ui/dom.js';
import type { SegFont, SegColor } from '../../ui/seven-seg.js';
import { type DisplayDef, type CtrlKind } from './shared.js';
import { Controller, deriveControllers } from './controllers.js';

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
.cr-sel{font:800 9px 'Courier New',monospace;letter-spacing:1px;text-transform:uppercase;cursor:pointer;
  background:#241a26;color:#e0c6ec;border:1px solid #3a2b46;border-radius:6px;padding:4px 5px;}
.cr-body{position:relative;width:100%;}
.cr-face{position:absolute;inset:0;width:100%;height:100%;display:block;}
.cr-xport{display:inline-flex;gap:6px;margin-left:auto;align-items:center;}
.cr-tbtn{font:800 10px 'Courier New',monospace;letter-spacing:1px;text-transform:uppercase;padding:6px 12px;border:none;
  border-radius:8px;background:#16233d;color:#bcd3ee;cursor:pointer;}
.cr-tbtn.set{background:#2a1c3a;color:#d9b6ee;}
.cr-tbtn.run{background:#e33;color:#150404;}
.cr-live{font:800 10px 'Courier New',monospace;letter-spacing:2px;color:#7de07d;}
`;

// ---- displays: collected from displays/*.ts (drop a file to add one) --------
const displayMods = import.meta.glob<{ default: DisplayDef }>('./displays/*.ts', { eager: true });
const DISPLAYS: DisplayDef[] = Object.values(displayMods)
  .map((m) => m.default)
  .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
const DISPLAY_BY_ID = new Map(DISPLAYS.map((d) => [d.id, d]));
const FALLBACK = DISPLAYS[0] as DisplayDef;   // displays/ always ships at least sevenseg

// The read-out a controller opens with (each card's picker can then differ).
const DEFAULT_DISPLAY: Record<CtrlKind, string> = { up: 'stopwatch', down: 'eggtimer', clock: 'sevenseg' };
const displayFor = (id: string): DisplayDef => DISPLAY_BY_ID.get(id) ?? FALLBACK;

const plugin: EditorPlugin = {
  id: 'chronos',
  title: 'CHRONOS · CHRONO RACK',
  order: 7,
  blurb: 'Chronos graphic set — count-up chronometers, a count-down egg timer and local time, each rendered as a digital LED read-out, a classic analog stopwatch or a wind-up egg timer (per-card picker).',
  match: (n) => /chrono/i.test(n),
  render(host, ctx) {
    addStyles('twist-editor-chronos', CSS);
    const dpr = Math.min(window.devicePixelRatio || 1, 3);

    let font: SegFont = 'seg';
    let color: SegColor = 'red';

    // ---- card model: a controller + the display drawing it ------------------
    interface Card {
      ctrl: Controller;
      displayId: string;
      body: HTMLElement;
      cvs: HTMLCanvasElement;
      g: CanvasRenderingContext2D | null;
      reflectRun?: () => void;
    }
    const cards: Card[] = [];
    const list = el('div', { class: 'cr-list' });

    const publishRun = (c: Controller): void => ctx.services.publishParam?.(`run.${c.id}`, c.running, { throttle: false });

    // Transport row — adapts to the controller kind (a clock has none; a down
    // count also gets ＋1m / ＋10s dial-winders).
    const mkTransport = (card: Card): HTMLElement => {
      const c = card.ctrl;
      if (c.kind === 'clock') return el('div', { class: 'cr-xport' }, [el('span', { class: 'cr-live' }, ['◉ LIVE'])]);
      const runBtn = el('button', { class: 'cr-tbtn' }, ['▶ Start']);
      const rstBtn = el('button', { class: 'cr-tbtn' }, ['⟲ Reset']);
      const reflect = (): void => { runBtn.classList.toggle('run', c.running); runBtn.textContent = c.running ? '⏸ Stop' : '▶ Start'; };
      card.reflectRun = reflect;
      runBtn.addEventListener('click', () => { c.toggle(); reflect(); publishRun(c); });
      rstBtn.addEventListener('click', () => { c.reset(); reflect(); publishRun(c); });
      const kids: HTMLElement[] = [runBtn];
      if (c.kind === 'down') {
        const add = (label: string, ms: number): HTMLElement => {
          const b = el('button', { class: 'cr-tbtn set' }, [label]);
          b.addEventListener('click', () => { c.addCapacity(ms); reflect(); });
          return b;
        };
        kids.push(add('＋1m', 60_000), add('＋10s', 10_000));
      }
      kids.push(rstBtn);
      return el('div', { class: 'cr-xport' }, kids);
    };

    const setDisplay = (card: Card, id: string): void => {
      card.displayId = displayFor(id).id;
      card.body.style.height = `${displayFor(card.displayId).h}px`;
    };

    const addCard = (ctrl: Controller): void => {
      const cvs = el('canvas', { class: 'cr-face' }) as HTMLCanvasElement;
      const body = el('div', { class: 'cr-body' }, [cvs]);
      const card: Card = { ctrl, displayId: displayFor(DEFAULT_DISPLAY[ctrl.kind]).id, body, cvs, g: ctx2d(cvs) };
      const sel = el('select', { class: 'cr-sel', title: 'Read-out' }) as HTMLSelectElement;
      for (const d of DISPLAYS) sel.append(el('option', { value: d.id }, [d.short]));
      sel.value = card.displayId;
      sel.addEventListener('change', () => setDisplay(card, sel.value));
      const head = el('div', { class: 'cr-head' }, [el('span', { class: 'cr-name' }, [ctrl.label]), sel, mkTransport(card)]);
      body.style.height = `${displayFor(card.displayId).h}px`;
      list.append(el('div', { class: 'cr-card' }, [head, body]));
      cards.push(card);
    };

    for (const ctrl of deriveControllers(ctx.sources)) addCard(ctrl);

    // ---- style controls (drive the digital read-outs) ----
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

    host.append(el('div', { class: 'cr' }, [
      el('div', { class: 'cr-bar' }, [
        el('h4', {}, ['Chronos']),
        el('div', { class: 'cr-grp' }, ['Font', fontCtl]),
        el('div', { class: 'cr-grp' }, ['Colour', colorCtl]),
      ]),
      list,
    ]));

    // ---- MQTT surface (style + per-controller run) --------------------------
    const runnable = cards.map((c) => c.ctrl).filter((c) => c.kind !== 'clock');
    ctx.services.advertiseParams?.([
      { name: 'style.font', type: 'string', writable: true },
      { name: 'style.color', type: 'string', writable: true },
      ...runnable.map((c) => ({ name: `run.${c.id}`, type: 'bool' as const, writable: true })),
    ]);
    ctx.services.onParam?.('style.font', (v) => { if (v === 'seg' || v === 'arial') { font = v; fontCtl.querySelectorAll('.cr-btn').forEach((b, i) => b.classList.toggle('on', (i === 0) === (v === 'seg'))); } });
    ctx.services.onParam?.('style.color', (v) => { if (v === 'red' || v === 'white') { color = v; colorCtl.querySelectorAll('.cr-btn').forEach((b, i) => b.classList.toggle('on', (i === 0) === (v === 'red'))); } });
    for (const card of cards) {
      const c = card.ctrl;
      if (c.kind === 'clock') continue;
      ctx.services.onParam?.(`run.${c.id}`, (v) => { if (v) c.start(); else c.stop(); card.reflectRun?.(); });
    }
    ctx.services.publishParam?.('style.font', font, { throttle: false });
    ctx.services.publishParam?.('style.color', color, { throttle: false });

    // ---- rAF: advance every controller + redraw its display -----------------
    const draw = (card: Card, now: number): void => {
      const { cvs, g } = card;
      if (!g) return;
      const cw = cvs.clientWidth, ch = cvs.clientHeight;
      if (!cw || !ch) return;
      const bw = Math.round(cw * dpr), bh = Math.round(ch * dpr);
      if (cvs.width !== bw) cvs.width = bw;
      if (cvs.height !== bh) cvs.height = bh;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      displayFor(card.displayId).draw(g, cw, ch, {
        ms: card.ctrl.ms, kind: card.ctrl.kind, running: card.ctrl.running, font, color, label: card.ctrl.label, now,
      });
    };

    let last = performance.now();
    ctx.dispose.raf(() => {
      const now = performance.now();
      const dt = Math.min(200, now - last); last = now;
      for (const card of cards) {
        if (card.ctrl.tick(dt)) { card.reflectRun?.(); publishRun(card.ctrl); }
        draw(card, now);
      }
    });
  },
};

export default plugin;

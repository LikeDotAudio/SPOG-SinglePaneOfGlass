// src/editors/timer/panel — one self-contained channel keypad + the shared FUNCTIONS
// drawer and GPI prompts (split from index.ts, audit §4.5). Each panel is a full
// timer face (6-digit LED read-out, function row, calculator keypad) driving its
// channel directly; the drawer carries the global/cross commands (audit §2A).

import { el, ctx2d } from '../../ui/dom.js';
import { drawSegString } from '../../ui/seven-seg.js';
import type { TimerEngine, ChanId, GpiWhen } from './engine.js';

const W = 470, H = 96;

export interface TimerPanel {
  panel: HTMLElement;
  update(): void;
  setSel(on: boolean): void;
}

// ---- shared GPI prompts (the bus stands in for the opto wiring) ----
const openGpiOut = (engine: TimerEngine, defChan: ChanId): void => {
  const port = Number(prompt('GPI OUT port (0/1)', '0')) === 1 ? 1 : 0;
  const chan = (prompt('Channel (A/B)', defChan) ?? 'A').toUpperCase() === 'B' ? 'B' : 'A';
  const when = ((prompt('Fire when? start/end/match', 'end') ?? 'end').toLowerCase()) as GpiWhen;
  engine.programGpiOut(port, chan as ChanId, ['start', 'end', 'match'].includes(when) ? when : 'end');
};
const openGpiIn = (engine: TimerEngine): void => {
  const port = Number(prompt('GPI IN port (0/1)', '0')) === 1 ? 1 : 0;
  const chan = (prompt('Channel (A/B)', 'A') ?? 'A').toUpperCase() === 'B' ? 'B' : 'A';
  const preset = Math.max(0, Math.min(19, Number(prompt('Recall preset (0-19)', '0')) || 0));
  engine.programGpiIn(port, chan as ChanId, preset);
};

// ---- one self-contained panel per channel (no A/B switch) ----
export function buildPanel(engine: TimerEngine, id: ChanId, dpr: number): TimerPanel {
  const S = engine.state;
  const cvs = el('canvas', { class: 'rc-canvas' }) as HTMLCanvasElement;
  cvs.width = W * dpr; cvs.height = H * dpr;
  const g = ctx2d(cvs); if (g) g.scale(dpr, dpr);
  const dir = el('span', { class: 'rc-badge' }, ['▼ DN']);
  const run = el('span', { class: 'rc-badge' }, ['‖']);
  const st = el('span', { class: 'st' }, ['READY']);
  const bezel = el('div', { class: 'rc-bezel' }, [cvs, el('span', { class: 'rc-badges' }, [dir, run])]);

  const withShift = (primary: () => void, shifted: () => void): void => {
    const c = S.channels[id];
    if (c.shift) { shifted(); c.shift = false; } else primary();
  };
  const fnKey = (sub: string, label: string, primary: () => void, shifted: () => void, cls = ''): HTMLElement => {
    const b = el('button', { class: `rc-k ${cls}` }, [el('span', { class: 'sub' }, [sub]), document.createTextNode(label)]);
    b.addEventListener('click', () => withShift(primary, shifted));
    return b;
  };
  const digit = (n: number): HTMLElement => {
    const b = el('button', { class: 'rc-k' }, [el('span', { class: 'sub' }, ['']), document.createTextNode(String(n))]);
    b.addEventListener('click', () => engine.pressDigit(id, n));   // pressDigit consumes SHIFT itself
    return b;
  };
  const shiftKey = el('button', { class: 'rc-k shift' }, [el('span', { class: 'sub' }, ['']), 'SHIFT']);
  shiftKey.addEventListener('click', () => engine.toggleShift(id));

  const fnRow = el('div', { class: 'rc-fnrow' }, [
    fnKey('GPI', 'SEC/FRM', () => engine.toggleFormat(id), () => openGpiOut(engine, id)),
    fnKey('', 'UP/DN', () => engine.toggleDirection(id), () => engine.reverseDirection(id)),
    fnKey('RTN-IN', 'INPUT', () => engine.toggleShowInput(id), () => engine.setReturnToInput(id)),
    fnKey('CLR ALL', 'CLEAR', () => engine.clearEntry(id), () => engine.clearAll(id)),
  ]);
  const keypad = el('div', { class: 'rc-keys' }, [
    digit(7), digit(8), digit(9), fnKey('', 'PRESET', () => engine.armPreset(id), () => engine.armPreset(id), 'op'),
    digit(4), digit(5), digit(6), fnKey('INC', '+', () => engine.beginCalc(id, '+'), () => engine.nudge(id, 1), 'op'),
    digit(1), digit(2), digit(3), fnKey('DEC', '−', () => engine.beginCalc(id, '-'), () => engine.nudge(id, -1), 'op'),
    shiftKey, digit(0),
    fnKey('FOLLOW', 'START/STOP', () => engine.startStop(id), () => engine.followDual(id), 'go wide'),
  ]);

  const panel = el('div', { class: 'rc-panel' }, [
    el('div', { class: 'rc-phead' }, [`CHANNEL ${id}`, el('span', { class: 'kb' }, ['⌨ KEYPAD']), st]),
    bezel, fnRow, keypad,
  ]);

  const update = (): void => {
    const c = S.channels[id];
    // Blink the 1st colon at ≤10s left, the 2nd at ≤5s left (down count).
    const rem = engine.secondsRemaining(id);
    const on = Math.floor(performance.now() / 350) % 2 === 0;
    const sep: boolean[] = [rem <= 10 ? on : true, rem <= 5 ? on : true];
    if (g) drawSegString(g, W, H, engine.displayString(id), 'seg', 'red', '#000', sep);
    cvs.style.opacity = String(0.42 + (S.brightness / 14) * 0.58);
    dir.textContent = c.direction === 'up' ? '▲ UP' : '▼ DN';
    run.textContent = c.running ? '▶' : '‖'; run.classList.toggle('hot', c.running);
    st.textContent = c.status;
    shiftKey.classList.toggle('on', c.shift);
  };
  return { panel, update, setSel: (on: boolean): void => { panel.classList.toggle('sel', on); } };
}

// ---- shared FUNCTIONS drawer: the global/cross commands (audit §2A) ----
export function buildFunctionsDrawer(engine: TimerEngine): HTMLElement {
  const fnBtn = (label: string, fn: () => void): HTMLElement => { const b = el('button', { class: 'rc-fn' }, [label]); b.addEventListener('click', fn); return b; };
  return el('details', { class: 'rc-drawer' }, [
    el('summary', {}, ['SHIFT functions — flat command palette (audit §2A)']),
    el('div', { class: 'rc-fns' }, [
      fnBtn('Start/Stop both', () => engine.startStopBoth()),
      fnBtn('Swap A ↔ B', () => engine.swapChannels()),
      fnBtn('Backtime → end (A)', () => engine.countdownToEnd('A')),
      fnBtn('Backtime → end (B)', () => engine.countdownToEnd('B')),
      fnBtn('Frame rate ▸', () => engine.cycleFrameRate()),
      fnBtn('Brightness ▸', () => engine.brightnessStep()),
      fnBtn('Time base UTC/Local', () => engine.toggleTimeBase()),
      fnBtn('12 / 24 hour', () => engine.toggleHour12()),
      fnBtn('RS-232 format', () => engine.toggleSerialFormat()),
      fnBtn('Firmware / key-test', () => engine.showFirmware()),
      fnBtn('Leading-zero blank', () => engine.toggleLeadingZero()),
      fnBtn('Program GPI OUT…', () => openGpiOut(engine, 'A')),
      fnBtn('Program GPI IN…', () => openGpiIn(engine)),
      fnBtn('Fire GPI IN 0', () => engine.fireGpiIn(0)),
      fnBtn('Fire GPI IN 1', () => engine.fireGpiIn(1)),
    ]),
  ]);
}

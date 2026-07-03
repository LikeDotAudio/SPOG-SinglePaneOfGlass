// src/editors/timer — the Dual-Channel Up/Down production timer (a graphics source).
//
// TWO independent keypads on screen at once — one per channel, no A/B switch. Each
// panel is a full timer face: a 6-digit red LED read-out, the GPI · SEC-FRM ·
// UP-DN · INPUT · CLR function row, and the calculator keypad (PRESET · INC · DEC ·
// SHIFT · START/STOP), driving its own channel directly. The count math is the pure
// timer-core; the per-channel state machine + every named SHIFT command is engine.ts.
// A shared FUNCTIONS drawer carries the global/cross commands (audit §2A). Opened
// when a TIMER feed (extraClass:"timer-source") is routed onto a twist, or a twist
// is named "Timer".

import type { EditorPlugin } from '../types.js';
import { el, addStyles, ctx2d } from '../../ui/dom.js';
import { drawSegString } from '../../ui/seven-seg.js';
import { logAction } from '../../ui/console/captains-log.js';
import { TimerEngine, type ChanId, type GpiWhen } from './engine.js';
import { formatValue } from '../../domain/timer-core/index.js';

const CSS = `
.rc{display:flex;flex-direction:column;gap:14px;height:100%;min-height:0;overflow:auto;color:#e7d3ea;
  font-family:'Courier New',Consolas,monospace;}
.rc-panels{display:grid;grid-template-columns:repeat(auto-fit,minmax(430px,1fr));gap:16px;}
.rc-panel{display:flex;flex-direction:column;gap:10px;background:#0a080d;border:1px solid #241a26;border-radius:14px;padding:12px;}
.rc-phead{display:flex;align-items:center;gap:10px;font:800 12px 'Courier New',monospace;letter-spacing:2px;color:#C864C8;text-transform:uppercase;}
.rc-phead .st{margin-left:auto;font:700 10px 'Courier New',monospace;letter-spacing:1px;color:#9fe0b0;text-transform:none;}
.rc-bezel{background:#050506;border:2px solid #201620;border-radius:10px;padding:8px 10px;display:flex;align-items:center;gap:8px;}
.rc-canvas{flex:1;min-width:0;height:auto;display:block;}
.rc-badges{display:flex;flex-direction:column;gap:3px;align-items:flex-end;min-width:40px;font:700 9px 'Courier New',monospace;letter-spacing:1px;}
.rc-badge{color:#6b7686;}.rc-badge.hot{color:#ff5a5a;}
.rc-fnrow,.rc-keys{display:grid;gap:7px;grid-template-columns:repeat(4,1fr);}
.rc-k{border:none;border-radius:9px;padding:12px 4px;cursor:pointer;font:800 12px 'Courier New',monospace;letter-spacing:1px;
  background:#161020;color:#d8c6e2;text-transform:uppercase;position:relative;}
.rc-k .sub{display:block;font:700 7px 'Courier New',monospace;color:#8a5aa0;letter-spacing:1px;margin-bottom:2px;min-height:8px;}
.rc-k.op{background:#241028;}
.rc-k.go{background:#7a1f2a;color:#ffe;}
.rc-k.wide{grid-column:span 2;}
.rc-k.shift{background:#2a2036;}
.rc-k.shift.on{background:#ffd23c;color:#241a12;}
.rc-k:active{filter:brightness(1.3);}
.rc-drawer{background:#0a0a0d;border:1px solid #20202a;border-radius:8px;padding:6px 10px;}
.rc-drawer summary{cursor:pointer;font:800 11px 'Courier New',monospace;letter-spacing:2px;color:#C864C8;text-transform:uppercase;}
.rc-fns{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px;margin-top:8px;}
.rc-fn{border:1px solid #2a2030;background:#120c18;color:#c9b6d6;border-radius:7px;padding:7px 9px;cursor:pointer;
  font:700 10px 'Courier New',monospace;letter-spacing:1px;text-transform:uppercase;text-align:left;}
.rc-fn:hover{background:#1c1226;}
.rc-gstat{font:700 10px 'Courier New',monospace;letter-spacing:1px;color:#6b7686;display:flex;gap:14px;flex-wrap:wrap;padding:0 4px;}
.rc-gstat b{color:#9fe0b0;}
.rc-bezel{cursor:pointer;}
.rc-panel.sel{border-color:#C864C8;box-shadow:0 0 0 1px #C864C8,0 0 16px rgba(200,100,200,.22);}
.rc-panel.sel .rc-phead{color:#e79ae7;}
.rc-phead .kb{margin-left:8px;font:700 9px 'Courier New',monospace;letter-spacing:1px;color:#C864C8;opacity:0;transition:opacity .12s;}
.rc-panel.sel .rc-phead .kb{opacity:1;}
.rc-hint{font:700 10px 'Courier New',monospace;letter-spacing:.4px;color:#6b7686;padding:0 4px;}
.rc-hint b{color:#C864C8;}
.rc-sc{background:#0a0a0d;border:1px solid #20202a;border-radius:8px;padding:10px 12px;}
.rc-sc-title{font:800 11px 'Courier New',monospace;letter-spacing:2px;color:#C864C8;text-transform:uppercase;margin-bottom:9px;}
.rc-sc-title span{color:#6b7686;letter-spacing:.4px;text-transform:none;font-weight:700;}
.rc-sc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:7px 16px;}
.rc-sc-row{display:flex;align-items:center;gap:10px;font:700 10px 'Courier New',monospace;}
.rc-kbd{display:inline-flex;align-items:center;justify-content:center;min-width:38px;padding:4px 8px;border-radius:6px;
  background:#161020;border:1px solid #2a2030;box-shadow:0 1px 0 #000;color:#ffd23c;font:800 11px 'Courier New',monospace;letter-spacing:1px;flex:0 0 auto;}
.rc-sc-desc{color:#c9b6d6;}
`;

const plugin: EditorPlugin = {
  id: 'timer',
  title: 'TIMER · DUAL COUNT',
  order: 7,
  blurb: 'Dual-channel up/down production timer — two independent 6-digit count keypads, presets, follow buffer, calculator, GPI on the bus.',
  match: (n) => /\btimer\b|count.?down|count.?up|stopwatch/i.test(n),
  render(host, ctx) {
    addStyles('twist-editor-timer', CSS);

    const engine = new TimerEngine({
      onChange: () => publish(),
      onLog: (m) => logAction(m),
      onGpi: (port, chan, when) => { logAction(`Timer: GPI OUT ${port} fired (chan ${chan}, ${when})`); ctx.services.publishParam?.(`gpiOut.${port}`, { chan, when }, { throttle: false }); },
    });
    const S = engine.state;
    const W = 470, H = 96, dpr = Math.min(window.devicePixelRatio || 1, 3);

    // ---- one self-contained panel per channel (no A/B switch) ----
    const buildPanel = (id: ChanId) => {
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
        fnKey('GPI', 'SEC/FRM', () => engine.toggleFormat(id), () => openGpiOut(id)),
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
    };

    // ---- shared FUNCTIONS drawer + GPI prompts ----
    const openGpiOut = (defChan: ChanId): void => {
      const port = Number(prompt('GPI OUT port (0/1)', '0')) === 1 ? 1 : 0;
      const chan = (prompt('Channel (A/B)', defChan) ?? 'A').toUpperCase() === 'B' ? 'B' : 'A';
      const when = ((prompt('Fire when? start/end/match', 'end') ?? 'end').toLowerCase()) as GpiWhen;
      engine.programGpiOut(port, chan as ChanId, ['start', 'end', 'match'].includes(when) ? when : 'end');
    };
    const openGpiIn = (): void => {
      const port = Number(prompt('GPI IN port (0/1)', '0')) === 1 ? 1 : 0;
      const chan = (prompt('Channel (A/B)', 'A') ?? 'A').toUpperCase() === 'B' ? 'B' : 'A';
      const preset = Math.max(0, Math.min(19, Number(prompt('Recall preset (0-19)', '0')) || 0));
      engine.programGpiIn(port, chan as ChanId, preset);
    };
    const fnBtn = (label: string, fn: () => void): HTMLElement => { const b = el('button', { class: 'rc-fn' }, [label]); b.addEventListener('click', fn); return b; };
    const drawer = el('details', { class: 'rc-drawer' }, [
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
        fnBtn('Program GPI OUT…', () => openGpiOut('A')),
        fnBtn('Program GPI IN…', openGpiIn),
        fnBtn('Fire GPI IN 0', () => engine.fireGpiIn(0)),
        fnBtn('Fire GPI IN 1', () => engine.fireGpiIn(1)),
      ]),
    ]);
    const gstat = el('div', { class: 'rc-gstat' });

    const panelA = buildPanel('A');
    const panelB = buildPanel('B');

    // ---- channel selection: touch a panel (its display OR its keypad) to select
    // it; the physical numeric keypad then drives the SELECTED channel. ----
    let selected: ChanId = 'A';
    const setSelected = (id: ChanId): void => {
      selected = id;
      panelA.setSel(selected === 'A');
      panelB.setSel(selected === 'B');
    };
    // Clicks on the keypad buttons bubble up here too, so pressing any on-screen
    // key also selects that channel (as requested).
    panelA.panel.addEventListener('click', () => setSelected('A'));
    panelB.panel.addEventListener('click', () => setSelected('B'));

    // Keyboard-shortcuts window: the numeric keypad drives the SELECTED channel.
    // Kept in lock-step with the onKey handler below — every mapped key is listed.
    const SHORTCUTS: Array<[string, string]> = [
      ['0–9', 'Enter time digits'],
      ['Enter', 'Start / Stop the timer'],
      ['Shift', 'SHIFT — unlocks the shifted 0–6 functions'],
      ['+', 'INC — calculator add'],
      ['−', 'DEC — calculator subtract'],
      ['Del', 'Clear the counter'],
      ['✳', 'Switch channel A / B'],
      ['÷', 'Flip count direction'],
    ];
    const hint = el('div', { class: 'rc-sc' }, [
      el('div', { class: 'rc-sc-title' }, ['⌨ Keyboard Shortcuts ', el('span', {}, ['— touch a channel to select it, then the number pad drives it'])]),
      el('div', { class: 'rc-sc-grid' }, SHORTCUTS.map(([k, d]) =>
        el('div', { class: 'rc-sc-row' }, [el('span', { class: 'rc-kbd' }, [k]), el('span', { class: 'rc-sc-desc' }, [d])]))),
    ]);

    host.append(el('div', { class: 'rc' }, [
      el('div', { class: 'rc-panels' }, [panelA.panel, panelB.panel]),
      hint, gstat, drawer,
    ]));
    setSelected('A');

    // ---- physical keyboard: the numeric keypad mirrors the on-screen keys for the
    // selected channel. Digits 0-9 enter time; Enter = START/STOP; Shift = the SHIFT
    // toggle (so 0-6 then fire their SHIFT functions); + / − = the INC / DEC calc
    // keys; Delete clears the counter; ✳ (*) switches A↔B; ÷ (/) flips direction.
    // e.repeat is ignored so a held key can't spam the SHIFT toggle or transport. ----
    const onKey = (e: KeyboardEvent): void => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      const k = e.key;
      if (k.length === 1 && k >= '0' && k <= '9') { engine.pressDigit(selected, Number(k)); e.preventDefault(); }
      else if (k === 'Enter') { engine.startStop(selected); e.preventDefault(); }
      else if (k === 'Shift') { engine.toggleShift(selected); e.preventDefault(); }
      else if (k === '+') { engine.beginCalc(selected, '+'); e.preventDefault(); }
      else if (k === '-') { engine.beginCalc(selected, '-'); e.preventDefault(); }
      else if (k === 'Delete') { engine.clearAll(selected); e.preventDefault(); }
      else if (k === '*') { setSelected(selected === 'A' ? 'B' : 'A'); e.preventDefault(); }
      else if (k === '/') { engine.toggleDirection(selected); e.preventDefault(); }
    };
    window.addEventListener('keydown', onKey);
    ctx.dispose.add(() => window.removeEventListener('keydown', onKey));

    // ---- MQTT surface (the GPI/timecode wiring) ----
    ctx.services.advertiseParams?.([
      { name: 'value.A', type: 'string' }, { name: 'value.B', type: 'string' },
      { name: 'run.A', type: 'bool', writable: true }, { name: 'run.B', type: 'bool', writable: true },
      { name: 'gpiIn.0', type: 'bool', writable: true }, { name: 'gpiIn.1', type: 'bool', writable: true },
    ]);
    ctx.services.onParam?.('run.A', (v) => { S.channels.A.running = !!v; });
    ctx.services.onParam?.('run.B', (v) => { S.channels.B.running = !!v; });
    ctx.services.onParam?.('gpiIn.0', (v) => { if (v) engine.fireGpiIn(0); });
    ctx.services.onParam?.('gpiIn.1', (v) => { if (v) engine.fireGpiIn(1); });

    function publish(): void {
      const fmt = (id: ChanId): string => formatValue(S.channels[id].value, S.serialHmsf ? 'msf' : S.channels[id].format, S.fps);
      ctx.services.publishParam?.('value.A', fmt('A'));
      ctx.services.publishParam?.('value.B', fmt('B'));
      ctx.services.publishParam?.('run.A', S.channels.A.running, { throttle: false });
      ctx.services.publishParam?.('run.B', S.channels.B.running, { throttle: false });
    }

    function renderGlobal(): void {
      gstat.replaceChildren(
        el('span', {}, ['FPS ', el('b', {}, [String(S.fps)])]),
        el('span', {}, ['PRESETS ', el('b', {}, [String(S.presets.filter(Boolean).length) + '/20'])]),
        el('span', {}, ['BRIGHT ', el('b', {}, [String(S.brightness + 1) + '/15'])]),
        el('span', {}, ['LEAD-ZERO ', el('b', {}, [S.leadingZero ? 'ON' : 'BLANK'])]),
        ...(S.firmware ? [el('span', {}, ['FW ', el('b', {}, [S.firmware])])] : []),
      );
    }

    publish();
    let last = performance.now();
    ctx.dispose.raf(() => {
      const now = performance.now();
      engine.tick(now - last); last = now;
      panelA.update(); panelB.update(); renderGlobal();
    });
  },
};

export default plugin;

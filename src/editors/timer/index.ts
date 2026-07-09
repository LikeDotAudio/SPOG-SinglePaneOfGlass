// src/editors/timer — the Dual-Channel Up/Down production timer (a graphics source).
//
// TWO independent keypads on screen at once — one per channel, no A/B switch. Each
// panel is a full timer face: a 6-digit red LED read-out, the GPI · SEC-FRM ·
// UP-DN · INPUT · CLR function row, and the calculator keypad (PRESET · INC · DEC ·
// SHIFT · START/STOP), driving its own channel directly. The count math is the pure
// timer-core; the per-channel state machine + every named SHIFT command is engine.ts.
// A shared FUNCTIONS drawer carries the global/cross commands (audit §2A). Opened
// when a TIMER feed (extraClass:"timer-source") is routed onto a twist, or a twist
// is named "Timer". Chrome (styles), the locked wall-clock header, and the channel
// panels/drawer are split into sibling modules (audit §4.5).

import { VOICE_COMMANDS } from './VOICE.js';
import type { EditorPlugin } from '../types.js';
import { el, addStyles } from '../../ui/dom.js';
import { logAction } from '../../ui/console/captains-log.js';
import { TimerEngine, type ChanId } from './engine.js';
import { formatValue } from '../../domain/timer-core/index.js';
import { CSS } from './styles.js';
import { buildWallClock } from './wall-clock.js';
import { buildPanel, buildFunctionsDrawer } from './panel.js';
import { getBus } from '../../platform/mqtt/index.js';
import { timeSync } from '../../platform/time-sync.js';

const plugin: EditorPlugin = {
  id: 'timer',
  title: 'TIMER · DUAL COUNT',
  order: 7,
  blurb: 'Dual-channel up/down production timer — two independent 6-digit count keypads, presets, follow buffer, calculator, GPI on the bus; a locked time-of-day clock (zone · resolution · face, same faces as the clock bench) pinned above the channels.',
  match: (n) => /\btimer\b|count.?down|count.?up|stopwatch/i.test(n),
  voiceCommands: VOICE_COMMANDS,
  render(host, ctx) {
    addStyles('twist-editor-timer', CSS);
    timeSync.init();

    const engine = new TimerEngine({
      onChange: () => publish(),
      onLog: (m) => logAction(m),
      onGpi: (port, chan, when) => { logAction(`Timer: GPI OUT ${port} fired (chan ${chan}, ${when})`); ctx.services.publishParam?.(`gpiOut.${port}`, { chan, when }, { throttle: false }); },
    });
    const S = engine.state;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);

    // ---- locked wall-clock header (same zone · resolution · face as the bench) ----
    const clock = buildWallClock(ctx);

    // ---- one self-contained panel per channel (no A/B switch) + FUNCTIONS drawer ----
    const drawer = buildFunctionsDrawer(engine);
    const gstat = el('div', { class: 'rc-gstat' });

    const panelA = buildPanel(engine, 'A', dpr);
    const panelB = buildPanel(engine, 'B', dpr);

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
      clock.strip,
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
      { name: 'clock.zone', type: 'string', writable: true },
      { name: 'clock.face', type: 'string', writable: true },
      { name: 'clock.res', type: 'string', writable: true },
    ]);
    ctx.services.onParam?.('clock.zone', (v) => clock.setZoneFromLabel(String(v)));
    ctx.services.onParam?.('clock.face', (v) => clock.setFace(String(v)));
    ctx.services.onParam?.('clock.res', (v) => clock.setRes(String(v)));
    ctx.services.publishParam?.('clock.zone', clock.zoneLabel(), { throttle: false });
    ctx.services.publishParam?.('clock.face', clock.faceId(), { throttle: false });
    ctx.services.publishParam?.('clock.res', clock.resId(), { throttle: false });
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
      
      if (ctx.production.id) {
        timeSync.claimMaster();
        getBus().publishValue(`destinations/${ctx.production.id}/counters_timer`, {
          A: { running: S.channels.A.running, valueFrames: S.channels.A.value, fps: S.fps, unix: timeSync.now(), direction: S.channels.A.direction },
          B: { running: S.channels.B.running, valueFrames: S.channels.B.value, fps: S.fps, unix: timeSync.now(), direction: S.channels.B.direction }
        }, { retain: true });
      }
    }

    if (ctx.production.id) {
      getBus().subscribe(`destinations/${ctx.production.id}/counters_timer`, (v: any) => {
        if (v && v.A && v.B) {
          S.channels.A.running = v.A.running; S.channels.A.value = v.A.valueFrames;
          S.channels.B.running = v.B.running; S.channels.B.value = v.B.valueFrames;
          engine['changed'](null);
        }
      });
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
      clock.draw(now);
      panelA.update(); panelB.update(); renderGlobal();
    });
  },
};

export default plugin;

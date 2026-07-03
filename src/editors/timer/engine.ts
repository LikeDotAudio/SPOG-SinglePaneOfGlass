// src/editors/timer/engine — the RC1000 dual-channel controller (audit T2/T4).
//
// A DOM-free state machine over two timer-core channels. The panel renders TWO
// independent keypads (one per channel, no A/B switch), so ALL interaction state
// — keypad entry, calculator, preset-arm, SHIFT — lives PER CHANNEL. Every RC1000
// key and SHIFT function (audit §2A) is a named method taking a channel id; global
// settings (frame rate, brightness, swap, GPI) take none. The panel reads `state`
// each frame; the engine calls `onChange` after mutations (publish) and `onLog` /
// `onGpi` for Captain's-Log + GPI events (the bus stands in for the opto wiring).

import {
  advance, calc, formatValue, maxFrames, nudgeFrames, parseEntry,
  type Direction, type Fps, type TimeFormat,
} from '../../domain/timer-core/index.js';

export type ChanId = 'A' | 'B';
export interface Preset { frames: number; direction: Direction; }
export type GpiWhen = 'start' | 'end' | 'match';
export interface GpiOut { port: 0 | 1; chan: ChanId; when: GpiWhen; matchFrames: number; durationFrames: number; armed: boolean; }
export interface GpiIn { port: 0 | 1; chan: ChanId; preset: number; }

export interface Channel {
  value: number;            // frames (float while running)
  direction: Direction;
  format: TimeFormat;
  running: boolean;
  blank: boolean;           // CLR ALL → dashes until next entry/recall
  followBuffer: number[];   // queued counts (frames), FIFO
  showInput: boolean;       // INPUT: overlay the reference timecode
  returnToInput: boolean;
  matchFired: boolean;
  overtime: boolean;        // a down count reached 0 and is now counting UP (over the target)
  // per-keypad interaction state
  entry: string;
  entering: boolean;
  presetArmed: boolean;
  presetMode: 'store' | 'recall' | null;
  calc: { op: '+' | '-'; operand: number } | null;
  shift: boolean;
  status: string;
}

export interface TimerState {
  channels: Record<ChanId, Channel>;
  presets: (Preset | null)[];   // 20 memories, shared
  fps: Fps;
  brightness: number;       // 0..14
  hour12: boolean;
  utc: boolean;
  leadingZero: boolean;
  serialHmsf: boolean;
  gpiOuts: GpiOut[];
  gpiIns: GpiIn[];
  firmware: string | null;
}

export interface EngineHooks {
  onChange(): void;
  onLog(msg: string): void;
  onGpi(port: 0 | 1, chan: ChanId, when: GpiWhen): void;
}

const mkChannel = (): Channel => ({
  value: 0, direction: 'down', format: 'hms', running: false, blank: false,
  followBuffer: [], showInput: false, returnToInput: false, matchFired: false, overtime: false,
  entry: '', entering: false, presetArmed: false, presetMode: null, calc: null,
  shift: false, status: 'READY',
});

export class TimerEngine {
  state: TimerState;
  private hooks: EngineHooks;

  constructor(hooks: EngineHooks, fps: Fps = 30) {
    this.hooks = hooks;
    this.state = {
      channels: { A: mkChannel(), B: mkChannel() },
      presets: Array(20).fill(null), fps, brightness: 12, hour12: false,
      utc: false, leadingZero: true, serialHmsf: false, gpiOuts: [], gpiIns: [],
      firmware: null,
    };
  }

  private ch(id: ChanId): Channel { return this.state.channels[id]; }
  private changed(id: ChanId | null, status?: string): void {
    if (status) {
      if (id) this.ch(id).status = status;
      else { this.ch('A').status = status; this.ch('B').status = status; }
    }
    this.hooks.onChange();
  }

  // ---- reference "input" timecode (synthetic — local time-of-day as frames) ----
  inputFrames(): number {
    const d = new Date();
    const h = this.state.utc ? d.getUTCHours() : d.getHours();
    const m = this.state.utc ? d.getUTCMinutes() : d.getMinutes();
    const s = this.state.utc ? d.getUTCSeconds() : d.getSeconds();
    const ms = this.state.utc ? d.getUTCMilliseconds() : d.getMilliseconds();
    return ((h * 3600 + m * 60 + s) * this.state.fps) + Math.floor(ms / 1000 * this.state.fps);
  }

  /** The 6-digit string to show for a channel (dashes / input / count).
      A leading "−" marks a DOWN count — the value is travelling from a larger to a
      smaller number. It drops once the count laps past zero into OVERTIME (which
      then counts UP, over the target) and whenever the INPUT reference is shown. */
  displayString(id: ChanId): string {
    const c = this.ch(id);
    if (c.blank && !c.entering) return '--:--:--';
    const val = c.showInput ? this.inputFrames() : c.value;
    const s = formatValue(val, c.format, this.state.fps, !this.state.leadingZero);
    // Actively counting down (running, down direction, not yet lapped into overtime).
    const countingDown = c.running && c.direction === 'down' && !c.overtime;
    return countingDown && !c.showInput ? '-' + s : s;
  }

  /** Seconds remaining on a live down count (Infinity if not counting down). */
  secondsRemaining(id: ChanId): number {
    const c = this.ch(id);
    if (!c.running || c.direction !== 'down' || c.overtime || c.blank || c.showInput) return Infinity;
    return c.value / this.state.fps;
  }

  // ======================================================================
  // Group A — function-row keys
  // ======================================================================
  toggleFormat(id: ChanId): void { const c = this.ch(id); c.format = c.format === 'hms' ? 'msf' : 'hms'; this.changed(id, `FORMAT ${c.format === 'hms' ? 'HH:MM:SS' : 'MM:SS.FF'}`); }
  toggleDirection(id: ChanId): void { const c = this.ch(id); c.direction = c.direction === 'up' ? 'down' : 'up'; this.changed(id, `DIR ${c.direction.toUpperCase()}`); }
  reverseDirection(id: ChanId): void { this.toggleDirection(id); }
  toggleShowInput(id: ChanId): void { const c = this.ch(id); c.showInput = !c.showInput; this.changed(id, `INPUT ${c.showInput ? 'SHOWN' : 'OFF'}`); }
  setReturnToInput(id: ChanId): void { const c = this.ch(id); c.returnToInput = !c.returnToInput; this.changed(id, `RETURN-TO-INPUT ${c.returnToInput ? 'ARMED' : 'OFF'}`); }

  clearEntry(id: ChanId): void {
    const c = this.ch(id);
    if (c.entry) { c.entry = c.entry.slice(0, -1); c.entering = c.entry.length > 0; c.value = parseEntry(c.entry, c.format, this.state.fps); }
    else { c.calc = null; }
    this.changed(id, 'CLEAR');
  }
  clearAll(id: ChanId): void { const c = this.ch(id); c.value = 0; c.blank = true; c.running = false; c.overtime = false; c.entry = ''; c.entering = false; c.calc = null; this.changed(id, 'CLR ALL'); }

  // ======================================================================
  // Group B — transport
  // ======================================================================
  private commitEntry(id: ChanId): void {
    const c = this.ch(id);
    if (c.entering) { c.value = parseEntry(c.entry, c.format, this.state.fps); c.blank = false; c.overtime = false; }
    c.entry = ''; c.entering = false;
  }

  startStop(id: ChanId): void {
    const c = this.ch(id);
    if (c.calc) {   // "=" — evaluate the calculator
      const b = c.entering ? parseEntry(c.entry, c.format, this.state.fps) : c.value;
      c.value = calc(c.calc.operand, c.calc.op, b, this.state.fps);
      c.blank = false; c.calc = null; c.entry = ''; c.entering = false;
      return this.changed(id, '= ' + this.displayString(id));
    }
    if (c.entering) { this.commitEntry(id); c.running = true; this.fireGpi(id, 'start'); return this.changed(id, 'START'); }
    c.running = !c.running;
    if (c.running) this.fireGpi(id, 'start');
    this.changed(id, c.running ? 'RUN' : 'PAUSE');
  }

  /** FOLLOW DUAL (SHIFT-START/STOP): push to this buffer + start BOTH channels. */
  followDual(id: ChanId): void {
    const c = this.ch(id);
    if (c.entering) this.commitEntry(id);
    c.followBuffer.push(c.value);
    this.state.channels.A.running = true; this.state.channels.B.running = true;
    this.hooks.onLog(`Timer: FOLLOW DUAL — chained ${this.displayString(id)} on ${id} (${c.followBuffer.length} in buffer)`);
    this.changed(id, 'FOLLOW DUAL');
  }
  startStopBoth(): void { const r = !(this.state.channels.A.running && this.state.channels.B.running); this.state.channels.A.running = r; this.state.channels.B.running = r; this.changed(null, r ? 'RUN A+B' : 'STOP A+B'); }

  nudge(id: ChanId, sign: 1 | -1): void { const c = this.ch(id); c.value = (c.value + sign * nudgeFrames(c.format, this.state.fps) + maxFrames(this.state.fps)) % maxFrames(this.state.fps); c.blank = false; this.changed(id, sign > 0 ? 'INC' : 'DEC'); }

  beginCalc(id: ChanId, op: '+' | '-'): void {
    const c = this.ch(id);
    const a = c.entering ? parseEntry(c.entry, c.format, this.state.fps) : c.value;
    c.calc = { op, operand: a }; c.entry = ''; c.entering = false;
    this.changed(id, `CALC ${op}`);
  }

  // ======================================================================
  // Keypad digits + PRESET
  // ======================================================================
  pressDigit(id: ChanId, n: number): void {
    const c = this.ch(id);
    if (c.presetArmed) { const s = c.shift; this.selectPreset(id, n + (s ? 10 : 0)); if (s) c.shift = false; return; }
    if (c.shift) { c.shift = false; return this.specialFn(id, n); }
    c.entry = (c.entry + String(n)).slice(-6);
    c.entering = true; c.blank = false; c.overtime = false; c.value = parseEntry(c.entry, c.format, this.state.fps);
    this.changed(id, 'ENTRY ' + this.displayString(id));
  }

  armPreset(id: ChanId): void {
    const c = this.ch(id);
    c.presetArmed = !c.presetArmed;
    c.presetMode = c.presetArmed ? (c.entering ? 'store' : 'recall') : null;
    this.changed(id, c.presetArmed ? `PRESET — ${c.presetMode!.toUpperCase()} (pick 0-19)` : 'READY');
  }
  private selectPreset(id: ChanId, slot: number): void {
    if (slot < 0 || slot > 19) return;
    const c = this.ch(id);
    if (c.presetMode === 'store') {
      this.commitEntry(id);
      this.state.presets[slot] = { frames: c.value, direction: c.direction };
      this.hooks.onLog(`Timer: stored PRESET ${slot} = ${this.displayString(id)} ${c.direction}`);
      this.changed(id, `STORED P${slot}`);
    } else {
      const p = this.state.presets[slot];
      if (p) { c.value = p.frames; c.direction = p.direction; c.blank = false; c.overtime = false; this.changed(id, `RECALL P${slot}`); }
      else this.changed(id, `P${slot} EMPTY`);
    }
    c.presetArmed = false; c.presetMode = null;
  }
  storePreset(id: ChanId, slot: number): void { const c = this.ch(id); this.commitEntry(id); this.state.presets[slot] = { frames: c.value, direction: c.direction }; this.changed(id, `STORED P${slot}`); }
  recallPreset(id: ChanId, slot: number): void { const p = this.state.presets[slot]; if (p) { const c = this.ch(id); c.value = p.frames; c.direction = p.direction; c.blank = false; c.overtime = false; this.changed(id, `RECALL P${slot}`); } }

  /** Countdown-to-end-of-program: value = end − live input TC, auto down-start. */
  countdownToEnd(id: ChanId): void {
    const c = this.ch(id);
    const end = c.entering ? parseEntry(c.entry, c.format, this.state.fps) : c.value;
    c.value = calc(end, '-', this.inputFrames(), this.state.fps);
    c.direction = 'down'; c.blank = false; c.running = true; c.showInput = false; c.overtime = false;
    c.entry = ''; c.entering = false;
    this.hooks.onLog(`Timer: BACKTIME to ${formatValue(end, c.format, this.state.fps)} — counting down ${this.displayString(id)} on ${id}`);
    this.changed(id, 'BACKTIME');
  }

  toggleShift(id: ChanId): void { const c = this.ch(id); c.shift = !c.shift; this.changed(id, c.shift ? 'SHIFT' : 'READY'); }

  // ======================================================================
  // Group C — settings (SHIFT-digit specials), each its own fn (global)
  // ======================================================================
  specialFn(id: ChanId, n: number): void {
    switch (n) {
      case 0: return this.cycleFrameRate();
      case 1: return this.brightnessStep();
      case 2: return this.toggleTimeBase();
      case 3: return this.toggleHour12();
      case 4: return this.swapChannels();
      case 7: return this.toggleSerialFormat();
      case 8: return this.showFirmware();
      case 9: return this.toggleLeadingZero();
      default: return this.changed(id, `SHIFT-${n} UNUSED`);
    }
  }
  cycleFrameRate(): void { const order: Fps[] = [24, 25, 30]; this.state.fps = order[(order.indexOf(this.state.fps) + 1) % order.length]!; this.changed(null, `FPS ${this.state.fps}`); }
  setFrameRate(fps: Fps): void { this.state.fps = fps; this.changed(null, `FPS ${fps}`); }
  brightnessStep(): void { this.state.brightness = this.state.brightness <= 0 ? 14 : this.state.brightness - 1; this.changed(null, `BRIGHT ${this.state.brightness + 1}/15`); }
  setBrightness(level: number): void { this.state.brightness = Math.max(0, Math.min(14, level)); this.changed(null, `BRIGHT ${this.state.brightness + 1}/15`); }
  toggleTimeBase(): void { this.state.utc = !this.state.utc; this.changed(null, `INPUT BASE ${this.state.utc ? 'UTC' : 'LOCAL'}`); }
  toggleHour12(): void { this.state.hour12 = !this.state.hour12; this.changed(null, `${this.state.hour12 ? '12' : '24'} HOUR`); }
  swapChannels(): void { const s = this.state.channels; [s.A, s.B] = [s.B, s.A]; this.changed(null, 'SWAP A↔B'); }
  toggleSerialFormat(): void { this.state.serialHmsf = !this.state.serialHmsf; this.changed(null, `RS-232 ${this.state.serialHmsf ? 'HH:MM:SS:FF' : 'HH:MM:SS'}`); }
  showFirmware(): void { this.state.firmware = this.state.firmware ? null : 'TWIST-RC1000  v1.0  2026-07-03'; this.changed(null, this.state.firmware ? 'FIRMWARE' : 'READY'); }
  toggleLeadingZero(): void { this.state.leadingZero = !this.state.leadingZero; this.changed(null, `LEAD-ZERO ${this.state.leadingZero ? 'ON' : 'BLANK'}`); }

  // ======================================================================
  // Group E — GPI (the MQTT bus is the wiring)
  // ======================================================================
  programGpiOut(port: 0 | 1, chan: ChanId, when: GpiWhen, matchFrames = 0, durationFrames = 10): void {
    this.state.gpiOuts = this.state.gpiOuts.filter((g) => g.port !== port);
    this.state.gpiOuts.push({ port, chan, when, matchFrames, durationFrames, armed: true });
    this.hooks.onLog(`Timer: GPI OUT ${port} → chan ${chan} @ ${when}`);
    this.changed(chan, `GPI OUT ${port} SET`);
  }
  programGpiIn(port: 0 | 1, chan: ChanId, preset: number): void {
    this.state.gpiIns = this.state.gpiIns.filter((g) => g.port !== port);
    this.state.gpiIns.push({ port, chan, preset });
    this.hooks.onLog(`Timer: GPI IN ${port} → recall P${preset} on chan ${chan}`);
    this.changed(chan, `GPI IN ${port} SET`);
  }
  fireGpiIn(port: 0 | 1): void {
    const g = this.state.gpiIns.find((x) => x.port === port);
    if (!g) return;
    const p = this.state.presets[g.preset]; if (!p) return;
    const c = this.state.channels[g.chan];
    c.value = p.frames; c.direction = p.direction; c.blank = false; c.running = true;
    this.hooks.onLog(`Timer: GPI IN ${port} fired — chan ${g.chan} runs P${g.preset}`);
    this.changed(g.chan, `GPI IN ${port} ▶`);
  }
  private fireGpi(id: ChanId, when: GpiWhen): void {
    for (const g of this.state.gpiOuts) if (g.armed && g.when === when && g.chan === id) this.hooks.onGpi(g.port, id, when);
  }

  // ======================================================================
  // Runtime tick
  // ======================================================================
  tick(dtMs: number): void {
    const df = (dtMs / 1000) * this.state.fps;
    let dirty = false;
    for (const id of ['A', 'B'] as ChanId[]) {
      const c = this.state.channels[id];
      if (!c.running) continue;
      dirty = true;
      if (c.overtime) {
        // Past zero: carry over and count UP (over-time). No "−" here — the minus
        // marks the DOWN phase; overtime is over-the-target and climbs.
        c.value = Math.min(c.value + df, maxFrames(this.state.fps) - 1);
      } else if (c.direction === 'up') {
        c.value = advance(c.value, 'up', df, this.state.fps);
      } else {
        c.value -= df;
        if (c.value <= 0) {
          for (const g of this.state.gpiOuts) if (g.armed && g.when === 'end' && g.chan === id) this.hooks.onGpi(g.port, id, 'end');
          if (c.followBuffer.length) { c.value = c.followBuffer.shift()!; }
          else if (c.returnToInput) { c.value = 0; c.running = false; c.showInput = true; this.hooks.onLog(`Timer: chan ${id} returned to INPUT`); }
          else { c.value = 0; c.overtime = true; this.hooks.onLog(`Timer: chan ${id} hit 00:00:00 — counting OVER`); }
        }
      }
      for (const g of this.state.gpiOuts) {
        if (g.armed && g.when === 'match' && g.chan === id) {
          const near = Math.abs(c.value - g.matchFrames) <= df;
          if (near && !c.matchFired) { c.matchFired = true; this.hooks.onGpi(g.port, id, 'match'); }
          if (!near) c.matchFired = false;
        }
      }
    }
    if (dirty) this.hooks.onChange();
  }
}

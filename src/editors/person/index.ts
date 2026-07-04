// src/editors/person — the PERSON (talent) entity editor (People/Places/Things audit §1,§5).
//
// A Person is declared as a destination (their kit — IEM/IFB, prompter, camera,
// lighting — routes INTO them) and, once processed, becomes a routable SOURCE:
// their mic passes through a VIRTUAL channel strip (input → EQ → compressor/
// dynamics → de-ess) with recallable presets. This editor is that strip plus the
// person's profile (name/pronunciation/super/side/mic-pref/seat) — the attributes
// the audit §1A lists, consumed by graphics (super), cameras (side), audio (mic).

import type { EditorPlugin } from '../types.js';
import { el, ctx2d } from '../../ui/dom.js';
import { knob as rotary } from '../../ui/widgets.js';
import { injectPersonStyles } from './styles.js';

interface Strip {
  bypass: boolean;
  inGain: number;                                   // dB
  eqOn: boolean; lf: number; lmf: number; hmf: number; hf: number;   // dB
  lmfFreq: number; hmfFreq: number;                 // Hz
  compOn: boolean; threshold: number; ratio: number; attack: number; release: number; makeup: number;
  gate: number; deess: number;
}

const BASE: Strip = {
  bypass: false, inGain: 0,
  eqOn: true, lf: 0, lmf: 0, hmf: 0, hf: 0, lmfFreq: 400, hmfFreq: 3000,
  compOn: true, threshold: -18, ratio: 3, attack: 10, release: 120, makeup: 3,
  gate: -50, deess: 0,
};

// Recallable "virtual" presets (audit: EQ + compression/dynamics presets).
const PRESETS: Record<string, Partial<Strip>> = {
  'Voice': { eqOn: true, lf: 1, lmf: -1, hmf: 2, hf: 2, compOn: true, threshold: -18, ratio: 3, makeup: 3, deess: 2, gate: -50 },
  'Warm Anchor': { lf: 3, lmf: 0, hmf: 1, hf: 1, threshold: -20, ratio: 2.5, makeup: 4, deess: 1 },
  'Bright': { lf: 0, lmf: -1, hmf: 3, hf: 5, threshold: -16, ratio: 2, makeup: 2, deess: 3 },
  'Podcast': { lf: 2, lmf: -2, hmf: 2, hf: 3, threshold: -24, ratio: 4, makeup: 6, deess: 4, gate: -42 },
  'Broadcast Loud': { lf: 1, lmf: 0, hmf: 2, hf: 2, threshold: -28, ratio: 6, makeup: 9, deess: 3 },
  'Bypass': { bypass: true },
};

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

// ── EQ frequency response (dB) at frequency f, from the 4 bands ───────────────
const bell = (f: number, fc: number, g: number, w = 0.55): number =>
  g * Math.exp(-((Math.log(f / fc) / w) ** 2));
const lowShelf = (f: number, fc: number, g: number): number => g * 0.5 * (1 - Math.tanh(Math.log(f / fc) / 0.7));
const highShelf = (f: number, fc: number, g: number): number => g * 0.5 * (1 + Math.tanh(Math.log(f / fc) / 0.7));

function eqResponse(s: Strip, f: number): number {
  if (!s.eqOn || s.bypass) return 0;
  return lowShelf(f, 120, s.lf) + bell(f, s.lmfFreq, s.lmf) + bell(f, s.hmfFreq, s.hmf) + highShelf(f, 8000, s.hf);
}

const plugin: EditorPlugin = {
  id: 'person',
  title: 'PERSON · VIRTUAL CHANNEL STRIP',
  order: 7,
  match: (n) => /\bperson\b|talent|channel.?strip/i.test(n),
  render(host, ctx) {
    injectPersonStyles();
    const s: Strip = { ...BASE };
    const personName = ctx.production.name || ctx.twist.name || 'PERSON';

    // ── PROFILE (audit §1A talent attributes) ──────────────────────────────
    const field = (label: string, value: string, opts?: string[]): [HTMLElement, HTMLInputElement | HTMLSelectElement] => {
      const input = opts
        ? el('select', {}, opts.map((o) => el('option', { value: o, selected: o === value }, [o]))) as HTMLSelectElement
        : el('input', { type: 'text', value }) as HTMLInputElement;
      return [el('div', { class: 'pr-field' }, [el('label', {}, [label]), input]), input];
    };
    const [fPron] = field('Name pronunciation', personName.toLowerCase());
    const [fSuper] = field('Title / name-super', 'CORRESPONDENT');
    const [fType] = field('Talent type', 'host', ['host', 'co-host', 'panelist', 'in-studio guest', 'correspondent', 'remote contributor']);
    const [fSide] = field('Favoured side', 'centre', ['left', 'centre', 'right']);
    const [fMic] = field('Mic preference', 'lav', ['lav', 'handheld', 'headset', 'boom/shotgun', 'desk']);
    const [fSeat] = field('Seat / position', 'ANCHOR DESK · SEAT 1');

    const virtualBadge = el('span', { class: 'pr-virtual' }, ['VIRTUAL SOURCE']);
    const profileCard = el('div', { class: 'pr-card' }, [
      el('div', { class: 'pr-id' }, [
        el('div', { class: 'pr-avatar' }, [personName.charAt(0)]),
        el('div', { class: 'pr-idtxt' }, [el('b', {}, [personName]), el('span', {}, ['TALENT · PERSON ENTITY'])]),
      ]),
      virtualBadge,
      fPron, fSuper,
      el('div', { class: 'pr-two' }, [fType, fSide]),
      el('div', { class: 'pr-two' }, [fMic, fSeat]),
    ]);

    // ── VIRTUAL CHANNEL STRIP ──────────────────────────────────────────────
    const eqCanvas = el('canvas', { class: 'pr-canvas' }) as HTMLCanvasElement;
    const compCanvas = el('canvas', { class: 'pr-canvas', style: 'height:300px' }) as HTMLCanvasElement;
    const grBar = el('span', { class: 'pr-gr-bar' });

    // Knob factory — a real rotary (shared ui/widgets knob, drag up/down), scaled
    // to this parameter's range with a live value readout beneath the label.
    const knobs: Array<() => void> = [];
    function knob(label: string, key: keyof Strip, min: number, max: number, step: number, unit: string): HTMLElement {
      const dec = (String(step).split('.')[1] || '').length;
      const valEl = el('span', { class: 'k-val' });
      const toNorm = (v: number): number => (v - min) / (max - min);
      const ctrl = rotary(label, toNorm(s[key] as number), '#F2B74B', (n) => {
        const raw = min + n * (max - min);
        (s[key] as number) = +((Math.round(raw / step) * step).toFixed(dec));
        syncFromKnob();
      });
      const upd = (): void => { ctrl.setValue(toNorm(s[key] as number)); valEl.textContent = `${s[key]}${unit}`; };
      knobs.push(upd);
      return el('div', { class: 'pr-knob' }, [ctrl, valEl]);
    }

    const eqToggle = el('button', { class: 'pr-toggle' }, ['ON']);
    const compToggle = el('button', { class: 'pr-toggle' }, ['ON']);
    const eqSec = el('div', { class: 'pr-sec' }, [
      el('div', { class: 'pr-sec-h' }, ['Equalizer', el('span', { class: 'en' }, [eqToggle])]),
      eqCanvas,
      el('div', { class: 'pr-knobs' }, [
        knob('Low', 'lf', -15, 15, 0.5, 'dB'),
        knob('Lo-Mid', 'lmf', -15, 15, 0.5, 'dB'),
        knob('Hi-Mid', 'hmf', -15, 15, 0.5, 'dB'),
        knob('High', 'hf', -15, 15, 0.5, 'dB'),
        knob('LM Hz', 'lmfFreq', 120, 2000, 10, ''),
        knob('HM Hz', 'hmfFreq', 800, 8000, 50, ''),
      ]),
    ]);
    const compSec = el('div', { class: 'pr-sec' }, [
      el('div', { class: 'pr-sec-h' }, ['Compressor · Dynamics', el('span', { class: 'en' }, [compToggle])]),
      compCanvas,
      el('div', { class: 'pr-gr' }, [el('span', { class: 'pr-gr-lbl' }, ['GR']), el('span', { class: 'pr-gr-track' }, [grBar])]),
      el('div', { class: 'pr-knobs' }, [
        knob('Thresh', 'threshold', -60, 0, 1, 'dB'),
        knob('Ratio', 'ratio', 1, 12, 0.1, ':1'),
        knob('Attack', 'attack', 1, 100, 1, 'ms'),
        knob('Release', 'release', 20, 800, 10, 'ms'),
        knob('Makeup', 'makeup', 0, 18, 0.5, 'dB'),
        knob('Gate', 'gate', -70, -20, 1, 'dB'),
        knob('De-ess', 'deess', 0, 10, 0.5, ''),
        knob('In Gain', 'inGain', -20, 40, 0.5, 'dB'),
      ]),
    ]);
    const stripCol = el('div', { class: 'pr-col pr-strip' }, [el('h4', {}, ['Virtual Channel Strip']), eqSec, compSec]);

    // ── PRESETS ────────────────────────────────────────────────────────────
    const presetBtns = new Map<string, HTMLElement>();
    const presetCol = el('div', { class: 'pr-col' }, [
      el('h4', {}, ['Presets']),
      el('div', { class: 'pr-presets' }, Object.keys(PRESETS).map((name) => {
        const b = el('button', { class: 'pr-preset' }, [name]);
        b.addEventListener('click', () => applyPreset(name));
        presetBtns.set(name, b);
        return b;
      })),
      el('div', { class: 'pr-hint' }, ['A preset makes this person a processed VIRTUAL source, routable into any production.']),
    ]);

    host.append(el('div', { class: 'pr' }, [
      el('div', { class: 'pr-col' }, [el('h4', {}, ['Profile']), profileCard]),
      stripCol,
      presetCol,
    ]));

    // ── MQTT (audit §4 propagation; no-op without a bus) ────────────────────
    ctx.services.advertiseParams?.([
      { name: 'bypass', type: 'bool', writable: true },
      { name: 'preset', type: 'string', writable: true },
      { name: 'threshold', type: 'number', unit: 'dB', writable: true },
      { name: 'ratio', type: 'number', writable: true },
      { name: 'makeup', type: 'number', unit: 'dB', writable: true },
    ]);

    // ── draw helpers ────────────────────────────────────────────────────────
    function drawEq(): void {
      const g = ctx2d(eqCanvas); if (!g) return;
      const w = eqCanvas.width = eqCanvas.clientWidth, h = eqCanvas.height = eqCanvas.clientHeight;
      g.clearRect(0, 0, w, h);
      g.strokeStyle = 'rgba(255,255,255,.10)'; g.lineWidth = 1;
      [-12, -6, 0, 6, 12].forEach((db) => { const y = h / 2 - (db / 15) * (h / 2 - 6); g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); });
      g.beginPath();
      for (let x = 0; x <= w; x++) {
        const f = 20 * Math.pow(1000, x / w);            // 20 Hz → 20 kHz log
        const db = eqResponse(s, f);
        const y = h / 2 - (db / 15) * (h / 2 - 6);
        x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.strokeStyle = s.eqOn && !s.bypass ? '#F2B74B' : '#3a4c68'; g.lineWidth = 2.5; g.stroke();
    }
    function drawComp(): void {
      const g = ctx2d(compCanvas); if (!g) return;
      const w = compCanvas.width = compCanvas.clientWidth, h = compCanvas.height = compCanvas.clientHeight;
      g.clearRect(0, 0, w, h);
      const map = (db: number): number => (db + 60) / 60;                 // -60..0 → 0..1
      g.strokeStyle = 'rgba(255,255,255,.10)';
      g.beginPath(); g.moveTo(0, h); g.lineTo(w, 0); g.stroke();          // unity line
      const on = s.compOn && !s.bypass;
      g.beginPath();
      for (let x = 0; x <= w; x++) {
        const inDb = -60 + (x / w) * 60;
        const outDb = on && inDb > s.threshold ? s.threshold + (inDb - s.threshold) / s.ratio : inDb;
        const y = h - map(outDb) * h;
        x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.strokeStyle = on ? '#39d353' : '#3a4c68'; g.lineWidth = 2.5; g.stroke();
      if (on) { const tx = map(s.threshold) * w; g.strokeStyle = 'rgba(255,214,0,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(tx, 0); g.lineTo(tx, h); g.stroke(); }
    }

    function sync(): void {
      knobs.forEach((u) => u());
      eqToggle.classList.toggle('on', s.eqOn && !s.bypass); eqToggle.textContent = s.eqOn ? 'ON' : 'OFF';
      compToggle.classList.toggle('on', s.compOn && !s.bypass); compToggle.textContent = s.compOn ? 'ON' : 'OFF';
      virtualBadge.classList.toggle('off', s.bypass);
      virtualBadge.textContent = s.bypass ? 'BYPASS · DIRECT' : 'VIRTUAL SOURCE';
      drawEq(); drawComp();
    }
    function syncFromKnob(): void { presetBtns.forEach((b) => b.classList.remove('sel')); sync(); publish(); }
    function applyPreset(name: string): void {
      if (name === 'Bypass') s.bypass = true; else Object.assign(s, { bypass: false }, PRESETS[name]);
      presetBtns.forEach((b, n) => b.classList.toggle('sel', n === name));
      sync(); publish();
    }
    function publish(): void {
      const p = ctx.services.publishParam; if (!p) return;
      p('bypass', s.bypass); p('threshold', s.threshold); p('ratio', s.ratio); p('makeup', s.makeup);
    }

    eqToggle.addEventListener('click', () => { s.eqOn = !s.eqOn; syncFromKnob(); });
    compToggle.addEventListener('click', () => { s.compOn = !s.compOn; syncFromKnob(); });

    // Live gain-reduction meter driven by a synthetic speech-like envelope.
    // Also repaint the curves whenever the canvas gains/changes real layout width
    // (first paint happens before the overlay lays out, so the mount-time draw
    // hits a 0×0 canvas and the graphs stayed blank until an interaction).
    let t = 0;
    let lastW = 0;
    ctx.dispose.raf(() => {
      t += 0.05;
      const inDb = -30 + 24 * (0.5 + 0.5 * Math.sin(t) * Math.abs(Math.sin(t * 0.37)));   // fake voice level
      const gr = s.compOn && !s.bypass && inDb > s.threshold ? (inDb - s.threshold) * (1 - 1 / s.ratio) : 0;
      grBar.style.width = `${clamp(gr / 18 * 100, 0, 100)}%`;
      if (eqCanvas.clientWidth !== lastW) { lastW = eqCanvas.clientWidth; drawEq(); drawComp(); }
    });

    applyPreset('Voice');
  },
};

export default plugin;

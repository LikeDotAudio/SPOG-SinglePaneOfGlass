// src/editors/person — the PERSON (talent) entity editor (People/Places/Things audit §1,§5).
//
// A Person is declared as a destination (their kit — IEM/IFB, prompter, camera,
// lighting — routes INTO them) and, once processed, becomes a routable SOURCE:
// their mic passes through a VIRTUAL channel strip (input → EQ → compressor/
// dynamics → de-ess) with recallable presets. This editor is that strip plus the
// person's profile (name/pronunciation/super/side/mic-pref/seat) — the attributes
// the audit §1A lists, consumed by graphics (super), cameras (side), audio (mic).

import type { EditorPlugin } from '../types.js';
import { el } from '../../ui/dom.js';
import { knob as rotary } from '../../ui/widgets.js';
import { injectPersonStyles } from './styles.js';
import type { Strip } from './dsp.js';
import { BASE, PRESETS, clamp } from './dsp.js';
import { drawEq, drawComp } from './draw.js';

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

    // ── draw helpers (painters live in ./draw) ──────────────────────────────
    const paint = (): void => { drawEq(eqCanvas, s); drawComp(compCanvas, s); };

    function sync(): void {
      knobs.forEach((u) => u());
      eqToggle.classList.toggle('on', s.eqOn && !s.bypass); eqToggle.textContent = s.eqOn ? 'ON' : 'OFF';
      compToggle.classList.toggle('on', s.compOn && !s.bypass); compToggle.textContent = s.compOn ? 'ON' : 'OFF';
      virtualBadge.classList.toggle('off', s.bypass);
      virtualBadge.textContent = s.bypass ? 'BYPASS · DIRECT' : 'VIRTUAL SOURCE';
      paint();
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
      if (eqCanvas.clientWidth !== lastW) { lastW = eqCanvas.clientWidth; paint(); }
    });

    applyPreset('Voice');
  },
};

export default plugin;

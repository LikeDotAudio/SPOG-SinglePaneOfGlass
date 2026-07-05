// src/editors/stagebox-input/view — faithful port of the legacy buildPanel +
// the two canvas renderers (PPM 30s history, HPF frequency response). Driven by
// a per-panel PanelState; timers/listeners register on the EditorContext disposer
// so the host tears them down on close (no module-global timer list).

import type { Disposer } from '../../ui/timers.js';
import type { EditorServices } from '../types.js';
import { MICS, STANDS, initState } from './state.js';
import type { PanelState } from './state.js';
import { drawHist, drawHPF } from './charts.js';
import { panelTemplate } from './template.js';
import { buildDials } from './dials.js';

/**
 * Build one full Stage Box Input channel panel into `body`.
 *
 * `idx` is the 1-based GLOBAL channel index; `services` is the MQTT bridge (its
 * methods are absent when MQTT is disabled, so every call is guarded with `?.`).
 * Operator-driven preamp values publish on indexed params `in<idx>_gain` (dB,
 * throttled — safe for the drag loop), `in<idx>_phantom` (discrete toggle) and
 * `in<idx>_name` (channel alias). Inbound writes from the bus / other consoles
 * are honoured via `onParam` and applied WITHOUT re-publishing (no echo loop).
 */
export function buildPanel(
  body: HTMLElement,
  chName: string,
  dispose: Disposer,
  idx: number,
  services: EditorServices,
): void {
  const s: PanelState = initState();
  const hist: number[] = [];

  // Preamp gain in dB depends on the selected mic's range (matches the dial paint).
  const gainDb = (): number => {
    const m = MICS[s.mic]!;
    return Math.round(m.gain[0] + s.gain * (m.gain[1] - m.gain[0]));
  };

  body.innerHTML = panelTemplate(chName);

  const q = <T extends Element>(sel: string): T => {
    const found = body.querySelector<T>(sel);
    if (!found) throw new Error(`stagebox-input: no element matches ${sel}`);
    return found;
  };

  const knrow = q<HTMLElement>('.sb-knrow');
  const dials = buildDials(knrow, s, dispose, idx, services, gainDb);

  function applyMic(): void {
    const m = MICS[s.mic]!;
    q<HTMLElement>('.sb-imp').textContent = m.imp + ' Ω';
    q<HTMLElement>('.sb-sens').textContent = m.sens + ' dBV';
    s.hpf = Math.min(1, (STANDS[s.stand]! - 20) / 280); // stand drives the HPF
    if (m.ribbon && s.phantom) {
      s.phantom = false;
    }
    const phantom = q<HTMLElement>('.phantom');
    phantom.classList.toggle('on', s.phantom);
    phantom.style.opacity = m.ribbon ? '.5' : '1';
    q<HTMLElement>('.sb-warn').classList.toggle('on', m.ribbon);
    dials.forEach((p) => p());
    // Mic change re-maps the gain range (dB) and may force phantom off (ribbon):
    // reflect both onto the bus. Also serves as the initial retained publish.
    services.publishParam?.(`in${idx}_gain`, gainDb());
    services.publishParam?.(`in${idx}_phantom`, s.phantom, { throttle: false });
  }
  q<HTMLSelectElement>('.sb-mic').addEventListener('change', (e) => {
    s.mic = +(e.target as HTMLSelectElement).value;
    applyMic();
  });
  q<HTMLSelectElement>('.sb-stand').addEventListener('change', (e) => {
    s.stand = (e.target as HTMLSelectElement).value;
    applyMic();
  });
  q<HTMLInputElement>('.sb-cable').addEventListener('input', (e) => {
    s.cable = +(e.target as HTMLInputElement).value;
    q<HTMLElement>('.sb-cablev').textContent = s.cable + ' m';
    q<HTMLElement>('.sb-hf').textContent = '+' + (s.cable * 0.012).toFixed(1) + ' dB';
  });
  q<HTMLElement>('.phantom').addEventListener('click', () => {
    if (MICS[s.mic]!.ribbon) return;
    s.phantom = !s.phantom;
    q<HTMLElement>('.phantom').classList.toggle('on', s.phantom);
    services.publishParam?.(`in${idx}_phantom`, s.phantom, { throttle: false }); // discrete
  });
  const alias = q<HTMLInputElement>('.sb-alias');
  alias.addEventListener('input', () => {
    services.publishParam?.(`in${idx}_name`, alias.value); // channel alias (throttled)
  });
  q<HTMLElement>('.sb-key.conf').addEventListener('click', (e) => {
    s.conf = !s.conf;
    (e.currentTarget as HTMLElement).classList.toggle('on', s.conf);
  });
  // noise reduction + HPF window / frequency / slope — visualised as a response chart
  const redrawHPF = (): void => {
    const fc = +q<HTMLInputElement>('.sb-hpf2').value;
    const sel = body.querySelector<HTMLElement>('.sb-slope.sel');
    const sl = sel ? parseInt(sel.textContent ?? '', 10) || 12 : 12;
    drawHPF(q<HTMLCanvasElement>('.sb-hpchart'), fc, sl, q<HTMLSelectElement>('.sb-hpw').value);
  };
  q<HTMLInputElement>('.sb-nr').addEventListener('input', (e) => {
    q<HTMLElement>('.sb-nrv').textContent = (e.target as HTMLInputElement).value + ' dB';
  });
  q<HTMLInputElement>('.sb-hpf2').addEventListener('input', (e) => {
    q<HTMLElement>('.sb-hpfv').textContent = (e.target as HTMLInputElement).value + ' Hz';
    redrawHPF();
  });
  q<HTMLSelectElement>('.sb-hpw').addEventListener('change', redrawHPF);
  const slopes = q<HTMLElement>('.sb-slopes');
  ['6', '12', '18', '24'].forEach((db, i) => {
    const btn = document.createElement('button');
    btn.className = 'sb-slope' + (i === 1 ? ' sel' : '');
    btn.textContent = db + ' dB/oct';
    btn.addEventListener('click', () => {
      slopes.querySelectorAll('.sb-slope').forEach((x) => x.classList.remove('sel'));
      btn.classList.add('sel');
      redrawHPF();
    });
    slopes.appendChild(btn);
  });
  const tid = setTimeout(redrawHPF, 0); // after layout so the canvas has a size
  dispose.add(() => clearTimeout(tid));
  applyMic(); // seeds the initial gain + phantom publish

  // Initial retained publish for the alias (applyMic already seeded gain/phantom).
  services.publishParam?.(`in${idx}_name`, alias.value);

  // External control: honour writes from the bus / other consoles, applied to
  // local state + DOM WITHOUT re-publishing (avoids an echo loop). Unsubscribes
  // register on the disposer so they tear down with the editor.
  const sub = (name: string, cb: (v: unknown) => void): void => {
    const off = services.onParam?.(name, cb);
    if (off) dispose.add(off);
  };
  sub(`in${idx}_gain`, (v) => {
    if (typeof v !== 'number') return;
    const m = MICS[s.mic]!;
    const span = m.gain[1] - m.gain[0] || 1;
    s.gain = Math.max(0, Math.min(1, (v - m.gain[0]) / span));
    dials.forEach((p) => p());
  });
  sub(`in${idx}_phantom`, (v) => {
    s.phantom = !!v && !MICS[s.mic]!.ribbon; // software interlock: ribbon blocks +48V
    q<HTMLElement>('.phantom').classList.toggle('on', s.phantom);
  });
  sub(`in${idx}_name`, (v) => {
    if (typeof v === 'string') alias.value = v;
  });

  const mask = q<HTMLElement>('.sb-meter .mask');
  const pk = q<HTMLElement>('.sb-meter .pk');
  const hr = q<HTMLElement>('.sb-headroom');
  const hc = q<HTMLCanvasElement>('.sb-hist canvas');
  let f = 0;
  dispose.interval(() => {
    f++;
    if (f % 6 === 0) s.target = Math.max(0.05, Math.min(1, s.target + (Math.random() - 0.5) * 0.45));
    // occasional "cable crackle" spike for the history view
    const crackle = s.cable > 60 && Math.random() < 0.03 ? Math.random() * 0.5 : 0;
    const goal = Math.min(1, s.target * (0.5 + s.gain) + crackle);
    s.level += (goal - s.level) * (goal > s.level ? 0.5 : 0.12);
    s.peak = s.level > s.peak ? s.level : Math.max(s.level, s.peak - 0.006);
    mask.style.height = 100 - s.level * 100 + '%';
    pk.style.bottom = s.peak * 100 + '%';
    const dbfs = Math.round((s.peak - 1) * 60);
    const head = Math.round((1 - s.peak) * 60);
    hr.innerHTML =
      `Peak&nbsp; <b>${dbfs} dBFS</b><br>Headroom&nbsp; <b class="${head < 6 ? 'hot' : ''}">${head} dB</b><br>` +
      `Phantom&nbsp; <b>${s.phantom ? '+48V ON' : 'OFF'}</b><br>Monitor&nbsp; <b>${s.conf ? 'CUE→BUS' : '—'}</b>`;
    hist.push(s.level);
    if (hist.length > 300) hist.shift();
    drawHist(hc, hist);
  }, 100);
}

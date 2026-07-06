// src/editors/vision-mixer/projection — state → DOM, per change and per frame.
//
// The render closure BUILDS the switcher DOM and wires events; this module PUSHES
// the shared state onto that DOM. `sync()` runs on every state change (bus take,
// delegate switch, DSK toggle…); `startAnimation()` registers the RAF loop that
// drives DVE flight chips, the auto-transition T-bar and the mix/wipe emulation.
// Both are pure projection — no state ownership — so they take the stage/transition
// refs the closure already built, plus the shared `Surface`.

import { el } from '../../ui/dom.js';
import { drawFauxSignal } from '../../ui/faux-signal.js';
import { srcLabel, tallySet } from './me.js';
import { poseAt, applyPose } from './dve.js';
import { emulateTransition } from './transitions/index.js';
import type { TransitionKind } from '../../model/index.js';
import type { Surface } from './surface.js';
import type { Stage } from './stage.js';
import type { AutoToken } from './transition.js';

export interface ProjectionRefs {
  stage: Stage;
  meTabs: HTMLElement[];
  transBtns: { t: TransitionKind; b: HTMLElement }[];
  rate: HTMLInputElement;
  dskBtns: HTMLElement[];
  auxSelects: HTMLSelectElement[];
  /** The in-flight auto-transition, owned by the closure; the RAF drives + clears it. */
  auto: { current: AutoToken | null };
  persist: () => void;
}

/** Build the projection over the shared surface + the closure's DOM refs. */
export function createProjection(s: Surface, refs: ProjectionRefs): { sync: () => void; startAnimation: () => void } {
  const { stage, meTabs, transBtns, rate, dskBtns, auxSelects, auto, persist } = refs;
  const { def, state } = s;
  let lastTally = '';

  // Each monitor feed shows the routed source's FAUX SIGNAL (a person-in-a-room),
  // not a colour swatch. One canvas per feed fills its .vm-feed box; pgmFeedNext is
  // already an absolute overlay (its transition transform rides on top).
  const mkFeedCanvas = (feedHost: HTMLElement): HTMLCanvasElement => {
    if (!feedHost.style.position) feedHost.style.position = 'relative';
    const cv = el('canvas', { style: 'position:absolute;inset:0;width:100%;height:100%;display:block' });
    feedHost.appendChild(cv);
    return cv;
  };
  const pgmCv = mkFeedCanvas(stage.pgmFeed);
  const pvwCv = mkFeedCanvas(stage.pvwFeed);
  const nextCv = mkFeedCanvas(stage.pgmFeedNext);
  // A source's colour: the authored input colour, else a stable hue from its index
  // (matching the retired zig-zag hue), converted to hex for the faux painter.
  const inputColor = (i: number): string => {
    const authored = def.inputs[i]?.color; if (authored) return authored;
    const h = (i * 37) % 360, l = 0.45, a = 0.42 * Math.min(l, 1 - l);
    const chan = (n: number): string => { const k = (n + h / 30) % 12; const x = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(255 * x).toString(16).padStart(2, '0'); };
    return `#${chan(0)}${chan(8)}${chan(4)}`;
  };
  const sourceFor = (i: number): { label: string; color: string } => ({ label: srcLabel(i, def), color: inputColor(i) });

  /** The PIP chips over the monitors — one per active keyer of the delegated bank. */
  function rebuildPips(): void {
    const mk = (armedOnly: boolean): HTMLElement[] => s.me().keyers.flatMap((k, ki) => {
      if (!k.on) return [];
      const chip = el('div', { class: `vm-pip${armedOnly ? ' armed' : ''}`, dataset: { fk: `${s.delegate}:${ki}` } },
        [srcLabel(k.source, def)]);
      return [chip];
    });
    stage.pgmPips.replaceChildren(...mk(false));
    stage.pvwPips.replaceChildren(...mk(true));
  }

  function sync(): void {
    const m = s.me();
    meTabs.forEach((t, i) => t.classList.toggle('sel', i === s.delegate));
    // Paint the routed source's faux signal into each monitor feed. pgmFeedNext's
    // overlay positioning + transition transforms are owned by stage.ts/startAnimation,
    // so we only repaint its canvas here (never clobber its inline style).
    const now = performance.now();
    drawFauxSignal(pgmCv, sourceFor(m.pgm), now);
    drawFauxSignal(pvwCv, sourceFor(m.pvw), now);
    drawFauxSignal(nextCv, sourceFor(m.pvw), now);
    stage.pgmSrc.textContent = `M/E ${s.delegate + 1}`;
    stage.pvwSrc.textContent = `NEXT · ${m.trans} ${m.rate}f`;
    s.busBtns.pgm.forEach((b, i) => b?.classList.toggle('sel', i === m.pgm));
    s.busBtns.pvw.forEach((b, i) => b?.classList.toggle('sel', i === m.pvw));
    transBtns.forEach(({ t, b }) => b.classList.toggle('sel', t === m.trans));
    rate.value = String(m.rate);
    stage.tbar.value = String(m.tbar);
    stage.pct.textContent = `${Math.round(m.tbar)}%`;
    stage.dskRow.replaceChildren(...state.dsks.flatMap((on, i) => on ? [el('span', {}, [def.dsks[i]!.name.split('·')[0]!.trim()])] : []));
    dskBtns.forEach((b, i) => b.classList.toggle('on', !!state.dsks[i]));
    rebuildPips();
    // Tally (read-only telemetry): the LAST bank is the programme output.
    const pgmTally = [...tallySet(state.mes, def.mes - 1, def)].map((i) => srcLabel(i, def)).sort();
    const key = pgmTally.join('|');
    if (key !== lastTally) { lastTally = key; s.publish('tally.program', pgmTally); }
    auxSelects.forEach((sel, i) => { if (!sel.value) sel.value = String(state.auxes[i]); });
    persist();
  }

  function startAnimation(): void {
    s.ctx.dispose.raf(() => {
      const now = performance.now();
      for (const chipHost of [stage.pgmPips, stage.pvwPips]) {
        for (const chip of chipHost.children) {
          const f = s.flights.get((chip as HTMLElement).dataset.fk ?? '');
          if (f) applyPose(chip as HTMLElement, poseAt(f.a, f.snapshot, f.t0, now));
        }
      }
      if (auto.current) {
        const a = auto.current;
        const t = Math.min(1, (now - a.t0) / a.ms);
        const m = state.mes[a.bank]!;
        m.tbar = t * 100;
        if (a.bank === s.delegate) { stage.tbar.value = String(m.tbar); stage.pct.textContent = `${Math.round(m.tbar)}%`; }
        if (t >= 1) { const bank = a.bank; auto.current = null; s.doTake(bank); }
      }

      // Render transition emulation.
      const m = s.me();
      if (m.tbar > 0 && m.tbar < 100) {
        const style = emulateTransition(m.trans, m.tbar / 100);
        stage.pgmFeedNext.style.opacity = String(style.opacity);
        stage.pgmFeedNext.style.clipPath = style.clipPath;
        stage.pgmFeedNext.style.transform = style.transform;
      } else {
        stage.pgmFeedNext.style.opacity = '0';
        stage.pgmFeedNext.style.clipPath = 'none';
        stage.pgmFeedNext.style.transform = 'none';
      }
    });
  }

  return { sync, startAnimation };
}

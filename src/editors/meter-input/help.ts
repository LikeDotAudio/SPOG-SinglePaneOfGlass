// src/editors/meter-input/help — the "how to read this scope" hover-help. Split
// from index.ts: the INTRO + per-card HELP text tables and the pointer-following
// tooltip that attaches to each card title (and the whole-bench intro chip).
import { el } from '../../ui/dom.js';

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

// ── Hover-help: a "how to read this scope" tooltip on each card title ──────
// These scopes visualize the same audio/video as an objective source of truth;
// the guidance below (lead + ✓ good / ✕ bad signal) is surfaced on title hover.
type Help = { t: string; lead: string; good?: string; bad?: string };
const INTRO =
  'These scopes can look intimidating, but they are just different ways of visualizing the same audio &amp; video data. ' +
  'Once you can read them they become an objective source of truth — showing what your eyes/ears miss due to monitor calibration or room acoustics. ' +
  'Hover any scope’s title for how to read it.';
const HELP: Record<string, Help> = {
  video: { t: 'Analyzed Source', lead: 'The actual frames + audio every scope reads (test pattern, captured tab, file, or URL). Everything else on this bench is measured from this signal.' },
  wave: { t: 'Luma Waveform', lead: 'Brightness only (colour ignored). Horizontal = left→right position in the frame; vertical = 0 (black) → 100 (white).', good: 'Detail well-distributed; faces sit ~40–70.', bad: 'Trace pinned at 100 (highlights clipped) or 0 (shadows crushed) — that data is gone.' },
  chroma: { t: 'Chroma Waveform', lead: 'Saturation (max−min of RGB) per left→right position — the colour counterpart of the luma waveform. Vertical = 0 % (neutral grey) → 100 % (fully saturated).', good: 'Colour sits at a sensible, consistent level for the shot; neutral greys/whites hug the bottom (near 0 %).', bad: 'The trace slams to the top = over-saturated / possibly broadcast-illegal; a supposed-neutral area riding high = an unwanted colour cast.' },
  parade: { t: 'RGB Parade · IRE', lead: 'Red, Green, Blue shown side-by-side. Horizontal = frame position; vertical = brightness (0–100).', good: 'On neutral whites/greys the R, G, B traces sit level with each other; faces ~40–70.', bad: 'A channel riding higher in the mid-tones = colour cast; traces flat-lining at 0/100 = crushed/clipped.' },
  rgba: { t: 'RGB Overlay', lead: 'The same R/G/B waveform data as the Parade, layered on top of each other for direct comparison.', good: 'Neutral areas keep the three channels aligned.', bad: 'Channels splitting apart = colour cast; tops clipped at 100.' },
  stack: { t: 'RGB Stacked', lead: 'The same R/G/B waveform data as the Parade, stacked vertically instead of side-by-side. Read it the same way.', good: 'Channels level on neutral tones.', bad: 'Clipping at 0/100 or a channel offset from the others.' },
  vec: { t: 'Vectorscope', lead: 'Colour only — brightness ignored. Angle = hue, distance from centre = saturation.', good: 'Neutrals sit near centre; skin rides the top-left “skin line” (nearly all skin, any ethnicity, aligns to it).', bad: 'Trace pushes past the target boxes = oversaturated / broadcast-illegal (bleed or artifacts on some TVs).' },
  cie: { t: 'CIE 1931 · xy Gamut', lead: 'Gamut check. The horseshoe = all of human vision; the triangle = your target space (e.g. Rec.709).', good: 'The glowing blob stays inside the triangle.', bad: 'It spills outside — colours the display physically can’t show → clipping / shifts on export.' },
  diamond: { t: 'Diamond · RGB Gamut', lead: 'Gamut check that verifies R/G/B combinations are mathematically legal for the target space.', good: 'Trace stays inside the diamond shape.', bad: 'Spilling out = illegal colours that will clip or shift on export.' },
  hsl: { t: 'Lightness / Saturation', lead: 'Vertical = brightness, horizontal = saturation. Cameras/screens struggle with heavy saturation at extreme bright or dark.', good: 'Saturation tapers off top and bottom into a rounded shape.', bad: 'A hard rectangular block pushing full saturation into highlights/shadows.' },
  aud: { t: 'Audio Oscilloscope', lead: 'The real-time wave shape of the sound (L / R / L+R).', good: 'Smooth, rounded wave peaks.', bad: 'Squared-off flat tops = heavy distortion / clipping.' },
  meter: { t: 'Meters · L/R dBFS', lead: 'Digital peak meters — instant and exact. 0 dBFS is the absolute digital ceiling.', good: 'Peaks dance between −12 and −6 dB, leaving headroom.', bad: 'Touching 0 dBFS = digital clipping (harsh crackle); barely moving = too quiet, high noise floor.' },
  vu: { t: 'VU · Analog', lead: 'Retro needle showing average perceived loudness (slow ballistics), not exact peaks.', good: 'Needle bounces around 0, dipping into the red only on loud hits.', bad: 'Pinned in the red (too hot) or motionless at the bottom (too quiet).' },
  gonio: { t: 'Goniometer · Lissajous', lead: 'Stereo phase + width. Mono = a straight vertical line; wide stereo = a tangled ball of yarn.', good: 'Shape is taller than it is wide.', bad: 'Stretched horizontal = phase cancellation — on a mono speaker (a phone) the audio goes quiet/hollow.' },
  rec: { t: 'Level Recorder', lead: 'Plots L/R level (dBFS) over ~2 minutes so you can see trends, not just the instant.', good: 'Consistent levels with headroom under 0 dBFS.', bad: 'Constant slamming at the top (clipping) or long stretches near the floor (too quiet).' },
  loud: { t: 'Loudness · ITU-R BS.1770', lead: 'Perceived average loudness in LUFS over time — the metric streaming platforms normalise to.', good: 'A stable line near your target (YouTube ≈ −14 LUFS; broadcast −23/−24 LUFS).', bad: 'Wild swings silent→loud, or a line parked well above/below target.' },
  lumin: { t: 'Luminance', lead: 'The average brightness of the whole frame (0–100 %), updated every frame, plus a running count and tempo of detected edits. The AVG bar is the live mean; a sudden frame-to-frame jump is what flags a cut.', good: 'A steady level within a shot; the bar only leaps when the picture really changes.', bad: 'Constant wild swings = flicker / exposure pumping; a high edit tempo = footage cutting very fast.' },
  editlog: { t: 'Edit Log', lead: 'A time-stamped list of detected scene cuts. Each row logs when a big luminance change happened, so you can find every edit point. SENS (Subtle → Hard) sets how big a change counts; edit tempo shows how fast cuts are coming.', good: 'Rows land exactly where the video actually cuts.', bad: 'Missed cuts (lower SENS to Subtle) or false hits on flashes / fast motion (raise SENS to Hard).' },
};

// Wire the hover-help onto each card title and the whole-bench intro chip.
export function attachHelp(host: HTMLElement, cardMap: Record<string, HTMLElement>): void {
  const tipEl = el('div', { class: 'mi-tip' });
  document.body.append(tipEl);
  const placeTip = (x: number, y: number): void => {
    const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
    tipEl.style.left = `${clamp(x + 14, 6, window.innerWidth - w - 6)}px`;
    tipEl.style.top = `${clamp(y + 16, 6, window.innerHeight - h - 6)}px`;
  };
  const attachTip = (target: HTMLElement, html: string): void => {
    target.addEventListener('mouseenter', (e) => { tipEl.innerHTML = html; tipEl.classList.add('open'); placeTip(e.clientX, e.clientY); });
    target.addEventListener('mousemove', (e) => placeTip(e.clientX, e.clientY));
    target.addEventListener('mouseleave', () => tipEl.classList.remove('open'));
  };
  const helpHtml = (h: Help): string =>
    `<b>${h.t}</b><br>${h.lead}` +
    (h.good ? `<br><span class="g">✓ Good:</span> ${h.good}` : '') +
    (h.bad ? `<br><span class="bad">✕ Bad:</span> ${h.bad}` : '');
  for (const [key, card] of Object.entries(cardMap)) {
    const h4 = card.querySelector('h4'); const h = HELP[key];
    if (h4 && h) { h4.classList.add('mi-help'); attachTip(h4, helpHtml(h)); }
  }
  // The whole-bench intro rides the "EDIT DETECTOR" title tab.
  const introChip = host.querySelector<HTMLElement>('.mi-title');
  if (introChip) { introChip.classList.add('mi-help'); attachTip(introChip, `<b>Reading the scopes</b><br>${INTRO}`); }
}

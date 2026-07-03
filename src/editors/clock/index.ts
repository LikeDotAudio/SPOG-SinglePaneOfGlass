// src/editors/clock — the CLOCK / TIME GENERATOR editor (a graphics source).
//
// Opened when a WORLD CLOCKS feed (extraClass:"clock-source") is routed onto a
// twist, or a twist is literally named "Clock". Each routed zone renders as a
// broadcast wall-clock, and the operator can jump between three faces:
//   • DIGITAL      — a big red LED HH:MM read-out on black + zone caption.
//   • DIGITAL·SEC  — the same, with seconds (HH:MM:SS).
//   • ANALOG       — a white face with 12h + inner red 24h numerals and a high-vis
//                    red second hand that SWEEPS smoothly (the Evertz analog clock).
//
// Self-contained: zones are parsed from the routed feed labels (UTC / LOCAL /
// LOCAL ±NH); no external time source — driven off the browser clock via rAF.

import type { EditorPlugin } from '../types.js';
import { el, addStyles, ctx2d } from '../../ui/dom.js';

const CSS = `
.ck{display:flex;flex-direction:column;gap:12px;height:100%;min-height:0;color:#dfe8f5;}
.ck-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}
.ck-bar h4{margin:0 8px 0 0;color:#C864C8;font:700 11px 'Courier New',monospace;letter-spacing:2px;text-transform:uppercase;}
.ck-seg{display:inline-flex;border:1px solid #3a2b46;border-radius:10px;overflow:hidden;}
.ck-btn{font:800 11px 'Courier New',monospace;letter-spacing:1px;text-transform:uppercase;padding:8px 15px;border:none;
  background:#1a1220;color:#c9b6d6;cursor:pointer;}
.ck-btn.on{background:#C864C8;color:#160a18;}
.ck-grid{flex:1;min-height:0;overflow:auto;display:grid;gap:16px;padding:2px;
  grid-template-columns:repeat(auto-fill,minmax(210px,1fr));align-content:start;}
.ck-card{display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px;
  background:#07080c;border:1px solid #20222c;border-radius:14px;}
.ck-card canvas{image-rendering:auto;}
.ck-label{font:800 11px 'Courier New',monospace;letter-spacing:2px;color:#9fb0c8;text-transform:uppercase;}
.ck-size{display:inline-flex;align-items:center;gap:8px;margin-left:auto;color:#9fb0c8;
  font:700 10px 'Courier New',monospace;letter-spacing:1px;text-transform:uppercase;}
.ck-size input[type=range]{width:130px;accent-color:#C864C8;cursor:pointer;}
.ck-size .ck-px{min-width:44px;text-align:right;color:#C864C8;}

/* Date read-out window — a standalone broadcast display of YYYY MM DD DAY. */
.ck-date{display:flex;align-items:stretch;gap:1px;align-self:flex-start;
  background:#050505;border:1px solid #20222c;border-radius:12px;padding:6px;
  box-shadow:inset 0 0 22px rgba(255,47,47,.12);}
.ck-date .ck-cell{display:flex;flex-direction:column;align-items:center;gap:3px;
  padding:6px 16px;min-width:56px;}
.ck-date .ck-cell + .ck-cell{border-left:1px solid #1b1d24;}
.ck-date .ck-cap{font:700 9px 'Courier New',monospace;letter-spacing:2px;color:#7d8ba0;text-transform:uppercase;}
.ck-date .ck-val{font:800 26px 'Courier New',Consolas,monospace;letter-spacing:1px;color:#ff2f2f;
  text-shadow:0 0 12px rgba(255,47,47,.75);}
.ck-date .ck-day .ck-val{font-size:20px;letter-spacing:2px;}
`;

// Face size (CSS px, square). The slider drives it; the bitmap is dpr-scaled.
const SIZE_MIN = 120, SIZE_MAX = 480, SIZE_DEF = 186;
const clampSize = (n: number): number => Math.max(SIZE_MIN, Math.min(SIZE_MAX, Math.round(n)));

// ---- zone model -------------------------------------------------------------
interface Zone { label: string; utc: boolean; offsetH: number; }

/** Parse a routed feed label into a time zone. "UTC" → utc; "LOCAL ±NH" → offset. */
function parseZone(label: string): Zone {
  const clean = label.trim();
  if (/utc|gmt|zulu/i.test(clean)) return { label: 'UTC', utc: true, offsetH: 0 };
  // A signed hour offset, tolerating both ASCII '-' and the unicode minus '−'.
  const m = clean.match(/([+\-−])\s*(\d+)/);
  const offsetH = m ? (m[1] === '+' ? 1 : -1) * Number(m[2]) : 0;
  return { label: clean || 'LOCAL', utc: false, offsetH };
}

/** The zones to display: every routed feed, or a LOCAL + UTC default pair. */
function deriveZones(sources: ReadonlyArray<{ label: string }>): Zone[] {
  const zones = sources.map((s) => parseZone(s.label));
  return zones.length ? zones : [parseZone('LOCAL'), parseZone('UTC')];
}

/** {h,m,s,ms} for a zone at the current instant (UTC read-out or local ± offset). */
function zoneTime(z: Zone): { h: number; m: number; s: number; ms: number } {
  const now = new Date();
  if (z.utc) return { h: now.getUTCHours(), m: now.getUTCMinutes(), s: now.getUTCSeconds(), ms: now.getUTCMilliseconds() };
  const d = new Date(now.getTime() + z.offsetH * 3600_000);
  return { h: d.getHours(), m: d.getMinutes(), s: d.getSeconds(), ms: d.getMilliseconds() };
}

const pad = (n: number): string => String(n).padStart(2, '0');
const TAU = Math.PI * 2;

// ---- date read-out ----------------------------------------------------------
const WEEKDAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

/** The local calendar date, split into YYYY / MM / DD / DAY for the display window. */
function dateParts(): { yyyy: string; mm: string; dd: string; day: string } {
  const d = new Date();
  return {
    yyyy: String(d.getFullYear()),
    mm: pad(d.getMonth() + 1),
    dd: pad(d.getDate()),
    day: WEEKDAYS[d.getDay()] ?? '',
  };
}

// ---- DIGITAL face (big red LED read-out, with or without seconds) -----------
function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function drawDigital(g: CanvasRenderingContext2D, S: number, z: Zone, withSeconds: boolean): void {
  const t = zoneTime(z);
  const cx = S / 2, cy = S / 2;
  g.clearRect(0, 0, S, S);
  // Read-out panel.
  const pw = S * 0.92, ph = S * 0.52, x = cx - pw / 2, y = cy - ph / 2;
  g.fillStyle = '#050505'; roundRect(g, x, y, pw, ph, ph * 0.12); g.fill();
  // Zone caption.
  g.fillStyle = '#7d8ba0';
  g.font = `700 ${Math.round(S * 0.07)}px 'Courier New',monospace`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(z.label.toUpperCase(), cx, y + ph * 0.2);
  // Time.
  const str = withSeconds ? `${pad(t.h)}:${pad(t.m)}:${pad(t.s)}` : `${pad(t.h)}:${pad(t.m)}`;
  g.fillStyle = '#ff2f2f'; g.shadowColor = '#ff2f2f'; g.shadowBlur = S * 0.05;
  g.font = `800 ${Math.round(S * (withSeconds ? 0.2 : 0.28))}px 'Courier New',Consolas,monospace`;
  g.fillText(str, cx, cy + ph * 0.14);
  g.shadowBlur = 0;
}

// ---- ANALOG face (Evertz analog reference) ----------------------------------
function drawAnalog(g: CanvasRenderingContext2D, S: number, z: Zone): void {
  const t = zoneTime(z);
  const cx = S / 2, cy = S / 2, R = S * 0.46;
  g.clearRect(0, 0, S, S);
  // Bezel + white face.
  g.fillStyle = '#111'; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
  g.fillStyle = '#f4f4f2'; g.beginPath(); g.arc(cx, cy, R * 0.94, 0, TAU); g.fill();

  // Minute (thin) + hour (thick) ticks.
  for (let i = 0; i < 60; i++) {
    const a = -Math.PI / 2 + (i / 60) * TAU, cos = Math.cos(a), sin = Math.sin(a);
    const hour = i % 5 === 0;
    g.strokeStyle = '#1a1a1a'; g.lineWidth = hour ? S * 0.016 : S * 0.006;
    const rI = R * (hour ? 0.8 : 0.85);
    g.beginPath(); g.moveTo(cx + cos * rI, cy + sin * rI); g.lineTo(cx + cos * R * 0.9, cy + sin * R * 0.9); g.stroke();
  }
  // 12h numerals (black) + inner 24h numerals (red), as on the reference face.
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let h = 1; h <= 12; h++) {
    const a = -Math.PI / 2 + (h / 12) * TAU, cos = Math.cos(a), sin = Math.sin(a);
    g.fillStyle = '#111'; g.font = `800 ${Math.round(S * 0.11)}px Arial,Helvetica,sans-serif`;
    g.fillText(String(h), cx + cos * R * 0.68, cy + sin * R * 0.68);
    g.fillStyle = '#c02020'; g.font = `700 ${Math.round(S * 0.058)}px Arial,Helvetica,sans-serif`;
    g.fillText(String(h === 12 ? 24 : h + 12), cx + cos * R * 0.5, cy + sin * R * 0.5);
  }
  // Brand caption.
  g.fillStyle = '#8a1f1f'; g.font = `800 ${Math.round(S * 0.05)}px Arial,sans-serif`;
  g.fillText(z.label.toUpperCase(), cx, cy + R * 0.34);

  // Hands. Second sweeps SMOOTHLY (ms fraction) for the high-visibility look.
  const secF = t.s + t.ms / 1000;
  const minF = t.m + secF / 60;
  const hourF = (t.h % 12) + minF / 60;
  const hand = (frac: number, len: number, w: number, color: string, tail = 0): void => {
    const a = -Math.PI / 2 + frac * TAU;
    g.strokeStyle = color; g.lineWidth = w; g.lineCap = 'round';
    g.beginPath();
    g.moveTo(cx - Math.cos(a) * tail, cy - Math.sin(a) * tail);
    g.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
    g.stroke();
  };
  hand(hourF / 12, R * 0.5, S * 0.028, '#141414');
  hand(minF / 60, R * 0.74, S * 0.02, '#141414');
  hand(secF / 60, R * 0.82, S * 0.012, '#e01010', R * 0.22);   // red sweep hand + counterweight
  g.fillStyle = '#141414'; g.beginPath(); g.arc(cx, cy, S * 0.03, 0, TAU); g.fill();
  g.fillStyle = '#e01010'; g.beginPath(); g.arc(cx, cy, S * 0.014, 0, TAU); g.fill();
}

const plugin: EditorPlugin = {
  id: 'clock',
  title: 'CLOCK · TIME GENERATOR',
  order: 8,
  blurb: 'Broadcast clock source — UTC + local ±3h zones as a digital read-out (with or without seconds) or a smooth analog sweep.',
  match: (n) => /\bclock\b/i.test(n),
  render(host, ctx) {
    addStyles('twist-editor-clock', CSS);
    const zones = deriveZones(ctx.sources);

    type Face = 'digital' | 'digitalsec' | 'analog';
    let style: Face = 'digitalsec';
    const FACES: Array<{ id: Face; label: string }> = [
      { id: 'digital', label: '◷ Digital' },
      { id: 'digitalsec', label: '◷ Digital · Sec' },
      { id: 'analog', label: '◴ Analog' },
    ];
    const faceBtns = FACES.map((f) => {
      const b = el('button', { class: `ck-btn${f.id === style ? ' on' : ''}` }, [f.label]);
      b.addEventListener('click', () => { style = f.id; reflect(); ctx.services.publishParam?.('face', style, { throttle: false }); });
      return { id: f.id, b };
    });
    const reflect = (): void => { for (const x of faceBtns) x.b.classList.toggle('on', x.id === style); };

    // One canvas per zone, backed by a devicePixelRatio-scaled bitmap for crisp
    // ticks and numerals at any zoom. S (the CSS px size) is slider-driven.
    const grid = el('div', { class: 'ck-grid' });
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    let S = SIZE_DEF;
    const faces = zones.map((z) => {
      const cvs = el('canvas') as HTMLCanvasElement;
      const g = ctx2d(cvs);
      grid.append(el('div', { class: 'ck-card' }, [cvs, el('div', { class: 'ck-label' }, [z.label.toUpperCase()])]));
      return { z, cvs, g };
    });

    // (Re)size every face bitmap to S·dpr and reset the transform so 1 unit = 1 CSS px.
    // Cards flex to fit the face, so the grid columns track the size too.
    const applySize = (): void => {
      grid.style.gridTemplateColumns = `repeat(auto-fill,minmax(${S + 24}px,1fr))`;
      for (const f of faces) {
        f.cvs.width = S * dpr; f.cvs.height = S * dpr;
        f.cvs.style.width = `${S}px`; f.cvs.style.height = `${S}px`;
        f.g?.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };

    // Size slider — resizes the clock faces live on the canvas.
    const sizeInput = el('input', {
      type: 'range', min: String(SIZE_MIN), max: String(SIZE_MAX), step: '2', value: String(S),
    }) as HTMLInputElement;
    const sizePx = el('span', { class: 'ck-px' }, [`${S}px`]);
    const setSize = (n: number, publish = true): void => {
      S = clampSize(n);
      sizeInput.value = String(S);
      sizePx.textContent = `${S}px`;
      applySize();
      if (publish) ctx.services.publishParam?.('size', S, { throttle: true });
    };
    sizeInput.addEventListener('input', () => setSize(Number(sizeInput.value)));

    // Date read-out window — its own standalone display of YYYY MM DD DAY.
    const yyyyV = el('div', { class: 'ck-val' });
    const mmV = el('div', { class: 'ck-val' });
    const ddV = el('div', { class: 'ck-val' });
    const dayV = el('div', { class: 'ck-val' });
    const cell = (cap: string, val: HTMLElement, extra = ''): HTMLElement =>
      el('div', { class: `ck-cell${extra}` }, [val, el('div', { class: 'ck-cap' }, [cap])]);
    const dateWin = el('div', { class: 'ck-date' }, [
      cell('Year', yyyyV),
      cell('Month', mmV),
      cell('Day', ddV),
      cell('Weekday', dayV, ' ck-day'),
    ]);
    let lastDate = '';
    const paintDate = (): void => {
      const d = dateParts();
      const key = `${d.yyyy}${d.mm}${d.dd}${d.day}`;
      if (key === lastDate) return;
      lastDate = key;
      yyyyV.textContent = d.yyyy;
      mmV.textContent = d.mm;
      ddV.textContent = d.dd;
      dayV.textContent = d.day;
    };
    paintDate();

    host.append(el('div', { class: 'ck' }, [
      dateWin,
      el('div', { class: 'ck-bar' }, [
        el('h4', {}, ['Face']),
        el('div', { class: 'ck-seg' }, faceBtns.map((x) => x.b)),
        el('label', { class: 'ck-size' }, ['Size', sizeInput, sizePx]),
      ]),
      grid,
    ]));
    applySize();

    // Advertise the face + size selectors so an external controller can drive the wall.
    ctx.services.advertiseParams?.([
      { name: 'face', type: 'string', writable: true },
      { name: 'size', type: 'number', writable: true },
    ]);
    ctx.services.onParam?.('face', (v) => { if (v === 'digital' || v === 'digitalsec' || v === 'analog') { style = v; reflect(); } });
    ctx.services.onParam?.('size', (v) => { const n = Number(v); if (Number.isFinite(n)) setSize(n, false); });
    ctx.services.publishParam?.('face', style, { throttle: false });
    ctx.services.publishParam?.('size', S, { throttle: false });

    ctx.dispose.raf(() => {
      paintDate();
      for (const f of faces) {
        if (!f.g) continue;
        if (style === 'analog') drawAnalog(f.g, S, f.z); else drawDigital(f.g, S, f.z, style === 'digitalsec');
      }
    });
  },
};

export default plugin;

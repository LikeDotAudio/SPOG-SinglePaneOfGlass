// src/ui/faux-signal — the shared "faux signal" a routed source presents on ANY
// preview surface (stage-box camera · signal-conditioner · vision-mixer · encoder
// · multi-viewer). Instead of generic colour bars, each source paints a
// DETERMINISTIC "person in a room" cartoon: seeded from the feed so a given source
// always looks the same and distinct sources look different. Pure canvas 2D.
import type { Feed } from '../domain/routing-core/index.js';
import { drawTsg } from '../domain/tsg/index.js';

// We only need identity + colour (+ optional room/media/fault) — accept a Feed or
// any lightweight source-like object. `tsg` (a pattern id) makes this feed paint a
// standardised Test Signal Generator pattern instead of the person-in-a-room cartoon.
export type FauxSource = Partial<Feed> & { label?: string; tsg?: string };

// --- deterministic seed (FNV-1a hash → mulberry32 PRNG) ---
const hashStr = (s: string): number => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const mulberry32 = (a: number): (() => number) => () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

type RGB = [number, number, number];
const hexToRgb = (hex: string): RGB => {
  const h = (hex || '#888').replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '8');
  const v = parseInt(n.slice(0, 6), 16); const w = Number.isNaN(v) ? 0x888888 : v;
  return [(w >> 16) & 255, (w >> 8) & 255, w & 255];
};
const css = (c: RGB): string => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const pick = <T>(rng: () => number, arr: T[]): T => arr[Math.floor(rng() * arr.length)] as T;

const SKIN: RGB[] = [[242, 201, 160], [230, 181, 142], [210, 155, 115], [184, 124, 80], [141, 90, 58], [92, 58, 38]];
const HAIR: RGB[] = [[43, 33, 25], [61, 43, 31], [107, 74, 43], [26, 26, 26], [122, 122, 122], [201, 168, 106], [163, 59, 42]];

// A framed window/poster + optional plant on the back wall → "a room".
function room(g: CanvasRenderingContext2D, W: number, H: number, rng: () => number, accent: RGB): void {
  const horizon = H * 0.62;
  const wall = mix([32, 38, 52], accent, 0.16);
  g.fillStyle = css(mix(wall, [255, 255, 255], 0.05)); g.fillRect(0, 0, W, horizon);
  g.fillStyle = css(mix([18, 22, 32], accent, 0.08)); g.fillRect(0, horizon, W, H - horizon);   // floor
  g.fillStyle = css(mix(wall, [0, 0, 0], 0.3)); g.fillRect(0, horizon - H * 0.018, W, H * 0.018);  // baseboard
  const fw = W * (0.17 + rng() * 0.1), fh = fw * 0.72, fx = rng() < 0.5 ? W * 0.08 : W * 0.65, fy = horizon * 0.14;
  g.fillStyle = css(mix(accent, [255, 255, 255], 0.4)); g.fillRect(fx, fy, fw, fh);
  g.strokeStyle = css(mix(wall, [0, 0, 0], 0.45)); g.lineWidth = Math.max(2, W * 0.008); g.strokeRect(fx, fy, fw, fh);
  g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx + fw, fy + fh); g.moveTo(fx + fw, fy); g.lineTo(fx, fy + fh); g.stroke();
  if (rng() < 0.6) {   // a potted plant on the opposite side
    const px = fx < W * 0.4 ? W * 0.85 : W * 0.14, py = horizon;
    g.fillStyle = '#7a4a2e'; g.fillRect(px - W * 0.03, py - H * 0.06, W * 0.06, H * 0.06);
    g.fillStyle = css(mix([46, 120, 64], accent, 0.15));
    g.beginPath(); g.ellipse(px, py - H * 0.09, W * 0.055, H * 0.07, 0, 0, 7); g.fill();
  }
}

// A seated head-and-shoulders "talent" — the news-anchor framing reads at any size.
function person(g: CanvasRenderingContext2D, W: number, H: number, rng: () => number, t: number): void {
  const cx = W * (0.46 + rng() * 0.08), horizon = H * 0.62;
  const skin = pick(rng, SKIN), hair = pick(rng, HAIR), shirtH = Math.floor(rng() * 360);
  const headR = W * 0.13 * (0.92 + rng() * 0.16);
  const bob = Math.sin(t / 900 + rng() * 6) * headR * 0.03;   // subtle "live" breathing
  const headY = horizon - headR * 1.15 + bob;
  // shoulders / torso
  g.fillStyle = `hsl(${shirtH},46%,44%)`;
  g.beginPath();
  g.moveTo(cx - W * 0.33, H); g.lineTo(cx - W * 0.19, horizon + headR * 0.1);
  g.quadraticCurveTo(cx, horizon - headR * 0.55, cx + W * 0.19, horizon + headR * 0.1);
  g.lineTo(cx + W * 0.33, H); g.closePath(); g.fill();
  // collar V
  g.fillStyle = `hsl(${shirtH},40%,30%)`;
  g.beginPath(); g.moveTo(cx, horizon + headR * 0.55); g.lineTo(cx - headR * 0.5, horizon - headR * 0.1); g.lineTo(cx + headR * 0.5, horizon - headR * 0.1); g.closePath(); g.fill();
  // neck
  g.fillStyle = css(mix(skin, [0, 0, 0], 0.14)); g.fillRect(cx - headR * 0.26, headY + headR * 0.8, headR * 0.52, headR * 0.8);
  // head + ears
  g.fillStyle = css(skin);
  g.beginPath(); g.ellipse(cx - headR * 0.82, headY + headR * 0.1, headR * 0.16, headR * 0.22, 0, 0, 7); g.ellipse(cx + headR * 0.82, headY + headR * 0.1, headR * 0.16, headR * 0.22, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(cx, headY, headR * 0.82, headR, 0, 0, 7); g.fill();
  // hair (varied styles: full cap, side-part, or short crop)
  g.fillStyle = css(hair);
  const style = Math.floor(rng() * 3);
  g.beginPath();
  if (style === 0) { g.arc(cx, headY - headR * 0.05, headR * 0.9, Math.PI * 1.02, Math.PI * 1.98); g.fill(); }
  else { g.ellipse(cx, headY - headR * 0.55, headR * 0.9, headR * (style === 1 ? 0.55 : 0.4), 0, 0, Math.PI, true); g.fill(); }
  // eyes + brows + smile
  const ey = headY + headR * 0.05, ex = headR * 0.34;
  g.fillStyle = '#20242e';
  g.beginPath(); g.ellipse(cx - ex, ey, headR * 0.09, headR * 0.12, 0, 0, 7); g.ellipse(cx + ex, ey, headR * 0.09, headR * 0.12, 0, 0, 7); g.fill();
  g.strokeStyle = css(mix(hair, [0, 0, 0], 0.2)); g.lineWidth = Math.max(1, headR * 0.06); g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx - ex * 1.4, ey - headR * 0.3); g.lineTo(cx - ex * 0.6, ey - headR * 0.36); g.moveTo(cx + ex * 0.6, ey - headR * 0.36); g.lineTo(cx + ex * 1.4, ey - headR * 0.3); g.stroke();
  g.strokeStyle = css(mix(skin, [120, 40, 40], 0.5));
  g.beginPath(); g.arc(cx, headY + headR * 0.34, headR * 0.32, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
}

// A desk microphone for AUDIO-medium feeds.
function mic(g: CanvasRenderingContext2D, W: number, H: number): void {
  const mx = W * 0.5, my = H * 0.86;
  g.fillStyle = '#141821'; g.fillRect(mx - W * 0.012, my, W * 0.024, H * 0.14);
  g.fillStyle = '#2b3242'; g.beginPath(); g.ellipse(mx, my, W * 0.05, H * 0.075, 0, 0, 7); g.fill();
  g.strokeStyle = 'rgba(180,200,230,.5)'; g.lineWidth = Math.max(1, W * 0.004);
  for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(mx + i * W * 0.014, my - H * 0.06); g.lineTo(mx + i * W * 0.014, my + H * 0.06); g.stroke(); }
}

// A broadcast lower-third: source label + originating room, with the feed accent.
function lowerThird(g: CanvasRenderingContext2D, W: number, H: number, feed: FauxSource): void {
  const label = (feed.label || feed.id || 'SOURCE').toUpperCase();
  const parts = (feed.origin || '').split(/[—–-]/).map((x) => x.trim()).filter(Boolean);
  const roomName = parts.length >= 2 ? parts[parts.length - 2]! : (parts[0] || '');
  const bh = H * 0.17, by = H - bh, acc = hexToRgb(feed.color || '#64c8a0');
  g.fillStyle = 'rgba(6,12,22,0.68)'; g.fillRect(0, by, W, bh);
  g.fillStyle = css(acc); g.fillRect(0, by, W * 0.022, bh);
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.fillStyle = '#eaf4ff'; g.font = `700 ${Math.round(bh * 0.4)}px sans-serif`;
  g.fillText(label, W * 0.055, by + bh * (roomName ? 0.45 : 0.62), W * 0.9);
  if (roomName) { g.fillStyle = '#9fb6cc'; g.font = `${Math.round(bh * 0.28)}px sans-serif`; g.fillText(roomName, W * 0.055, by + bh * 0.82, W * 0.9); }
}

// A "no signal" slate for faulted feeds (static + red bar).
function faultSlate(g: CanvasRenderingContext2D, W: number, H: number, rng: () => number): void {
  g.fillStyle = '#0a0a0a'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < (W * H) / 40; i++) { const v = Math.floor(rng() * 255); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(rng() * W, rng() * H, 2, 2); }
  const bh = H * 0.17; g.fillStyle = 'rgba(178,20,20,0.9)'; g.fillRect(0, H * 0.42, W, bh);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 ${Math.round(bh * 0.48)}px sans-serif`;
  g.fillText('NO SIGNAL', W / 2, H * 0.42 + bh / 2);
}

// Paint the faux signal for `feed` onto `canvas`. Pass `t` (a timestamp, ms) for a
// subtle "live" bob; omit for a still frame. Sizes the backing store from the
// canvas's CSS box when laid out, else draws in its existing backing pixels.
export function drawFauxSignal(canvas: HTMLCanvasElement, feed: FauxSource, t = 0): void {
  // A Test Signal Generator feed paints its standardised pattern, not the cartoon.
  if (feed.tsg) { drawTsg(canvas, feed.tsg, t); return; }
  const dpr = window.devicePixelRatio || 1;
  const cw = canvas.clientWidth, ch = canvas.clientHeight;
  const laidOut = cw > 0 && ch > 0;
  const W = laidOut ? cw : canvas.width, H = laidOut ? ch : canvas.height;
  if (!W || !H) return;
  if (laidOut) { canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr); }
  const g = canvas.getContext('2d'); if (!g) return;
  const s = laidOut ? dpr : 1; g.setTransform(s, 0, 0, s, 0, 0);
  g.clearRect(0, 0, W, H);
  const rng = mulberry32(hashStr(`${feed.id || feed.label || 'src'}|${feed.color || ''}`));
  if (feed.faulted) { faultSlate(g, W, H, rng); return; }
  room(g, W, H, rng, hexToRgb(feed.color || '#64c8a0'));
  person(g, W, H, rng, t);
  if (feed.media === 'audio') mic(g, W, H);
  lowerThird(g, W, H, feed);
}

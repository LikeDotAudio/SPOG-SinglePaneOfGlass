// src/editors/meter-input/live-input — REAL video/audio capture + analysis (TS).
//
// Reads ACTUAL pixels + audio the browser is allowed to touch, so the scopes are
// genuine (not the synthetic state of ui/scopes.ts):
//   • Test Pattern — a generated bars+gradient source (offline; proves the pipeline)
//   • Capture Tab  — getDisplayMedia(): scope a real tab/window incl. a playing YouTube clip
//   • File / URL   — a local file (blob) or a CORS-enabled media URL
//
// A YouTube <iframe> itself can't be scoped: it is cross-origin → the canvas is
// tainted and getImageData()/WebAudio are blocked. Capture Tab sidesteps that —
// the captured MediaStream is readable, so the scopes run on the real frames+audio.
//
// Secure-context only (https or http://localhost): getDisplayMedia + canvas pixel
// reads require it — which the deployed https site and `python3 start.py` both are.

export type SourceMode = 'bars' | 'stream' | 'media';

export interface FrameData {
  AW: number; AH: number; BINS: number;
  // Per-column value HISTOGRAMS (AW columns × BINS value bins). Brightness when
  // drawn = pixel count → the real waveform-monitor density look.
  rH: Uint32Array; gH: Uint32Array; bH: Uint32Array; yH: Uint32Array;
  pts: number[];               // flat [cb, cr, r, g, b, …] for the vectorscope
}

export interface LiveInput {
  readonly video: HTMLVideoElement;
  mode(): SourceMode;
  isTainted(): boolean;
  captureTab(): Promise<MediaStream>;
  useMedia(url: string, remote: boolean): Promise<void>;
  useBars(): void;
  grab(t: number): boolean;
  analyze(): FrameData | null;
  timeData(): Uint8Array | null;    // summed (L+R mono downmix)
  timeDataL(): Uint8Array | null;   // left channel
  timeDataR(): Uint8Array | null;   // right channel
  rmsL(): number;
  rmsR(): number;
  stop(): void;
}

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

export function createLiveInput(AW = 256, AH = 144): LiveInput {
  const video = document.createElement('video');
  video.playsInline = true;
  video.muted = true;

  const off = document.createElement('canvas');
  off.width = AW; off.height = AH;
  const octx = off.getContext('2d', { willReadFrequently: true });
  const gen = document.createElement('canvas');
  gen.width = AW; gen.height = AH;
  const gctx = gen.getContext('2d');

  let mode: SourceMode = 'bars';
  let tainted = false;

  // --- audio graph (lazy) ---
  let actx: AudioContext | null = null;
  let anTime: AnalyserNode | null = null;
  let anL: AnalyserNode | null = null;
  let anR: AnalyserNode | null = null;
  let td: Uint8Array<ArrayBuffer> | null = null;
  let tdL: Uint8Array<ArrayBuffer> | null = null;
  let tdR: Uint8Array<ArrayBuffer> | null = null;
  let fL: Float32Array<ArrayBuffer> | null = null;
  let fR: Float32Array<ArrayBuffer> | null = null;
  let elemSrc: MediaElementAudioSourceNode | null = null;
  let streamSrc: MediaStreamAudioSourceNode | null = null;
  let curSrc: AudioNode | null = null;

  function ensureAudio(): void {
    if (!actx) {
      const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
      if (!Ctor) return;
      actx = new Ctor();
      anTime = actx.createAnalyser(); anTime.fftSize = 1024; td = new Uint8Array(anTime.fftSize);
      anL = actx.createAnalyser(); anR = actx.createAnalyser(); anL.fftSize = anR.fftSize = 1024;
      fL = new Float32Array(anL.fftSize); fR = new Float32Array(anR.fftSize);
      tdL = new Uint8Array(anL.fftSize); tdR = new Uint8Array(anR.fftSize);
    }
    if (actx.state === 'suspended') void actx.resume();
  }

  function wireAudio(isStream: boolean, stream?: MediaStream): void {
    ensureAudio();
    if (!actx || !anTime || !anL || !anR) return;
    if (curSrc) { try { curSrc.disconnect(); } catch { /* ignore */ } }
    if (isStream && stream) {
      if (streamSrc) { try { streamSrc.disconnect(); } catch { /* ignore */ } }
      streamSrc = actx.createMediaStreamSource(stream);
      curSrc = streamSrc;
    } else {
      if (!elemSrc) elemSrc = actx.createMediaElementSource(video); // once per element
      curSrc = elemSrc;
    }
    const split = actx.createChannelSplitter(2);
    curSrc.connect(split); split.connect(anL, 0); split.connect(anR, 1);
    curSrc.connect(anTime);
    if (!isStream) curSrc.connect(actx.destination); // play file/URL; don't echo captured tab
  }

  // --- sources ---
  function stopStream(): void {
    const s = video.srcObject as MediaStream | null;
    if (s) s.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  }
  function useBars(): void { stopStream(); mode = 'bars'; tainted = false; }
  async function captureTab(): Promise<MediaStream> {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    stopStream(); video.srcObject = stream; video.muted = true; await video.play();
    mode = 'stream'; tainted = false; wireAudio(true, stream); return stream;
  }
  async function useMedia(url: string, remote: boolean): Promise<void> {
    stopStream(); video.srcObject = null;
    if (remote) video.crossOrigin = 'anonymous'; else video.removeAttribute('crossorigin');
    video.src = url; video.muted = false;
    await video.play();
    mode = 'media'; tainted = false;
    try { wireAudio(false); } catch { /* audio may be blocked on tainted cross-origin */ }
  }
  function stop(): void { stopStream(); try { if (actx) void actx.close(); } catch { /* ignore */ } }

  // --- test pattern ---
  function drawBars(t: number): void {
    if (!gctx) return;
    const cols = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
    const w = AW / cols.length;
    for (let i = 0; i < cols.length; i++) { gctx.fillStyle = cols[i] ?? '#000'; gctx.fillRect(i * w, 0, w + 1, AH * 0.75); }
    const g = gctx.createLinearGradient(0, 0, AW, 0);
    g.addColorStop(0, '#000'); g.addColorStop((Math.sin(t / 1000) + 1) / 2, '#fff'); g.addColorStop(1, '#000');
    gctx.fillStyle = g; gctx.fillRect(0, AH * 0.75, AW, AH * 0.25);
  }

  // --- per-frame video ---
  function grab(t: number): boolean {
    if (!octx) return false;
    if (mode === 'bars') { drawBars(t); octx.drawImage(gen, 0, 0, AW, AH); return true; }
    if (video.readyState < 2) return false;
    try { octx.drawImage(video, 0, 0, AW, AH); return true; } catch { return false; }
  }
  function analyze(): FrameData | null {
    if (!octx) return null;
    let img: Uint8ClampedArray;
    try { img = octx.getImageData(0, 0, AW, AH).data; tainted = false; }
    catch { tainted = true; return null; } // cross-origin without CORS → tainted
    const rMin = new Uint8Array(AW).fill(255), rMax = new Uint8Array(AW);
    const gMin = new Uint8Array(AW).fill(255), gMax = new Uint8Array(AW);
    const bMin = new Uint8Array(AW).fill(255), bMax = new Uint8Array(AW);
    const yMin = new Uint8Array(AW).fill(255), yMax = new Uint8Array(AW);
    const pts: number[] = [];
    for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) {
      const i = (y * AW + x) * 4;
      const r = img[i] ?? 0, g = img[i + 1] ?? 0, b = img[i + 2] ?? 0;
      if (r < (rMin[x] ?? 255)) rMin[x] = r; if (r > (rMax[x] ?? 0)) rMax[x] = r;
      if (g < (gMin[x] ?? 255)) gMin[x] = g; if (g > (gMax[x] ?? 0)) gMax[x] = g;
      if (b < (bMin[x] ?? 255)) bMin[x] = b; if (b > (bMax[x] ?? 0)) bMax[x] = b;
      const Y = (0.2126 * r + 0.7152 * g + 0.0722 * b) | 0;
      if (Y < (yMin[x] ?? 255)) yMin[x] = Y; if (Y > (yMax[x] ?? 0)) yMax[x] = Y;
      if (((x + y) & 3) === 0) {
        const cb = -0.1146 * r - 0.3854 * g + 0.5 * b, cr = 0.5 * r - 0.4542 * g - 0.0458 * b;
        pts.push(cb, cr, r, g, b);
      }
    }
    return { AW, AH, rMin, rMax, gMin, gMax, bMin, bMax, yMin, yMax, pts };
  }

  // --- audio reads ---
  function timeData(): Uint8Array | null { if (anTime && td) { anTime.getByteTimeDomainData(td); return td; } return null; }
  function timeDataL(): Uint8Array | null { if (anL && tdL) { anL.getByteTimeDomainData(tdL); return tdL; } return null; }
  function timeDataR(): Uint8Array | null { if (anR && tdR) { anR.getByteTimeDomainData(tdR); return tdR; } return null; }
  function rmsOf(an: AnalyserNode | null, buf: Float32Array<ArrayBuffer> | null): number {
    if (!an || !buf) return -70;
    an.getFloatTimeDomainData(buf);
    let s = 0; for (let i = 0; i < buf.length; i++) { const v = buf[i] ?? 0; s += v * v; }
    return 20 * Math.log10(Math.sqrt(s / buf.length) || 1e-7);
  }

  return {
    video, mode: () => mode, isTainted: () => tainted,
    captureTab, useMedia, useBars, stop, grab, analyze, timeData, timeDataL, timeDataR,
    rmsL: () => rmsOf(anL, fL), rmsR: () => rmsOf(anR, fR),
  };
}

// ---- draw helpers (render analysis onto editor canvases) -------------------
function ctx2d(cv: HTMLCanvasElement): CanvasRenderingContext2D | null { return cv.getContext('2d'); }

// --- phosphor look: fade the previous frame (persistence trail) instead of a hard
//     clear, then plot sparse, low-alpha, ADDITIVE dots so the signal glows where
//     it dwells and leaves soft ghosts. The graticule is redrawn crisp each frame.
function fade(c: CanvasRenderingContext2D, W: number, H: number, a: number): void {
  c.globalCompositeOperation = 'source-over';
  c.fillStyle = `rgba(3,6,15,${a})`;
  c.fillRect(0, 0, W, H);
}

export function drawParadeReal(cv: HTMLCanvasElement, d: FrameData): void {
  const c = ctx2d(cv); if (!c) return; const W = cv.width, H = cv.height, pw = W / 3;
  fade(c, W, H, 0.20);
  const chans: Array<[Uint8Array, Uint8Array, string]> = [
    [d.rMin, d.rMax, '255,90,90'], [d.gMin, d.gMax, '90,255,122'], [d.bMin, d.bMax, '90,157,255'],
  ];
  c.strokeStyle = '#0e2436';
  for (let p = 0; p < 3; p++) for (let i = 0; i <= 4; i++) { const y = H * i / 4; c.beginPath(); c.moveTo(p * pw, y); c.lineTo((p + 1) * pw, y); c.stroke(); }
  c.globalCompositeOperation = 'lighter';
  chans.forEach((ch, p) => {
    c.fillStyle = `rgba(${ch[2]},0.13)`;
    for (let x = 0; x < pw; x++) {
      const sx = (x / pw * d.AW) | 0;
      const top = H - (ch[1][sx] ?? 0) / 255 * H, bot = H - (ch[0][sx] ?? 0) / 255 * H;
      for (let k = 0; k < 3; k++) { const y = top + (bot - top) * Math.random(); c.fillRect(p * pw + x, y, 1, 1); }
    }
  });
  c.globalCompositeOperation = 'source-over';
}

export function drawWaveReal(cv: HTMLCanvasElement, mins: Uint8Array, maxs: Uint8Array, AW: number, color = '215,240,255'): void {
  const c = ctx2d(cv); if (!c) return; const W = cv.width, H = cv.height;
  fade(c, W, H, 0.20);
  c.strokeStyle = '#0e2436';
  for (let i = 0; i <= 4; i++) { const y = H * i / 4; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = `rgba(${color},0.12)`;
  for (let x = 0; x < W; x++) {
    const sx = (x / W * AW) | 0;
    const top = H - (maxs[sx] ?? 0) / 255 * H, bot = H - (mins[sx] ?? 0) / 255 * H;
    for (let k = 0; k < 3; k++) { const y = top + (bot - top) * Math.random(); c.fillRect(x, y, 1, 1); }
  }
  c.globalCompositeOperation = 'source-over';
}

export function drawVectorReal(cv: HTMLCanvasElement, pts: number[]): void {
  const c = ctx2d(cv); if (!c) return; const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 6;
  fade(c, W, H, 0.18);
  c.strokeStyle = '#0e2436'; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.stroke();
  c.beginPath(); c.moveTo(cx - R, cy); c.lineTo(cx + R, cy); c.moveTo(cx, cy - R); c.lineTo(cx, cy + R); c.stroke();
  c.strokeStyle = '#24401f'; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + R * Math.cos(-2.15), cy + R * Math.sin(-2.15)); c.stroke();
  const sc = R / 140;
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < pts.length; i += 5) {
    c.fillStyle = `rgba(${(pts[i + 2] ?? 0) | 0},${(pts[i + 3] ?? 0) | 0},${(pts[i + 4] ?? 0) | 0},0.5)`;
    c.fillRect(cx + (pts[i] ?? 0) * sc, cy - (pts[i + 1] ?? 0) * sc, 1, 1);
  }
  c.globalCompositeOperation = 'source-over';
}

// Three stacked lanes: Left (top), Right (middle), and their sum L+R (bottom).
export function drawScope3(cv: HTMLCanvasElement, L: Uint8Array | null, R: Uint8Array | null, S: Uint8Array | null): void {
  const c = ctx2d(cv); if (!c) return; const W = cv.width, H = cv.height; c.clearRect(0, 0, W, H);
  const lanes: Array<[Uint8Array | null, string, string]> = [[L, 'L', '90,255,122'], [R, 'R', '90,157,255'], [S, 'L+R', '255,212,0']];
  const lh = H / 3;
  c.font = 'bold 9px "Courier New",monospace';
  lanes.forEach(([data, label, rgb], li) => {
    const y0 = li * lh, mid = y0 + lh / 2;
    c.strokeStyle = '#0e2436'; c.beginPath(); c.moveTo(0, mid); c.lineTo(W, mid); c.stroke();
    c.fillStyle = '#5a6f88'; c.fillText(label, 5, y0 + 12);
    if (!data) return;
    c.globalCompositeOperation = 'lighter';
    c.strokeStyle = `rgba(${rgb},0.5)`; c.lineWidth = 1; c.beginPath();
    for (let x = 0; x < W; x++) {
      const v = (data[(x / W * data.length) | 0] ?? 128) / 128 - 1;
      const y = mid - v * (lh / 2) * 0.82;
      x ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.stroke();
    c.globalCompositeOperation = 'source-over';
  });
}

// Analog VU meters (L + R), inspired by OPEN-AIR libControl/metering NeedleMeter:
// a cream face, arced -20…+3 VU scale with a red over-0 zone, and a ballistic
// needle. Caller passes already-ballistic-smoothed dBFS (0 VU ≙ -18 dBFS).
const VU_LO = -20, VU_HI = 3;
const VU_MARKS: Array<[number, string]> = [[-20, '20'], [-10, '10'], [-7, '7'], [-5, '5'], [-3, '3'], [0, '0'], [3, '+3']];
function drawOneVU(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, db: number, label: string): void {
  c.save();
  c.beginPath(); c.roundRect(x + 2, y + 2, w - 4, h - 4, 8); c.fillStyle = '#efe7d0'; c.fill();
  c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1; c.stroke();
  const cx = x + w / 2, cy = y + h * 0.9, R = Math.min(w, h) * 0.7;
  const A0 = -Math.PI / 2 - 0.92, A1 = -Math.PI / 2 + 0.92;
  const ang = (vu: number): number => A0 + (A1 - A0) * ((vu - VU_LO) / (VU_HI - VU_LO));
  c.strokeStyle = '#3a3428'; c.lineWidth = 1.5; c.beginPath(); c.arc(cx, cy, R, A0, A1); c.stroke();
  c.strokeStyle = '#c02020'; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, R, ang(0), A1); c.stroke();
  const fs = Math.max(6, h * 0.085);
  c.textAlign = 'center'; c.font = `bold ${fs}px Arial`;
  VU_MARKS.forEach(([vu, txt]) => {
    const a = ang(vu), red = vu >= 0;
    c.strokeStyle = red ? '#c02020' : '#2a2418'; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); c.lineTo(cx + Math.cos(a) * (R - 7), cy + Math.sin(a) * (R - 7)); c.stroke();
    c.fillStyle = red ? '#c02020' : '#2a2418'; c.fillText(txt, cx + Math.cos(a) * (R - 15), cy + Math.sin(a) * (R - 15) + 3);
  });
  c.fillStyle = '#8a7530'; c.font = `bold ${Math.max(8, h * 0.1)}px Arial`; c.fillText('VU', cx, cy - R * 0.5);
  c.fillStyle = '#2a2418'; c.font = `bold ${fs}px Arial`; c.fillText(label, cx, cy - 5);
  const a = ang(Math.max(VU_LO, Math.min(VU_HI, db + 18)));
  c.strokeStyle = '#141414'; c.lineWidth = Math.max(1.5, h * 0.018); c.lineCap = 'round';
  c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * R * 0.95, cy + Math.sin(a) * R * 0.95); c.stroke();
  c.fillStyle = '#141414'; c.beginPath(); c.arc(cx, cy, Math.max(3, h * 0.035), 0, 7); c.fill();
  c.restore();
}
export function drawVUpair(cv: HTMLCanvasElement, dbL: number, dbR: number): void {
  const c = ctx2d(cv); if (!c) return; const W = cv.width, H = cv.height; c.clearRect(0, 0, W, H);
  drawOneVU(c, 0, 0, W / 2, H, dbL, 'L');
  drawOneVU(c, W / 2, 0, W / 2, H, dbR, 'R');
}

export interface PeakState { l: number; r: number; }
export function drawMetersReal(cv: HTMLCanvasElement, dbL: number, dbR: number, peak: PeakState): void {
  const c = ctx2d(cv); if (!c) return; const W = cv.width, H = cv.height; c.clearRect(0, 0, W, H);
  const norm = (db: number): number => Math.max(0, Math.min(1, (db + 60) / 60));
  peak.l = Math.max(norm(dbL), peak.l - 0.01); peak.r = Math.max(norm(dbR), peak.r - 0.01);
  const bars: Array<[number, number, number, string]> = [[norm(dbL), peak.l, dbL, 'L'], [norm(dbR), peak.r, dbR, 'R']];
  bars.forEach((m, i) => {
    const bw = W / 2 - 14, x = i * (W / 2) + 8;
    c.fillStyle = '#0c1322'; c.fillRect(x, 8, bw, H - 30);
    const g = c.createLinearGradient(0, H - 22, 0, 8);
    g.addColorStop(0, '#19c54b'); g.addColorStop(0.7, '#e6e23a'); g.addColorStop(1, '#ff3b3b');
    c.fillStyle = g; c.fillRect(x, 8 + (H - 30) * (1 - m[0]), bw, (H - 30) * m[0]);
    c.fillStyle = '#fff'; c.fillRect(x, 8 + (H - 30) * (1 - m[1]), bw, 2);
    c.fillStyle = '#bcd3ee'; c.font = 'bold 10px monospace';
    c.fillText(`${m[3]} ${isFinite(m[2]) ? m[2].toFixed(0) : '-∞'}`, x, H - 6);
  });
}

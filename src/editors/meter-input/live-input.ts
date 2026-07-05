// src/editors/meter-input/live-input — REAL video/audio capture + analysis (TS).
//
// Reads ACTUAL pixels + audio the browser is allowed to touch, so the scopes are
// genuine (not the synthetic state of ui/scopes.ts):
//   • Test Pattern — standard SMPTE colour bars (offline; proves the pipeline end-to-end)
//   • Capture Tab  — getDisplayMedia(): scope a real tab/window incl. a playing YouTube clip
//   • File / URL   — a local file (blob) or a CORS-enabled media URL
//
// A YouTube <iframe> itself can't be scoped: it is cross-origin → the canvas is
// tainted and getImageData()/WebAudio are blocked. Capture Tab sidesteps that —
// the captured MediaStream is readable, so the scopes run on the real frames+audio.
//
// Secure-context only (https or http://localhost): getDisplayMedia + canvas pixel
// reads require it — which the deployed https site and `python3 start.py` both are.
import { drawTestPattern } from './test-pattern.js';

export type SourceMode = 'bars' | 'stream' | 'media';

export interface FrameData {
  AW: number; AH: number; BINS: number;
  // Per-column value HISTOGRAMS (AW columns × BINS value bins). Brightness when
  // drawn = pixel count → the real waveform-monitor density look. cH = chroma
  // (saturation = max−min of RGB), the colour counterpart of the luma waveform.
  rH: Uint32Array; gH: Uint32Array; bH: Uint32Array; yH: Uint32Array; aH: Uint32Array; cH: Uint32Array;
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
  paint(cv: HTMLCanvasElement): void;   // blit the current analysed frame to a visible canvas
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

  // --- line-up tone: a 1 kHz sine at −22 dBFS on the test pattern; sequence is
  //     110 s BOTH (L+R) · 45 s LEFT · 5 s RIGHT · 1 s SILENCE, looping. It drives
  //     the METERS ONLY — routed to the sound card through a muted gain so nothing
  //     is audible, yet the Web Audio graph is still pulled so the analysers read
  //     it (a bare source→analyser tap with no destination path won't update). ---
  const TONE_LEVEL = Math.pow(10, -22 / 20);   // −22 dBFS ≈ 0.0794 linear
  let toneStarted = false;
  let toneGL: GainNode | null = null;   // left-channel gate
  let toneGR: GainNode | null = null;   // right-channel gate
  function ensureTone(): void {
    ensureAudio();
    if (toneStarted || !actx || !anTime || !anL || !anR) return;
    const osc = actx.createOscillator(); osc.type = 'sine'; osc.frequency.value = 1000;
    toneGL = actx.createGain(); toneGR = actx.createGain(); toneGL.gain.value = 0; toneGR.gain.value = 0;
    const merger = actx.createChannelMerger(2);
    osc.connect(toneGL); osc.connect(toneGR);
    toneGL.connect(merger, 0, 0); toneGR.connect(merger, 0, 1);
    const split = actx.createChannelSplitter(2);
    merger.connect(split); split.connect(anL, 0); split.connect(anR, 1);   // per-channel meters/scopes
    const mute = actx.createGain(); mute.gain.value = 0;                     // silent at the sound card
    merger.connect(anTime); merger.connect(mute); mute.connect(actx.destination);   // meters only — never audible
    osc.start();
    toneStarted = true;
  }
  function silenceTone(): void { if (toneGL) toneGL.gain.value = 0; if (toneGR) toneGR.gain.value = 0; }
  function updateTone(now: number): void {
    if (!toneGL || !toneGR) return;
    const phase = (now % 161000) / 1000;   // 0..161 s cycle
    // 0–110 s: BOTH · 110–155 s: LEFT · 155–160 s: RIGHT · 160–161 s: SILENCE
    const left = phase < 155;
    const right = phase < 110 || (phase >= 155 && phase < 160);
    toneGL.gain.value = left ? TONE_LEVEL : 0;
    toneGR.gain.value = right ? TONE_LEVEL : 0;
  }

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
  function useBars(): void { stopStream(); mode = 'bars'; tainted = false; ensureTone(); }
  async function captureTab(): Promise<MediaStream> {
    const md = navigator.mediaDevices;
    if (!md || typeof md.getDisplayMedia !== 'function') {
      throw new Error('screen capture needs a secure context (https:// or http://localhost)');
    }
    const stream = await md.getDisplayMedia({ video: true, audio: true });
    stopStream(); video.srcObject = stream; video.muted = true; await video.play();
    mode = 'stream'; tainted = false; silenceTone(); wireAudio(true, stream); return stream;
  }
  async function useMedia(url: string, remote: boolean): Promise<void> {
    stopStream(); video.srcObject = null;
    if (remote) video.crossOrigin = 'anonymous'; else video.removeAttribute('crossorigin');
    video.src = url; video.muted = false;
    await video.play();
    mode = 'media'; tainted = false; silenceTone();
    try { wireAudio(false); } catch { /* audio may be blocked on tainted cross-origin */ }
  }
  function stop(): void { stopStream(); try { if (actx) void actx.close(); } catch { /* ignore */ } }

  // --- per-frame video ---
  function grab(t: number): boolean {
    if (!octx) return false;
    if (mode === 'bars') { if (gctx) drawTestPattern(gctx, AW, AH); octx.drawImage(gen, 0, 0, AW, AH); ensureTone(); updateTone(t); return true; }
    if (video.readyState < 2) return false;
    try { octx.drawImage(video, 0, 0, AW, AH); return true; } catch { return false; }
  }
  // Blit the current analysed frame (the offscreen source, incl. the test pattern)
  // onto a visible canvas so the "Input Under Test" panel shows the test pattern.
  function paint(cv: HTMLCanvasElement): void {
    const c = cv.getContext('2d'); if (!c) return;
    c.drawImage(off, 0, 0, cv.width, cv.height);
  }
  const BINS = 128;
  function analyze(): FrameData | null {
    if (!octx) return null;
    let img: Uint8ClampedArray;
    try { img = octx.getImageData(0, 0, AW, AH).data; tainted = false; }
    catch { tainted = true; return null; } // cross-origin without CORS → tainted
    const rH = new Uint32Array(AW * BINS), gH = new Uint32Array(AW * BINS);
    const bH = new Uint32Array(AW * BINS), yH = new Uint32Array(AW * BINS), aH = new Uint32Array(AW * BINS), cH = new Uint32Array(AW * BINS);
    const pts: number[] = [];
    for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) {
      const i = (y * AW + x) * 4;
      const r = img[i] ?? 0, g = img[i + 1] ?? 0, b = img[i + 2] ?? 0, a = img[i + 3] ?? 255;
      const col = x * BINS;
      const ri = col + ((r * BINS) >> 8), gi = col + ((g * BINS) >> 8), bi = col + ((b * BINS) >> 8), ai = col + ((a * BINS) >> 8);
      rH[ri] = (rH[ri] ?? 0) + 1; gH[gi] = (gH[gi] ?? 0) + 1; bH[bi] = (bH[bi] ?? 0) + 1; aH[ai] = (aH[ai] ?? 0) + 1;
      const Y = (0.2126 * r + 0.7152 * g + 0.0722 * b) | 0;
      const yi = col + ((Y * BINS) >> 8); yH[yi] = (yH[yi] ?? 0) + 1;
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);   // saturation, 0..255
      const ci = col + ((chroma * BINS) >> 8); cH[ci] = (cH[ci] ?? 0) + 1;
      if (((x + y) & 3) === 0) {
        const cb = -0.1146 * r - 0.3854 * g + 0.5 * b, cr = 0.5 * r - 0.4542 * g - 0.0458 * b;
        pts.push(cb, cr, r, g, b);
      }
    }
    return { AW, AH, BINS, rH, gH, bH, yH, aH, cH, pts };
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
    captureTab, useMedia, useBars, stop, grab, paint, analyze, timeData, timeDataL, timeDataR,
    rmsL: () => rmsOf(anL, fL), rmsR: () => rmsOf(anR, fR),
  };
}

// ---- scope painters -------------------------------------------------------
// The draw helpers were split into sibling libraries to keep this file focused
// on capture/analysis. They are re-exported here so every existing import site
// (index.ts, hover.ts) that pulls draw fns + `View` from './live-input.js'
// resolves unchanged.
export * from './scopes-video.js';
export * from './scopes-gamut.js';
export * from './scopes-audio.js';

// src/editors/timer/wall-clock — the locked time-of-day header pinned above the two
// channels (split from index.ts, audit §4.5). Same zone · resolution · face controls
// as the clock bench (clock/faces/*), but no drag / no close. Owns its own config
// persist (localStorage) and the FACES glob registry; returns a strip element, a
// per-frame draw(now), and publish-suppressed setters the MQTT surface drives.

import type { EditorContext } from '../types.js';
import { el, ctx2d } from '../../ui/dom.js';
import {
  type Zone, type Resolution, type FaceState, type FaceDef,
  RESOLUTIONS, ZONES, zoneOf, offsetLabel, detectZoneIdx, zoneIdxForOffset, parseZone,
} from '../clock/faces/shared.js';

// ---- wall-clock faces: the SAME registry the clock bench uses (clock/faces/*) ----
const faceMods = import.meta.glob<{ default?: FaceDef }>('../clock/faces/*.ts', { eager: true });
const FACES: FaceDef[] = Object.values(faceMods)
  .map((m) => m.default)
  .filter((d): d is FaceDef => !!d && typeof d.draw === 'function')
  .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
const faceById = (id: string): FaceDef => FACES.find((f) => f.id === id) ?? FACES[0]!;

export interface WallClock {
  strip: HTMLElement;
  draw(now: number): void;
  /** MQTT clock.zone → resolve the offset back to a zone index (no re-publish). */
  setZoneFromLabel(label: string): void;
  /** MQTT clock.face → apply if it's a known face (no re-publish). */
  setFace(id: string): void;
  /** MQTT clock.res → apply if it's a known resolution (no re-publish). */
  setRes(id: string): void;
  zoneLabel(): string;
  faceId(): string;
  resId(): Resolution;
}

export function buildWallClock(ctx: EditorContext): WallClock {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);

  // ---- locked wall-clock header — the SAME zone · resolution · face controls
  // as the clock bench, but pinned above the channels: no drag, no close. ----
  const detectedIdx = detectZoneIdx();
  const CK_LS = 'twistTimerWallClock';
  interface ClockCfg { zoneIdx?: number; face?: string; res?: Resolution; }
  let ckCfg: ClockCfg = {};
  try { ckCfg = (JSON.parse(localStorage.getItem(CK_LS) || '{}') as ClockCfg) || {}; } catch { /* ignore */ }
  let ckZoneIdx = ckCfg.zoneIdx != null && ZONES[ckCfg.zoneIdx] ? ckCfg.zoneIdx : detectedIdx;
  let ckZone: Zone = zoneOf(ZONES[ckZoneIdx]!);
  let ckFace: string = FACES.some((f) => f.id === ckCfg.face) ? ckCfg.face! : 'digital';
  let ckRes: Resolution = RESOLUTIONS.some((r) => r.id === ckCfg.res) ? ckCfg.res! : 'hms';
  const ckState: FaceState = {};
  const saveCk = (): void => {
    try { localStorage.setItem(CK_LS, JSON.stringify({ zoneIdx: ckZoneIdx, face: ckFace, res: ckRes })); } catch { /* ignore */ }
  };

  const ckCvs = el('canvas') as HTMLCanvasElement;
  const ckG = ctx2d(ckCvs);
  const ckZoneLbl = el('span', { class: 'rc-clock-zone' });
  const ckSel = (title: string, opts: Array<{ v: string; label: string }>, value: string,
                 onChange: (v: string) => void): HTMLSelectElement => {
    const sel = el('select', { class: 'rc-clock-sel', title }) as HTMLSelectElement;
    for (const o of opts) sel.append(el('option', { value: o.v }, [o.label]));
    sel.value = value;
    sel.addEventListener('change', () => onChange(sel.value));
    return sel;
  };
  const zoneSel = ckSel(
    'Time zone',
    ZONES.map((z, i) => ({ v: String(i), label: `${i === detectedIdx ? '◉ ' : ''}${offsetLabel(z.off)} · ${z.codes}` })),
    String(ckZoneIdx),
    (v) => setCkZone(Number(v)),
  );
  const resSel = ckSel('Resolution', RESOLUTIONS.map((r) => ({ v: r.id, label: r.label })), ckRes,
    (v) => setCkRes(v as Resolution));
  const faceSel = ckSel('Clock face', FACES.map((f) => ({ v: f.id, label: f.short })), ckFace,
    (v) => setCkFace(v));
  const setCkZone = (i: number, publish = true): void => {
    if (!ZONES[i]) return;
    ckZoneIdx = i; ckZone = zoneOf(ZONES[i]!);
    zoneSel.value = String(i);
    ckZoneLbl.textContent = `${ckZone.label} · ${offsetLabel(ckZone.offsetMin)}`;
    saveCk();
    if (publish) ctx.services.publishParam?.('clock.zone', ckZone.label, { throttle: false });
  };
  const setCkFace = (f: string, publish = true): void => {
    ckFace = faceById(f).id;
    faceSel.value = ckFace;
    ckCvs.style.background = faceById(ckFace).lightBg
      ? 'radial-gradient(circle at 50% 42%, #e8ecf2, #c2cad6)' : 'transparent';
    saveCk();
    if (publish) ctx.services.publishParam?.('clock.face', ckFace, { throttle: false });
  };
  const setCkRes = (r: Resolution, publish = true): void => {
    ckRes = r;
    resSel.value = r;
    saveCk();
    if (publish) ctx.services.publishParam?.('clock.res', ckRes, { throttle: false });
  };
  const clockStrip = el('div', { class: 'rc-clock' }, [
    el('div', { class: 'rc-clock-lbl' }, [
      el('b', {}, ['Time of Day']), ckZoneLbl, el('span', { class: 'rc-clock-lock' }, ['▣ locked top']),
    ]),
    el('div', { class: 'rc-clock-body' }, [ckCvs]),
    el('div', { class: 'rc-clock-cfg' }, [zoneSel, resSel, faceSel]),
  ]);
  setCkZone(ckZoneIdx, false);
  setCkFace(ckFace, false);

  const drawClock = (now: number): void => {
    if (!ckG) return;
    const cw = ckCvs.clientWidth, ch = ckCvs.clientHeight;
    if (!cw || !ch) return;
    const bw = Math.round(cw * dpr), bh = Math.round(ch * dpr);
    if (ckCvs.width !== bw) ckCvs.width = bw;
    if (ckCvs.height !== bh) ckCvs.height = bh;
    ckG.setTransform(1, 0, 0, 1, 0, 0);
    ckG.clearRect(0, 0, bw, bh);
    const def = faceById(ckFace);
    const [fw, fh] = def.fit;
    const size = Math.max(40, Math.min(cw / fw, ch / fh));
    ckG.setTransform(dpr, 0, 0, dpr, ((cw - size) / 2) * dpr, ((ch - size) / 2) * dpr);
    def.draw(ckG, size, { z: ckZone, now, res: ckRes, state: ckState });
  };

  return {
    strip: clockStrip,
    draw: drawClock,
    setZoneFromLabel: (label) => setCkZone(zoneIdxForOffset(parseZone(String(label)).offsetMin), false),
    setFace: (id) => { if (FACES.some((f) => f.id === id)) setCkFace(String(id), false); },
    setRes: (id) => { if (RESOLUTIONS.some((r) => r.id === id)) setCkRes(id as Resolution, false); },
    zoneLabel: () => ckZone.label,
    faceId: () => ckFace,
    resId: () => ckRes,
  };
}

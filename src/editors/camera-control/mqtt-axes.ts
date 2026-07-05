// src/editors/camera-control/mqtt-axes — the MQTT param bridge (audit §4.5).
// Advertises the PTZ control surface and streams the ACTIVE camera's live pose so
// an external controller / another console can follow or drive it. The engineering
// units reuse the exact maths the OSD + telemetry print (deg / % / f-stop), so
// what rides the bus matches what the operator reads. Extracted from index.ts.

import { clamp } from './state.js';
import type { CamState, CameraConsole } from './state.js';
import type { EditorContext } from '../types.js';
import type { ParamSpec } from '../../platform/mqtt/types.js';

const clampRate = (v: number): number => Math.max(0.2, Math.min(3, v));
const panDeg = (v: number): number => (v - 0.5) * 340; // −170..170°
const tiltDeg = (v: number): number => (v - 0.5) * 120; // −60..60°
const irisF = (v: number): number => 1.8 + (1 - v) * 14; // f/1.8..f/15.8
const pct = (v: number): number => v * 100;
const fromPanDeg = (d: number): number => clamp(d / 340 + 0.5);
const fromTiltDeg = (d: number): number => clamp(d / 120 + 0.5);
const fromIrisF = (f: number): number => clamp(1 - (f - 1.8) / 14);
const fromPct = (p: number): number => clamp(p / 100);

// Every driveable axis: read it from state, publish it in engineering units,
// and fold an inbound write back to the 0..1 model. No DOM scraping (M3).
interface Axis {
  name: string;
  unit: string;
  min: number;
  max: number;
  get(s: CamState): number;
  set(s: CamState, v: number): void;
  out(v: number): number; // 0..1 state → engineering value on the bus
  from(o: number): number; // engineering value → 0..1 state
}
const AXES: Axis[] = [
  { name: 'pan', unit: 'deg', min: -170, max: 170, get: (s) => s.pan, set: (s, v) => { s.pan = v; }, out: panDeg, from: fromPanDeg },
  { name: 'tilt', unit: 'deg', min: -60, max: 60, get: (s) => s.tilt, set: (s, v) => { s.tilt = v; }, out: tiltDeg, from: fromTiltDeg },
  { name: 'zoom', unit: '%', min: 0, max: 100, get: (s) => s.zoom, set: (s, v) => { s.zoom = v; }, out: pct, from: fromPct },
  { name: 'iris', unit: 'f', min: 1.8, max: 15.8, get: (s) => s.iris, set: (s, v) => { s.iris = v; }, out: irisF, from: fromIrisF },
  { name: 'dolly', unit: '%', min: 0, max: 100, get: (s) => s.dolly, set: (s, v) => { s.dolly = v; }, out: pct, from: fromPct },
  { name: 'ped', unit: '%', min: 0, max: 100, get: (s) => s.ped, set: (s, v) => { s.ped = v; }, out: pct, from: fromPct },
  { name: 'rate', unit: 'x', min: 0.2, max: 3, get: (s) => s.rate, set: (s, v) => { s.rate = clampRate(v); }, out: (v) => v, from: clampRate },
];

/** The MQTT bridge the console wires up: publish/seed/inbound for the pose axes. */
export interface AxisBridge {
  /** Coalesced per-axis publish of the active camera (throttled by the service). */
  publishState(force?: boolean): void;
  /** Reseed the dedupe cache from state WITHOUT publishing (after inbound/switch). */
  seedPub(): void;
  /** Honour inbound axis writes from the bus, applied to the ACTIVE camera. */
  wireInbound(): void;
}

/**
 * Advertise the PTZ param schema and build the publish/seed/inbound helpers. The
 * three share a dedupe cache so a still camera stays quiet; `reflect` repaints the
 * control surface after an inbound write.
 */
export function buildAxisBridge(cc: CameraConsole, ctx: EditorContext, reflect: () => void): AxisBridge {
  ctx.services.advertiseParams?.([
    ...AXES.map((a): ParamSpec => ({ name: a.name, type: 'number', unit: a.unit, min: a.min, max: a.max, writable: true, cap: 'shade' })),
    { name: 'camera', type: 'number', min: 1, max: 8, writable: true, cap: 'shade' },
    { name: 'preset', type: 'number', min: 1, max: 6, writable: true, cap: 'shade' },
  ]);

  // Coalesced per-axis publish of the active camera. Called every frame; the
  // service throttle handles drag loops and the dedupe skips static axes, so a
  // joystick/slider/dial move, an auto mode, or a fly-to all reach the bus while
  // a still camera stays quiet.
  const lastPub: Record<string, number> = {};
  const EPS = 0.001;
  const publishState = (force = false): void => {
    const p = ctx.services.publishParam;
    if (!p) return;
    const s = cc.S();
    for (const a of AXES) {
      const raw = a.get(s);
      const prev = lastPub[a.name];
      if (!force && prev !== undefined && Math.abs(raw - prev) < EPS) continue;
      lastPub[a.name] = raw;
      p(a.name, a.out(raw));
    }
  };
  // Reseed the dedupe cache from state WITHOUT publishing — used after an inbound
  // write / camera switch so the frame loop doesn't echo the value straight back.
  const seedPub = (): void => {
    const s = cc.S();
    for (const a of AXES) lastPub[a.name] = a.get(s);
  };

  // External control — honour writes from the bus / other consoles, applied to
  // the ACTIVE camera. Reseed the dedupe cache so we don't echo them back out.
  const wireInbound = (): void => {
    for (const a of AXES) {
      ctx.services.onParam?.(a.name, (v) => {
        if (typeof v !== 'number') return;
        a.set(cc.S(), a.from(v));
        lastPub[a.name] = a.get(cc.S());
        reflect();
      });
    }
  };

  return { publishState, seedPub, wireInbound };
}

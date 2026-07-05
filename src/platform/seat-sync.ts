// src/platform/seat-sync — the seat's preferences on the retained bus
// (audit §7 / §8 W3): local-first boot, MQTT-validated reconcile.
//
// The local prefs blob paints the console instantly at boot; when the bus
// connects, the retained copy on SPOG/seats/<seat>/prefs replays (via the
// client's last-value cache) and NEWER-WINS by envelope timestamp:
//   broker newer → adopt + repaint the live engines (never delay first paint)
//   local newer  → publish local back up (offline edits win their way to the bus)
// Every subsequent prefs-change publishes (debounced). Offline = a silent no-op:
// the noopBus swallows everything and local remains the whole truth.
//
// Envelope (audit §7.3): retained MQTT has no broker timestamp, so the payload
// self-describes — { v, ts, seat, full_id, data }. `seat` is the STABLE id from
// prefs; `full_id` is the per-boot session id (self-echo suppression only).

import type { TwistBus } from './mqtt/types.js';
import { getPrefs, adoptPrefs, type Prefs } from './prefs.js';
import { applyStoredChirality } from '../ui/console/chirality.js';
import { applyStoredColourScheme } from '../ui/console/colour-scheme.js';

interface SeatEnvelope { v: 1; ts: number; seat: string; full_id: string; data: Prefs }

const isEnvelope = (p: unknown): p is SeatEnvelope =>
  !!p && typeof p === 'object' && (p as SeatEnvelope).v === 1
  && typeof (p as SeatEnvelope).ts === 'number' && typeof (p as SeatEnvelope).seat === 'string'
  && !!(p as SeatEnvelope).data && typeof (p as SeatEnvelope).data === 'object';

function chip(state: 'synced' | 'local'): void {
  const c = document.querySelector<HTMLElement>('.mq-chip');
  if (!c) return;
  c.classList.toggle('seat-synced', state === 'synced');
  if (state === 'synced') c.title = `${c.title.replace(/ · SEAT SYNCED$/, '')} · SEAT SYNCED`;
}

export function initSeatSync(bus: TwistBus): void {
  if (!bus.status().enabled) return;   // offline mode: local is the whole truth
  const seat = getPrefs().seat;
  const topic = `seats/${seat}/prefs`;

  let applying = false;
  let publishTimer: ReturnType<typeof setTimeout> | null = null;
  let heardRetained = false;

  const publish = (): void => {
    const p = getPrefs();
    bus.publishRaw(topic, { v: 1, ts: p.ts, seat, full_id: bus.sessionId, data: p } satisfies SeatEnvelope, { retain: true });
    chip('synced');
  };
  const publishSoon = (): void => {
    if (publishTimer) clearTimeout(publishTimer);
    publishTimer = setTimeout(() => { publishTimer = null; publish(); }, 400);
  };

  // Reconcile: the retained copy replays here on connect (and, via the client's
  // last-value cache, even though we subscribed before the broker answered).
  bus.subscribe(topic, (_t, payload) => {
    if (!isEnvelope(payload) || payload.seat !== seat) return;
    heardRetained = true;
    const local = getPrefs();
    if (payload.ts > local.ts) {
      // Broker is newer (another console on this seat, or a pre-crash save):
      // adopt WITHOUT re-stamping ts, then repaint the live engines — both are
      // idempotent attribute writes, safe at any time after first paint.
      applying = true;
      try {
        adoptPrefs(payload.data);
        applyStoredChirality();
        applyStoredColourScheme();
      } finally { applying = false; }
      chip('synced');
    } else if (payload.ts < local.ts) {
      publishSoon();   // local (offline) edits win their way back to the bus
    } else chip('synced');
  });

  // Every local change rides up (unless it IS the adoption we just applied).
  document.addEventListener('prefs-change', () => { if (!applying) publishSoon(); });

  // First-ever seat: nothing retained to reconcile against — seed the topic.
  void bus.ready.then(() => setTimeout(() => { if (!heardRetained && bus.status().connected) publish(); }, 2000));
}

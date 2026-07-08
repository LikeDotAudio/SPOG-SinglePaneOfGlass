// src/platform/mqtt/log-bridge — Captain's Log → MQTT (audit §4.6).
//
// TWIST's edge over comMQTT: the Captain's Log already narrates EVERY routing
// change (drag-drop, 1990s view, portals, Reverse Course) via a MutationObserver.
// This bridge is the one wire that turns that stream into retained topics — so
// "topics in every … Captain's Log" and "every create route" fall out of a single
// subscription. Each entry lands at Twist/log/<voyage>/<entry> plus Twist/log/latest.

import { onLogEntry, receiveNetworkLog, type LogEntryEvent } from '../../ui/console/captains-log.js';
import type { TwistBus, LogMsg } from './types.js';

/** Wire the Captain's Log to the bus. Returns an unsubscribe.
 *
 * Subscribes UNCONDITIONALLY and gates each entry on `enabled`, so the bridge also
 * publishes when the broker connects AFTER boot (e.g. the MQTT tree's Save & Connect,
 * or a reconnect): a no-op bus stays silent; a live one publishes. Gating at setup
 * time (the old behaviour) left the bridge permanently dead if MQTT wasn't up yet.
 * mqtt.js buffers any pre-`connect` publishes and flushes them on connect. */
export function startLogBridge(bus: TwistBus): () => void {
  const unsubLocal = onLogEntry((e: LogEntryEvent) => {
    if (!bus.status().enabled) return;
    const msg: Omit<LogMsg, 'full_id'> = {
      voyage: e.voyage, entry: e.entry, ts: e.ts,
      dest: e.dest, prod: e.prod, added: e.added, removed: e.removed,
      text: e.text, reversed: e.reversed,
    };
    bus.publishRaw(`log/${e.voyage}/${e.entry}`, { ...msg, full_id: bus.sessionId });
    bus.publishRaw('log/latest', { ...msg, full_id: bus.sessionId });
  });

  const unsubRemote = bus.subscribe('log/latest', (_topic, payload) => {
    const msg = payload as LogMsg | null;
    if (!msg || msg.full_id === bus.sessionId) return;
    receiveNetworkLog({
      voyage: msg.voyage, entry: msg.entry, ts: msg.ts,
      dest: msg.dest, prod: msg.prod, added: msg.added, removed: msg.removed,
      text: msg.text, reversed: msg.reversed,
    });
  });

  return () => { unsubLocal(); unsubRemote(); };
}

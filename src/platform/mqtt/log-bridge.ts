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
  const origin = (bus.sessionId || '').split(':')[0];
  const unsubLocal = onLogEntry((e: LogEntryEvent) => {
    if (!bus.status().enabled) return;
    // F3: a routing entry's English narration is deterministic — each console
    // rebuilds it from {dest, prod, added, removed, by}. Drop `text` from the wire
    // for those (the frequent case); keep it for reversals + semantic logAction
    // entries whose text isn't derivable.
    const derivable = !e.reversed && (e.added.length > 0 || e.removed.length > 0);
    const msg: Omit<LogMsg, 'full_id'> = {
      voyage: e.voyage, entry: e.entry, ts: e.ts,
      dest: e.dest, prod: e.prod, added: e.added, removed: e.removed,
      text: derivable ? '' : e.text, by: e.by,
      reversed: e.reversed, reversedBy: e.reversedBy, reversedTs: e.reversedTs,
    };
    // Namespaced by ORIGIN so two consoles' `voyage/entry` numbers never collide
    // (each seat owns its own retained subtree) — the key to a unified, complete log.
    bus.publishRaw(`log/${origin}/${e.voyage}/${e.entry}`, { ...msg, full_id: bus.sessionId });
  });

  // Subscribe to the WHOLE retained per-entry tree: the broker replays every retained
  // `log/<origin>/<voyage>/<entry>` on connect, so a console that joins late catches
  // up on the ENTIRE unified log (audit §7.3 gap: no history replay). The topic's
  // origin segment keeps every seat's voyages distinct.
  const unsubRemote = bus.subscribe('log/+/+/+', (topic, payload) => {
    const msg = payload as LogMsg | null;
    if (!msg || msg.full_id === bus.sessionId) return;
    const org = (msg.full_id || '').split(':')[0] || topic.split('/')[1];
    receiveNetworkLog({
      voyage: msg.voyage, entry: msg.entry, ts: msg.ts,
      dest: msg.dest, prod: msg.prod, added: msg.added, removed: msg.removed,
      text: msg.text, by: msg.by, reversed: msg.reversed, reversedBy: msg.reversedBy, reversedTs: msg.reversedTs,
    }, org);
  });

  return () => { unsubLocal(); unsubRemote(); };
}

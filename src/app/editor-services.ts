// src/app/editor-services — the cross-editor services (M1) + the per-twist MQTT
// param bridge. Split out of editor-dispatch: these are the typed capabilities an
// editor receives on its context (openStageBox / openWirelessMic / openTsg) plus
// twistServices(), which scopes the MQTT advertise/publish/subscribe bridge to one
// twist's topic. Nothing here imports the shell (keeps the dependency graph acyclic).

import { pluginFor } from '../editors/registry.js';
import { openOverlay } from '../platform/overlay.js';
import type { EditorServices } from '../editors/types.js';
import { getBus } from '../platform/mqtt/index.js';
import { twistTopic, slug as topicSlug } from '../platform/mqtt/topics.js';
import { mergeManager } from '../platform/merge/manager.js';
import { localSeatRank, localSeatLabel } from '../platform/merge/seat.js';

/** Open a "system" editor overlay (no room twist) with a minimal always-permitted
 *  context — the shared spine of openStageBox / openWirelessMic / openTsg. */
function openSystemEditor(
  pluginKey: string,
  opts: { title: string; prodName: string; twistName: string; color: string; config: unknown },
): void {
  const plugin = pluginFor(pluginKey);
  if (!plugin) return;
  openOverlay({ title: opts.title, color: opts.color, prodName: opts.prodName, twistName: opts.twistName, voiceCommands: plugin.voiceCommands }, (body, dispose) => {
    const ctx: any = {
      twist: { name: opts.twistName, config: opts.config },
      sources: [],
      production: { name: opts.prodName, color: opts.color },
      siblings: [],
      can: () => true,
      services: twistServices(opts.prodName, opts.twistName),
      dispose,
    };
    plugin.render(body, ctx);
  });
}

/** Cross-editor services (M1): replaces the legacy window.openStageBox global. */
const services: EditorServices = {
  openStageBox(name, color, channels) {
    // The real stagebox-input editor (preamp bench), not a bare channel list.
    openSystemEditor('Stage Box', { title: pluginFor('Stage Box')?.title ?? 'Stage Box', prodName: 'System', twistName: name, color, config: { name, inputs: channels } });
  },
  openWirelessMic(name, color) {
    openSystemEditor('wireless', { title: pluginFor('wireless')?.title ?? 'Wireless', prodName: 'System', twistName: name, color, config: { type: 'wireless-mic' } });
  },
  openTsg(name, color) {
    // The studio's Test Signal Generator, opened from the SIGNALING studio frame.
    // `name` is the room, so the TSG editor persists the pick per room.
    openSystemEditor('TSG', { title: `${name} · ${pluginFor('TSG')?.title ?? 'TSG'}`, prodName: name, twistName: 'STUDIO TSG', color, config: null });
  },
};

/** Services scoped to one twist: the base services + a MQTT param bridge (audit §4.5)
 *  bound to THIS twist's topic (rooms/<prod>/twists/<twist>/params/<param>). */
export function twistServices(prodDisplayName: string, twistName: string): EditorServices {
  const base = twistTopic(prodDisplayName, twistName);   // rooms/<prod>/twists/<twist>
  const bus = getBus();
  // Bind the mediator's self-identity to the bus session once (used to drop our own echo).
  if (mergeManager.selfFullId === 'local:TWIST:0' && bus.sessionId) mergeManager.selfFullId = bus.sessionId;
  const paramTopic = (p: string): string => `${base}/params/${topicSlug(p)}`;
  return {
    ...services,
    advertiseParams(params) { bus.publishConfig(`${base}/config`, { kind: 'twist', name: twistName, params }); },
    // A local write feeds the mediator AND rides the bus carrying our seat rank, so
    // every console arbitrates the same fight by the same higher-rank-wins rule.
    publishParam(pname, value, opts) {
      const topic = paramTopic(pname);
      mergeManager.submitLocal(topic, pname, value);
      bus.publishValue(topic, value, { throttle: opts?.throttle ?? true, seat: localSeatRank(), label: localSeatLabel() });
    },
    // The editor's applier receives the mediator's RESOLVED value (windowed); foreign
    // bus writes are fed in as competing proposals rather than applied blindly.
    onParam(pname, cb) {
      const topic = paramTopic(pname);
      const offApply = mergeManager.onApply(topic, pname, (v) => cb(v));
      const offBus = bus.subscribe(topic, (_t, p) => mergeManager.ingestForeign(topic, pname, p));
      return () => { offApply(); offBus(); };
    },
  };
}

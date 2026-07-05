// src/ui/console/chat-dock-bus — MQTT wiring for the PRODUCTION CHAT dock.

import type { TwistBus } from '../../platform/mqtt/index.js';
import type { ChatMsg } from './chat-dock-types.js';

/** Subscribe to every chat thread. Split out so the summarize/log closure stays tidy. */
export function wireBus(bus: TwistBus, onMsg: (m: ChatMsg) => void): void {
  bus.subscribe('chat/#', (topic, payload) => {
    if (!/\/(msg\/|latest$)/.test(topic)) return;
    const m = payload as ChatMsg;
    if (m && typeof m === 'object' && m.from && m.to && m.kind) onMsg(m);
  });
}

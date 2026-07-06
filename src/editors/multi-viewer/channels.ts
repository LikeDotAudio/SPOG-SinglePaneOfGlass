// src/editors/multi-viewer/channels — source resolution for the wall.
//
// Turns the twist's routed sources into the panes the wall renders: real routed
// feeds first, else the twist's input slots, else a default MV count. Routed
// AUDIO feeds collapse by origin into a single VU-bank pane each.

import type { EditorContext } from '../types.js';

/** One resolved pane spec: an UMD label + colour, and — for an audio group —
 *  the channel labels that feed its VU bank. */
export interface ChannelSpec {
  label: string;
  color: string;
  channels?: string[];
  /** Device lineage ("Floor — Room — Device") — feeds the faux-signal room caption. */
  origin?: string;
  media?: 'audio' | 'video' | 'control';
}

// Channels for the wall: real routed sources, else the twist's input slots,
// else a sensible default count (mirrors the legacy channelsFor(twist,cfg,'MV',9)).
// Routed AUDIO feeds collapse by origin into a single VU-bank pane each.
export function channelsFor(ctx: EditorContext): ChannelSpec[] {
  if (ctx.sources.length) {
    const out: ChannelSpec[] = [];
    const groups = new Map<string, { label: string; color: string; channels: string[] }>();
    for (const f of ctx.sources) {
      if (f.media === 'audio') {
        const key = f.origin || 'AUDIO';
        let g = groups.get(key);
        if (!g) {
          const parts = key.split(' — ').map((s) => s.trim()).filter(Boolean);
          g = { label: parts[parts.length - 1] || key, color: f.color, channels: [] };
          groups.set(key, g);
          out.push(g);
        }
        g.channels.push(f.label);
      } else {
        out.push({ label: f.label, color: f.color, origin: f.origin, media: f.media });
      }
    }
    return out;
  }
  const inputs = ctx.twist.config?.inputs;
  if (inputs && inputs.length) return inputs.map((i) => ({ label: i, color: '#4d94ff' }));
  return Array.from({ length: 9 }, (_, i) => ({ label: `MV ${i + 1}`, color: '#4d94ff' }));
}

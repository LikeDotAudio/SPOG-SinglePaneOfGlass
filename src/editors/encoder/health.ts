// src/editors/encoder/health — live stream-health monitoring + random packet-drop
// simulation lifted out of index.ts (audit §4.7). Animates the embedded-audio
// meters, flips random ABR rungs into error, publishes aggregate egress as
// read-only telemetry, and renders the Stream Health panel. Registered on
// ctx.dispose so the host tears the interval down on close.

import type { EditorContext } from '../types.js';
import { qs } from '../../ui/dom.js';
import type { TileRef } from './state.js';

interface HealthUI {
  drm: boolean;
  failPrimary: boolean;
}

export function startHealthMonitor(
  host: HTMLElement,
  ctx: EditorContext,
  audBars: HTMLElement[],
  tiles: TileRef[],
  ui: HealthUI,
): void {
  const health = qs(host, '.enc-health');
  ctx.dispose.interval(() => {
    for (const bar of audBars) bar.style.width = 25 + Math.random() * 60 + '%';
    for (const t of tiles) {
      if (t.on && Math.random() < 0.01) t.err = true;
      else if (t.err && Math.random() < 0.25) t.err = false;
      t.el.classList.toggle('err', t.err && t.on);
    }
    const errs = tiles.filter((t) => t.on && t.err);
    const first = errs[0];
    const totalMbps = tiles.filter((t) => t.on).reduce((a, t) => a + t.kbps, 0) / 1000;
    // Aggregate egress bitrate as read-only telemetry (throttled — it ticks live).
    ctx.services.publishParam?.('egress_mbps', +totalMbps.toFixed(1));
    health.innerHTML =
      `Frozen Frame &nbsp;<span class="${errs.length ? 'bad' : 'ok'}">${first ? 'CHECK ' + first.name : 'OK'}</span><br>` +
      `Black Video &nbsp;<span class="ok">OK</span><br>` +
      `Audio Silence &nbsp;<span class="ok">OK</span><br>` +
      `Failover &nbsp;<span class="ok">${ui.failPrimary ? 'PRIMARY' : 'SECONDARY'}</span><br>` +
      `Encryption &nbsp;<span class="${ui.drm ? 'ok' : 'bad'}">${ui.drm ? 'AES-128' : 'CLEAR'}</span><br>` +
      `Egress Total &nbsp;<b style="color:#cfe6ff">${totalMbps.toFixed(1)} Mbps</b>`;
  }, 220);
}

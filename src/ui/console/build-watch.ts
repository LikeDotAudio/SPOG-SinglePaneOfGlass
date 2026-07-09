// src/ui/console/build-watch — "the version badge is live, not decorative"
// (audit §8 W4a). deploy.py publishes a retained SPOG/system/build stamp after
// every upload; every console compares it against its own baked __BUILD_ID__.
// A NEWER stamp turns the byline's .app-version badge into a pulsing
// "NEW BUILD — RELOAD" chip — deploys announce themselves floor-wide within
// seconds, and one click brings the console current.

import { addStyles } from '../dom.js';
import type { TwistBus } from '../../platform/mqtt/types.js';

interface BuildStamp { buildId?: { short?: string; full?: string }; routesHash?: string; ts?: number }

const BW_CSS = `
.app-version.stale{background:rgb(244, 144, 44);color:#ffe;cursor:pointer;animation:bw-pulse 1.2s infinite;}
@keyframes bw-pulse{0%,100%{box-shadow:0 0 0 0 rgba(244,144,44,.55);}50%{box-shadow:0 0 10px 3px rgba(244,144,44,.55);}}
`;

export function initBuildWatch(bus: TwistBus, running: { short: string; full: string; ts?: number }): void {
  if (!bus.status().enabled) return;
  addStyles('build-watch-styles', BW_CSS);
  
  let initialStampSeen = false;
  let currentStampFull = running.full;

  bus.subscribe('system/build', (_t, p) => {
    const stamp = p as BuildStamp | null;
    if (!stamp?.buildId?.full) return;

    if (running.short === 'dev' && !initialStampSeen) {
      initialStampSeen = true;
      currentStampFull = stamp.buildId.full;
      return;
    }
    initialStampSeen = true;

    if (stamp.buildId.full === currentStampFull) return;
    
    // Only a stamp NEWER than this bundle's own build time means "behind"
    if (running.short !== 'dev' && typeof stamp.ts === 'number' && typeof running.ts === 'number' && stamp.ts <= running.ts + 60_000) return;
    
    const badge = document.querySelector<HTMLElement>('.app-version');
    if (!badge || badge.classList.contains('stale')) return;
    badge.classList.add('stale');
    badge.textContent = 'NEW BUILD — RELOAD';
    badge.title = `Deployed: ${stamp.buildId.full} · click to reload`;
    badge.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); location.reload(); });
    // The badge lives inside the seat menu now — pulse the launcher too, so a
    // pending deploy is visible while the menu is closed.
    const menu = document.querySelector<HTMLElement>('.um-btn');
    if (menu) { menu.classList.add('stale'); menu.title = `NEW BUILD DEPLOYED — open the menu · ${stamp.buildId.full}`; }
  });
}

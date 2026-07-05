// src/app/main.ts — boot + composition root of the A.8 side build.
//
// Builds the LCARS routing console: the SOURCES ingress panel (left), the
// destination program content (centre), and the destinations tab FOOTER (bottom).
// Sources drag into destination twists (the crosspoint); clicking a twist opens
// its dispatched editor with a fully-resolved, typed EditorContext (data-in, M3).
// Composition root — the only layer allowed to wire ui + editors + platform.
//
// The heavy lifting lives in flat siblings (200-line rule): the console shell in
// shell.ts, the twist→editor dispatch + deep-link routing in editor-dispatch.ts,
// and the editor blurb catalogue in blurbs.ts. This entry keeps only the BUILD
// stamp and the bootstrap.

import { buildConsole } from './shell.js';
import { openFromHash } from './editor-dispatch.js';

// Real build stamp shown beside the credit byline — injected by Vite's `define`
// at build time (see vite.config.ts `buildId`), so it changes on every deploy.
// `.short` shows on the badge; `.full` (with git commit) is the hover title.
declare const __BUILD_ID__: { short: string; full: string; ts?: number };
const BUILD = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : { short: 'dev', full: 'dev build' };

buildConsole(BUILD).then(() => openFromHash()).catch((e: unknown) => {
  document.body.innerHTML = `<pre style="color:#ff6a6a">console boot failed: ${String(e)}</pre>`;
});
window.addEventListener('hashchange', openFromHash);

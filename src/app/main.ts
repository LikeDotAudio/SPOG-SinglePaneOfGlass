// src/app/main.ts — boot of the A.8 side build.
//
// P0 walking-skeleton: prove the typed pipeline end-to-end against the SHARED
// Routes/ data — discover the Destinations tree, load each production, and show
// which editor each twist dispatches to (via the auto-built registry). No DOM
// scraping, no window globals; everything flows through typed modules.

import { listDirectory, fetchJSON } from '../platform/discovery.js';
import { pluginFor } from '../editors/registry.js';
import { isFaultStatus } from '../domain/routing-core/index.js';
import type { Production, TwistConfig } from '../model/index.js';

const ROOT = 'Routes/Destinations/';

const twistName = (t: string | TwistConfig): string => (typeof t === 'string' ? t : t.name);

async function loadProductions(): Promise<Production[]> {
  const groups = await listDirectory(ROOT);
  const prods: Production[] = [];
  for (const group of groups.dirs) {
    const groupUrl = ROOT + group.href;
    const inner = await listDirectory(groupUrl);
    // Productions can be one level deep (Edit Suites/Encoders) or two (Control Rooms/Floors).
    const fileDirs = inner.files.length ? [{ url: groupUrl, files: inner.files }] : [];
    for (const sub of inner.dirs) {
      const subUrl = groupUrl + sub.href;
      fileDirs.push({ url: subUrl, files: (await listDirectory(subUrl)).files });
    }
    for (const fd of fileDirs) {
      for (const f of fd.files) {
        const p = await fetchJSON<Production>(fd.url + f.href);
        if (p) prods.push(p);
      }
    }
  }
  return prods;
}

function render(prods: Production[]): void {
  const app = document.getElementById('app');
  if (!app) return;
  const rows = prods.map((p) => {
    const twists = (p.twists ?? []).map((t) => {
      const name = twistName(t);
      const plugin = pluginFor(name);
      const tag = plugin
        ? `<span class="ed">${plugin.title}</span>`
        : `<span class="fallback">matrix fallback</span>`;
      return `<li>${name} → ${tag}</li>`;
    }).join('');
    const fault = isFaultStatus(p.status) ? ' ⚠' : '';
    return `<section class="prod" style="--c:${p.color ?? '#646DCC'}">
      <h2>${p.name}${fault}</h2><ul>${twists}</ul></section>`;
  }).join('');

  app.innerHTML = `
    <header><h1>TwistRouting · <small>A.8 side build (P0 skeleton)</small></h1>
      <p>${prods.length} productions discovered · ${countDispatched(prods)} twists routed to a dedicated editor</p>
    </header>${rows}`;
}

function countDispatched(prods: Production[]): number {
  let n = 0;
  for (const p of prods) for (const t of p.twists ?? []) if (pluginFor(twistName(t))) n++;
  return n;
}

loadProductions().then(render).catch((e) => {
  const app = document.getElementById('app');
  if (app) app.innerHTML = `<pre style="color:#ff6a6a">boot failed: ${String(e)}</pre>`;
});

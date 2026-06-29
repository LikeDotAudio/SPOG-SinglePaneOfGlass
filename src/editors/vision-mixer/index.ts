// src/editors/vision-mixer — example plugin package proving the M2/M3 contract.
//
// A real editor is a folder (index/view/state/styles); this P0 seed keeps the
// view inline to demonstrate: self-contained match + title + requiredCaps, and a
// render() that reads ONLY the typed ctx (no DOM scraping, no globals).

import type { EditorPlugin } from '../types.js';

const plugin: EditorPlugin = {
  id: 'vision-mixer',
  title: 'VISION MIXER',
  requiredCaps: ['switch'],
  match: (n) => /video\s*mix|vision|switch/i.test(n),
  render(host, ctx) {
    const feeds = ctx.sources.length
      ? ctx.sources.map((f) => `<li style="color:${f.color}">${f.label}${f.faulted ? ' ⚠' : ''}</li>`).join('')
      : '<li><em>no sources routed</em></li>';
    host.innerHTML = `
      <h3 style="color:${ctx.production.color}">${ctx.production.name} · ${plugin.title}</h3>
      <p>PGM / PVW bus — T-bar transition (CUT / MIX / WIPE)</p>
      <ul>${feeds}</ul>`;
  },
};

export default plugin;

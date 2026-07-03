// src/editors/stagebox-input — Stage Box Input "Smart Object" editor (A.8 port).
//
// Full technical visibility of a physical input from the console: preamp gain +
// headroom, software-interlocked +48V phantom (blocks ribbon mics), auto impedance
// match, cable-length HF compensation, stand-based high-pass, a channel alias, a
// PPM meter with a rolling 30-second history plot, and confidence monitoring.
//
// M3 data-in: the legacy editor scraped the twist title for its channel and the
// audio mixer reached it via window.openStageBox(name,color,channels,origin). Here
// the channels arrive on ctx.sources; the openStageBox SERVICE is host-provided
// (ctx.services) — this editor only renders from ctx. A channel "bank" jump bar
// pages the routed grouping 4 panels at a time (the legacy quad layout).

import type { EditorPlugin, EditorServices } from '../types.js';
import type { Disposer } from '../../ui/timers.js';
import type { ParamSpec } from '../../platform/mqtt/types.js';
import { injectStageBoxStyles } from './styles.js';
import { buildPanel } from './view.js';
import { resolveChannels } from './state.js';
import type { Channel } from './state.js';

const BANK = 4;

function renderBank(
  host: HTMLElement,
  channels: ReadonlyArray<Channel>,
  origin: string,
  nBanks: number,
  bankReq: number,
  dispose: Disposer,
  services: EditorServices,
): void {
  const bank = Math.max(0, Math.min(nBanks - 1, bankReq));
  host.innerHTML = '';
  host.style.display = 'flex';
  host.style.flexDirection = 'column';
  host.style.gap = '10px';
  host.style.height = '100%';

  // bank nav — page through the routed grouping 4 at a time
  const nav = document.createElement('div');
  nav.className = 'sb-nav';
  if (origin) {
    const o = document.createElement('span');
    o.className = 'orig';
    o.textContent = origin;
    nav.appendChild(o);
  }
  if (nBanks > 1) {
    const bl = document.createElement('span');
    bl.className = 'sb-bankl';
    bl.textContent = `BANK ${bank + 1}/${nBanks}`;
    nav.appendChild(bl);
    const pv = document.createElement('button');
    pv.className = 'sb-arrow';
    pv.textContent = '◀';
    pv.addEventListener('click', () => renderBank(host, channels, origin, nBanks, bank - 1, dispose, services));
    nav.appendChild(pv);
    for (let bi = 0; bi < nBanks; bi++) {
      const bt = document.createElement('button');
      bt.className = 'sb-tab' + (bi === bank ? ' sel' : '');
      const lo = channels[bi * BANK]!;
      const hi = channels[Math.min(channels.length - 1, bi * BANK + BANK - 1)]!;
      bt.textContent = `${lo.label}–${hi.label}`;
      bt.addEventListener('click', () => renderBank(host, channels, origin, nBanks, bi, dispose, services));
      nav.appendChild(bt);
    }
    const nx = document.createElement('button');
    nx.className = 'sb-arrow';
    nx.textContent = '▶';
    nx.addEventListener('click', () => renderBank(host, channels, origin, nBanks, bank + 1, dispose, services));
    nav.appendChild(nx);
  }
  host.appendChild(nav);

  // 2×2 grid — the bank's 4 channels, each its own 1/4-screen panel
  const grid = document.createElement('div');
  grid.className = 'sb-bankgrid';
  host.appendChild(grid);
  channels.slice(bank * BANK, bank * BANK + BANK).forEach((ch, i) => {
    const cell = document.createElement('div');
    cell.className = 'sb-host';
    grid.appendChild(cell);
    // 1-based GLOBAL channel index across all banks → indexed MQTT param names.
    buildPanel(cell, ch.label, dispose, bank * BANK + i + 1, services);
    const tag = document.createElement('div');
    tag.className = 'sb-cell-tag';
    tag.textContent = ch.label;
    cell.appendChild(tag);
  });
}

const plugin: EditorPlugin = {
  id: 'stagebox-input',
  title: 'STAGE BOX INPUT · SMART OBJECT',
  order: 9,
  match: (n) => /stage\s*box|pre.?amp|input asset|mic input/i.test(n),
  requiredCaps: ['audio'],
  render(host, ctx) {
    injectStageBoxStyles();
    const channels = resolveChannels(ctx.sources, ctx.twist.config);
    const nBanks = Math.max(1, Math.ceil(channels.length / BANK));

    // Advertise every input's preamp params ONCE (all channels, not just the
    // current bank — panels are built lazily per bank, but the schema is fixed).
    // Indexed names in<N>_* so an external controller drives a specific preamp.
    const params: ParamSpec[] = [];
    channels.forEach((_, i) => {
      const n = i + 1;
      params.push(
        { name: `in${n}_gain`, type: 'number', unit: 'dB', min: 0, max: 70, writable: true },
        { name: `in${n}_phantom`, type: 'bool', writable: true },
        { name: `in${n}_name`, type: 'string', writable: true },
      );
    });
    ctx.services.advertiseParams?.(params);

    renderBank(host, channels, ctx.twist.name, nBanks, 0, ctx.dispose, ctx.services);
  },
};

export default plugin;

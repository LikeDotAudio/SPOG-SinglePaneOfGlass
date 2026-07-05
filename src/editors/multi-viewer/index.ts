// src/editors/multi-viewer — port of js/editors/multi-viewer.js.
//
// A multiviewer "layout maker": an LCARS-framed wall of tiles fed from the
// twist's routed sources (ctx.sources, NOT DOM scraping). Preset buttons reshape
// the wall (NxN / PIP), tiles cycle PGM/PVW/off tally on click, carry an editable
// UMD label and an animated VU meter, and reorder by drag-and-drop.

import type { EditorPlugin, EditorContext } from '../types.js';
import type { ParamSpec } from '../../platform/mqtt/types.js';
import type { Disposer } from '../../ui/timers.js';
import { el } from '../../ui/dom.js';
import { injectMultiViewerStyles } from './styles.js';

type Tally = 'pgm' | 'pvw' | 'off';
interface Win {
  label: string;
  color: string;
  tally: Tally;
  /** An AUDIO GROUP pane: one multiviewer window carrying n channel VU meters
   *  (a routed stagebox/audio bundle occupies ONE pane, never one per channel). */
  channels?: string[];
}

const next = (t: Tally): Tally => (t === 'off' ? 'pgm' : t === 'pgm' ? 'pvw' : 'off');

// Channels for the wall: real routed sources, else the twist's input slots,
// else a sensible default count (mirrors the legacy channelsFor(twist,cfg,'MV',9)).
// Routed AUDIO feeds collapse by origin into a single VU-bank pane each.
function channelsFor(ctx: EditorContext): Array<{ label: string; color: string; channels?: string[] }> {
  if (ctx.sources.length) {
    const out: Array<{ label: string; color: string; channels?: string[] }> = [];
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
        out.push({ label: f.label, color: f.color });
      }
    }
    return out;
  }
  const inputs = ctx.twist.config?.inputs;
  if (inputs && inputs.length) return inputs.map((i) => ({ label: i, color: '#4d94ff' }));
  return Array.from({ length: 9 }, (_, i) => ({ label: `MV ${i + 1}`, color: '#4d94ff' }));
}

// A bank of n vertical VU meters — the SCREEN of an audio-group pane. Each
// channel gets its own bar + number, all animated on the shared disposer.
function vuBank(channels: string[], dispose: Disposer): HTMLElement {
  const bank = el('div', { class: 'mv-vubank' });
  const fills: Array<{ fill: HTMLElement; lvl: number }> = [];
  channels.forEach((ch, i) => {
    const fill = el('i');
    const bar = el('div', { class: 'bar' }, [fill]);
    const cell = el('div', { class: 'mv-vu', title: ch }, [bar, el('span', { textContent: String(i + 1).padStart(2, '0') })]);
    bank.append(cell);
    fills.push({ fill, lvl: 0.2 + Math.random() * 0.4 });
  });
  dispose.interval(() => {
    for (const f of fills) {
      f.lvl = Math.max(0.04, Math.min(1, f.lvl + (Math.random() - 0.48) * 0.3));
      f.fill.style.height = `${f.lvl * 100}%`;
    }
  }, 120);
  return bank;
}

// Port of core.js meterBar('mv-meter'): a thin VU strip animated via the disposer.
function meterBar(dispose: Disposer): HTMLElement {
  const m = el('div', { class: 'mv-meter' });
  const fill = el('i');
  m.append(fill);
  let lvl = 0.3;
  dispose.interval(() => {
    lvl = Math.max(0.05, Math.min(1, lvl + (Math.random() - 0.5) * 0.4));
    fill.style.height = `${lvl * 100}%`;
  }, 120);
  return m;
}

const plugin: EditorPlugin = {
  id: 'multi-viewer',
  title: 'MULTI VIEWER · LAYOUT MAKER',
  order: 2,
  match: (n) => /multi\s*view/i.test(n),
  requiredCaps: ['view'],
  render(host, ctx) {
    injectMultiViewerStyles();

    const wins: Win[] = channelsFor(ctx).map((s, i) => ({
      label: s.label,
      color: s.color,
      tally: i === 0 ? 'pgm' : i === 1 ? 'pvw' : 'off',
      channels: s.channels,
    }));

    // PIP=0 (special). NxN presets render a full cols×cols wall; cells beyond
    // the available sources show as empty tiles, like a real multiviewer.
    const PRESETS: Record<string, number> = {
      '2×2': 2,
      '3×3': 3,
      '4×4': 4,
      '8×8': 8,
      '16×16': 16,
      PIP: 0,
    };
    let preset = '3×3';

    // Advertise the wall as R/W MQTT params: the layout selector (enum) plus,
    // per pane, its SOURCE (the UMD label — reordering re-assigns which source
    // lands in a pane) and its TALLY. All operator-driven, so all writable.
    const specs: ParamSpec[] = [
      { name: 'layout', type: 'enum', values: Object.keys(PRESETS), writable: true },
    ];
    wins.forEach((_, i) => {
      specs.push({ name: `pane${i + 1}_source`, type: 'string', writable: true });
      specs.push({ name: `pane${i + 1}_tally`, type: 'enum', values: ['pgm', 'pvw', 'off'], writable: true });
    });
    ctx.services.advertiseParams?.(specs);

    // Publish on each local change. Layout + tally are discrete one-shots
    // (throttle:false); the UMD label rides the default throttle while typing.
    const pub = ctx.services.publishParam;
    const publishLayout = (): void => pub?.('layout', preset, { throttle: false });
    const publishSource = (i: number, opts?: { throttle: boolean }): void => {
      const w = wins[i];
      if (w) pub?.(`pane${i + 1}_source`, w.label, opts);
    };
    const publishTally = (i: number): void => {
      const w = wins[i];
      if (w) pub?.(`pane${i + 1}_tally`, w.tally, { throttle: false });
    };
    // A reorder shifts many panes at once → republish every pane's source+tally.
    const publishAllPanes = (): void => wins.forEach((_, i) => { publishSource(i, { throttle: false }); publishTally(i); });

    // LCARS elbow frame wrapping the preset bar + wall. Frame colour comes from
    // the production (data-in), replacing the legacy inherited --ed-color.
    const frame = el('div', { class: 'mv-frame', style: `--ed-color:${ctx.production.color}` });
    frame.append(el('div', { class: 'mv-frame-label', innerHTML: 'MULTI<br>VIEWER' }));
    host.appendChild(frame);

    const pbar = el('div', { class: 'mv-presets' });
    Object.keys(PRESETS).forEach((name) => {
      const b = el('div', {
        class: 'mv-pbtn' + (name === preset ? ' sel' : ''),
        textContent: name,
      });
      b.addEventListener('click', () => {
        preset = name;
        publishLayout();
        draw();
      });
      pbar.appendChild(b);
    });
    frame.appendChild(pbar);

    const grid = el('div', { class: 'mv-grid' });
    frame.appendChild(grid);

    let dragIdx: number | null = null;

    function fullWin(w: Win, i: number): HTMLElement {
      const winEl = el('div', {
        class: 'mv-win ' + (w.tally === 'pgm' ? 'pgm' : w.tally === 'pvw' ? 'pvw' : ''),
      });
      if (preset === 'PIP' && i === 0) winEl.style.gridRow = `span ${Math.max(2, wins.length - 1)}`;
      winEl.draggable = true;
      const tally = el('span', {
        class: 'mv-tally',
        textContent: w.tally === 'pgm' ? 'PGM' : w.tally === 'pvw' ? 'PVW' : 'IN ' + (i + 1),
      });
      // An audio group renders as ONE pane holding n channel VU meters; video
      // (and unknown) feeds keep the mock picture + single side meter.
      const screen = w.channels
        ? vuBank(w.channels, ctx.dispose)
        : el('div', { class: 'mv-screen', textContent: `▣ ${w.label}` });
      const umd = el('div', {
        class: 'mv-umd',
        style: `--umd:${w.color}`,
        textContent: w.channels ? `♪ ${w.label} ×${w.channels.length}` : w.label,
      });
      umd.contentEditable = 'true';
      if (w.channels) winEl.append(tally, screen, umd);
      else winEl.append(tally, screen, umd, meterBar(ctx.dispose));
      screen.addEventListener('click', () => {
        w.tally = next(w.tally);
        publishTally(i);
        draw();
      });
      umd.addEventListener('input', () => {
        w.label = umd.textContent ?? '';
        publishSource(i);
      });
      winEl.addEventListener('dragstart', () => {
        dragIdx = i;
        winEl.classList.add('dragging');
      });
      winEl.addEventListener('dragend', () => winEl.classList.remove('dragging'));
      winEl.addEventListener('dragover', (e) => e.preventDefault());
      winEl.addEventListener('drop', (e) => {
        e.preventDefault();
        if (dragIdx === null || dragIdx === i) return;
        const m = wins.splice(dragIdx, 1)[0];
        if (m) wins.splice(i, 0, m);
        dragIdx = null;
        publishAllPanes();
        draw();
      });
      return winEl;
    }

    // A lightweight tile for the dense 8×8 / 16×16 walls (no per-tile chrome).
    function compactWin(w: Win | undefined): HTMLElement {
      const has = !!w;
      const winEl = el('div', {
        class:
          'mv-win' + (w ? (w.tally === 'pgm' ? ' pgm' : w.tally === 'pvw' ? ' pvw' : '') : ' empty'),
      });
      winEl.append(el('div', { class: 'mv-tile', textContent: w ? (w.channels ? `♪ ${w.label} ×${w.channels.length}` : w.label) : '—' }));
      if (w) {
        const idx = wins.indexOf(w);
        winEl.addEventListener('click', () => {
          w.tally = next(w.tally);
          publishTally(idx);
          draw();
        });
      }
      return winEl;
    }

    function draw(): void {
      pbar
        .querySelectorAll<HTMLElement>('.mv-pbtn')
        .forEach((b) => b.classList.toggle('sel', b.textContent === preset));
      const cols = PRESETS[preset] || 3;
      const compact = cols >= 8;
      grid.classList.toggle('compact', compact);
      // The wall is a SQUARE raster: cols×cols with explicit 1fr rows, so every
      // pane lands 1:1 on the 1:1 canvas. PIP keeps its own asymmetric split.
      grid.style.gridTemplateColumns = preset === 'PIP' ? '3fr 1fr' : `repeat(${cols},1fr)`;
      grid.style.gridTemplateRows = preset === 'PIP' ? '' : `repeat(${cols},1fr)`;
      grid.innerHTML = '';
      if (compact) {
        // Fill a full cols×cols wall; map cells to sources, rest stay empty.
        for (let i = 0; i < cols * cols; i++) grid.appendChild(compactWin(wins[i]));
      } else if (preset === 'PIP') {
        wins.forEach((w, i) => grid.appendChild(fullWin(w, i)));
      } else {
        // Full cols×cols wall here too — cells past the sources render empty,
        // like unassigned inputs on a real multiviewer.
        for (let i = 0; i < cols * cols; i++) {
          const w = wins[i];
          grid.appendChild(w ? fullWin(w, i) : compactWin(undefined));
        }
      }
    }

    // Honour inbound writes from the bus / other consoles → apply to state and
    // re-render WITHOUT re-publishing (draw() never publishes, so no echo loop).
    ctx.services.onParam?.('layout', (v) => {
      if (typeof v === 'string' && v in PRESETS) { preset = v; draw(); }
    });
    wins.forEach((w, i) => {
      ctx.services.onParam?.(`pane${i + 1}_source`, (v) => {
        if (typeof v === 'string') { w.label = v; draw(); }
      });
      ctx.services.onParam?.(`pane${i + 1}_tally`, (v) => {
        if (v === 'pgm' || v === 'pvw' || v === 'off') { w.tally = v; draw(); }
      });
    });

    draw();
  },
};

export default plugin;

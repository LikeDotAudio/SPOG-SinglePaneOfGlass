// src/editors/multi-viewer — port of js/editors/multi-viewer.js.
//
// A multiviewer "layout maker": an LCARS-framed wall of tiles fed from the
// twist's routed sources (ctx.sources, NOT DOM scraping). Preset buttons reshape
// the wall (NxN / PIP), tiles cycle PGM/PVW/off tally on click, carry an editable
// UMD label and an animated VU meter, and reorder by drag-and-drop.

import type { EditorPlugin } from '../types.js';
import type { ParamSpec } from '../../platform/mqtt/types.js';
import { el } from '../../ui/dom.js';
import { createTestCardWall, testCardFor } from '../../domain/test-card/index.js';
import { injectMultiViewerStyles } from './styles.js';
import { channelsFor } from './channels.js';
import { createPanes, type Win } from './panes.js';

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

    // One shared test-card ticker for the whole wall: each video pane's screen is
    // a live SMPTE test frame keyed on that source's label + colour, so routing a
    // source makes its self-identifying frame appear here (audit §8-9).
    const cardWall = createTestCardWall(ctx.dispose);
    const videoScreen = (w: Win): HTMLElement => cardWall.mount(testCardFor(w.label, w.color));

    // The tile builders are closure-coupled to render state; hand them that
    // state explicitly (getPreset reads the live selection, redraw = draw).
    const { fullWin, compactWin } = createPanes({
      wins,
      dispose: ctx.dispose,
      getPreset: () => preset,
      redraw: () => draw(),
      publishSource,
      publishTally,
      publishAllPanes,
      videoScreen,
    });

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

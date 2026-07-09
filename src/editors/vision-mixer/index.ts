// src/editors/vision-mixer — the production video switcher (deployment plan).
//
// Schema-driven: the surface renders whatever the resolved SwitcherDef says
// (inputs, M/E count, keyers, DSKs, preset libraries) — counts are DATA, so the
// switcher is user-scalable per production (docs/Production-Video-Switcher-
// Deployment-Plan.md). Three M/E banks with delegation + re-entry, 24 inputs in
// an operator-chosen layout (prefs.ts), keyers with DVE flight (dve.ts), M/E
// composite presets, whole-switcher scene registers (scenes.ts), Kind-B tips on
// every control (tips.ts), and a definition-derived MQTT surface (mqtt.ts).
//
// The render closure orchestrates the shared state and threads it into flat
// sibling builders through the `Surface` context object (surface.ts): buses.ts,
// keyers.ts, panels.ts, mqtt-registry.ts and scene-editor.ts. The free-form
// module canvas lives in dashboard.ts + layout-drawer.ts.

import { VOICE_COMMANDS } from './VOICE.js';
import type { EditorPlugin, EditorContext } from '../types.js';
import type { DVESnapshot, MEPreset, SceneDef } from '../../model/index.js';
import { el } from '../../ui/dom.js';
import { tip } from '../../ui/tip.js';
import { injectVisionMixerStyles } from './styles.js';
import { resolveDef } from './schema.js';
import { effective, getPrefs, setPrefs, type VmPrefs } from './prefs.js';
import { newME, srcLabel, type MEState } from './me.js';
import { loadUserScenes, type SwitcherState } from './scenes.js';
import { buildDveEditor } from './dve.js';
import { publisher } from './mqtt.js';
import { TIPS } from './tips.js';
import { MacroRecorder } from './macros.js';
import { createBuses } from './buses.js';
import { createKeyers } from './keyers.js';
import { buildRegistry } from './mqtt-registry.js';
import { buildSceneEditor } from './scene-editor.js';
import { createDashboard } from './dashboard.js';
import { buildLayoutDrawer } from './layout-drawer.js';
import { buildAuxRow, buildMacroRow } from './panels.js';
import { buildPreRoute } from './preroute.js';
import { buildStage } from './stage.js';
import { wireKeyboard } from './keyboard.js';
import { buildTransition, type AutoToken } from './transition.js';
import { buildLooks } from './looks-scenes.js';
import { createProjection } from './projection.js';
import type { Flight, Surface } from './surface.js';

function render(host: HTMLElement, ctx: EditorContext): void {
  injectVisionMixerStyles();
  const def = resolveDef(ctx);
  const rawPublish = publisher(ctx);
  const publish = (topic: string, payload: unknown, throttle?: boolean) => {
    rawPublish(topic, payload, throttle);
    if (!throttle) macroRecorder.recordAction(topic, payload);
  };

  // ---- state ---------------------------------------------------------------
  const state: SwitcherState = {
    mes: Array.from({ length: def.mes }, (_, i) => newME(def, i + 1)),
    dsks: def.dsks.map(() => false),
    auxes: Array.from({ length: def.auxes ?? 6 }, () => 0),
    dskSrc: def.dsks.map((d) => d.source ?? 0),   // graphics PRE-ROUTE (hard-wired defaults)
  };
  let delegate = 0;                       // which M/E the surface controls
  let shift = false;                      // bus shift bank (shift12 layout)
  let dveSnapshots: DVESnapshot[] = [...def.dveSnapshots];
  let mePresets: MEPreset[] = [...def.mePresets];
  let scenes: SceneDef[] = [...def.scenes, ...loadUserScenes(ctx.twist.name)];
  const macroRecorder = new MacroRecorder(def.macros ?? []);
  const flights = new Map<string, Flight>();          // "me:keyer" → live pose
  let dveTargetKeyer = 0;                              // keyer the DVE editor drives
  let activeKeyerParam: number | null = null;         // keyer whose drawer is open
  let busBtns: { pgm: HTMLElement[]; pvw: HTMLElement[] } = { pgm: [], pvw: [] };

  // State persists per twist so a reopened switcher is exactly as left (plan §10).
  const STATE_KEY = `twist.vm.state.${ctx.twist.name}`;
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as SwitcherState;
      if (s.mes?.length === def.mes) { state.mes = s.mes; state.dsks = def.dsks.map((_, i) => !!s.dsks?.[i]); state.auxes = s.auxes || Array.from({ length: def.auxes ?? 6 }, () => 0); state.dskSrc = def.dsks.map((d, i) => s.dskSrc?.[i] ?? d.source ?? 0); }
    }
  } catch { /* fall through to defaults */ }
  const persist = (): void => { try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch { /* ignore */ } };

  const me = (): MEState => state.mes[delegate]!;
  const srcCount = def.inputs.length + def.mes;        // inputs + re-entries
  const allLabels = Array.from({ length: srcCount }, (_, i) => srcLabel(i, def));

  // Assigned once the scene-editor drawer is built (below); refreshes its select.
  let rebuildSceneEditorSel: () => void = () => {};
  // Assigned once the transition controls are built (below); triggers a bus take.
  let doTake: (bank: number) => void = () => {};
  // Assigned once projection.ts / looks-scenes.ts are built (below); surface + local
  // handlers call these by reference, so the late binding is transparent.
  let sync: () => void = () => {};
  let rebuildScenes: () => void = () => {};

  // ---- shared surface --------------------------------------------------------
  // One context object handed to every extracted builder. Reassignable scalars
  // are proxied via get/set so index.ts and the siblings mutate the same bindings.
  const surface: Surface = {
    ctx, def, state, allLabels, flights, dveSnapshots, mePresets, scenes, macroRecorder,
    publish, rawPublish,
    me: () => me(),
    sync: () => sync(),
    rebuild: () => rebuild(),
    rebuildKeyers: () => rebuildKeyers(),
    rebuildScenes: () => rebuildScenes(),
    rebuildSceneEditorSel: () => rebuildSceneEditorSel(),
    doTake: (bank: number) => doTake(bank),
    get delegate() { return delegate; }, set delegate(v: number) { delegate = v; },
    get shift() { return shift; }, set shift(v: boolean) { shift = v; },
    get dveTargetKeyer() { return dveTargetKeyer; }, set dveTargetKeyer(v: number) { dveTargetKeyer = v; },
    get activeKeyerParam() { return activeKeyerParam; }, set activeKeyerParam(v: number | null) { activeKeyerParam = v; },
    get busBtns() { return busBtns; }, set busBtns(v: { pgm: HTMLElement[]; pvw: HTMLElement[] }) { busBtns = v; },
  };

  // ---- M/E delegation tabs + toolbar ----------------------------------------
  const meTabs = state.mes.map((_, i) => {
    const b = el('button', { class: 'vm-metab', type: 'button' }, [`M/E ${i + 1}`]);
    b.addEventListener('click', () => { delegate = i; publish('panel.delegate', `M/E ${i + 1}`); rebuild(); });
    tip(b, TIPS.meTab!);
    return b;
  });
  const layoutSel = el('select', { class: 'vm-sel' }) as HTMLSelectElement;
  for (const [v, label] of [['def', 'LAYOUT · AUTO'], ['shift12', '12 + SHIFT'], ['wide24', '24 WIDE'], ['stack12', '2×12 STACK']] as const) {
    layoutSel.append(el('option', { value: v }, [label]));
  }
  layoutSel.value = getPrefs().layout;
  layoutSel.addEventListener('change', () => setPrefs({ layout: layoutSel.value as VmPrefs['layout'] }));
  tip(layoutSel, TIPS.layout!);
  // Self-cleaning: the overlay body is rebuilt per open, so drop the listener
  // once this render's DOM is gone (the host owns no unmount hook for editors).
  const onPrefs = (): void => {
    if (!host.isConnected) { document.removeEventListener('vm-prefs-change', onPrefs); return; }
    rebuildBuses();
  };
  document.addEventListener('vm-prefs-change', onPrefs);

  // ---- stage: PGM | T-bar | PVW ---------------------------------------------
  // `stage` (whole object) is handed to projection.ts; the closure also pulls out
  // the refs it wires directly (bus containers, monitors, T-bar).
  const stage = buildStage();
  const {
    pgmBusContainer, pvwBusContainer, pvwMon, busesMod, pgmMon, tbar, pct, tbarWrap,
  } = stage;

  // ---- buses (rebuilt on delegate / shift / layout change) --------------------
  const rebuildBuses = createBuses(surface, { pgm: pgmBusContainer, pvw: pvwBusContainer });

  // ---- transition section (transition.ts) -------------------------------------
  // `auto` is owned here (a holder so projection.ts can read/clear the same slot);
  // the RAF loop in projection drives it, transition.ts only arms it via setAuto.
  // doTake is built there and threaded back to the slot.
  const auto: { current: AutoToken | null } = { current: null };
  const { transBtns, rate, cutBtn, autoBtn, doTake: transDoTake } =
    buildTransition(surface, { tbar, pct, setAuto: (v) => { auto.current = v; } });
  doTake = transDoTake;

  // ---- keyers + DSKs -----------------------------------------------------------
  const keyerRow = el('div', { class: 'vm-keyrow' });
  const rebuildKeyers = createKeyers(surface, keyerRow);

  const dskBtns = def.dsks.map((d, i) => {
    const b = el('div', { class: 'vm-key' }, [d.name]);
    b.addEventListener('click', () => {
      state.dsks[i] = !state.dsks[i];
      publish(`dsk.${i + 1}.on`, state.dsks[i]);
      if (i < 2) publish(`dsk${i + 1}`, state.dsks[i]);   // legacy alias
      sync();
    });
    tip(b, TIPS.dsk!);
    return b;
  });

  // ---- M/E looks + scene registers (looks-scenes.ts) ----------------------------
  const { meRow, sceneRow, rebuildScenes: rebuildScenesFn } = buildLooks(surface);
  rebuildScenes = rebuildScenesFn;

  // ---- aux + macro panels (panels.ts) -------------------------------------------
  const { auxRow, auxSelects } = buildAuxRow(surface);
  const { macroRow } = buildMacroRow(surface);
  // Graphics PRE-ROUTE: shift which hard-wired control-room graphic feeds each DSK.
  const { preRow } = buildPreRoute(surface, dskBtns);

  // ---- DVE editor drawer -----------------------------------------------------------
  const dveDrawer = buildDveEditor({
    snapshots: () => dveSnapshots,
    onPreview: (kf) => {
      const key = `${delegate}:${dveTargetKeyer}`;
      flights.set(key, { a: kf, snapshot: { id: '_preview', name: '', pose: kf, ms: 0 }, t0: performance.now() });
      const k = me().keyers[dveTargetKeyer];
      if (k && !k.on) { k.on = true; rebuildKeyers(); sync(); }
    },
    onPlay: (p, currentKf) => flights.set(`${delegate}:${dveTargetKeyer}`, { a: currentKf, snapshot: p, t0: performance.now() }),
    onSave: (p) => {
      const i = dveSnapshots.findIndex((x) => x.id === p.id);
      if (i >= 0) dveSnapshots[i] = p; else dveSnapshots.push(p);
    },
  });
  const dveSec = el('div', { class: 'vm-sec', style: 'flex: 1; max-width: 400px;' }, [
    el('p', { class: 'ed-h' }, ['DVE EDITOR']),
    dveDrawer
  ]);

  // ---- console assembly ---------------------------------------------------------
  const macroSec = el('div', { class: 'vm-sec', style: 'flex: 1; max-width: 250px;' }, [
    el('p', { class: 'ed-h' }, ['MACROS']),
    macroRow,
  ]);
  const sceneSec = el('div', { class: 'vm-sec', style: 'flex: 1; max-width: 250px;' }, [
    el('p', { class: 'ed-h' }, ['SCENES']),
    sceneRow,
  ]);

  const transSec = el('div', { class: 'vm-sec', style: 'flex: 1;' }, [
    el('p', { class: 'ed-h' }, ['TRANSITION']),
    el('div', { class: 'vm-transrow' }, [...transBtns.map((x) => x.b), rate, cutBtn, autoBtn]),
  ]);
  const keyerSec = el('div', { class: 'vm-sec' }, [
    el('p', { class: 'ed-h' }, ['KEYERS — DELEGATED M/E']),
    keyerRow,
  ]);
  const dskSec = el('div', { class: 'vm-sec' }, [
    el('p', { class: 'ed-h' }, ['DOWNSTREAM KEYERS']),
    el('div', { class: 'vm-keyrow' }, dskBtns),
  ]);
  const preSec = el('div', { class: 'vm-sec' }, [
    el('p', { class: 'ed-h' }, ['GRAPHICS PRE-ROUTE']),
    preRow,
  ]);
  const meSec = el('div', { class: 'vm-sec' }, [
    el('p', { class: 'ed-h' }, ['M/E LOOKS']),
    meRow,
  ]);
  const auxSec = el('div', { class: 'vm-sec' }, [
    el('p', { class: 'ed-h' }, ['AUX PANEL']),
    auxRow,
  ]);

  const modules: Record<string, HTMLElement> = {
    macros: macroSec, pgm: pgmMon, buses: busesMod, tbar: tbarWrap, pvw: pvwMon, scenes: sceneSec,
    transitions: transSec, keyers: keyerSec, dsks: dskSec, preroute: preSec, me: meSec, aux: auxSec, dve: dveSec
  };

  // ---- dashboard canvas + drawers -----------------------------------------------
  const dash = createDashboard(ctx.twist.name, modules);
  const { lmDrawer, lmToggle } = buildLayoutDrawer(dash);
  const { sceneEditorDrawer, sceneEdToggle, rebuildSel } = buildSceneEditor(surface);
  rebuildSceneEditorSel = rebuildSel;

  if (effective(def).handedness === 'fixed') dash.el.classList.add('chir-exempt');

  host.append(
    el('div', { class: 'vm-root' }, [
      el('div', { class: 'vm-medock' }, [
        ...meTabs, el('span', { class: 'vm-spacer' }), sceneEdToggle, lmToggle, layoutSel,
      ]),
      lmDrawer,
      sceneEditorDrawer,
      dash.el,
    ]),
  );

  // ---- projection: state → DOM + animation frame (projection.ts) ------------------
  const proj = createProjection(surface, { stage, meTabs, transBtns, rate, dskBtns, auxSelects, auto, persist });
  sync = proj.sync;
  proj.startAnimation();

  // ---- MQTT surface (definition-derived registry, plan §6) ---------------------------
  buildRegistry(surface, { tbar, pct });

  // ---- full rebuild (delegate change) ------------------------------------------------
  function rebuild(): void {
    rebuildBuses();
    rebuildKeyers();
    sync();
  }

  wireKeyboard(surface, { host, tbar, cutBtn, autoBtn, dskBtns });

  rebuild();
}

const plugin: EditorPlugin = {
  id: 'vision-mixer',
  title: 'VISION MIXER',
  order: 3,
  blurb: 'Production switcher — 3 M/E banks with re-entry, 24 inputs, keyers with DVE flight, M/E looks, scene registers. Drives tally.',
  match: (n) => /video\s*mix|vision|switch/i.test(n),
  requiredCaps: ['switch'],
  render,
};

export default plugin;

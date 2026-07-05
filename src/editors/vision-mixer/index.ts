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

import type { EditorPlugin, EditorContext } from '../types.js';
import type { DVEPreset, MEPreset, SceneDef } from '../../model/index.js';
import { el } from '../../ui/dom.js';
import { tip } from '../../ui/tip.js';
import { injectVisionMixerStyles } from './styles.js';
import { resolveDef } from './schema.js';
import { effective, getPrefs, setPrefs, type VmPrefs } from './prefs.js';
import { newME, srcLabel, tallySet, applyPreset, capturePreset, type MEState } from './me.js';
import { emulateTransition } from './transitions/index.js';
import { captureScene, recallScene, loadUserScenes, saveUserScenes, type SwitcherState } from './scenes.js';
import { buildDveEditor, poseAt, poseToCss } from './dve.js';
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
import { buildStage } from './stage.js';
import { wireKeyboard } from './keyboard.js';
import { buildTransition, type AutoToken } from './transition.js';
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
  };
  let delegate = 0;                       // which M/E the surface controls
  let shift = false;                      // bus shift bank (shift12 layout)
  let dvePresets: DVEPreset[] = [...def.dvePresets];
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
      if (s.mes?.length === def.mes) { state.mes = s.mes; state.dsks = def.dsks.map((_, i) => !!s.dsks?.[i]); state.auxes = s.auxes || Array.from({ length: def.auxes ?? 6 }, () => 0); }
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

  // ---- shared surface --------------------------------------------------------
  // One context object handed to every extracted builder. Reassignable scalars
  // are proxied via get/set so index.ts and the siblings mutate the same bindings.
  const surface: Surface = {
    ctx, def, state, allLabels, flights, dvePresets, mePresets, scenes, macroRecorder,
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
  const {
    pgmFeed, pgmSrc, pgmPips, pgmBusContainer,
    pvwFeed, pvwSrc, pvwPips, pvwMon, pvwBusContainer, busesMod,
    dskRow, pgmFeedNext, pgmMon, tbar, pct, tbarWrap,
  } = buildStage();

  // ---- buses (rebuilt on delegate / shift / layout change) --------------------
  const rebuildBuses = createBuses(surface, { pgm: pgmBusContainer, pvw: pvwBusContainer });

  // ---- transition section (transition.ts) -------------------------------------
  // `auto` is owned here — the RAF loop below drives and clears it; transition.ts
  // only arms it via setAuto. doTake is built there and threaded back to the slot.
  let auto: AutoToken | null = null;
  const { transBtns, rate, cutBtn, autoBtn, doTake: transDoTake } =
    buildTransition(surface, { tbar, pct, setAuto: (v) => { auto = v; } });
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

  // ---- M/E presets + scenes ------------------------------------------------------
  const meRow = el('div', { class: 'vm-transrow' });

  function rebuildMeRow(): void {
    meRow.replaceChildren(
      ...mePresets.map((p) => {
        const b = el('div', { class: 'vm-btn' }, [p.name]);
        b.addEventListener('click', () => {
          applyPreset(me(), p, def);
          for (const [ki, k] of me().keyers.entries()) {
            if (k.on && k.dve) flights.set(`${delegate}:${ki}`, { preset: dvePresets.find((x) => x.id === k.dve) ?? dvePresets[0]!, t0: performance.now() });
          }
          rebuildKeyers(); sync();
        });
        tip(b, `Apply M/E preset: ${p.name}`);
        return b;
      }),
      meSave
    );
  }

  const meSave = el('div', { class: 'vm-btn', style: 'color: #ff9c63;' }, ['SAVE LOOK']);
  meSave.addEventListener('click', () => {
    const name = (prompt('Save this M/E composite as:', `LOOK ${mePresets.length + 1}`) || '').trim();
    if (!name) return;
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const p = capturePreset(me(), id, name);
    const i = mePresets.findIndex((x) => x.id === id);
    if (i >= 0) mePresets[i] = p; else mePresets.push(p);
    rebuildMeRow();
  });
  tip(meSave, TIPS.meEditor!);
  rebuildMeRow();

  const sceneRow = el('div', { class: 'vm-transrow', style: 'position: relative;' });
  function rebuildScenes(): void {
    sceneRow.replaceChildren(
      ...scenes.map((s) => {
        const b = el('button', { class: 'vm-scenebtn', type: 'button' }, [s.name]);
        b.addEventListener('click', () => {
          recallScene(state, s, def);
          publish('scene.recall', s.name);
          rebuildKeyers(); sync();
        });
        tip(b, TIPS.scene!);
        return b;
      }),
    );
    const store = el('button', { class: 'vm-scenebtn', type: 'button' }, ['＋ STORE…']);
    store.addEventListener('click', () => {
      const name = (prompt('Store the whole switcher as scene:', `SCENE ${scenes.length + 1}`) || '').trim();
      if (!name) return;
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const s = captureScene(state, id, name);
      const i = scenes.findIndex((x) => x.id === id);
      if (i >= 0) scenes[i] = s; else scenes.push(s);
      saveUserScenes(ctx.twist.name, scenes.filter((x) => !def.scenes.some((d) => d.id === x.id)));
      publish('scene.store', name);
      rebuildScenes();
      rebuildSceneEditorSel();
    });
    const editToggle = el('button', { class: 'vm-scenebtn', type: 'button' }, ['⚙']);
    editToggle.addEventListener('click', () => { sceneEditorDrawer.style.display = sceneEditorDrawer.style.display === 'none' ? 'flex' : 'none'; });
    tip(store, TIPS.sceneStore!);
    sceneRow.appendChild(store);
  }
  rebuildScenes();

  // ---- aux + macro panels (panels.ts) -------------------------------------------
  const { auxRow, auxSelects } = buildAuxRow(surface);
  const { macroRow } = buildMacroRow(surface);

  // ---- DVE editor drawer -----------------------------------------------------------
  const dveDrawer = buildDveEditor({
    presets: () => dvePresets,
    onPreview: (kf) => {
      const key = `${delegate}:${dveTargetKeyer}`;
      flights.set(key, { preset: { id: '_preview', name: '', a: kf, b: kf, ms: 0 }, t0: performance.now() });
      const k = me().keyers[dveTargetKeyer];
      if (k && !k.on) { k.on = true; rebuildKeyers(); sync(); }
    },
    onPlay: (p) => flights.set(`${delegate}:${dveTargetKeyer}`, { preset: p, t0: performance.now() }),
    onSave: (p) => {
      const i = dvePresets.findIndex((x) => x.id === p.id);
      if (i >= 0) dvePresets[i] = p; else dvePresets.push(p);
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
    transitions: transSec, keyers: keyerSec, dsks: dskSec, me: meSec, aux: auxSec, dve: dveSec
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

  // ---- sync (state → DOM) ---------------------------------------------------------
  let lastTally = '';

  const getZigZagStyle = (idx: number): string => {
    const hue = (idx * 37) % 360;
    return `background-color: hsl(${hue}, 40%, 30%); background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, hsl(${hue}, 40%, 20%) 10px, hsl(${hue}, 40%, 20%) 20px);`;
  };

  function sync(): void {
    const m = me();
    meTabs.forEach((t, i) => t.classList.toggle('sel', i === delegate));
    pgmFeed.textContent = srcLabel(m.pgm, def);
    pgmFeed.style.cssText = getZigZagStyle(m.pgm);
    pgmFeedNext.textContent = srcLabel(m.pvw, def);
    pgmFeedNext.style.cssText = getZigZagStyle(m.pvw) + ' position:absolute; inset:0; opacity:0; pointer-events:none; z-index:1;';
    pvwFeed.textContent = srcLabel(m.pvw, def);
    pvwFeed.style.cssText = getZigZagStyle(m.pvw);
    pgmSrc.textContent = `M/E ${delegate + 1}`;
    pvwSrc.textContent = `NEXT · ${m.trans} ${m.rate}f`;
    busBtns.pgm.forEach((b, i) => b?.classList.toggle('sel', i === m.pgm));
    busBtns.pvw.forEach((b, i) => b?.classList.toggle('sel', i === m.pvw));
    transBtns.forEach(({ t, b }) => b.classList.toggle('sel', t === m.trans));
    rate.value = String(m.rate);
    tbar.value = String(m.tbar);
    pct.textContent = `${Math.round(m.tbar)}%`;
    dskRow.replaceChildren(...state.dsks.flatMap((on, i) => on ? [el('span', {}, [def.dsks[i]!.name.split('·')[0]!.trim()])] : []));
    dskBtns.forEach((b, i) => b.classList.toggle('on', !!state.dsks[i]));
    rebuildPips();
    // Tally (read-only telemetry): the LAST bank is the programme output.
    const pgmTally = [...tallySet(state.mes, def.mes - 1, def)].map((i) => srcLabel(i, def)).sort();
    const key = pgmTally.join('|');
    if (key !== lastTally) { lastTally = key; publish('tally.program', pgmTally); }
    auxSelects.forEach((sel, i) => { if (!sel.value) sel.value = String(state.auxes[i]); });
    persist();
  }

  /** The PIP chips over the monitors — one per active keyer of the delegated bank. */
  function rebuildPips(): void {
    const mk = (armedOnly: boolean): HTMLElement[] => me().keyers.flatMap((k, ki) => {
      if (!k.on) return [];
      const chip = el('div', { class: `vm-pip${armedOnly ? ' armed' : ''}`, dataset: { fk: `${delegate}:${ki}` } },
        [srcLabel(k.source, def)]);
      return [chip];
    });
    pgmPips.replaceChildren(...mk(false));
    pvwPips.replaceChildren(...mk(true));
  }

  // ---- animation loop: DVE flights + auto-transition -------------------------------
  ctx.dispose.raf(() => {
    const now = performance.now();
    for (const chipHost of [pgmPips, pvwPips]) {
      for (const chip of chipHost.children) {
        const f = flights.get((chip as HTMLElement).dataset.fk ?? '');
        if (f) (chip as HTMLElement).style.transform = poseToCss(poseAt(f.preset, f.t0, now));
      }
    }
    if (auto) {
      const t = Math.min(1, (now - auto.t0) / auto.ms);
      const m = state.mes[auto.bank]!;
      m.tbar = t * 100;
      if (auto.bank === delegate) { tbar.value = String(m.tbar); pct.textContent = `${Math.round(m.tbar)}%`; }
      if (t >= 1) { const bank = auto.bank; auto = null; doTake(bank); }
    }

    // Render transition emulation
    const m = me();
    if (m.tbar > 0 && m.tbar < 100) {
      const pct = m.tbar / 100;
      const style = emulateTransition(m.trans, pct);

      pgmFeedNext.style.opacity = String(style.opacity);
      pgmFeedNext.style.clipPath = style.clipPath;
      pgmFeedNext.style.transform = style.transform;
    } else {
      pgmFeedNext.style.opacity = '0';
      pgmFeedNext.style.clipPath = 'none';
      pgmFeedNext.style.transform = 'none';
    }
  });

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

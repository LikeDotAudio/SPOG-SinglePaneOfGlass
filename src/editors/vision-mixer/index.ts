// src/editors/vision-mixer — the production video switcher (deployment plan).
//
// Schema-driven: the surface renders whatever the resolved SwitcherDef says
// (inputs, M/E count, keyers, DSKs, preset libraries) — counts are DATA, so the
// switcher is user-scalable per production (docs/Production-Video-Switcher-
// Deployment-Plan.md). Three M/E banks with delegation + re-entry, 24 inputs in
// an operator-chosen layout (prefs.ts), keyers with DVE flight (dve.ts), M/E
// composite presets, whole-switcher scene registers (scenes.ts), Kind-B tips on
// every control (tips.ts), and a definition-derived MQTT surface (mqtt.ts).

import type { EditorPlugin, EditorContext } from '../types.js';
import type { DVEPreset, MEPreset, SceneDef, SwitcherDef, TransitionKind } from '../../model/index.js';
import { el } from '../../ui/dom.js';
import { tip } from '../../ui/tip.js';
import { injectVisionMixerStyles } from './styles.js';
import { resolveDef } from './schema.js';
import { effective, getPrefs, setPrefs, type VmPrefs } from './prefs.js';
import { newME, take, srcLabel, reentryOf, tallySet, applyPreset, capturePreset, KEYER_TYPES, type MEState, type KeyerState } from './me.js';
import { emulateTransition } from './transitions/index.js';
import { captureScene, recallScene, loadUserScenes, saveUserScenes, type SwitcherState } from './scenes.js';
import { buildDveEditor, poseAt, poseToCss } from './dve.js';
import { P, wire, publisher, type ParamRegistry } from './mqtt.js';
import { TIPS } from './tips.js';
import { MacroRecorder } from './macros.js';

/** A keyer's live DVE flight: the preset in motion and when it was triggered. */
interface Flight { preset: DVEPreset; t0: number; }

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
  const pgmFeed = el('div', { class: 'vm-feed' });
  const pgmSrc = el('span', { class: 'vm-src' });
  const pgmPips = el('div');
  const pgmBusContainer = el('div');
  
  const pvwFeed = el('div', { class: 'vm-feed' });
  const pvwSrc = el('span', { class: 'vm-src' });
  const pvwPips = el('div');
  const pvwMon = el('div', { class: 'vm-mon pvw', style: 'flex: none; aspect-ratio: auto; width: 300px; height: 300px; min-width: 150px; min-height: 150px;' }, [
    el('span', { class: 'vm-tag' }, ['PREVIEW']), pvwSrc, pvwFeed, pvwPips,
  ]);
  tip(pvwMon, TIPS.pvwMon!);

  const pvwBusContainer = el('div');
  
  const busesMod = el('div', { class: 'vm-sec', style: 'flex: 1 1 auto; min-width: 300px; max-width: 100%; padding-bottom: 24px;' }, [
    el('p', { class: 'ed-h' }, ['PROGRAM BUS']), pgmBusContainer,
    el('p', { class: 'ed-h', style: 'margin-top: 16px;' }, ['PREVIEW BUS']), pvwBusContainer
  ]);

  const dskRow = el('div', { class: 'vm-dskrow' });
  const pgmFeedNext = el('div', { class: 'vm-feed', style: 'position:absolute; inset:0; opacity:0; pointer-events:none; z-index:1;' });
  const pgmMon = el('div', { class: 'vm-mon pgm', style: 'flex: none; aspect-ratio: auto; width: 300px; height: 300px; min-width: 150px; min-height: 150px;' }, [
    el('span', { class: 'vm-tag' }, ['PROGRAM']), pgmSrc, pgmFeed, pgmFeedNext, pgmPips, dskRow,
  ]);
  tip(pgmMon, TIPS.pgmMon!);

  const tbar = el('input', { class: 'vm-tbar', type: 'range', min: '0', max: '100', value: '0' }) as HTMLInputElement;
  const pct = el('div', { class: 'vm-pct' }, ['0%']);
  tip(tbar, TIPS.tbar!);
  const tbarWrap = el('div', { class: 'vm-tbar-wrap' }, [
    el('p', { class: 'ed-h vm-h' }, ['T-BAR']),
    el('div', { class: 'vm-tbar-stage' }, [
      el('div', { class: 'vm-tbar-ends' }, [
        el('span', { class: 'pvw' }, ['PVW ▲']), el('span', { class: 'pgm' }, ['PGM ▼']),
      ]),
      tbar,
    ]),
    pct,
  ]);



  // ---- buses (rebuilt on delegate / shift / layout change) --------------------
  let busBtns: { pgm: HTMLElement[]; pvw: HTMLElement[] } = { pgm: [], pvw: [] };

  function busButton(kind: 'pgm' | 'pvw', i: number): HTMLElement {
    const re = reentryOf(i, def);
    const input = def.inputs[i];
    const b = el('div', {
      class: `vm-btn${re !== null ? ' reentry' : ''}`,
      ...(re === null && input?.category ? { dataset: { cat: input.category } } : {}),
    }, [srcLabel(i, def)]);
    b.addEventListener('click', () => {
      me()[kind] = i;
      publish(`me.${delegate + 1}.${kind}`, srcLabel(i, def));
      if (delegate === 0) publish(kind, srcLabel(i, def));   // legacy alias
      sync();
    });
    tip(b, re !== null ? TIPS.reentry! : (kind === 'pgm' ? TIPS.busPgm! : TIPS.busPvw!));
    return b;
  }

  function rebuildBuses(): void {
    const layout = effective(def).layout;
    busBtns = { pgm: [], pvw: [] };
    for (const kind of ['pgm', 'pvw'] as const) {
      const bus = el('div', { class: `vm-bus ${kind}${layout === 'stack12' ? ' stack' : ''}` });
      // Which source indices this row shows. Re-entries (minus self) always ride
      // at the end; a bank never re-enters itself.
      const reentries = Array.from({ length: def.mes }, (_, m) => def.inputs.length + m)
        .filter((i) => reentryOf(i, def) !== delegate);
      const idx = (list: number[]): void => {
        for (const i of list) { const b = busButton(kind, i); busBtns[kind][i] = b; bus.appendChild(b); }
      };
      if (layout === 'shift12') {
        const bank = shift ? 1 : 0;
        const from = bank * 12;
        idx(Array.from({ length: Math.min(12, def.inputs.length - from) }, (_, k) => from + k));
        const sh = el('div', { class: `vm-btn shiftkey${shift ? ' on' : ''}` }, ['⇧']);
        sh.addEventListener('click', () => { shift = !shift; rebuildBuses(); });
        tip(sh, TIPS.shift!);
        bus.appendChild(sh);
        idx(reentries);
      } else if (layout === 'stack12') {
        const rowA = el('div', { class: 'vm-bank' }), rowB = el('div', { class: 'vm-bank' });
        def.inputs.forEach((_, i) => {
          const b = busButton(kind, i); busBtns[kind][i] = b;
          (i < 12 ? rowA : rowB).appendChild(b);
        });
        for (const i of reentries) { const b = busButton(kind, i); busBtns[kind][i] = b; rowB.appendChild(b); }
        bus.append(rowA, rowB);
      } else {
        idx(def.inputs.map((_, i) => i));
        idx(reentries);
      }
      
      if (kind === 'pgm') {
        pgmBusContainer.replaceChildren(bus);
      } else {
        pvwBusContainer.replaceChildren(bus);
      }
    }
    sync();
  }

  // ---- transition section -----------------------------------------------------
  const transBtns = def.transitions.map((t) => {
    const b = el('div', { class: 'vm-tbtn' }, [t]);
    b.addEventListener('click', () => {
      me().trans = t;
      publish(`me.${delegate + 1}.transition`, t);
      if (delegate === 0) publish('transition', t);
      sync();
    });
    tip(b, (t === 'CUT' ? TIPS.cut : t === 'MIX' ? TIPS.mix : t === 'WIPE' ? TIPS.wipe : TIPS.dveTrans)!);
    return { t, b };
  });
  const rate = el('input', { class: 'vm-num', type: 'number', min: '1', max: '300' }) as HTMLInputElement;
  rate.addEventListener('input', () => { me().rate = Math.max(1, +rate.value || 24); publish(`me.${delegate + 1}.rate`, me().rate); });
  tip(rate, TIPS.rate!);
  const cutBtn = el('div', { class: 'vm-tbtn take', style: 'background: var(--state-alarm,#ff3b3b); color: #fff;' }, ['CUT']);
  const autoBtn = el('div', { class: 'vm-tbtn take', style: 'background: var(--sig-audio,#FF9C63); color: #000;' }, ['AUTO']);
  tip(cutBtn, TIPS.take!);
  tip(autoBtn, 'Trigger the selected transition over the given rate.');

  // Auto-transition: CUT is instant; MIX/WIPE/DVE run the T-bar over `rate` frames.
  let auto: { bank: number; t0: number; ms: number } | null = null;
  function doTake(bank: number): void {
    take(state.mes[bank]!);
    tbar.value = '0'; pct.textContent = '0%';
    publish(`me.${bank + 1}.pgm`, srcLabel(state.mes[bank]!.pgm, def));
    publish(`me.${bank + 1}.pvw`, srcLabel(state.mes[bank]!.pvw, def));
    if (bank === 0) { publish('pgm', srcLabel(state.mes[0]!.pgm, def)); publish('pvw', srcLabel(state.mes[0]!.pvw, def)); }
    sync();
  }
  cutBtn.addEventListener('click', () => { doTake(delegate); });
  autoBtn.addEventListener('click', () => {
    auto = { bank: delegate, t0: performance.now(), ms: (me().rate / 30) * 1000 };
  });
  tbar.addEventListener('input', () => {
    me().tbar = +tbar.value;
    pct.textContent = `${tbar.value}%`;
    publish(`me.${delegate + 1}.tbar`, me().tbar, true);
    if (delegate === 0) publish('tbar', me().tbar, true);
    if (me().tbar >= 100) doTake(delegate);
  });

  // ---- keyers + DSKs -----------------------------------------------------------
  let activeKeyerParam: number | null = null;

  const keyerRow = el('div', { class: 'vm-keyrow' });
  function rebuildKeyers(): void {
    keyerRow.replaceChildren(...me().keyers.map((k, ki) => {
      const wrapper = el('div', { style: 'position: relative; display: flex; flex-direction: column; gap: 4px;' });
      const b = el('div', { class: `vm-key${k.on ? ' on' : ''}` }, [
        `KEY ${ki + 1} · ${k.type.toUpperCase()}`,
      ]);
      
      const paramRow = el('div', { class: 'vm-drawer', style: 'position: absolute; top: 100%; left: 0; z-index: 50; width: max-content; margin-top: 5px; flex-direction: column; align-items: stretch; gap: 4px; background: #17233c; padding: 6px; border-radius: 8px;' });
      paramRow.style.display = (activeKeyerParam === ki) ? 'flex' : 'none';

      const typeSel = el('select', { class: 'vm-sel' }) as HTMLSelectElement;
      for (const t of KEYER_TYPES) typeSel.append(el('option', { value: t }, [t.toUpperCase()]));
      typeSel.value = k.type;
      typeSel.addEventListener('change', () => { k.type = typeSel.value as typeof k.type; publish(`me.${delegate + 1}.key.${ki + 1}.type`, k.type); rebuildKeyers(); });
      
      const srcSel = el('select', { class: 'vm-sel' }) as HTMLSelectElement;
      allLabels.forEach((l, i) => { if (reentryOf(i, def) !== delegate) srcSel.append(el('option', { value: String(i) }, [l])); });
      srcSel.value = String(k.source);
      srcSel.addEventListener('change', () => { k.source = +srcSel.value; publish(`me.${delegate + 1}.key.${ki + 1}.source`, srcLabel(k.source, def)); sync(); });
      
      const dveSel = el('select', { class: 'vm-sel' }) as HTMLSelectElement;
      dveSel.append(el('option', { value: '' }, ['DVE · NONE']));
      for (const p of dvePresets) dveSel.append(el('option', { value: p.id }, [p.name]));
      dveSel.value = k.dve ?? '';
      dveSel.addEventListener('change', () => {
        if (dveSel.value) k.dve = dveSel.value; else delete k.dve;
        publish(`me.${delegate + 1}.key.${ki + 1}.dve`, dveSel.value || 'none');
        if (k.dve) flights.set(`${delegate}:${ki}`, { preset: dvePresets.find((p) => p.id === k.dve)!, t0: performance.now() });
        sync();
      });
      
      paramRow.append(
        el('span', { class: 'ed-h vm-h' }, [`KEYER ${ki + 1}`]),
        typeSel, srcSel, dveSel
      );
      
      let holdTimer: ReturnType<typeof setTimeout>;
      let held = false;
      b.addEventListener('pointerdown', () => {
        held = false;
        holdTimer = setTimeout(() => {
          held = true;
          activeKeyerParam = (activeKeyerParam === ki) ? null : ki;
          if (activeKeyerParam === ki) dveTargetKeyer = ki;
          rebuildKeyers();
        }, 500);
      });
      b.addEventListener('pointerup', () => clearTimeout(holdTimer));
      b.addEventListener('pointerleave', () => clearTimeout(holdTimer));
      b.addEventListener('pointercancel', () => clearTimeout(holdTimer));
      
      b.addEventListener('click', () => {
        if (held) return;
        k.on = !k.on;
        if (k.on && k.dve) flights.set(`${delegate}:${ki}`, { preset: dvePresets.find((p) => p.id === k.dve) ?? dvePresets[0]!, t0: performance.now() });
        publish(`me.${delegate + 1}.key.${ki + 1}.on`, k.on);
        sync();
      });
      
      tip(b, TIPS.keyer!);
      wrapper.append(b, paramRow);
      return wrapper;
    }));
    const splitBtn = el('div', { class: `vm-key split${me().split ? ' on' : ''}` }, ['SPLIT M/E']);
    splitBtn.addEventListener('click', () => { me().split = !me().split; rebuildKeyers(); sync(); });
    tip(splitBtn, 'Partition this M/E into two independently-keyed halves.');
    keyerRow.appendChild(splitBtn);
  }

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

  const auxRow = el('div', { class: 'vm-transrow', style: 'flex-direction: column; align-items: stretch; gap: 8px;' });
  const auxSelects: HTMLSelectElement[] = [];
  state.auxes.forEach((_, i) => {
    const row = el('div', { style: 'display: flex; gap: 8px; align-items: center;' });
    row.append(el('span', { class: 'ed-h', style: 'margin: 0; min-width: 50px;' }, [`AUX ${i + 1}`]));
    
    const srcSel = el('select', { class: 'vm-sel', style: 'flex: 1' }) as HTMLSelectElement;
    allLabels.forEach((l, idx) => srcSel.append(el('option', { value: String(idx) }, [l])));
    srcSel.value = String(state.auxes[i]);
    
    srcSel.addEventListener('change', () => {
      state.auxes[i] = +srcSel.value;
      publish(`aux.${i + 1}.source`, srcLabel(+srcSel.value, def));
      sync();
    });
    auxSelects.push(srcSel);
    row.append(srcSel);
    auxRow.append(row);
  });

  const macroRow = el('div', { class: 'vm-transrow' });
  const recBtn = el('button', { class: 'vm-tbtn', type: 'button', style: 'color: #f55' }, ['⏺ RECORD']);
  const macroSel = el('select', { class: 'vm-sel' }) as HTMLSelectElement;
  const playBtn = el('button', { class: 'vm-tbtn', type: 'button' }, ['▶ PLAY']);
  const rebuildMacroSel = () => { macroSel.replaceChildren(...macroRecorder.macros.map(m => el('option', { value: m.id }, [m.name]))); };
  rebuildMacroSel();

  recBtn.addEventListener('click', () => {
    if (macroRecorder.recording) {
      macroRecorder.stopRecording();
      recBtn.textContent = '⏺ RECORD';
      rebuildMacroSel();
    } else {
      const name = prompt('Macro name:', `MACRO ${macroRecorder.macros.length + 1}`);
      if (!name) return;
      macroRecorder.startRecording(name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name);
      recBtn.textContent = '⏹ STOP';
    }
  });

  playBtn.addEventListener('click', () => {
    if (macroSel.value) macroRecorder.playMacro(macroSel.value, rawPublish);
  });
  macroRow.append(recBtn, macroSel, playBtn);

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

  interface ScreenLayout {
    order: string[];
    hidden: string[];
    sizes?: Record<string, { width: string; height: string }>;
    positions?: Record<string, { x: number; y: number }>;
  }
  const LAYOUT_KEY = `twist.vm.layout.${ctx.twist.name}`;
  const PRESETS_KEY = `twist.vm.layout_presets`;

  const initPositions: Record<string, {x:number, y:number}> = {
    pgm: {x: 16, y: 16}, pvw: {x: 350, y: 16}, transitions: {x: 680, y: 16}, keyers: {x: 1000, y: 16},
    buses: {x: 16, y: 350}, macros: {x: 680, y: 220}, dsks: {x: 1000, y: 220},
    scenes: {x: 680, y: 400}, me: {x: 1000, y: 400}, aux: {x: 1000, y: 500}, dve: {x: 16, y: 550}
  };

  let currentLayout: ScreenLayout = {
    order: ['macros', 'pgm', 'buses', 'tbar', 'pvw', 'scenes', 'transitions', 'keyers', 'dsks', 'me', 'aux', 'dve'],
    hidden: ['dve'],
    sizes: {},
    positions: {}
  };

  try {
    const saved = localStorage.getItem(LAYOUT_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) currentLayout.order = parsed;
      else if (parsed && parsed.order) currentLayout = parsed;
    }
  } catch {}

  let userLayoutPresets: Record<string, ScreenLayout> = {};
  try {
    const p = localStorage.getItem(PRESETS_KEY);
    if (p) userLayoutPresets = JSON.parse(p);
  } catch {}

  const dashboard = el('div', { class: 'vm-dashboard tips-disabled', style: 'position: relative; flex: 1; overflow: auto; min-height: 800px;' });
  
  let jsonView: HTMLTextAreaElement | undefined;

  let isLayoutLocked = true;

  function applyLayout() {
    dashboard.replaceChildren();
    Object.keys(modules).forEach(k => {
      if (!currentLayout.order.includes(k)) currentLayout.order.push(k);
    });
    
    currentLayout.order.forEach((id, index) => {
      const mod = modules[id];
      if (mod) {
        mod.style.display = currentLayout.hidden.includes(id) ? 'none' : 'flex';
        mod.style.position = 'absolute';
        mod.style.zIndex = (index + 10).toString();
        mod.style.margin = '0';
        
        const pos = currentLayout.positions?.[id] || initPositions[id] || {x: 0, y: 0};
        mod.style.left = `${pos.x}px`;
        mod.style.top = `${pos.y}px`;

        if (currentLayout.sizes && currentLayout.sizes[id]) {
          mod.style.width = currentLayout.sizes[id].width || '';
          mod.style.height = currentLayout.sizes[id].height || '';
        }
        mod.style.resize = 'both';
        mod.style.overflow = 'auto';
        dashboard.appendChild(mod);
      }
    });
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(currentLayout));
    if (jsonView) jsonView.value = JSON.stringify(currentLayout, null, 2);
  }

  let draggedId: string | null = null;
  let resizeTimeout: ReturnType<typeof setTimeout>;
  
  const styleObserver = new MutationObserver((mutations) => {
    let changed = false;
    mutations.forEach(m => {
      if (m.type === 'attributes' && m.attributeName === 'style') {
        const tgt = m.target as HTMLElement;
        const id = tgt.dataset.id;
        if (id) {
          if (!currentLayout.sizes) currentLayout.sizes = {};
          currentLayout.sizes[id] = { width: tgt.style.width, height: tgt.style.height };
          changed = true;
        }
      }
    });
    if (changed) {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        localStorage.setItem(LAYOUT_KEY, JSON.stringify(currentLayout));
      }, 500);
    }
  });

  let activeDrag: { id: string; startX: number; startY: number; initialX: number; initialY: number } | null = null;
  
  Object.entries(modules).forEach(([id, mod]) => {
    mod.dataset.id = id;
    styleObserver.observe(mod, { attributes: true, attributeFilter: ['style'] });
    
    mod.addEventListener('pointerdown', (e) => {
      // ONLY ALLOW DRAG/DROP WHEN LAYOUT IS UNLOCKED!
      if (isLayoutLocked) return;

      const tgt = e.target as HTMLElement;
      if (['BUTTON', 'SELECT', 'INPUT'].includes(tgt.tagName) || tgt.closest('button') || tgt.closest('select') || tgt.closest('input')) return;
      
      const rect = mod.getBoundingClientRect();
      const isResize = (e.clientX > rect.right - 24) && (e.clientY > rect.bottom - 24);
      if (isResize) return;

      const pos = currentLayout.positions?.[id] || initPositions[id] || {x: 0, y: 0};
      activeDrag = {
        id,
        startX: e.pageX,
        startY: e.pageY,
        initialX: pos.x,
        initialY: pos.y
      };
      
      const idx = currentLayout.order.indexOf(id);
      if (idx >= 0) {
        currentLayout.order.splice(idx, 1);
        currentLayout.order.push(id);
        applyLayout();
      }
      mod.setPointerCapture(e.pointerId);
    });

    mod.addEventListener('pointermove', (e) => {
      if (!activeDrag || activeDrag.id !== id) return;
      const dx = e.pageX - activeDrag.startX;
      const dy = e.pageY - activeDrag.startY;
      
      if (!currentLayout.positions) currentLayout.positions = {};
      currentLayout.positions[id] = {
        x: activeDrag.initialX + dx,
        y: activeDrag.initialY + dy
      };
      mod.style.left = `${currentLayout.positions[id].x}px`;
      mod.style.top = `${currentLayout.positions[id].y}px`;
    });

    mod.addEventListener('pointerup', (e) => {
      if (activeDrag && activeDrag.id === id) {
        activeDrag = null;
        mod.releasePointerCapture(e.pointerId);
        localStorage.setItem(LAYOUT_KEY, JSON.stringify(currentLayout));
        if (jsonView) jsonView.value = JSON.stringify(currentLayout, null, 2);
      }
    });
  });

  applyLayout();

  const lmDrawer = el('div', { class: 'vm-drawer', style: 'display:none; padding: 16px; background: #0a0f1c; border-radius: 8px; margin-bottom: 16px; gap: 16px; flex-direction: column;' });
  const lmChecks = el('div', { style: 'display:flex; gap:16px; flex-wrap:wrap;' });
  const rebuildLmChecks = () => {
    lmChecks.replaceChildren(...Object.keys(modules).map(id => {
      const lbl = el('label', { style: 'cursor:pointer; display:flex; align-items:center; gap:4px; font-weight:bold; color: #cfe0ff;' }, [id.toUpperCase()]);
      const chk = el('input', { type: 'checkbox', checked: !currentLayout.hidden.includes(id) }) as HTMLInputElement;
      chk.addEventListener('change', () => {
        if (chk.checked) currentLayout.hidden = currentLayout.hidden.filter(x => x !== id);
        else currentLayout.hidden.push(id);
        applyLayout();
      });
      lbl.prepend(chk);
      return lbl;
    }));
  };
  rebuildLmChecks();

  const lmPresetSel = el('select', { class: 'vm-sel' }) as HTMLSelectElement;
  const rebuildLmPresetSel = () => {
    lmPresetSel.replaceChildren(
      el('option', { value: '' }, ['LOAD PRESET...']),
      el('option', { value: '__classic' }, ['Default (All)']),
      el('option', { value: '__compact' }, ['Compact']),
      ...Object.keys(userLayoutPresets).map(k => el('option', { value: k }, [k]))
    );
  };
  rebuildLmPresetSel();
  
  lmPresetSel.addEventListener('change', () => {
    const v = lmPresetSel.value;
    if (!v) return;
    if (v === '__classic') {
      currentLayout.hidden = [];
    } else if (v === '__compact') {
      currentLayout.hidden = ['macros', 'scenes', 'keyers', 'dsks', 'me', 'aux'];
    } else if (userLayoutPresets[v]) {
      currentLayout = JSON.parse(JSON.stringify(userLayoutPresets[v]));
    }
    applyLayout();
    rebuildLmChecks();
    lmPresetSel.value = '';
  });

  const lmSaveBtn = el('button', { class: 'vm-tbtn', type: 'button' }, ['SAVE AS PRESET']);
  lmSaveBtn.addEventListener('click', () => {
    const name = prompt('Preset name:', `Layout ${Object.keys(userLayoutPresets).length + 1}`);
    if (!name) return;
    userLayoutPresets[name] = JSON.parse(JSON.stringify(currentLayout));
    localStorage.setItem(PRESETS_KEY, JSON.stringify(userLayoutPresets));
    rebuildLmPresetSel();
  });

  jsonView = el('textarea', { style: 'width: 100%; height: 150px; background: #000; color: #0f0; font-family: monospace; padding: 8px; border-radius: 8px;' }) as HTMLTextAreaElement;
  jsonView.value = JSON.stringify(currentLayout, null, 2);
  
  const applyJsonBtn = el('button', { class: 'vm-tbtn', type: 'button' }, ['APPLY JSON']);
  applyJsonBtn.addEventListener('click', () => {
    try {
      const parsed = JSON.parse(jsonView.value);
      if (parsed && typeof parsed === 'object') {
        currentLayout = parsed;
        if (!currentLayout.positions) currentLayout.positions = {};
        if (!currentLayout.sizes) currentLayout.sizes = {};
        applyLayout();
        rebuildLmChecks();
      }
    } catch(e) {
      alert('Invalid JSON: ' + (e as Error).message);
    }
  });

  const layoutLockBtn = el('button', { class: 'vm-tbtn', type: 'button' }, ['🔒 UNLOCK LAYOUT DRAG']);
  layoutLockBtn.addEventListener('click', () => {
    isLayoutLocked = !isLayoutLocked;
    layoutLockBtn.textContent = isLayoutLocked ? '🔒 UNLOCK LAYOUT DRAG' : '🔓 LOCK LAYOUT DRAG';
    layoutLockBtn.style.background = isLayoutLocked ? '' : 'var(--state-alarm,#ff3b3b)';
    layoutLockBtn.style.color = isLayoutLocked ? '' : '#fff';
    dashboard.classList.toggle('tips-disabled', isLayoutLocked);
    Object.values(modules).forEach(mod => {
      mod.style.resize = isLayoutLocked ? 'none' : 'both';
    });
  });

  lmDrawer.append(
    el('div', { class: 'ed-h vm-h', style: 'display:flex; justify-content:space-between; align-items:center;' }, [
      'SCREEN LAYOUT CONFIGURATION', layoutLockBtn
    ]),
    lmChecks,
    el('div', { style: 'display:flex; gap: 8px; margin-top: 8px;' }, [lmPresetSel, lmSaveBtn]),
    el('div', { class: 'ed-h vm-h', style: 'margin-top: 16px;' }, ['VIEW / EDIT JSON']),
    jsonView,
    el('div', { style: 'display:flex; gap: 8px; margin-top: 8px;' }, [applyJsonBtn])
  );

  const lmToggle = el('button', { class: 'vm-tbtn', type: 'button' }, ['SCREEN LAYOUT']);
  lmToggle.addEventListener('click', () => {
    lmDrawer.style.display = lmDrawer.style.display === 'none' ? 'flex' : 'none';
  });

  const sceneEditorDrawer = el('div', { class: 'vm-drawer', style: 'display:none; padding: 16px; background: #0a0f1c; border-radius: 8px; margin-bottom: 16px; gap: 16px; flex-direction: column;' });
  const sceneEdSel = el('select', { class: 'vm-sel' }) as HTMLSelectElement;
  const sceneEdJson = el('textarea', { style: 'width: 100%; height: 300px; background: #000; color: #0f0; font-family: monospace; padding: 8px; border-radius: 8px;' }) as HTMLTextAreaElement;
  const sceneEdApply = el('button', { class: 'vm-tbtn', type: 'button' }, ['SAVE SCENE']);
  const sceneEdCapture = el('button', { class: 'vm-tbtn', type: 'button' }, ['CAPTURE CURRENT STATE']);

  var rebuildSceneEditorSel = () => {
    sceneEdSel.replaceChildren(
      el('option', { value: '' }, ['-- SELECT SCENE TO EDIT --']),
      ...scenes.map(s => el('option', { value: s.id }, [s.name]))
    );
  };
  rebuildSceneEditorSel();

  sceneEdSel.addEventListener('change', () => {
    const s = scenes.find(x => x.id === sceneEdSel.value);
    if (s) {
      sceneEdJson.value = JSON.stringify(s, null, 2);
    } else {
      sceneEdJson.value = '';
    }
  });

  sceneEdCapture.addEventListener('click', () => {
    const name = prompt('Scene Name:', `SCENE ${scenes.length + 1}`);
    if (!name) return;
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const s = captureScene(state, id, name);
    sceneEdJson.value = JSON.stringify(s, null, 2);
    sceneEdSel.value = '';
  });

  sceneEdApply.addEventListener('click', () => {
    try {
      const parsed = JSON.parse(sceneEdJson.value);
      if (parsed && parsed.id) {
        const i = scenes.findIndex(x => x.id === parsed.id);
        if (i >= 0) scenes[i] = parsed;
        else scenes.push(parsed);
        rebuildScenes();
        rebuildSceneEditorSel();
        sceneEdSel.value = parsed.id;
      }
    } catch(e) {
      alert('Invalid JSON: ' + (e as Error).message);
    }
  });

  sceneEditorDrawer.append(
    el('div', { class: 'ed-h vm-h' }, ['SCENE EDITOR']),
    el('div', { style: 'display:flex; gap: 8px;' }, [sceneEdSel, sceneEdCapture]),
    sceneEdJson,
    el('div', { style: 'display:flex; gap: 8px;' }, [sceneEdApply])
  );

  const sceneEdToggle = el('button', { class: 'vm-tbtn', type: 'button' }, ['SCENE EDITOR']);
  sceneEdToggle.addEventListener('click', () => {
    sceneEditorDrawer.style.display = sceneEditorDrawer.style.display === 'none' ? 'flex' : 'none';
  });

  if (effective(def).handedness === 'fixed') dashboard.classList.add('chir-exempt');

  host.append(
    el('div', { class: 'vm-root' }, [
      el('div', { class: 'vm-medock' }, [
        ...meTabs, el('span', { class: 'vm-spacer' }), sceneEdToggle, lmToggle, layoutSel,
      ]),
      lmDrawer,
      sceneEditorDrawer,
      dashboard,
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
  const reg: ParamRegistry = new Map();
  const idxOf = (v: unknown): number => allLabels.indexOf(String(v));
  state.mes.forEach((_, n) => {
    const N = n + 1;
    const bank = (): MEState => state.mes[n]!;
    reg.set(`me.${N}.pgm`, { spec: P.enum(`me.${N}.pgm`, allLabels), apply: (v) => { const i = idxOf(v); if (i >= 0) { bank().pgm = i; sync(); } } });
    reg.set(`me.${N}.pvw`, { spec: P.enum(`me.${N}.pvw`, allLabels), apply: (v) => { const i = idxOf(v); if (i >= 0) { bank().pvw = i; sync(); } } });
    reg.set(`me.${N}.transition`, { spec: P.enum(`me.${N}.transition`, def.transitions), apply: (v) => { if (def.transitions.includes(v as TransitionKind)) { bank().trans = v as TransitionKind; sync(); } } });
    reg.set(`me.${N}.rate`, { spec: P.num(`me.${N}.rate`, 1, 300, 'frames'), apply: (v) => { if (typeof v === 'number') { bank().rate = v; sync(); } } });
    reg.set(`me.${N}.tbar`, { spec: P.num(`me.${N}.tbar`, 0, 100, '%'), apply: (v) => { if (typeof v === 'number') { bank().tbar = v; if (n === delegate) { tbar.value = String(v); pct.textContent = `${Math.round(v)}%`; } } } });
    reg.set(`me.${N}.take`, { spec: P.bool(`me.${N}.take`), apply: (v) => { if (v) doTake(n); } });
    bank().keyers.forEach((_, ki) => {
      const K = ki + 1;
      const kk = (): KeyerState => bank().keyers[ki]!;
      reg.set(`me.${N}.key.${K}.on`, { spec: P.bool(`me.${N}.key.${K}.on`), apply: (v) => { kk().on = !!v; if (n === delegate) rebuildKeyers(); sync(); } });
      reg.set(`me.${N}.key.${K}.type`, { spec: P.enum(`me.${N}.key.${K}.type`, KEYER_TYPES), apply: (v) => { if ((KEYER_TYPES as string[]).includes(String(v))) { kk().type = v as KeyerState['type']; if (n === delegate) rebuildKeyers(); } } });
      reg.set(`me.${N}.key.${K}.source`, { spec: P.enum(`me.${N}.key.${K}.source`, allLabels), apply: (v) => { const i = idxOf(v); if (i >= 0) { kk().source = i; sync(); } } });
      reg.set(`me.${N}.key.${K}.dve`, { spec: P.str(`me.${N}.key.${K}.dve`) });
    });
  });
  def.dsks.forEach((_, i) => {
    reg.set(`dsk.${i + 1}.on`, { spec: P.bool(`dsk.${i + 1}.on`), apply: (v) => { state.dsks[i] = !!v; sync(); } });
  });
  state.auxes.forEach((_, i) => {
    reg.set(`aux.${i + 1}.source`, { spec: P.enum(`aux.${i + 1}.source`, allLabels), apply: (v) => { const x = idxOf(v); if (x >= 0) { state.auxes[i] = x; sync(); } } });
  });
  reg.set('panel.delegate', { spec: P.enum('panel.delegate', state.mes.map((_, i) => `M/E ${i + 1}`)), apply: (v) => { const i = state.mes.findIndex((_, n) => `M/E ${n + 1}` === v); if (i >= 0) { delegate = i; rebuild(); } } });
  reg.set('scene.recall', { spec: P.enum('scene.recall', scenes.map((s) => s.name)), apply: (v) => { const s = scenes.find((x) => x.name === v); if (s) { recallScene(state, s, def); rebuildKeyers(); sync(); } } });
  reg.set('scene.store', { spec: P.str('scene.store') });
  reg.set('tally.program', { spec: P.ro('tally.program') });
  // Legacy aliases → M/E 1 (backward compatibility, plan §9).
  reg.set('pgm', { spec: P.enum('pgm', allLabels), apply: (v) => { const i = idxOf(v); if (i >= 0) { state.mes[0]!.pgm = i; sync(); } } });
  reg.set('pvw', { spec: P.enum('pvw', allLabels), apply: (v) => { const i = idxOf(v); if (i >= 0) { state.mes[0]!.pvw = i; sync(); } } });
  reg.set('transition', { spec: P.enum('transition', def.transitions), apply: (v) => { if (def.transitions.includes(v as TransitionKind)) { state.mes[0]!.trans = v as TransitionKind; sync(); } } });
  reg.set('tbar', { spec: P.num('tbar', 0, 100, '%'), apply: (v) => { if (typeof v === 'number' && delegate === 0) { state.mes[0]!.tbar = v; tbar.value = String(v); pct.textContent = `${Math.round(v)}%`; } } });
  def.dsks.slice(0, 2).forEach((_, i) => {
    reg.set(`dsk${i + 1}`, { spec: P.bool(`dsk${i + 1}`), apply: (v) => { state.dsks[i] = !!v; sync(); } });
  });
  wire(ctx, reg);

  // ---- full rebuild (delegate change) ------------------------------------------------
  function rebuild(): void {
    rebuildBuses();
    rebuildKeyers();
    sync();
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (!host.isConnected) {
      window.removeEventListener('keydown', onKeyDown);
      return;
    }
    const tgt = e.target as HTMLElement;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tgt.tagName)) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      autoBtn.click();
      return;
    }
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      cutBtn.click();
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      tbar.value = Math.max(0, +tbar.value - 5).toString();
      tbar.dispatchEvent(new Event('input'));
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      tbar.value = Math.min(100, +tbar.value + 5).toString();
      tbar.dispatchEvent(new Event('input'));
      return;
    }

    const pgmKeys = ['1','2','3','4','5','6','7','8','9','0','-','='];
    const pvwKeys = ['q','w','e','r','t','y','u','i','o','p','[',']'];
    const dskKeys = ['b','n','m',',','.','/'];

    const pgmIndex = pgmKeys.indexOf(e.key.toLowerCase());
    if (pgmIndex >= 0 && busBtns.pgm[pgmIndex]) {
      e.preventDefault();
      busBtns.pgm[pgmIndex].click();
      return;
    }

    const pvwIndex = pvwKeys.indexOf(e.key.toLowerCase());
    if (pvwIndex >= 0 && busBtns.pvw[pvwIndex]) {
      e.preventDefault();
      busBtns.pvw[pvwIndex].click();
      return;
    }

    const dskIndex = dskKeys.indexOf(e.key.toLowerCase());
    if (dskIndex >= 0 && dskBtns[dskIndex]) {
      e.preventDefault();
      dskBtns[dskIndex].click();
      return;
    }
  };
  window.addEventListener('keydown', onKeyDown);

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

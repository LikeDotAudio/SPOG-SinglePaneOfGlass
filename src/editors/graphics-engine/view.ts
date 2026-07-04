// src/editors/graphics-engine/view — the CONTROL / PLAYOUT surface (audit §6).
//
// Three panes: a rundown RAIL (left), the preview STAGE + transport (centre),
// and a data FIELD editor (right). The twist name selects a mode:
//   GRAPHICS PRESETS → recall saved instances (audit §6 "presets & saved instances")
//   TITLE EDITOR     → the name-super / lower-third authoring subset
//   GRAPHIC EDITOR   → the full template catalog + IN/UPDATE/NEXT/OUT
// The rail is seeded from the routed inputs (ctx.sources) — the presets / graphic
// sets you route in — falling back to the built-in catalog when nothing is routed.

import { el } from '../../ui/dom.js';
import type { EditorContext } from '../types.js';
import { createStage } from './preview.js';
import {
  TEMPLATES, PRESETS, templateById, templateForLabel, presetForLabel, defaults,
  type GfxTemplate, type Values,
} from './templates.js';

export type Mode = 'presets' | 'title' | 'supers' | 'crawl' | 'graphic';

export function modeFor(twistName: string): Mode {
  const n = twistName.toUpperCase();
  if (n.includes('CRAWL')) return 'crawl';
  if (n.includes('SUPER')) return 'supers';
  if (n.includes('PRESET')) return 'presets';
  if (n.includes('TITLE')) return 'title';
  return 'graphic';
}

interface RailEntry { label: string; tpl: GfxTemplate; values: Values; sub: string; }

/** Build the rundown entries for a mode, seeded from routed inputs. */
function railEntries(mode: Mode, ctx: EditorContext): RailEntry[] {
  const labels = ctx.sources.map((f) => f.label);
  if (mode === 'presets') {
    const src = labels.length
      ? labels.map((l) => presetForLabel(l)).filter((p): p is NonNullable<typeof p> => !!p)
      : PRESETS;
    const seen = new Set<string>();
    return src.filter((p) => !seen.has(p.name) && seen.add(p.name)).map((p) => {
      const tpl = templateById(p.templateId) ?? TEMPLATES[0]!;
      return { label: p.name, tpl, values: { ...defaults(tpl), ...p.values }, sub: tpl.name };
    });
  }
  const pool =
    mode === 'crawl' ? TEMPLATES.filter((t) => t.kind === 'ticker')
    : mode === 'supers' ? TEMPLATES.filter((t) => t.kind === 'name-super' || t.kind === 'lower-third')
    : mode === 'title' ? TEMPLATES.filter((t) => t.kind === 'fullscreen' || t.kind === 'lower-third')
    : TEMPLATES;
  const fromRouted = labels.map((l) => templateForLabel(l)).filter((t): t is GfxTemplate => !!t)
    .filter((t) => pool.includes(t));
  const chosen = fromRouted.length ? fromRouted : pool;
  const seen = new Set<string>();
  return chosen.filter((t) => !seen.has(t.id) && seen.add(t.id))
    .map((t) => ({ label: t.name, tpl: t, values: defaults(t), sub: t.kind.toUpperCase() }));
}

export function buildEngine(host: HTMLElement, ctx: EditorContext): void {
  const mode = modeFor(ctx.twist.name);
  const entries = railEntries(mode, ctx);
  // Preselect the template the twist NAME asks for (e.g. a "WEATHER" twist lands
  // on the WEATHER template), else the first rail entry.
  const named = templateForLabel(ctx.twist.name);
  let active: RailEntry | null =
    (named ? entries.find((e) => e.tpl.id === named.id) : undefined) ?? entries[0] ?? null;

  const railHead =
    mode === 'presets' ? 'RUNDOWN' : mode === 'crawl' ? 'CRAWL'
    : mode === 'supers' ? 'SUPERS' : mode === 'title' ? 'TITLES' : 'TEMPLATES';

  // ---- panes ----
  const rail = el('div', { class: 'gfx-rail' });
  const stageWrap = el('div', { class: 'gfx-stage-wrap' });
  const transport = el('div', { class: 'gfx-transport' });
  const statusBar = el('div', { class: 'gfx-status' });
  const fields = el('div', { class: 'gfx-fields' });

  const crawlBox = el('div', { class: 'gfx-crawl', style: 'display:none' });
  const left = el('div', { class: 'gfx-col' }, [el('h4', {}, [railHead]), rail]);
  const centre = el('div', { class: 'gfx-col gfx-center' }, [
    el('h4', {}, [mode === 'presets' ? 'PROGRAM' : 'PREVIEW']),
    stageWrap, transport, statusBar, crawlBox,
  ]);
  const right = el('div', { class: 'gfx-col' }, [
    el('h4', {}, ['DATA FIELDS']), fields,
    el('div', { class: 'gfx-hint' }, ['Edits bind live · UPDATE mutates in-place']),
  ]);
  host.append(el('div', { class: 'gfx' }, [left, centre, right]));

  const stage = createStage(stageWrap, mode === 'presets' ? 'PGM' : 'PVW', ctx.dispose);

  // ---- MQTT projection (audit §4.5 param bridge; no-op without a bus) ----
  ctx.services.advertiseParams?.([
    { name: 'state', type: 'enum', values: ['clear', 'live'], writable: false },
    { name: 'template', type: 'string', writable: false },
    { name: 'reveal', type: 'number', min: 0, writable: false },
  ]);

  // ---- transport ----
  const btnTake = el('button', { class: 'gfx-btn take' }, ['TAKE ▶']);
  const btnUpd = el('button', { class: 'gfx-btn upd' }, ['UPDATE']);
  const btnNext = el('button', { class: 'gfx-btn' }, ['NEXT ⧉']);
  const btnOut = el('button', { class: 'gfx-btn out' }, ['OUT ■']);
  transport.append(btnTake, btnUpd, btnNext, btnOut);

  const dot = el('span', { class: 'gfx-dot' });
  const stateTxt = el('span', {}, ['CLEAR']);
  const revealTxt = el('span', {}, ['']);
  statusBar.append(dot, stateTxt, revealTxt);

  stage.onStateChange((s, reveal, total) => {
    const live = s === 'live';
    dot.className = `gfx-dot${live ? ' live' : ''}`;
    stateTxt.textContent = live ? 'ON AIR' : 'CLEAR';
    revealTxt.textContent = active && total > 1 ? `${reveal} / ${total}` : '';
    btnTake.disabled = !active;
    btnUpd.disabled = !live || !active?.tpl.updatable;
    btnNext.disabled = !live || !active?.tpl.stateful || reveal >= total;
    btnOut.disabled = !live;
    ctx.services.publishParam?.('state', s);
    ctx.services.publishParam?.('reveal', reveal);
  });

  btnTake.onclick = () => { stage.play(); };
  btnUpd.onclick = () => { if (active) stage.update(active.values); };
  btnNext.onclick = () => { stage.next(); };
  btnOut.onclick = () => { stage.out(); };

  // ---- field editor (right) ----
  function renderFields(): void {
    fields.replaceChildren();
    if (!active) { fields.append(el('div', { class: 'gfx-empty' }, ['Select an item.'])); return; }
    const { tpl, values } = active;
    tpl.fields.forEach((f) => {
      let input: HTMLElement;
      if (f.type === 'textarea') {
        input = el('textarea', { value: values[f.key] ?? '', placeholder: f.placeholder ?? '' });
      } else if (f.type === 'select') {
        const sel = el('select', {}, (f.options ?? []).map((o) => el('option', { value: o }, [o]))) as HTMLSelectElement;
        sel.value = values[f.key] ?? f.options?.[0] ?? '';
        input = sel;
      } else {
        input = el('input', { type: 'text', value: values[f.key] ?? '', placeholder: f.placeholder ?? '' });
      }
      const commit = (): void => {
        values[f.key] = (input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
        // Live WYSIWYG: mutate in place if the template supports it, else re-load
        // the definition so the preview reflects edits (a soft re-take when live).
        if (stage.state() === 'live' && tpl.updatable) stage.update(values);
        else stage.load(tpl, values);
      };
      input.oninput = commit;
      if (f.type === 'select') input.onchange = commit;   // selects fire change reliably
      fields.append(el('div', { class: 'gfx-field' }, [el('label', {}, [f.label]), input]));
    });
  }

  // ---- crawl item editor (ticker only): a running list you enable + reorder for NEXT ----
  const crawlItems: Array<{ text: string; enabled: boolean }> = [
    'ROUTING MATRIX ONLINE', 'ALL STAGEBOXES LOCKED', 'PGM CLEAN', 'STANDBY FOR TAKE',
    'REMOTE 1 FRAME-SYNCED', 'LOUDNESS AT -23 LUFS', 'CAM 3 IRIS AUTO', 'ISO REC ARMED',
    'MULTIVIEWER 2 ONLINE', 'INTERCOM CH 4 OPEN',
  ].map((text) => ({ text, enabled: true }));
  // One element per line; the on-air separator char + spacing come from the data
  // fields (sep/gap) and are applied at render time (see templates renderGraphic).
  const composeCrawl = (): string => crawlItems.filter((i) => i.enabled).map((i) => i.text.trim()).filter(Boolean).join('\n');
  const applyCrawl = (): void => {
    if (!active || active.tpl.kind !== 'ticker') return;
    active.values['text'] = composeCrawl();
    if (stage.state() === 'live' && active.tpl.updatable) stage.update(active.values); else stage.load(active.tpl, active.values);
  };
  function renderCrawl(): void {
    crawlBox.replaceChildren(el('div', { class: 'gfx-crawl-h' }, ['Crawl Items · ticked show in NEXT']));
    crawlItems.forEach((it, i) => {
      const cb = el('input', { type: 'checkbox' }) as HTMLInputElement; cb.checked = it.enabled;
      const tx = el('input', { class: 'gfx-crawl-text', type: 'text', value: it.text }) as HTMLInputElement;
      const up = el('button', { class: 'gfx-crawl-mv', title: 'Move up' }, ['↑']);
      const dn = el('button', { class: 'gfx-crawl-mv', title: 'Move down' }, ['↓']);
      const row = el('div', { class: `gfx-crawl-row${it.enabled ? '' : ' off'}` }, [cb, el('span', { class: 'gfx-crawl-n' }, [String(i + 1)]), tx, up, dn]);
      cb.onchange = () => { it.enabled = cb.checked; row.classList.toggle('off', !it.enabled); applyCrawl(); };
      tx.oninput = () => { it.text = tx.value; applyCrawl(); };
      up.onclick = () => { if (i > 0) { const a = crawlItems[i - 1]!, b = crawlItems[i]!; crawlItems[i - 1] = b; crawlItems[i] = a; renderCrawl(); applyCrawl(); } };
      dn.onclick = () => { if (i < crawlItems.length - 1) { const a = crawlItems[i + 1]!, b = crawlItems[i]!; crawlItems[i + 1] = b; crawlItems[i] = a; renderCrawl(); applyCrawl(); } };
      crawlBox.append(row);
    });
  }
  const refreshCrawl = (): void => {
    const on = !!active && active.tpl.kind === 'ticker';
    crawlBox.style.display = on ? '' : 'none';
    if (on) { renderCrawl(); applyCrawl(); }
  };

  // ---- rail selection ----
  function select(entry: RailEntry): void {
    active = entry;
    stage.load(entry.tpl, entry.values);
    ctx.services.publishParam?.('template', entry.tpl.name);
    refreshCrawl();   // compose ticker text first so the fields reflect it
    renderFields();
    syncSel();
  }

  const nodeOf = new Map<RailEntry, HTMLElement>();
  function syncSel(): void {
    nodeOf.forEach((node, e) => node.classList.toggle('sel', e === active));
  }

  if (!entries.length) {
    rail.append(el('div', { class: 'gfx-empty' }, ['No graphics routed. Route a Graphic Set or Preset into this twist.']));
  }
  entries.forEach((entry) => {
    const node = el('div', { class: 'gfx-item' }, [
      el('span', {}, [entry.label]),
      el('span', { class: 'kind' }, [entry.sub]),
    ]);
    node.onclick = () => select(entry);
    nodeOf.set(entry, node);
    rail.append(node);
  });

  // initial state
  if (active) { stage.load(active.tpl, active.values); }
  refreshCrawl();
  renderFields();
  syncSel();
  // prime button disabled-state
  btnTake.disabled = !active; btnUpd.disabled = true; btnNext.disabled = true; btnOut.disabled = true;
}

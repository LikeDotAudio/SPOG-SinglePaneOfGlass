// src/editors/graphics-engine/rail — the rundown RAIL builder (audit §6).
//
// The twist name selects a mode:
//   GRAPHICS PRESETS → recall saved instances (audit §6 "presets & saved instances")
//   TITLE EDITOR     → the name-super / lower-third authoring subset
//   GRAPHIC EDITOR   → the full template catalog + IN/UPDATE/NEXT/OUT
// The rail is seeded from the routed inputs (ctx.sources) — the presets / graphic
// sets you route in — falling back to the built-in catalog when nothing is routed.

import type { EditorContext } from '../types.js';
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

export interface RailEntry { label: string; tpl: GfxTemplate; values: Values; sub: string; }

/** Build the rundown entries for a mode, seeded from routed inputs. */
export function railEntries(mode: Mode, ctx: EditorContext): RailEntry[] {
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

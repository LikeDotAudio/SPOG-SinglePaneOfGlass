// src/editors/vision-mixer/prefs — the operator's presentation preferences.
//
// Plan D9: "config proposes, the operator disposes." The production's SwitcherDef
// sets DEFAULTS (layout, handedness); this module holds the per-device override,
// persisted exactly like twist.chirality / twist.colour. Sibling of chirality.ts.

import type { BusLayout, SwitcherDef } from '../../model/index.js';

export interface VmPrefs {
  layout: BusLayout | 'def';                    // 'def' = follow the production default
  handedness: 'fixed' | 'follow-chirality' | 'def';
}

const KEY = 'twist.vm.prefs';
const DEFAULT: VmPrefs = { layout: 'def', handedness: 'def' };

const LAYOUTS: ReadonlyArray<BusLayout | 'def'> = ['def', 'shift12', 'wide24', 'stack12'];

export function getPrefs(): VmPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<VmPrefs>;
      return {
        layout: LAYOUTS.includes(p.layout as BusLayout) || p.layout === 'def' ? p.layout! : DEFAULT.layout,
        handedness: p.handedness === 'fixed' || p.handedness === 'follow-chirality' || p.handedness === 'def'
          ? p.handedness : DEFAULT.handedness,
      };
    }
  } catch { /* private mode / malformed */ }
  return { ...DEFAULT };
}

export function setPrefs(patch: Partial<VmPrefs>): void {
  const next = { ...getPrefs(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  document.dispatchEvent(new CustomEvent<VmPrefs>('vm-prefs-change', { detail: next }));
}

/** The EFFECTIVE presentation: operator pref if set, else the production default. */
export function effective(def: SwitcherDef): { layout: BusLayout; handedness: 'fixed' | 'follow-chirality' } {
  const p = getPrefs();
  return {
    layout: p.layout === 'def' ? (def.layout ?? 'shift12') : p.layout,
    handedness: p.handedness === 'def' ? (def.handedness ?? 'fixed') : p.handedness,
  };
}

// src/ui/console/authoring-forms — the LCARS form modal, the grab-bag tool roster,
// and the room/container declaration editors for the single-pane AUTHORING layer.
// Split out of authoring.ts to keep each module under the 200-line rule.

import { el } from '../dom.js';
import { commit } from './authoring-commit.js';
import type { Production, TwistConfig, Accepts } from '../../model/index.js';

// ---- the grab-bag: the editor roster as container factories (audit §3A) ------
// Each tool emits a TwistConfig whose `name` an editor's match() will claim, so a
// dropped tool and a hand-typed twist are the same thing. `n` disambiguates repeats.
interface Tool { label: string; make: (n: number) => TwistConfig }
const TOOLS: Tool[] = [
  { label: 'Camera', make: (n) => ({ name: `CAM ${n}`, accepts: 'camera', maxVideo: 1, row: 'cameras', cameraInput: true }) },
  { label: 'Remote', make: (n) => ({ name: `REMOTE ${n}`, accepts: 'camera', maxVideo: 1, row: 'remotes', cameraInput: true }) },
  { label: 'Monitor', make: (n) => ({ name: `Monitor ${n}`, accepts: 'video', maxVideo: 1, monitor: true }) },
  { label: 'Vision Mixer', make: () => ({ name: 'Video Mixer', accepts: 'video', inputs: ['SW 1', 'SW 2', 'SW 3', 'SW 4'] }) },
  { label: 'Multi-Viewer', make: (n) => ({ name: `Multi Viewer ${n}`, accepts: 'both', inputs: ['MV 1', 'MV 2', 'MV 3', 'MV 4'] }) },
  { label: 'ISO Recorder', make: (n) => ({ name: `ISO ${n}`, accepts: 'both', maxVideo: 1, maxAudio: 16, row: 'iso', inputs: ['TRK 1', 'TRK 2'] }) },
  { label: 'Audio Mixer', make: () => ({ name: 'MONITOR CONSOLE', accepts: 'audio', inputs: ['CH 1', 'CH 2', 'CH 3', 'CH 4'] }) },
  { label: 'Audio Positioner', make: () => ({ name: 'AUDIO POSITIONER', accepts: 'audio', inputs: ['CH 1', 'CH 2', 'CH 3', 'CH 4'] }) },
  { label: 'Audio Monitor', make: (n) => ({ name: `Audio Monitor ${n}`, accepts: 'audio', maxAudio: 1, row: 'audiomon' }) },
  { label: 'Intercom', make: () => ({ name: 'Intercom', accepts: 'audio', inputs: ['ICOM 1', 'ICOM 2', 'ICOM 3', 'ICOM 4'] }) },
  { label: 'IFB', make: (n) => ({ name: `IFB ${n}`, accepts: 'audio', maxAudio: 1, row: 'ifb' }) },
  { label: 'Graphics', make: () => ({ name: 'GRAPHICS', accepts: 'both', row: 'graphics', inputs: ['LOWER THIRD', 'NAME SUPER', 'FULL-SCREEN TITLE', 'TICKER'] }) },
  { label: 'Lighting', make: () => ({ name: 'Lighting', accepts: 'both', row: 'lighting' }) },
  { label: 'Signaling', make: () => ({ name: 'Tally', accepts: 'both', row: 'signaling' }) },
  { label: 'Encoder', make: () => ({ name: 'Encoder', accepts: 'both' }) },
];

// ---- tiny LCARS form modal --------------------------------------------------
type FieldKind = 'text' | 'color' | 'number' | 'select' | 'list';
interface Field { key: string; label: string; kind: FieldKind; value: string; options?: string[]; hint?: string }

function openForm(title: string, fields: Field[], onSave: (v: Record<string, string>) => void): void {
  const inputs: Record<string, HTMLInputElement | HTMLSelectElement> = {};
  const body = el('div', { class: 'auth-modal' }, [el('h3', {}, [title])]);
  for (const f of fields) {
    let input: HTMLInputElement | HTMLSelectElement;
    if (f.kind === 'select') {
      input = el('select', {}, (f.options ?? []).map((o) => {
        const opt = el('option', { value: o }, [o || '(none)']);
        if (o === f.value) opt.selected = true;
        return opt;
      }));
    } else {
      input = el('input', {
        type: f.kind === 'color' ? 'color' : f.kind === 'number' ? 'number' : 'text',
        value: f.value,
      });
    }
    inputs[f.key] = input;
    const field = el('div', { class: 'auth-field' }, [el('label', {}, [f.label]), input]);
    body.append(field);
    if (f.hint) body.append(el('div', { class: 'auth-hint' }, [f.hint]));
  }
  const bg = el('div', { class: 'auth-modal-bg' }, [body]);
  const cancel = el('button', { class: 'cancel' }, ['Cancel']);
  const ok = el('button', { class: 'ok' }, ['Save']);
  body.append(el('div', { class: 'rowbtn' }, [cancel, ok]));
  const closeModal = (): void => bg.remove();
  cancel.onclick = closeModal;
  bg.onclick = (e): void => { if (e.target === bg) closeModal(); };
  ok.onclick = (): void => {
    const out: Record<string, string> = {};
    for (const k of Object.keys(inputs)) out[k] = inputs[k]!.value;
    closeModal();
    onSave(out);
  };
  document.body.append(bg);
}

// comma-list <-> string[] helpers
const toList = (s: string): string[] => s.split(',').map((x) => x.trim()).filter(Boolean);
const fromList = (a?: string[]): string => (a ?? []).join(', ');
const numOrUndef = (s: string): number | undefined => { const n = parseInt(s, 10); return Number.isFinite(n) ? n : undefined; };

// ---- the room-level forms ---------------------------------------------------
export function editRoom(pgm: Production, url: string, rerender: () => void): void {
  openForm('Edit Room / Production', [
    { key: 'name', label: 'Name', kind: 'text', value: pgm.name ?? '' },
    { key: 'color', label: 'Colour', kind: 'color', value: pgm.color ?? '#ffaa00' },
    { key: 'status', label: 'Status', kind: 'select', value: pgm.status ?? 'OK', options: ['OK', 'FAULT', 'OFFLINE', 'STANDBY'] },
  ], (v) => {
    commit(pgm, url, rerender, () => `room set to "${pgm.name}" · ${pgm.status}`, () => {
      pgm.name = v.name ?? pgm.name;
      pgm.color = (v.color as Production['color']) ?? pgm.color;
      pgm.status = v.status || 'OK';
    });
  });
}

export function editTwist(pgm: Production, idx: number, url: string, rerender: () => void): void {
  if (!pgm.twists || !pgm.twists[idx]) return;
  const cur = pgm.twists[idx];
  const cfg: TwistConfig = typeof cur === 'string' ? { name: cur } : { ...cur };
  openForm(`Edit Container — ${cfg.name}`, [
    { key: 'name', label: 'Name', kind: 'text', value: cfg.name ?? '', hint: 'The name decides which editor (tool) opens on click.' },
    { key: 'accepts', label: 'Accepts', kind: 'select', value: cfg.accepts ?? '', options: ['', 'video', 'audio', 'both', 'camera'] },
    { key: 'row', label: 'Row / band', kind: 'select', value: cfg.row ?? '', options: ['', 'cameras', 'remotes', 'monitors', 'iso', 'graphics', 'speaker', 'audiomon', 'ifb', 'lighting', 'signaling'] },
    { key: 'maxVideo', label: 'Max video', kind: 'number', value: cfg.maxVideo != null ? String(cfg.maxVideo) : '' },
    { key: 'maxAudio', label: 'Max audio', kind: 'number', value: cfg.maxAudio != null ? String(cfg.maxAudio) : '' },
    { key: 'inputs', label: 'Inputs (comma-separated)', kind: 'list', value: fromList(cfg.inputs) },
    { key: 'backup', label: 'Backup / secondary feeds (comma-separated)', kind: 'list', value: fromList(cfg.backup?.inputs), hint: 'Failover sources used when the primary faults (audit §6).' },
    { key: 'backupMode', label: 'Backup mode', kind: 'select', value: cfg.backup?.mode ?? 'warm', options: ['hot', 'warm', 'manual'] },
  ], (v) => {
    commit(pgm, url, rerender, () => `container "${v.name || cfg.name}" edited`, () => {
      const next: TwistConfig = { ...cfg, name: v.name || cfg.name };
      next.accepts = (v.accepts || undefined) as Accepts | undefined;
      next.row = v.row || undefined;
      next.maxVideo = numOrUndef(v.maxVideo ?? '');
      next.maxAudio = numOrUndef(v.maxAudio ?? '');
      const inputs = toList(v.inputs ?? '');
      next.inputs = inputs.length ? inputs : undefined;
      const backup = toList(v.backup ?? '');
      next.backup = backup.length ? { inputs: backup, mode: (v.backupMode as 'hot' | 'warm' | 'manual') } : undefined;
      pgm.twists![idx] = next;
    });
  });
}

/** The grab-bag: pick a tool → append a container to the room (audit §3A / §8). */
export function addContainer(pgm: Production, url: string, rerender: () => void): void {
  const body = el('div', { class: 'auth-modal' }, [el('h3', {}, ['Add Container — Grab Bag'])]);
  const bg = el('div', { class: 'auth-modal-bg' }, [body]);
  const palette = el('div', { class: 'auth-palette' });
  const nextN = (base: string): number => {
    const stem = base.replace(/\s*\d+$/, '');
    const used = (pgm.twists ?? []).map((t) => (typeof t === 'string' ? t : t.name))
      .filter((nm) => nm.replace(/\s*\d+$/, '') === stem).length;
    return used + 1;
  };
  for (const tool of TOOLS) {
    const chip = el('div', { class: 'tool' }, [tool.label]);
    chip.onclick = (): void => {
      const cfg = tool.make(nextN(tool.make(1).name));
      bg.remove();
      commit(pgm, url, rerender, () => `added container "${cfg.name}"`, () => {
        pgm.twists = [...(pgm.twists ?? []), cfg];
      });
    };
    palette.append(chip);
  }
  body.append(palette);
  const cancel = el('button', { class: 'cancel' }, ['Close']);
  body.append(el('div', { class: 'rowbtn' }, [cancel]));
  cancel.onclick = (): void => bg.remove();
  bg.onclick = (e): void => { if (e.target === bg) bg.remove(); };
  document.body.append(bg);
}

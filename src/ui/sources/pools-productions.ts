// src/ui/sources/pools-productions — the PRODUCTIONS-as-source pool renderer
// (port of renderProductionInputs, extracted from pools.ts). No behaviour change.
import { addStyles } from '../dom.js';
import type { SourceLeaf, ProductionBox } from '../../model/index.js';
import { slugId } from './format.js';
import { wireFold } from './pools-fold.js';

// ---- PRODUCTIONS-as-source pool (port of renderProductionInputs) ------------
const DEFAULT_OUTPUTS: { video: string[]; audio: string[]; intercom: string[]; control: string[] } = {
  video: ['AUX 1', 'AUX 2', 'MV 1', 'PROGRAM'],
  audio: ['MAIN MIX', 'MIX MINUS 1', 'MIX MINUS 2', 'MIX MINUS 3', 'MIX MINUS 4'],
  intercom: ['IFB OUT 1', 'IFB OUT 2', 'IFB OUT 3', 'IFB OUT 4'],
  control: ['LIGHTING', 'SIGNALING', 'CLOCK SYNC', 'DUAL COUNTER', 'STOPWATCH', 'CHAT ROOM'],
};

// A production source fans out MANY feeds (per box: a video + its audio, plus the
// odd control feed). Grouping them by KIND — all VIDEO together, all AUDIO together,
// CONTROL last — lets an op grab every video (or every audio) without hunting box by
// box, and matches how they route: video to video dests, audio to audio dests.
const PROD_SRC_CAT_CSS = `
.prod-src-cat{font-size:9px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;
  opacity:.8;margin:9px 2px 5px;padding-left:2px;}
.prod-src-cat:first-child{margin-top:2px;}`;

export function renderProductionInputs(data: SourceLeaf, container: HTMLElement): void {
  const color = data.color || '#7CFC00';
  const outs = data.outputs || {};
  const group = document.createElement('div');
  group.className = 'input-group';
  // Collect by KIND (not by box), so each category renders as one contiguous grid.
  const vids: string[] = [], auds: string[] = [], ctrls: string[] = [];
  const vNode = (label: string, id: string, orig: string): string =>
    `<div class="signal-node video video-main" draggable="true" data-origin="${orig}" id="${id}" style="border-color:${color};color:${color};">${label}</div>`;
  const aNode = (label: string, id: string, orig: string, cls = 'audio-studio'): string =>
    `<div class="signal-node audio ${cls}" draggable="true" data-origin="${orig}" id="${id}">${label}</div>`;
  const cNode = (label: string, id: string, orig: string): string =>
    `<div class="signal-node control" draggable="true" data-origin="${orig}" id="${id}">${label}</div>`;

  if (Array.isArray(data.boxes)) {
    data.boxes.forEach((box: ProductionBox) => {
      const bid = `prodsrc-${data.id}-${slugId(box.name)}`, orig = `${data.name} — ${box.name}`;
      if (box.video !== false) vids.push(vNode(`${box.name} V`, `${bid}-v`, orig));
      (box.audio ?? []).forEach((a) => auds.push(aNode(`${box.name} ${a}`, `${bid}-${slugId(a)}`, orig)));
      (box.control ?? []).forEach((cc) => ctrls.push(cNode(`${box.name} ${cc}`, `${bid}-${slugId(cc)}`, orig)));
    });
  } else {
    (outs.video ?? DEFAULT_OUTPUTS.video).forEach((o) => vids.push(vNode(`${data.name} ${o}`, `prodsrc-${data.id}-${slugId(o)}`, data.name)));
    (outs.audio ?? DEFAULT_OUTPUTS.audio).forEach((o) => auds.push(aNode(`${data.name} ${o}`, `prodsrc-${data.id}-${slugId(o)}`, data.name)));
    (outs.intercom ?? DEFAULT_OUTPUTS.intercom).forEach((o) => auds.push(aNode(`${data.name} ${o}`, `prodsrc-${data.id}-${slugId(o)}`, data.name, 'audio-comms')));
    ((outs as { control?: string[] }).control ?? DEFAULT_OUTPUTS.control).forEach((o) => ctrls.push(cNode(`${data.name} ${o}`, `prodsrc-${data.id}-${slugId(o)}`, data.name)));
  }

  // Each category is a labelled sub-section (only if it has feeds); video uses the
  // 2-col video grid, audio + control the 3-col audio grid — matching their shapes.
  const section = (label: string, gridClass: string, nodes: string[]): string =>
    nodes.length ? `<div class="prod-src-cat" style="color:${color}">${label}</div><div class="${gridClass}">${nodes.join('')}</div>` : '';

  group.innerHTML = `
    <div class="foldable-header signal-node multiplex production" draggable="true" id="prodsrc-${data.id}-bundle" data-origin="${data.name}" style="--lcars-color: ${color}; background-color: ${color}; font-size: 11px; margin-bottom: 4px;">
      <span>${data.name}</span>
      <span class="fold-icon" style="transform: rotate(-90deg); display: inline-block; transition: transform 0.2s;">▼</span>
    </div>
    <div class="pool-content" style="display: none;">
      ${section('Video', 'input-grid-video', vids)}
      ${section('Audio', 'input-grid-audio', auds)}
      ${section('Control', 'input-grid-audio', ctrls)}
    </div>`;
  container.appendChild(group);
  wireFold(group);
  addStyles('prod-src-cat', PROD_SRC_CAT_CSS);
}

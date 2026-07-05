// src/ui/sources/pools-video — the VIDEO pool renderer + camera-multiplex fill
// (extracted from pools.ts). fillVideoCameras is re-exported by pools.ts because
// gang.ts consumes it. No behaviour change.
import { addStyles } from '../dom.js';
import type { SourceLeaf } from '../../model/index.js';
import { isFaultStatus } from '../../domain/routing-core/index.js';
import { slugId, faultTag, monoEmoji, styleSignalNode, shadeColor } from './format.js';
import { wireFold, tagOrigin } from './pools-fold.js';

// A prompter feed reads as a beam-splitter/prompter-glass silhouette (angled
// trapezoid hood) so it is instantly distinguishable from a plain video node,
// both in the source pool and once dropped onto a twist.
const PROMPTER_NODE_CSS = `
.signal-node.prompter-source{
  clip-path:polygon(10% 0,90% 0,100% 100%,0 100%);
  border-radius:0 !important;padding-left:16px;padding-right:16px;
  text-align:center;letter-spacing:.5px;position:relative;}
.signal-node.prompter-source::before{
  content:'';position:absolute;left:12%;right:12%;top:5px;height:2px;
  background:currentColor;opacity:.45;pointer-events:none;}`;

// A clock feed reads as a round clock badge — a circular ⌚ face glyph at the head
// so a time source is instantly distinguishable from a plain video/graphics node,
// both in the pool and once dropped onto a twist.
const CLOCK_NODE_CSS = `
.signal-node.clock-source{
  border-radius:16px !important;padding-left:30px;text-align:left;letter-spacing:.5px;
  position:relative;font-variant-numeric:tabular-nums;}
.signal-node.clock-source::before{
  content:'◷';position:absolute;left:9px;top:50%;transform:translateY(-50%);
  font-size:14px;line-height:1;opacity:.9;pointer-events:none;}
.signal-node.chronos-source{
  border-radius:16px !important;padding-left:30px;text-align:left;letter-spacing:.5px;
  position:relative;font-variant-numeric:tabular-nums;}
.signal-node.chronos-source::before{
  content:'⏱';position:absolute;left:8px;top:50%;transform:translateY(-50%);
  font-size:14px;line-height:1;opacity:.9;pointer-events:none;}
.signal-node.timer-source{
  border-radius:16px !important;padding-left:30px;text-align:left;letter-spacing:.5px;
  position:relative;font-variant-numeric:tabular-nums;}
.signal-node.timer-source::before{
  content:'⏲';position:absolute;left:8px;top:50%;transform:translateY(-50%);
  font-size:14px;line-height:1;opacity:.9;pointer-events:none;}`;

// ---- VIDEO pool -------------------------------------------------------------
/** Build `count` camera multiplex boxes (video + 4 audio + camera-control) into grid. */
export function fillVideoCameras(
  grid: HTMLElement, prefix: string, count: number, extraClass: string, color: string, status?: string,
): void {
  const poolColor = color || '#CC99CC';
  const faulted = isFaultStatus(status);
  for (let i = 1; i <= count; i++) {
    const id = prefix + i.toString().padStart(2, '0');
    const node = document.createElement('div');
    node.className = `signal-node video multiplex ${extraClass}`;
    node.id = 'pool-' + id;
    node.draggable = true;
    node.innerHTML = `
      <div class="multiplex-header">${id}</div>
      <div class="multiplex-children" style="display: none;">
        <div class="signal-node video ${extraClass} sub-stream" draggable="true" id="pool-${id}-V">${id}-V</div>
        <div class="signal-node audio audio-studio sub-stream" draggable="true" id="pool-${id}-A1">${id}-A1</div>
        <div class="signal-node audio audio-studio sub-stream" draggable="true" id="pool-${id}-A2">${id}-A2</div>
        <div class="signal-node audio audio-studio sub-stream" draggable="true" id="pool-${id}-A3">${id}-A3</div>
        <div class="signal-node audio audio-studio sub-stream" draggable="true" id="pool-${id}-A4">${id}-A4</div>
        <div class="signal-node camera-control sub-stream" draggable="true" id="pool-${id}-CC">${id}-CC</div>
      </div>`;
    styleSignalNode(node, poolColor);
    node.style.borderColor = shadeColor(poolColor, ((i % 4) * 14) - 21);
    const vSub = node.querySelector<HTMLElement>(`#pool-${id}-V`);
    if (vSub) styleSignalNode(vSub, poolColor);
    node.dataset.status = status || 'OK';
    node.querySelectorAll<HTMLElement>('.sub-stream').forEach((sub) => {
      sub.dataset.status = faulted ? (status ?? 'OK') : 'OK';
      if (faulted) sub.classList.add('fault');
    });
    if (faulted) node.classList.add('fault');
    grid.appendChild(node);
  }
}

export function renderVideoPool(data: SourceLeaf, container: HTMLElement): void {
  const faulted = isFaultStatus(data.status);
  const group = document.createElement('div');
  group.className = 'input-group';
  group.innerHTML = `
    <div class="foldable-header${faulted ? ' fault' : ''}" title="${data.status || 'OK'}" style="--lcars-color: ${data.color || 'var(--lcars-color)'}; font-size: 11px; margin-bottom: 4px;">
      <span>${monoEmoji(data.name)}${data.name}${faultTag(data.status)}</span>
      <span class="fold-icon" style="transform: rotate(-90deg); display: inline-block; transition: transform 0.2s;">▼</span>
    </div>
    <div class="input-grid-video pool-content" id="${data.id}" style="display: none;"></div>`;
  container.appendChild(group);
  wireFold(group);
  const grid = group.querySelector<HTMLElement>('.pool-content');
  if (grid) {
    // Named video feeds (e.g. a teleprompter engine's prompt-head / confidence /
    // clean-program renders — one playhead, many synchronised outputs) live in the
    // dedicated `video[]` field (kept SEPARATE from audio `items[]`) and render as
    // plain draggable video nodes; otherwise fall back to the camera-stack fill.
    if (data.video && data.video.length > 0) {
      const poolColor = data.color || '#CC99CC';
      addStyles('prompter-node-shape', PROMPTER_NODE_CSS);
      addStyles('clock-node-shape', CLOCK_NODE_CSS);
      // (clock-node-shape carries both clock-source and chronos-source rules)
      data.video.forEach((label) => {
        const node = document.createElement('div');
        node.className = `signal-node video ${data.extraClass ?? ''}`;
        node.innerText = label;
        node.id = `pool-${data.id}-${slugId(label)}`;
        node.draggable = true;
        styleSignalNode(node, poolColor);
        node.dataset.status = data.status || 'OK';
        if (faulted) node.classList.add('fault');
        grid.appendChild(node);
      });
    } else {
      fillVideoCameras(grid, data.prefix ?? '', data.count ?? 0, data.extraClass ?? '', data.color ?? '', data.status);
    }
    tagOrigin(grid, data.origin || data.name);
  }
}

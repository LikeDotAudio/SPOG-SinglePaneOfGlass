// src/ui/sources/pools — the per-leaf source pool renderers, ported from
// js/pool{Video,Audio,Playout,Streams}.js + productions.js. The renderer for a
// leaf is chosen from its SHAPE (inferPoolKind), not its folder — so dropping a
// new file into Routes/Sources/** makes it appear with zero code edits.
//
// Ported faithfully (same class names, ids, data-origin, DOM) because the LCARS
// CSS is SHARED with the live app. The one behavioural change: the legacy inline
// onclick="togglePool(this)" (a window global) is replaced by an addEventListener
// — no window.* globals in the TS build.
import { addStyles } from '../dom.js';
import type { Hex, PoolKind, SourceLeaf, PlayoutPlayer, PlayoutVideo, ProductionBox, StreamDef } from '../../model/index.js';
import { isFaultStatus } from '../../domain/routing-core/index.js';
import { slugId, faultTag, monoEmoji, styleSignalNode, shadeColor } from './format.js';
import { makeMediaGroup } from './media-group.js';

// ---- fold behaviour (port of js/globals.js togglePool) ----------------------
export function togglePool(header: HTMLElement): void {
  const content = header.nextElementSibling as HTMLElement | null;
  if (!content) return;
  const icon = header.querySelector<HTMLElement>('.fold-icon');
  const isOpening = content.style.display === 'none';
  const parent = header.closest('.super-pool-content');
  if (parent && isOpening) {
    parent.querySelectorAll<HTMLElement>('.pool-content').forEach((c) => {
      c.style.display = 'none';
      const prevIcon = c.previousElementSibling?.querySelector<HTMLElement>('.fold-icon');
      if (prevIcon) prevIcon.style.transform = 'rotate(-90deg)';
    });
  }
  content.style.display = isOpening ? '' : 'none';
  if (icon) icon.style.transform = isOpening ? 'rotate(0deg)' : 'rotate(-90deg)';
}

/** Wire a pool group's own foldable header to the accordion toggle. */
function wireFold(group: HTMLElement): void {
  const header = group.querySelector<HTMLElement>(':scope > .foldable-header');
  if (header) header.addEventListener('click', () => togglePool(header));
}

const tagOrigin = (root: ParentNode, origin: string): void => {
  root.querySelectorAll<HTMLElement>('.signal-node').forEach((n) => { n.dataset.origin = origin; });
};

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
    <div class="foldable-header${faulted ? ' fault' : ''}" title="${data.status || 'OK'}" style="--lcars-color: ${data.color || 'var(--lcars-color)'}; font-size: 11px; margin-bottom: 8px;">
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

// ---- AUDIO pool -------------------------------------------------------------
export function renderAudioPool(data: SourceLeaf, container: HTMLElement, color?: string): void {
  const poolColor = color || data.color || '#00ffff';
  const faulted = isFaultStatus(data.status);
  const group = document.createElement('div');
  group.className = 'input-group';
  group.innerHTML = `
    <div class="foldable-header${faulted ? ' fault' : ''}" title="${data.status || 'OK'}" style="--lcars-color: ${poolColor}; background-color: ${poolColor}; font-size: 11px; margin-bottom: 8px;">
      <span>${monoEmoji(data.name)}${data.name}${faultTag(data.status)}</span>
      <span class="fold-icon" style="transform: rotate(-90deg); display: inline-block; transition: transform 0.2s;">▼</span>
    </div>
    <div class="input-grid-audio pool-content" id="${data.id}" style="display: none;"></div>`;
  container.appendChild(group);
  wireFold(group);
  const grid = group.querySelector<HTMLElement>('.pool-content');
  if (!grid) return;
  const mk = (label: string, id: string): void => {
    const node = document.createElement('div');
    node.className = `signal-node audio ${data.extraClass ?? ''}`;
    node.innerText = label;
    node.id = id;
    node.draggable = true;
    styleSignalNode(node, poolColor);
    node.dataset.status = data.status || 'OK';
    if (faulted) node.classList.add('fault');
    grid.appendChild(node);
  };
  if (data.items && data.items.length > 0) {
    data.items.forEach((item) => mk(item, `pool-${data.id}-${slugId(item)}`));
  } else {
    for (let i = 1; i <= (data.count ?? 0); i++) {
      const num = i.toString().padStart(2, '0');
      mk(`${data.prefix ?? ''}${num}`, `pool-${data.prefix ?? ''}${num}`);
    }
  }
  tagOrigin(grid, data.origin || data.name);
}

// ---- PERSON pool ------------------------------------------------------------
// A declared Person, once processed, is a routable SOURCE. Its audio (mic /
// processed / IFB return) and video (camera) feeds are rendered as FLAT, sibling
// signal-nodes — never a multiplex where video "contains" audio — so audio routes
// to audio destinations and video to video destinations independently. An ISO
// recorder (accepts:"both") is the one place both of a person's feeds can co-land.
export function renderPersonPool(data: SourceLeaf, container: HTMLElement, color?: string): void {
  const poolColor = color || data.color || '#F2B74B';
  const faulted = isFaultStatus(data.status);
  const origin = data.origin || data.name;
  const group = document.createElement('div');
  group.className = 'input-group';
  group.innerHTML = `
    <div class="foldable-header${faulted ? ' fault' : ''}" title="${data.status || 'OK'}" style="--lcars-color: ${poolColor}; background-color: ${poolColor}; font-size: 11px; margin-bottom: 8px;">
      <span>${monoEmoji(data.name)}${data.name}${faultTag(data.status)}</span>
      <span class="fold-icon" style="transform: rotate(-90deg); display: inline-block; transition: transform 0.2s;">▼</span>
    </div>
    <div class="input-grid-audio pool-content" id="${data.id}" style="display: none;"></div>`;
  container.appendChild(group);
  wireFold(group);
  const grid = group.querySelector<HTMLElement>('.pool-content');
  if (!grid) return;
  const mk = (label: string, kind: 'audio' | 'video', extra: string): void => {
    const node = document.createElement('div');
    node.className = `signal-node ${kind} ${extra}`;
    node.innerText = label;
    node.id = `pool-${data.id}-${slugId(label)}`;
    node.draggable = true;
    node.dataset.origin = origin;
    styleSignalNode(node, poolColor);
    node.dataset.status = data.status || 'OK';
    if (faulted) node.classList.add('fault');
    grid.appendChild(node);
  };
  // Video (camera) feeds first, then audio — separate, flat siblings. Feeds come
  // from the unified `source{audio,video}` projection (falling back to the legacy
  // flat items[]/video[]). Every person has a camera: default to one CAM if none
  // declared, so the person is routable to video destinations independent of mic.
  const audioFeeds = data.source?.audio ?? data.items ?? [];
  const declaredVideo = (data.source?.video && data.source.video.length ? data.source.video : data.video) ?? [];
  const videos = declaredVideo.length ? declaredVideo : ['CAM'];
  videos.forEach((label) => mk(label, 'video', data.extraClass?.includes('video') ? data.extraClass : 'video-person'));
  audioFeeds.forEach((label) => mk(label, 'audio', 'audio-person'));
}

// ---- PLAYOUT pool -----------------------------------------------------------
function buildPlayoutVideoNode(video: PlayoutVideo, color: string, origin: string): HTMLElement {
  const vid = video.id;
  const vLabel = video.stack?.video || 'V';
  const audio = video.stack?.audio?.length ? video.stack.audio : ['A1', 'A2', 'A3', 'A4'];
  const node = document.createElement('div');
  node.className = 'signal-node video multiplex playout-video';
  node.id = 'pool-' + vid;
  node.draggable = true;
  node.dataset.origin = origin;
  let subs = `<div class="signal-node video sub-stream" draggable="true" id="pool-${vid}-V">${video.name} ${vLabel}</div>`;
  audio.forEach((a, i) => {
    subs += `<div class="signal-node audio audio-studio sub-stream" draggable="true" id="pool-${vid}-A${i + 1}">${video.name} ${a}</div>`;
  });
  node.innerHTML = `<div class="multiplex-header">${video.name}</div><div class="multiplex-children" style="display: none;">${subs}</div>`;
  styleSignalNode(node, color);
  const vSub = node.querySelector<HTMLElement>(`#pool-${vid}-V`);
  if (vSub) styleSignalNode(vSub, color);
  node.querySelectorAll<HTMLElement>('.sub-stream').forEach((s) => { s.dataset.origin = origin; });
  node.dataset.status = 'OK';
  return node;
}

export function renderPlayoutPool(data: SourceLeaf, container: HTMLElement): void {
  const color = data.color || '#646DCC';
  const players: PlayoutPlayer[] = Array.isArray(data.players) ? data.players : [];
  const group = document.createElement('div');
  group.className = 'input-group';
  group.innerHTML = `
    <div class="foldable-header" style="--lcars-color: ${color}; background-color: ${color}; font-size: 11px; margin-bottom: 8px;">
      <span>${monoEmoji(data.name)}${data.name}</span>
      <span class="fold-icon" style="transform: rotate(-90deg); display: inline-block; transition: transform 0.2s;">▼</span>
    </div>
    <div class="pool-content" id="${data.id}" style="display: none;"></div>`;
  container.appendChild(group);
  wireFold(group);
  const content = group.querySelector<HTMLElement>('.pool-content');
  if (!content) return;
  players.forEach((player) => {
    const origin = `${data.name} — ${player.name}`;
    const playerContent = makeMediaGroup(content, player.name, color, 0);
    const grid = document.createElement('div');
    grid.className = 'input-grid-video';
    (player.videos ?? []).forEach((video) => grid.appendChild(buildPlayoutVideoNode(video, color, origin)));
    playerContent.appendChild(grid);
  });
}

// ---- PRODUCTIONS-as-source pool (port of renderProductionInputs) ------------
const DEFAULT_OUTPUTS = {
  video: ['AUX 1', 'AUX 2', 'MV 1', 'PROGRAM'],
  audio: ['MAIN MIX', 'MIX MINUS 1', 'MIX MINUS 2', 'MIX MINUS 3', 'MIX MINUS 4'],
  intercom: ['IFB OUT 1', 'IFB OUT 2', 'IFB OUT 3', 'IFB OUT 4'],
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
  }

  // Each category is a labelled sub-section (only if it has feeds); video uses the
  // 2-col video grid, audio + control the 3-col audio grid — matching their shapes.
  const section = (label: string, gridClass: string, nodes: string[]): string =>
    nodes.length ? `<div class="prod-src-cat" style="color:${color}">${label}</div><div class="${gridClass}">${nodes.join('')}</div>` : '';

  group.innerHTML = `
    <div class="foldable-header" style="--lcars-color: ${color}; background-color: ${color}; font-size: 11px; margin-bottom: 8px;">
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

// ---- STREAMS pool (port of js/poolStreams.js) -------------------------------
const STREAM_CSS = `
.signal-node.stream-node .stream-link{display:block;font-size:9px;letter-spacing:.5px;
    color:#9fb6cc;text-decoration:none;padding:3px 4px;margin-top:2px;word-break:break-all;
    background:rgba(0,0,0,.35);border-radius:3px;}
.signal-node.stream-node .stream-link:hover{color:#fff;text-decoration:underline;}`;

function buildStreamNode(stream: StreamDef, color: string, origin: string): HTMLElement {
  const sid = stream.id || slugId(stream.name);
  const url = stream.url || '';
  const left = stream.left || 'L', right = stream.right || 'R';
  const node = document.createElement('div');
  node.className = 'signal-node video multiplex stream-node';
  node.id = 'pool-' + sid;
  node.draggable = true;
  node.dataset.origin = origin;
  node.dataset.url = url;
  node.dataset.status = 'OK';
  if (url) node.title = url;
  const subs =
    `<div class="signal-node video sub-stream" draggable="true" id="pool-${sid}-V">${stream.name} VIDEO</div>` +
    `<div class="signal-node audio audio-studio sub-stream" draggable="true" id="pool-${sid}-L">${stream.name} ${left}</div>` +
    `<div class="signal-node audio audio-studio sub-stream" draggable="true" id="pool-${sid}-R">${stream.name} ${right}</div>`;
  node.innerHTML = `
    <div class="multiplex-header">${stream.name}</div>
    <div class="multiplex-children" style="display: none;">
      ${subs}
      ${url ? `<a class="stream-link" href="${url}" target="_blank" rel="noopener">▶ ${url}</a>` : ''}
    </div>`;
  styleSignalNode(node, color);
  const vSub = node.querySelector<HTMLElement>(`#pool-${sid}-V`);
  if (vSub) styleSignalNode(vSub, color);
  node.querySelectorAll<HTMLElement>('.sub-stream').forEach((s) => { s.dataset.origin = origin; s.dataset.url = url; });
  const link = node.querySelector<HTMLElement>('.stream-link');
  if (link) link.addEventListener('click', (e) => e.stopPropagation());
  return node;
}

export function renderStreamsPool(data: SourceLeaf, container: HTMLElement): void {
  const color = data.color || '#C864C8';
  const streams: StreamDef[] = Array.isArray(data.streams) ? data.streams : [];
  const group = document.createElement('div');
  group.className = 'input-group';
  group.innerHTML = `
    <div class="foldable-header" style="--lcars-color: ${color}; background-color: ${color}; font-size: 11px; margin-bottom: 8px;">
      <span>${monoEmoji(data.name)}${data.name}</span>
      <span class="fold-icon" style="transform: rotate(-90deg); display: inline-block; transition: transform 0.2s;">▼</span>
    </div>
    <div class="pool-content" id="${data.id}" style="display: none;"></div>`;
  container.appendChild(group);
  wireFold(group);
  const content = group.querySelector<HTMLElement>('.pool-content');
  if (!content) return;
  const grid = document.createElement('div');
  grid.className = 'input-grid-video';
  streams.forEach((stream) => grid.appendChild(buildStreamNode(stream, color, `${data.name} — ${stream.name}`)));
  content.appendChild(grid);
  addStyles('stream-pool-styles', STREAM_CSS);
}

// ---- shape → renderer dispatch ---------------------------------------------
export function inferPoolKind(data: SourceLeaf | null | undefined): PoolKind {
  if (!data || typeof data !== 'object') return 'video';
  if (Array.isArray(data.players)) return 'playout';
  if ((data.outputs && typeof data.outputs === 'object') || Array.isArray(data.boxes)) return 'productions';
  if (Array.isArray(data.streams)) return 'streams';
  const ec = (data.extraClass || '').toLowerCase();
  // A Person leaf carries BOTH audio (items) and video (camera) feeds, kept
  // separate — its own renderer emits them as flat, independent nodes. Detect it
  // by the person extraClass, or by carrying both a video[] AND an audio items[]
  // (a video-ONLY leaf like a teleprompter engine is NOT a person → see below).
  if (data.source && typeof data.source === 'object') return 'person';   // unified person model
  if (ec.includes('person') || (Array.isArray(data.video) && Array.isArray(data.items))) return 'person';
  // Explicit video wins over the items→audio default: a source can declare its
  // named VIDEO feeds (e.g. a teleprompter engine's prompt-head / confidence /
  // clean-program outputs) in `video[]` via kind:"video" or a "…video…" extraClass.
  if (data.kind === 'video' || ec.includes('video') || Array.isArray(data.video)) return 'video';
  if (ec.includes('audio') || Array.isArray(data.items)) return 'audio';
  return 'video';
}

export function renderSourceLeaf(data: SourceLeaf, container: HTMLElement, kind: PoolKind, color: Hex): void {
  if (kind === 'playout') return renderPlayoutPool(data, container);
  if (kind === 'productions') return renderProductionInputs(data, container);
  if (kind === 'streams') return renderStreamsPool(data, container);
  if (kind === 'person') return renderPersonPool(data, container, color);
  if (kind === 'audio') return renderAudioPool(data, container, color);
  return renderVideoPool(data, container);
}

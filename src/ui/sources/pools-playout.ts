// src/ui/sources/pools-playout — the PLAYOUT + STREAMS pool renderers and their
// node builders (extracted from pools.ts). No behaviour change.
import { addStyles } from '../dom.js';
import type { SourceLeaf, PlayoutPlayer, PlayoutVideo, StreamDef } from '../../model/index.js';
import { slugId, monoEmoji, styleSignalNode } from './format.js';
import { makeMediaGroup } from './media-group.js';
import { wireFold } from './pools-fold.js';

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
    <div class="foldable-header" style="--lcars-color: ${color}; background-color: ${color}; font-size: 11px; margin-bottom: 4px;">
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
    <div class="foldable-header" style="--lcars-color: ${color}; background-color: ${color}; font-size: 11px; margin-bottom: 4px;">
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

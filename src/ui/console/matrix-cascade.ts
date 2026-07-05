// src/ui/console/matrix-cascade — trickle-down routing: a dropped bundle fans out one
// video per CAM/REMOTE input, each input's video cascades to the vision/multiviewer
// twists and its audio to the console/positioner. Split out of matrix.ts (audit §5.3).
import { updateTwistVisuals } from './helix.js';
import { parseConfig, ensureDropZone } from './matrix-groups.js';
import { placeSourceInTwist } from './matrix-place.js';

// Trickle-down targets: a CAM/REMOTE input auto-routes VIDEO to the vision/
// multiviewer twists and AUDIO to the monitor/positioner twists — "audio goes to
// audio, video goes to video" (matched by twist name).
const CASCADE: Array<{ re: RegExp; kind: 'video' | 'audio' }> = [
  { re: /video\s*mix|vision|switch/i, kind: 'video' },
  { re: /multi\s*view/i, kind: 'video' },
  { re: /monitor\s*console|audio\s*mix/i, kind: 'audio' },
  { re: /audio\s*position|positioner/i, kind: 'audio' },
];

/** Split a dropped bundle (ids, multiplex-aware) into its video + audio leaf feeds. */
function leafFeeds(ids: string[]): { videos: HTMLElement[]; audios: HTMLElement[] } {
  const videos: HTMLElement[] = [], audios: HTMLElement[] = [];
  ids.forEach((id) => {
    const node = document.getElementById(id); if (!node) return;
    const pool = node.classList.contains('multiplex') ? [...node.querySelectorAll<HTMLElement>('.sub-stream')] : [node];
    pool.forEach((n) => { if (n.classList.contains('video')) videos.push(n); else if (n.classList.contains('audio')) audios.push(n); });
  });
  return { videos, audios };
}

/** Route given nodes to a production's downstream twists (all matches — e.g. all 3 Multi Viewers). */
function cascadeNodes(inputTwist: HTMLElement, videos: HTMLElement[], audios: HTMLElement[]): void {
  const scope: ParentNode = inputTwist.closest('.program-row') ?? inputTwist.closest('[id^="tab-"]') ?? document;
  const twists = [...scope.querySelectorAll<HTMLElement>('.twist-container')];
  for (const { re, kind } of CASCADE) {
    const nodes = kind === 'video' ? videos : audios;
    if (!nodes.length) continue;
    const targets = twists.filter((t) => t !== inputTwist && re.test((t.querySelector('.twist-title')?.textContent ?? '')));
    for (const target of targets) { nodes.forEach((n) => placeSourceInTwist(target, n)); updateTwistVisuals(target); }
  }
}

/** Fan a dropped bundle across the production's CAM/REMOTE inputs — ONE video feed
 *  per input from the drop target onward, until feeds or input slots run out — then
 *  send the whole audio bundle to the monitor console + audio positioner. */
export function fanOutToInputs(startTwist: HTMLElement, ids: string[]): void {
  const scope: ParentNode = startTwist.closest('.program-row') ?? startTwist.closest('[id^="tab-"]') ?? document;
  const inputs = [...scope.querySelectorAll<HTMLElement>('.twist-container')]
    .filter((t) => { const c = parseConfig(t); return !!c && (!!c.cameraInput || c.row === 'remotes'); });
  const start = Math.max(0, inputs.indexOf(startTwist));
  const { videos, audios } = leafFeeds(ids);
  for (let i = 0; i < videos.length && start + i < inputs.length; i++) {
    const target = inputs[start + i]!, video = videos[i]!;
    ensureDropZone(target).replaceChildren();   // one input per camera / remote
    placeSourceInTwist(target, video);
    updateTwistVisuals(target);
    cascadeNodes(target, [video], []);          // this input's video → vision + multiviewers
  }
  if (audios.length) cascadeNodes(startTwist, [], audios);   // audio bundle → console + positioner
}

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

export function leafFeeds(ids: string[]): { videos: HTMLElement[]; audios: HTMLElement[]; controls: HTMLElement[]; } {
  const videos: HTMLElement[] = [], audios: HTMLElement[] = [], controls: HTMLElement[] = [];
  ids.forEach((id) => {
    const node = document.getElementById(id); if (!node) return;
    let pool: HTMLElement[];
    if (node.classList.contains('production')) {
       // production bundle: feeds are in the sibling .pool-content
       const next = node.nextElementSibling as HTMLElement;
       pool = next && next.classList.contains('pool-content') ? [...next.querySelectorAll<HTMLElement>('.signal-node')] : [];
    } else {
       pool = node.classList.contains('multiplex') ? [...node.querySelectorAll<HTMLElement>('.sub-stream')] : [node];
    }
    pool.forEach((n) => { 
      if (n.classList.contains('video')) videos.push(n); 
      else if (n.classList.contains('audio')) audios.push(n); 
      else if (n.classList.contains('control')) controls.push(n);
    });
  });
  return { videos, audios, controls };
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

/** Drop a whole Production onto a Studio: wires up monitors, speakers, comms, and controllers */
export function fanOutProductionToStudio(startTwist: HTMLElement, ids: string[]): void {
  const scope: ParentNode = startTwist.closest('.program-row') ?? startTwist.closest('[id^="tab-"]') ?? document;
  const twists = [...scope.querySelectorAll<HTMLElement>('.twist-container')];
  const { videos, audios, controls } = leafFeeds(ids);

  const place = (re: RegExp, feeds: HTMLElement[], max: number = 1) => {
    const targets = twists.filter(t => re.test(t.querySelector('.twist-title')?.textContent ?? ''));
    let feedIdx = 0;
    for (const target of targets) {
      ensureDropZone(target).replaceChildren();
      for (let i = 0; i < max && feedIdx < feeds.length; i++) {
        placeSourceInTwist(target, feeds[feedIdx]!);
        feedIdx++;
      }
      updateTwistVisuals(target);
    }
  };

  // 1. Monitors align with the first 4 videos (max 1 feed per monitor twist)
  place(/Monitor \d/i, videos, 1);

  // 2. Speaker with the first Aux, Audio monitors with AUX 1-4
  // For Studio Speaker, we use the first audio feed. For Audio Monitors, the rest.
  place(/Studio Speaker/i, audios.slice(0, 1), 1);
  place(/Audio Monitor/i, audios.slice(1, 5), 1);

  // 3. IFB with IFB of the studio
  const ifbFeeds = audios.filter(a => a.classList.contains('audio-comms'));
  place(/IFB \d/i, ifbFeeds, 1);

  // 4. Lighting with lighting, signalling with signalling, clocks, counters, chat
  place(/Lighting/i, controls.filter(c => /lighting/i.test(c.textContent || '')), 1);
  place(/On Air Light|Tally/i, controls.filter(c => /signaling/i.test(c.textContent || '')), 1);
  place(/Clock/i, controls.filter(c => /clock/i.test(c.textContent || '')), 1);
  place(/Counter|Stopwatch/i, controls.filter(c => /counter|stopwatch/i.test(c.textContent || '')), 1);
  place(/Chat/i, controls.filter(c => /chat/i.test(c.textContent || '')), 1);
}

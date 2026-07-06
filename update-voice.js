import fs from 'fs';
import path from 'path';

const editorsDir = './src/editors';
const editors = fs.readdirSync(editorsDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

const verbs = "take, cut, preview, mix, wipe, key, mute, start, stop, roll, hold, fade, clear";
const nouns = "camera, prompter, server, graphics, lower third, audio, mic, studio, iso, tally";
const modifiers = "to, all, on, off, up, down, full, next, previous, instantly, softly";

for (const editor of editors) {
  const voiceTsPath = path.join(editorsDir, editor, 'VOICE.ts');
  if (!fs.existsSync(voiceTsPath)) continue;

  let targets = "1, 2, 3, 4, 5, 6, 7, 8, primary, secondary, program, preview";
  
  if (editor === 'audio-mixer' || editor === 'audio-monitor' || editor === 'audio-positioner') {
    targets = "channel 1-24, master, aux 1-6, group 1-8";
  } else if (editor === 'camera-control') {
    targets = "cam 1-8, preset 1-10, pan, tilt, zoom, focus, iris";
  } else if (editor === 'prompter') {
    targets = "script, speed, font size, next story, previous story, top, bottom";
  } else if (editor === 'graphics-engine' || editor === 'cg' || editor === 'weather') {
    targets = "lower third, full screen, bug, ticker, clock, crawl, over-the-shoulder";
  } else if (editor === 'lighting') {
    targets = "grid, floor, spot 1-4, key, fill, back, preset A-D";
  } else if (editor === 'encoder' || editor === 'iso-recorder') {
    targets = "stream 1-4, disk A, disk B, proxy, high-res";
  } else if (editor === 'intercom' || editor === 'ifb') {
    targets = "prod, dir, cam 1-8, talent 1-4, floor manager, all call";
  } else if (editor === 'clock' || editor === 'chronos' || editor === 'timer') {
    targets = "countdown, countup, time of day, segment, total, flash";
  } else if (editor === 'vision-mixer') {
    targets = "M/E 1-3, key 1-4, dsk 1-2, aux 1-6, program, preview, clean feed";
  }

  const voiceContent = `export const VOICE_COMMANDS = {
  "Verbs": "${verbs}",
  "Nouns": "${nouns}",
  "Modifiers": "${modifiers}",
  "Targets": "${targets}"
};
`;
  fs.writeFileSync(voiceTsPath, voiceContent);
  console.log(`Updated VOICE.ts for ${editor}`);
}

// scripts/migrate-studio-spaces — one-shot Routes migration (git-reversible).
//
// Merges Routes/Sources/001_Sound + 002_Video into a single 001_Studio Spaces tree
// (Studio → Wall → {Video SB, Audio SB} → channels), preserving every stage box's
// prefix/count/items. Relocates the wireless (controllers + mic packs) to 002_Wireless
// and the remotes to 007_Remotes, then removes the old Sound/Video folders and rewrites
// the root Sources manifest. See docs/Audit/Studio-Spaces-and-Hierarchical-Routing-Audit.md.
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'Routes/Sources';
const WALLS = ['North Wall', 'East Wall', 'South Wall', 'West Wall'];
const WALLS_PER_STUDIO = 4;
const pad = (n) => String(n).padStart(3, '0');
const letter = (i) => String.fromCharCode(65 + i);   // A, B, C …
const readJSON = (p) => JSON.parse(readFileSync(p, 'utf8'));
const writeJSON = (p, o) => { mkdirSync(join(p, '..'), { recursive: true }); writeFileSync(p, JSON.stringify(o, null, 2) + '\n'); };

/** Collect { loc → leaf } for every stage box under a Sound/Video category's floor dirs. */
function collectBoxes(cat) {
  const out = new Map();
  const root = join(SRC, cat);
  for (const dir of readdirSync(root, { withFileTypes: true })) {
    if (!dir.isDirectory() || !/floor/i.test(dir.name)) continue;   // skip Remotes / Wireless Mics
    for (const f of readdirSync(join(root, dir.name))) {
      const m = /^\d{3,}_(\d+)\.json$/.exec(f);                     // NNN_<loc>.json (skips controllers)
      if (!m) continue;
      out.set(Number(m[1]), readJSON(join(root, dir.name, f)));
    }
  }
  return out;
}

const video = collectBoxes('002_Video');
const audio = collectBoxes('001_Sound');
const locs = [...new Set([...video.keys(), ...audio.keys()])].sort((a, b) => a - b);
console.log(`Found ${video.size} video + ${audio.size} audio boxes across ${locs.length} locations.`);

// ---- 001_Studio Spaces/<Studio>/<Wall>/{Video SB, Audio SB} ----
const spacesRoot = join(SRC, '001_Studio Spaces');
if (existsSync(spacesRoot)) rmSync(spacesRoot, { recursive: true });
const studioDirs = [];
for (let s = 0; s * WALLS_PER_STUDIO < locs.length; s++) {
  const studioName = `STUDIO ${letter(s)}`;
  const studioDir = `${pad(s + 1)}_${studioName}`;
  studioDirs.push(`${studioDir}/`);
  const wallDirs = [];
  for (let w = 0; w < WALLS_PER_STUDIO; w++) {
    const loc = locs[s * WALLS_PER_STUDIO + w];
    if (loc == null) break;
    const wallDir = `${pad(w + 1)}_${WALLS[w]}`;
    wallDirs.push(`${wallDir}/`);
    const base = join(spacesRoot, studioDir, wallDir);
    const files = [];
    const v = video.get(loc), a = audio.get(loc);
    if (v) { writeJSON(join(base, `001_Video SB ${loc}.json`), { ...v, name: `VIDEO SB ${loc}` }); files.push(`001_Video SB ${loc}.json`); }
    if (a) { writeJSON(join(base, `002_Audio SB ${loc}.json`), { ...a, name: `AUDIO SB ${loc}` }); files.push(`002_Audio SB ${loc}.json`); }
    writeJSON(join(base, 'index.json'), files);
  }
  writeJSON(join(spacesRoot, studioDir, 'index.json'), wallDirs);
}
writeJSON(join(spacesRoot, 'index.json'), studioDirs);
console.log(`Wrote ${studioDirs.length} studios (${WALLS_PER_STUDIO} walls each).`);

// ---- 002_Wireless/{Controllers, Microphones} ----
const wlRoot = join(SRC, '002_Wireless');
if (existsSync(wlRoot)) rmSync(wlRoot, { recursive: true });
const ctrlFiles = [];
let ci = 1;
for (const dir of readdirSync(join(SRC, '001_Sound'), { withFileTypes: true })) {
  if (!dir.isDirectory() || !/floor/i.test(dir.name)) continue;
  const ctrl = join(SRC, '001_Sound', dir.name, '000_Wireless_Controller.json');
  if (!existsSync(ctrl)) continue;
  const name = dir.name.replace(/^\d+_/, '');
  const file = `${pad(ci++)}_${name}.json`;
  writeJSON(join(wlRoot, '001_Controllers', file), readJSON(ctrl));
  ctrlFiles.push(file);
}
writeJSON(join(wlRoot, '001_Controllers', 'index.json'), ctrlFiles);
cpSync(join(SRC, '001_Sound', '006_Wireless Microphones'), join(wlRoot, '002_Microphones'), { recursive: true });
writeJSON(join(wlRoot, 'index.json'), ['001_Controllers/', '002_Microphones/']);
console.log(`Wrote 002_Wireless (${ctrlFiles.length} controllers + mic packs).`);

// ---- 007_Remotes/ ----
const remRoot = join(SRC, '007_Remotes');
if (existsSync(remRoot)) rmSync(remRoot, { recursive: true });
cpSync(join(SRC, '002_Video', '006_Remotes'), remRoot, { recursive: true });
console.log('Wrote 007_Remotes.');

// ---- remove old Sound/Video, rewrite root manifest ----
rmSync(join(SRC, '001_Sound'), { recursive: true });
rmSync(join(SRC, '002_Video'), { recursive: true });
writeJSON(join(SRC, 'index.json'), [
  '001_Studio Spaces/', '002_Wireless/', '003_Streams/', '004_Play/',
  '005_Prod/', '006_Graphics/', '007_Remotes/', '008_Prompter/',
]);
console.log('Removed old Sound/Video; rewrote Routes/Sources/index.json. Done.');

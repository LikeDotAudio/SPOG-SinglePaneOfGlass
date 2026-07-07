// scripts/migrate-floors — reshape 001_Studio Spaces into Floor → Studio → Wall → Box.
// Reads the current Studio Spaces boxes (each still tagged with its `floor`), regroups
// them by floor, and lays out 4 studios per floor (walls N/E/S/W; a floor's 10 location
// pairs distribute 3·3·2·2 so all 50 pairs are preserved — no fabricated devices).
// Git-reversible. See docs/Audit/Studio-Spaces-and-Hierarchical-Routing-Audit.md.
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'Routes/Sources/001_Studio Spaces';
const WALLS = ['North Wall', 'East Wall', 'South Wall', 'West Wall'];
const STUDIOS_PER_FLOOR = 4;
const FLOOR_ORDER = ['1st Floor', '2nd Floor', '3rd Floor', '4th Floor', '5th Floor'];
const pad = (n) => String(n).padStart(3, '0');
const readJSON = (p) => JSON.parse(readFileSync(p, 'utf8'));
const writeJSON = (p, o) => { mkdirSync(join(p, '..'), { recursive: true }); writeFileSync(p, JSON.stringify(o, null, 2) + '\n'); };

/** Walk the tree for every box leaf (skips index.json). */
function collectBoxes(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...collectBoxes(p));
    else if (e.endsWith('.json') && e !== 'index.json') out.push(readJSON(p));
  }
  return out;
}

const boxes = collectBoxes(ROOT);
const locOf = (b) => Number(/(\d+)/.exec(b.name)?.[1] ?? 0);
// floor → loc → { video, audio }
const byFloor = new Map();
for (const b of boxes) {
  const floor = b.floor || '1st Floor';
  if (!byFloor.has(floor)) byFloor.set(floor, new Map());
  const locs = byFloor.get(floor);
  const loc = locOf(b);
  if (!locs.has(loc)) locs.set(loc, {});
  locs.get(loc)[b.items ? 'audio' : 'video'] = b;
}
console.log(`Read ${boxes.length} boxes across ${byFloor.size} floors.`);

rmSync(ROOT, { recursive: true });
const floorDirs = [];
FLOOR_ORDER.filter((f) => byFloor.has(f)).forEach((floor, fi) => {
  const floorDir = `${pad(fi + 1)}_${floor}`;
  floorDirs.push(`${floorDir}/`);
  const pairs = [...byFloor.get(floor).entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
  // Distribute this floor's location pairs across 4 studios: sizes floor(n/4)+remainder.
  const base = Math.floor(pairs.length / STUDIOS_PER_FLOOR), extra = pairs.length % STUDIOS_PER_FLOOR;
  const studioDirs = [];
  let idx = 0;
  for (let s = 0; s < STUDIOS_PER_FLOOR; s++) {
    const count = base + (s < extra ? 1 : 0);
    const studioDir = `${pad(s + 1)}_Studio ${s + 1}`;
    studioDirs.push(`${studioDir}/`);
    const wallDirs = [];
    for (let w = 0; w < count; w++) {
      const pair = pairs[idx++];
      const wallDir = `${pad(w + 1)}_${WALLS[w]}`;
      wallDirs.push(`${wallDir}/`);
      const dir = join(ROOT, floorDir, studioDir, wallDir);
      const files = [];
      if (pair.video) { writeJSON(join(dir, `001_${pair.video.name}.json`), pair.video); files.push(`001_${pair.video.name}.json`); }
      if (pair.audio) { writeJSON(join(dir, `002_${pair.audio.name}.json`), pair.audio); files.push(`002_${pair.audio.name}.json`); }
      writeJSON(join(dir, 'index.json'), files);
    }
    writeJSON(join(ROOT, floorDir, studioDir, 'index.json'), wallDirs);
  }
  writeJSON(join(ROOT, floorDir, 'index.json'), studioDirs);
});
writeJSON(join(ROOT, 'index.json'), floorDirs);
console.log(`Wrote ${floorDirs.length} floors × ${STUDIOS_PER_FLOOR} studios. Done.`);

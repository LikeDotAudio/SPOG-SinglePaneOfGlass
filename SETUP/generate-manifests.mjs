import fs from 'fs';
import path from 'path';

const MANIFEST_ROOTS = ['Routes/Destinations', 'Routes/People', 'Routes/Sources', 'Routes/Themes'];
const ICON_ASSET_DIRS = new Set(['icons', 'png']);

function writeManifest(dirpath) {
  const entries = [];
  const files = fs.readdirSync(dirpath);
  files.sort().forEach(name => {
    if (name === 'index.json' || name.startsWith('.') || ICON_ASSET_DIRS.has(name)) {
      return;
    }
    const full = path.join(dirpath, name);
    if (fs.statSync(full).isDirectory()) {
      entries.push(name + '/');
    } else if (name.toLowerCase().endsWith('.json')) {
      entries.push(name);
    }
  });
  fs.writeFileSync(path.join(dirpath, 'index.json'), JSON.stringify(entries, null, 2) + '\n');
}

function generateManifests() {
  let count = 0;
  const projectDir = process.cwd();
  
  MANIFEST_ROOTS.forEach(root => {
    const rootPath = path.join(projectDir, root);
    if (!fs.existsSync(rootPath) || !fs.statSync(rootPath).isDirectory()) return;

    function walk(currentPath) {
      const dirs = [];
      const files = fs.readdirSync(currentPath);
      files.forEach(name => {
        if (name.startsWith('.') || ICON_ASSET_DIRS.has(name)) return;
        const full = path.join(currentPath, name);
        if (fs.statSync(full).isDirectory()) dirs.push(full);
      });
      
      writeManifest(currentPath);
      count++;
      dirs.forEach(walk);
    }

    walk(rootPath);
  });
  
  console.log(`Generated ${count} manifest(s).`);
}

generateManifests();

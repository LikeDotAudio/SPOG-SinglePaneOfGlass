import fs from 'fs';
import path from 'path';

const editorsDir = './src/editors';
const editors = fs.readdirSync(editorsDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

for (const editor of editors) {
  const indexTsPath = path.join(editorsDir, editor, 'index.ts');
  if (!fs.existsSync(indexTsPath)) continue;

  const content = fs.readFileSync(indexTsPath, 'utf8');
  if (content.includes('VOICE_COMMANDS')) continue; // Already processed

  // Create VOICE.ts
  const voiceTsPath = path.join(editorsDir, editor, 'VOICE.ts');
  const voiceName = editor.replace(/-/g, ' ');
  const voiceContent = `export const VOICE_COMMANDS = {
  "open ${voiceName}": "Opens the ${voiceName} editor window",
  "close": "Closes the current editor window",
  "focus": "Brings focus to the main interaction area",
};
`;
  fs.writeFileSync(voiceTsPath, voiceContent);

  // Update index.ts
  let updatedContent = content;

  // Add import
  const importMatch = updatedContent.match(/^import .*?['"]\..*?['"];/m);
  if (importMatch) {
    updatedContent = updatedContent.replace(importMatch[0], `import { VOICE_COMMANDS } from './VOICE.js';\n${importMatch[0]}`);
  } else {
    // just put it after the last import or at the top
    const lastImport = [...updatedContent.matchAll(/^import /gm)].pop();
    if (lastImport) {
        const idx = updatedContent.indexOf('\n', lastImport.index) + 1;
        updatedContent = updatedContent.slice(0, idx) + `import { VOICE_COMMANDS } from './VOICE.js';\n` + updatedContent.slice(idx);
    } else {
        updatedContent = `import { VOICE_COMMANDS } from './VOICE.js';\n` + updatedContent;
    }
  }

  // Add to plugin object
  updatedContent = updatedContent.replace(/(const plugin:\s*EditorPlugin\s*=\s*\{[\s\S]*?)(render\s*:|render\s*\()/m, '$1voiceCommands: VOICE_COMMANDS,\n  $2');

  fs.writeFileSync(indexTsPath, updatedContent);
  console.log(`Updated ${editor}`);
}

// src/ui/console/destinations — the destination side of the console. Ports
// js/app.js addDestinationTree (Routes/Destinations/** → nested footer groups +
// lazily-loaded tabs). Each room paints via renderPrograms (render-programs.ts).
// Twists are the crosspoints sources route into (wired by ui/console/matrix.ts).
import { listDirectory, fetchJSON, type Entry } from '../../platform/discovery.js';
import type { Production } from '../../model/index.js';
import { DEST_TAB_COLORS, DEST_GROUP_COLORS, paletteAt, rgbAt } from '../palette.js';
import { stripOrder } from '../sources/format.js';
import { Footer, type GroupHandle } from './footer.js';
import { type OpenEditor } from './matrix.js';
import { renderPrograms } from './render-programs.js';

// Re-export so existing importers of console/destinations keep resolving.
export { renderPrograms } from './render-programs.js';

/** Populate a destination category folder: subfolders → nested footer groups, *.json → lazy tabs. */
export async function addDestinationTree(
  baseUrl: string, parentGroup: GroupHandle | null, groupColorRgb: string, parentName: string | undefined, openEditor?: OpenEditor,
  category?: string,
): Promise<void> {
  const { dirs, files } = await listDirectory(baseUrl);
  if (files.length) {
    const ns = baseUrl.replace(/[^a-zA-Z0-9]/g, '-');
    files.forEach((f: Entry, i: number) => {
      const fileName = decodeURIComponent(f.href).replace(/\.json$/i, '');
      const id = ns + '--' + fileName.replace(/[^a-zA-Z0-9]+/g, '-');
      const color = paletteAt(DEST_TAB_COLORS, i);
      Footer.addTab({ id, name: stripOrder(fileName).toUpperCase() }, {
        group: parentGroup, active: false, color,
        onActivate: () => {
          void fetchJSON<Production>(baseUrl + f.href).then((data) => {
            if (!data) return;
            data.id = id;
            // Unified person model: its destination twists live under `kit`.
            if (!data.twists && data.kit?.twists) data.twists = data.kit.twists;
            if (parentName) data.parentName = parentName;
            if (category) data.category = category;
            data.color = color;
            const pane = document.getElementById('tab-' + id);
            if (pane) renderPrograms(data, pane, openEditor, baseUrl + f.href);
          });
        },
      });
    });
  }
  await Promise.all(dirs.map((dir: Entry) => {
    const sub = Footer.addGroup(stripOrder(dir.name).toUpperCase(), { parent: parentGroup, color: groupColorRgb, collapsed: true });
    // `category` (top Facility level) stays constant through the recursion; `parentName`
    // is the immediate parent (the Floor level).
    return addDestinationTree(baseUrl + dir.href, sub, groupColorRgb, stripOrder(dir.name), openEditor, category ?? stripOrder(dir.name));
  }));
}

/** Build the whole destinations footer from Routes/Destinations/**. */
export async function buildDestinations(openEditor?: OpenEditor): Promise<void> {
  const destDir = await listDirectory('Routes/Destinations/');
  // `icons/` holds the ICON-face tiles, not a destination category.
  destDir.dirs = destDir.dirs.filter((d) => !/^\.?icons?\/?$/i.test(stripOrder(d.name)));
  await Promise.all(destDir.dirs.map((cat: Entry, di: number) => {
    const colorRgb = rgbAt(DEST_GROUP_COLORS, di);
    const catGroup = Footer.addGroup(stripOrder(cat.name).toUpperCase(), { color: colorRgb, collapsed: true });
    // Rooms directly under a category inherit IT as their type ("ENCODERS —
    // ENCODER 1") — this also keeps the UI's twist topics aligned with the
    // advertise pass, which has always walked with the category as parent.
    return addDestinationTree('Routes/Destinations/' + cat.href, catGroup, colorRgb, stripOrder(cat.name), openEditor, stripOrder(cat.name));
  }));
  // People: ONE unified model — the destinations console projects `kit{}` twists
  // from the canonical Routes/People tree (same files the sources panel reads).
  const pColor = rgbAt(DEST_GROUP_COLORS, destDir.dirs.length);
  const peopleGroup = Footer.addGroup('PEOPLE', { color: pColor, collapsed: true });
  await addDestinationTree('Routes/People/', peopleGroup, pColor, undefined, openEditor, 'People');
}

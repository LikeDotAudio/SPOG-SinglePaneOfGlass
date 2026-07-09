// src/ui/console/chrome-icons — ICON-face tiles for the console CHROME buttons
// (Captain's Log, chat, MQTT chip, chirality + settings toggles, 1990s VIEW).
//
// Tiles are rendered programmatically in the active palette (src/ui/icon-tiles)
// — no bundled or fetched artwork. Inert in LCARS face; the `data-face="icons"`
// CSS block in lcars.css swaps each button to its tile.

import { stampIcon } from '../icon-face.js';

const CHROME: ReadonlyArray<[selector: string, id: string]> = [
  ['.cl-btn', 'captains-log'],
  ['.chat-launch', 'chat'],
  ['.voice-launch', 'voice'],
  ['.mq-chip', 'mqtt'],
  ['.chir-toggle', 'chirality'],
  ['.palette-toggle', 'settings'],
  ['.rv-btn', '1990s-view'],
  ['.tut-help', 'academy'],
  ['.um-btn', 'menu'],
  ['.credit-button', 'credits'],
];

/** Stamp every chrome button with its tile. Call once, AFTER the chrome inits
 *  (captains-log, chat dock, mqtt chip, chirality, colour-scheme, router-view). */
export function initChromeIcons(): void {
  for (const [sel, id] of CHROME) {
    document.querySelectorAll<HTMLElement>(sel).forEach((el) => stampIcon(el, 'chrome', id));
  }
}

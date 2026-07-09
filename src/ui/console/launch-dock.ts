// src/ui/console/launch-dock — the shared bottom-right dock that keeps the CHAT and
// VOICE launch buttons in one flex row, so they are ALWAYS side by side. Previously
// each was independently `position:fixed` at its own right offset, which drifted apart
// (and let a footer group popup overlap them); housing both in one row fixes that. The
// `position:static !important` on the children neutralises their own fixed offsets.
import { addStyles } from '../dom.js';

const CSS = `
.launch-dock{position:fixed;right:14px;bottom:76px;z-index:1200;display:flex;gap:10px;align-items:center;}
.launch-dock > button{position:static !important;right:auto !important;bottom:auto !important;}
/* Chirality: the clock + MQTT chip dock OPPOSITE the sources rail (left in
   right-handed mode — lcars.css .ptp-clock/.mq-chip flip). CHAT/VOICE must sit
   ABOVE that cluster, so the dock flips to the same side. Left-handed keeps the
   default right edge (where the clock lives there). */
html[data-chirality="right"] .launch-dock{right:auto !important;left:14px;}`;

/** Get (or lazily create) the shared launch dock — order-independent between docks. */
export function launchDock(): HTMLElement {
  addStyles('launch-dock', CSS);
  let dock = document.querySelector<HTMLElement>('.launch-dock');
  if (!dock) { dock = document.createElement('div'); dock.className = 'launch-dock'; document.body.appendChild(dock); }
  return dock;
}

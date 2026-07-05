// src/ui/console/matrix — the crosspoint: routing a dragged source into a twist's
// drop-zone. Port of the drop half of js/matrix.js (initializeTwists +
// enforceTwistLimits + buildDroppedGroup). A source node carries a comma id-list
// (set by ui/sources/interact.ts); dropping expands multiplex boxes to their
// accepted sub-feeds, groups same-origin feeds into a collapsible chip, and
// enforces the twist's video/audio/input caps (newest replaces oldest).
//
// This file is the slim orchestrator/barrel (audit §5.3): the drop wiring lives
// here, the rest is split into flat matrix-* siblings and re-exported so every
// existing `./matrix.js` import stays byte-identical.
import { updateTwistVisuals, toggleHelix } from './helix.js';
import { parseConfig, enforceTwistLimits, ensureDropZone, acceptsFor, buildDroppedGroup, rid } from './matrix-groups.js';
import { refreshCrosspoints } from './matrix-crosspoints.js';
import { publishCrosspoints } from './matrix-place.js';
import { fanOutToInputs } from './matrix-cascade.js';

// ---- barrel: preserve the module's public surface ------------------------------
export { publishCrosspoints, enforceTwistLimits, buildDroppedGroup, refreshCrosspoints };
export { placeSourceInTwist } from './matrix-place.js';
export { renumberCrosspoints } from './matrix-crosspoints.js';

/** Open-editor callback so a twist click dispatches to the ported editor layer. */
export type OpenEditor = (twist: HTMLElement) => void;

/** Wire every twist in `root` for drag-over highlight, drop-routing, and click-to-open. */
export function initializeTwists(root: ParentNode, onOpenEditor?: OpenEditor): void {
  root.querySelectorAll<HTMLElement>('.twist-container').forEach((twist) => {
    if (twist.dataset.initialized) return;
    twist.dataset.initialized = 'true';
    twist.style.cursor = 'pointer';
    updateTwistVisuals(twist);   // collapse the empty strand to start

    // The right lip / foldbar folds the DNA strand away.
    twist.querySelectorAll<HTMLElement>('.twist-lip, .twist-foldbar').forEach((lip) => {
      lip.addEventListener('click', (e) => toggleHelix(e, lip));
    });

    twist.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.signal-node, .twist-lip, .twist-foldbar')) return;
      onOpenEditor?.(twist);
    });
    twist.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      twist.style.borderColor = 'var(--magenta)';
      twist.style.boxShadow = 'var(--glow-magenta)';
    });
    twist.addEventListener('dragleave', () => { twist.style.borderColor = ''; twist.style.boxShadow = ''; });

    twist.addEventListener('drop', (e) => {
      e.preventDefault();
      twist.style.borderColor = '';
      twist.style.boxShadow = '';
      const idsStr = e.dataTransfer?.getData('text/plain') ?? '';
      const sourceType = e.dataTransfer?.getData('source-type') ?? '';
      if (!idsStr) return;
      const ids = idsStr.split(',');
      const config = parseConfig(twist);
      const dropZone = ensureDropZone(twist);
      const accepts = acceptsFor(config);
      const appendWithLimit = (child: HTMLElement): void => { enforceTwistLimits(dropZone, config, child); dropZone.appendChild(child); };

      const plain: HTMLElement[] = [];
      ids.forEach((id) => {
        const node = document.getElementById(id);
        if (!node) return;
        if (sourceType !== 'pool') { if (accepts(node)) appendWithLimit(node); return; }
        if (node.classList.contains('multiplex')) {
          const accepted = Array.from(node.querySelectorAll<HTMLElement>('.sub-stream')).filter(accepts);
          // Split the stage box's audio CONTROL (preamp) out of the channel group so
          // it lands as its OWN visible crosspoint (not hidden inside the collapsed chip).
          const controls = accepted.filter((n) => n.classList.contains('control'));
          const feeds = accepted.filter((n) => !n.classList.contains('control'));
          if (feeds.length) {
            const headerEl = node.querySelector<HTMLElement>('.multiplex-header');
            const groupName = headerEl ? headerEl.innerText : (node.dataset.origin || node.id);
            const parentCap = (node.dataset.origin || '').split(' — ').map((s) => s.trim()).filter(Boolean).join(' · ');
            dropZone.appendChild(buildDroppedGroup(groupName, getComputedStyle(node).color, feeds, parentCap));
          }
          controls.forEach((ctrlNode) => {
            const clone = ctrlNode.cloneNode(true) as HTMLElement;
            clone.id = ctrlNode.id + '-' + rid();
            clone.classList.remove('selected'); clone.style.opacity = '1'; clone.draggable = true;
            appendWithLimit(clone);
          });
        } else if (accepts(node)) plain.push(node);
      });

      // Group same-origin plain sources under one labelled chip.
      const byOrigin = new Map<string, HTMLElement[]>();
      plain.forEach((n) => { const key = n.dataset.origin || ''; if (!byOrigin.has(key)) byOrigin.set(key, []); byOrigin.get(key)?.push(n); });
      byOrigin.forEach((nodes, origin) => {
        const parts = String(origin || '').split(' — ').map((s) => s.trim()).filter(Boolean);
        const boxName = parts[parts.length - 1] || origin;
        const parentCap = parts.slice(0, -1).join(' · ');
        const first = nodes[0];
        if (origin && nodes.length >= 2 && first) {
          dropZone.appendChild(buildDroppedGroup(boxName, getComputedStyle(first).color, nodes, parentCap));
        } else {
          nodes.forEach((n) => {
            const clone = n.cloneNode(true) as HTMLElement;
            clone.id = n.id + '-' + rid();
            clone.classList.remove('selected');
            clone.style.opacity = '1';
            clone.draggable = true;
            appendWithLimit(clone);
          });
        }
      });

      // A CAM / REMOTE holds ONE input: a dropped bundle FANS OUT one feed per input
      // across the cameras + remotes (from here onward), each trickling its video to
      // the vision/multiviewer twists and the audio bundle to the console/positioner.
      if (config && (config.cameraInput || config.row === 'remotes')) {
        dropZone.replaceChildren();   // discard the default placement; fan-out re-places
        fanOutToInputs(twist, ids);
      }

      // Redraw the DNA strand for the new routed set, then a brief confirm flash.
      updateTwistVisuals(twist);
      refreshCrosspoints(dropZone);   // number 1..N + make reorderable
      publishCrosspoints(twist);
      const originalBg = twist.style.backgroundColor;
      twist.style.backgroundColor = 'rgba(255, 0, 255, 0.2)';
      setTimeout(() => { twist.style.backgroundColor = originalBg; }, 300);
    });
  });
}

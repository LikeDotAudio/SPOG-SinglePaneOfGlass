// src/ui/icon-face — the ICON face resolver (docs/Audit/Icon-View-Aesthetic-Audit.md).
//
// The FACE axis (colour-scheme.ts, html[data-face]="lcars"|"icons") swaps the LCARS
// chrome for the macOS-style icon tiles that live beside the data they name:
//   Routes/Sources/icons/<slug>.svg          (+ <slug>.mouseover.svg hover state)
//   Routes/Destinations/icons/<slug>.svg
// (The icons folders are upload-only: deploy.py excludes them from the discovery
// manifests so they never appear as categories in the app.)
// This module maps a chrome label to those URLs and stamps them as CSS custom
// properties on the element. The DOM never changes — the `data-face="icons"` CSS
// overlay in lcars.css paints the tile; in LCARS face the stamp is inert.
//
// A tile is only activated after its SVG actually loads (Image() probe), so a label
// without artwork keeps its LCARS pill in icon face — degrade to text, never a hole.

const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const DIRS = { src: 'Routes/Sources/icons', dest: 'Routes/Destinations/icons' } as const;
export type IconKind = keyof typeof DIRS;

export const iconUrl = (kind: IconKind, label: string, hover = false): string =>
  `${DIRS[kind]}/${slug(label)}${hover ? '.mouseover' : ''}.svg`;

/** Stamp an element with its icon tile (and hover variant). The `has-face-icon`
 *  class — the CSS overlay's hook — is only added once the tile proves loadable. */
export function stampIcon(target: HTMLElement, kind: IconKind, label: string): void {
  const url = iconUrl(kind, label);
  const probe = new Image();
  probe.onload = () => {
    target.style.setProperty('--face-icon', `url("${url}")`);
    target.style.setProperty('--face-icon-hover', `url("${iconUrl(kind, label, true)}")`);
    target.classList.add('has-face-icon');
  };
  probe.src = url;
}

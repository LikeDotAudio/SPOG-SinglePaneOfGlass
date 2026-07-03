// src/ui/sources/media-group — a collapsible "folder" group inside a super-pool.
// Port of js/ui/makeMediaGroup.js. Returns the content element children append to.
// Its own accordion (one sibling open at a time) is independent of the pool
// accordion, so nested folders fold on their own.
import { monoEmoji } from './format.js';

export function makeMediaGroup(container: HTMLElement, title: string, color: string, depth: number): HTMLElement {
  const group = document.createElement('div');
  group.className = 'input-group media-group';

  const header = document.createElement('div');
  header.className = 'foldable-header media-group-header';
  // Indent is a token so the bracket can flip side under chirality (see lcars.css).
  header.style.cssText = `--lcars-color:${color}; background-color:${color}; font-size:11px; margin-bottom:6px; font-weight:bold; cursor:pointer; --mg-head-indent:${depth * 10}px;`;
  header.innerHTML = `<span>${monoEmoji(title)}${title}</span><span class="fold-icon" style="transform:rotate(-90deg);display:inline-block;transition:transform .2s;">▼</span>`;

  const content = document.createElement('div');
  content.className = 'media-group-content';
  // Colour + indent as tokens; the bracket geometry (border/shadow/radius/indent)
  // lives in lcars.css so it mirrors to the RIGHT in right-handed mode.
  content.style.setProperty('--mg-color', color);
  content.style.setProperty('--mg-indent', `${depth * 12 + 12}px`);
  content.style.display = 'none';

  header.addEventListener('click', () => {
    const opening = content.style.display === 'none';
    if (opening) {
      const parent = group.parentElement;
      if (parent) parent.querySelectorAll<HTMLElement>(':scope > .media-group').forEach((g) => {
        if (g === group) return;
        const c = g.querySelector<HTMLElement>(':scope > .media-group-content');
        if (c) c.style.display = 'none';
        const ic = g.querySelector<HTMLElement>(':scope > .media-group-header .fold-icon');
        if (ic) ic.style.transform = 'rotate(-90deg)';
      });
    }
    content.style.display = opening ? '' : 'none';
    const icon = header.querySelector<HTMLElement>('.fold-icon');
    if (icon) icon.style.transform = opening ? 'rotate(0deg)' : 'rotate(-90deg)';
  });

  group.appendChild(header);
  group.appendChild(content);
  container.appendChild(group);
  return content;
}

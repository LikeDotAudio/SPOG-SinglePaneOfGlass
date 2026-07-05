// src/editors/intercom/subcards — the static IFB / beltpacks / matrix sub-cards.
// Pure presentation lifted verbatim from the view; pills toggle their `on` state.

import { el } from '../../ui/dom.js';

/** Build the IFB / beltpacks / matrix sub-card row, with pill click toggles. */
export function buildSubCards(): HTMLElement {
  const sub = el('div', { class: 'ic-sub' });
  sub.innerHTML = `
            <div class="ic-card"><p class="ed-h">IFB — INTERRUPTIBLE FOLDBACK</p>
                <div class="ic-row"><span>TALENT 1 EARPIECE</span><span class="ic-pill on">PROGRAM</span></div>
                <div class="ic-row"><span>TALENT 2 EARPIECE</span><span class="ic-pill">PROGRAM</span></div>
                <div class="ic-row"><span>STAGE MANAGER</span><span class="ic-pill">PROGRAM</span></div></div>
            <div class="ic-card"><p class="ed-h">BELTPACKS</p>
                <div class="ic-row"><span>CAM 1 · PARTY-LINE A</span><span class="ic-pill on">ONLINE</span></div>
                <div class="ic-row"><span>CAM 2 · PARTY-LINE A</span><span class="ic-pill on">ONLINE</span></div>
                <div class="ic-row"><span>FLOOR · PARTY-LINE B</span><span class="ic-pill on">ONLINE</span></div></div>
            <div class="ic-card"><p class="ed-h">MATRIX</p>
                <div class="ic-row"><span>TALLY-LINKED DUCKING</span><span class="ic-pill on">ENABLED</span></div>
                <div class="ic-row"><span>PRIVATE LINE — DIR↔FLOOR</span><span class="ic-pill on">OPEN</span></div>
                <div class="ic-row"><span>ROUTER</span><span class="ic-pill on">ONLINE</span></div></div>`;
  sub.querySelectorAll<HTMLElement>('.ic-pill').forEach((p) => p.addEventListener('click', () => p.classList.toggle('on')));
  return sub;
}

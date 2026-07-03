// src/editors/prompter — teleprompter feed for a Person (People/Places/Things §2).
//
// One of the "things" routed to a person: their prompter. A scrolling script with
// speed / font / mirror controls and a title-safe reading area. Self-contained.

import type { EditorPlugin } from '../types.js';
import { el, addStyles } from '../../ui/dom.js';

const CSS = `
.tp{display:grid;grid-template-columns:300px minmax(0,1fr);gap:14px;height:100%;min-height:0;color:#cfe6ff;}
.tp-col{display:flex;flex-direction:column;gap:10px;min-height:0;}
.tp-col h4{margin:0;color:#6FC8F0;font:700 11px 'Courier New',monospace;letter-spacing:2px;text-transform:uppercase;}
.tp-script{flex:1;min-height:0;background:#03060f;border:1px solid #1d2942;border-radius:8px;color:#cfe6ff;
  font:13px/1.6 'Courier New',monospace;padding:10px 12px;resize:none;outline:none;}
.tp-script:focus{border-color:#6FC8F0;}
.tp-ctrls{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}
.tp-btn{font:800 11px 'Courier New',monospace;letter-spacing:1px;text-transform:uppercase;padding:9px 15px;border:none;
  border-radius:10px;background:#16233d;color:#bcd3ee;cursor:pointer;}
.tp-btn.on{background:#6FC8F0;color:#08131f;}
.tp-slide{display:flex;align-items:center;gap:6px;font:10px 'Courier New',monospace;color:#7e93b5;letter-spacing:1px;}
.tp-slide input{width:110px;}
.tp-stage{flex:1;min-height:0;position:relative;overflow:hidden;background:#000;border:1px solid #1d2942;border-radius:10px;}
.tp-scroll{position:absolute;left:0;right:0;top:0;padding:0 9%;color:#fff;font-weight:800;text-align:center;
  text-shadow:0 2px 8px rgba(0,0,0,.8);will-change:transform;}
.tp-scroll p{margin:0 0 .7em;}
/* Reading line sits in the LOWER THIRD — near where a real teleprompter's glass
   folds out from the monitor base, so the presenter reads close to the lens. */
.tp-mid{position:absolute;left:0;right:0;top:68%;height:2px;background:rgba(111,200,240,.35);pointer-events:none;}
`;

const plugin: EditorPlugin = {
  id: 'prompter',
  title: 'PROMPTER · TELEPROMPTER',
  order: 9,
  match: (n) => /prompt/i.test(n),
  render(host, ctx) {
    addStyles('twist-editor-prompter', CSS);
    const script = el('textarea', { class: 'tp-script', spellcheck: false }) as HTMLTextAreaElement;
    script.value = [
      'GOOD EVENING, AND WELCOME TO THE BROADCAST.',
      'OUR TOP STORY TONIGHT — THE ROUTING MATRIX IS FULLY ONLINE.',
      'COMING UP: WEATHER, SPORTS, AND A LOOK AT THE WEEK AHEAD.',
      'BUT FIRST, LET US GO LIVE TO THE FIELD.',
      'STAND BY... AND WE ARE ON AIR.',
    ].join('\n\n');

    const scroll = el('div', { class: 'tp-scroll' });
    const stage = el('div', { class: 'tp-stage' }, [scroll, el('div', { class: 'tp-mid' })]);
    const rebuild = (): void => { scroll.replaceChildren(...script.value.split(/\n\s*\n/).map((p) => el('p', {}, [p.trim()]))); };
    script.addEventListener('input', rebuild); rebuild();

    const playBtn = el('button', { class: 'tp-btn on' }, ['▶ Run']);
    const mirrorBtn = el('button', { class: 'tp-btn' }, ['Mirror']);
    let speed = 40, size = 34, running = true, mirrored = false;
    const setSize = (): void => { scroll.style.fontSize = `${size}px`; };
    const applyTransform = (): void => { scroll.style.transform = `translateY(${y}px)${mirrored ? ' scaleX(-1)' : ''}`; };
    const speedIn = el('input', { type: 'range', min: '5', max: '160', value: String(speed) }) as HTMLInputElement;
    const sizeIn = el('input', { type: 'range', min: '18', max: '64', value: String(size) }) as HTMLInputElement;
    speedIn.addEventListener('input', () => { speed = +speedIn.value; });
    sizeIn.addEventListener('input', () => { size = +sizeIn.value; setSize(); }); setSize();
    playBtn.addEventListener('click', () => { running = !running; playBtn.classList.toggle('on', running); playBtn.textContent = running ? '▶ Run' : '⏸ Hold'; });
    mirrorBtn.addEventListener('click', () => { mirrored = !mirrored; mirrorBtn.classList.toggle('on', mirrored); applyTransform(); });
    const rewind = el('button', { class: 'tp-btn' }, ['⟲ Top']);
    let y = stage.clientHeight || 300;
    rewind.addEventListener('click', () => { y = stage.clientHeight || 300; });

    host.append(el('div', { class: 'tp' }, [
      el('div', { class: 'tp-col' }, [
        el('h4', {}, ['Script']), script,
        el('div', { class: 'tp-ctrls' }, [playBtn, mirrorBtn, rewind]),
        el('div', { class: 'tp-slide' }, ['SPEED', speedIn]),
        el('div', { class: 'tp-slide' }, ['SIZE', sizeIn]),
      ]),
      el('div', { class: 'tp-col' }, [el('h4', {}, ['On-air feed']), stage]),
    ]));

    y = stage.clientHeight || 300;
    ctx.dispose.raf(() => {
      if (running) {
        y -= speed / 60;
        if (y < -scroll.offsetHeight) y = stage.clientHeight || 300;   // loop
      }
      applyTransform();
    });
  },
};

export default plugin;

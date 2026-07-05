// src/editors/prompter/index.ts — teleprompter feed for a Person (People/Places/Things §2).
//
// One of the "things" routed to a person: their prompter. A scrolling script with
// speed / font / mirror controls and a title-safe reading area. Self-contained.

import type { EditorPlugin } from '../types.js';
import { el, addStyles } from '../../ui/dom.js';

const CSS = `
.tp{display:grid;grid-template-columns:1fr 1fr;gap:14px;height:100%;min-height:0;color:#cfe6ff;position:relative;}
.tp-col{display:flex;flex-direction:column;gap:10px;min-height:0;position:relative;}
.tp-col h4{margin:0;color:#6FC8F0;font:700 22px 'Courier New',monospace;letter-spacing:2px;text-transform:uppercase;}
.tp-script-wrapper{flex:1;min-height:0;display:flex;flex-direction:column;background:#03060f;border:1px solid #1d2942;border-radius:8px;overflow:hidden;}
.tp-script-wrapper:focus-within{border-color:#6FC8F0;}
.tp-script-container{flex:1;min-height:0;display:flex;}
.tp-gutter{padding:10px 8px;background:#0a1122;color:#4a5c7d;font:13px/1.6 'Courier New',monospace;text-align:right;border-right:1px solid #1d2942;overflow:hidden;user-select:none;white-space:pre;}
.tp-script{flex:1;min-height:0;background:transparent;border:none;color:#cfe6ff;
  font:13px/1.6 'Courier New',monospace;padding:10px 12px;outline:none;white-space:pre-wrap;overflow:auto;}
.tp-toolbar { display:flex; gap: 8px; padding: 6px 12px; background: #16233d; border-bottom: 1px solid #1d2942; }
.tp-tool-btn { font: bold 14px monospace; padding: 4px 8px; border-radius: 4px; background: #0a1122; color: #cfe6ff; border: 1px solid #2a3b5c; cursor: pointer; }
.tp-tool-btn:hover { background: #1d2942; }
.tp-tool-color { width: 24px; height: 24px; padding: 0; border: none; background: none; cursor: pointer; }
.tp-ctrls{display:flex;flex-wrap:wrap;gap:16px;align-items:center;}
.tp-btn{font:800 22px 'Courier New',monospace;letter-spacing:1px;text-transform:uppercase;padding:18px 30px;border:none;
  border-radius:20px;background:#16233d;color:#bcd3ee;cursor:pointer;}
.tp-btn.on{background:#6FC8F0;color:#08131f;}
.tp-file-btn{font:700 20px 'Courier New',monospace;padding:8px 16px;background:#1d2942;border:none;border-radius:8px;color:#cfe6ff;cursor:pointer;}
.tp-file-btn:hover{background:#2a3b5c;}
.tp-slide{display:flex;align-items:center;gap:12px;font:20px 'Courier New',monospace;color:#7e93b5;letter-spacing:1px;}
.tp-slide input{width:220px;height:24px;cursor:pointer;}
.tp-config{display:flex;flex-wrap:wrap;gap:16px;align-items:center;font:20px 'Courier New',monospace;color:#7e93b5;}
.tp-config label{display:flex;align-items:center;gap:8px;cursor:pointer;}
.tp-config input[type="color"]{width:40px;height:40px;padding:0;border:none;border-radius:4px;background:none;cursor:pointer;}
.tp-config input[type="checkbox"]{width:24px;height:24px;cursor:pointer;}
.tp-stage{flex:1;min-height:0;position:relative;overflow:hidden;background:#000;border:1px solid #1d2942;border-radius:10px;}
.tp-scroll{position:absolute;left:0;right:0;top:0;padding:0 9%;color:#fff;font-weight:800;text-align:center;
  text-shadow:0 2px 8px rgba(0,0,0,.8);will-change:transform;}
.tp-scroll p{margin:0 0 .7em;}
.story-marker{color:#ffcc33;font-weight:700;font-size:0.65em;border-top:1px dashed rgba(255,255,255,0.35);padding-top:4px;margin-top:8px;text-transform:uppercase;}
.gpo-marker{color:#ff3366;font-weight:700;font-size:0.65em;border-top:1px dashed rgba(255,51,102,0.35);padding-top:4px;margin-top:8px;text-transform:uppercase;}
.tp-gpo-log{height:80px;overflow-y:auto;background:#0a1122;border:1px solid #1d2942;border-radius:8px;padding:8px;font:14px monospace;color:#ff3366;}
.tp-gpo-entry{margin-bottom:4px;border-bottom:1px dashed #1d2942;padding-bottom:4px;}
.tp-shortcuts{position:absolute;bottom:20px;right:100px;background:rgba(10,17,34,0.9);border:1px solid #1d2942;border-radius:8px;padding:12px;font:14px monospace;color:#7e93b5;box-shadow:0 4px 12px rgba(0,0,0,0.5);z-index:100;pointer-events:none;}
.tp-shortcuts h4{margin:0 0 10px 0;color:#6FC8F0;font-size:16px;text-transform:uppercase;}
.tp-shortcuts div{margin-bottom:6px;}
.tp-wheel-col{background:#03060f;border:1px solid #1d2942;border-radius:10px;display:flex;flex-direction:column;align-items:center;padding:15px 0;width:80px;}
.tp-wheel-container{flex:1;width:100%;display:flex;justify-content:center;align-items:center;}
.tp-wheel{-webkit-appearance:slider-vertical;appearance:slider-vertical;width:60px;height:100%;cursor:grab;}
/* Reading line sits in the LOWER THIRD — near where a real teleprompter's glass
   folds out from the monitor base, so the presenter reads close to the lens. */
.tp-mid{position:absolute;left:0;right:0;top:68%;height:2px;background:rgba(111,200,240,.35);pointer-events:none;}
.tp-mid::before{content:'▶';position:absolute;left:3%;top:-10px;color:#6FC8F0;font-size:22px;line-height:22px;text-shadow:0 2px 4px rgba(0,0,0,0.8);}
.tp-mid::after{content:'◀';position:absolute;right:3%;top:-10px;color:#6FC8F0;font-size:22px;line-height:22px;text-shadow:0 2px 4px rgba(0,0,0,0.8);}
`;

const plugin: EditorPlugin = {
  id: 'prompter',
  title: 'PROMPTER · TELEPROMPTER',
  order: 9,
  match: (n) => /prompt/i.test(n),
  render(host, ctx) {
    host.tabIndex = 0; // Make host focusable for keyboard shortcuts
    addStyles('twist-editor-prompter', CSS);
    const script = el('div', { class: 'tp-script', contenteditable: 'true', spellcheck: 'false' }) as HTMLDivElement;
    const gutter = el('div', { class: 'tp-gutter' });
    const scriptContainer = el('div', { class: 'tp-script-container' }, [gutter, script]);
    
    const toolbar = el('div', { class: 'tp-toolbar' }, [
       el('button', { class: 'tp-tool-btn', 'data-cmd': 'bold' }, ['B']),
       el('button', { class: 'tp-tool-btn', 'data-cmd': 'italic', style: 'font-style:italic;' }, ['I']),
       el('button', { class: 'tp-tool-btn', 'data-cmd': 'underline', style: 'text-decoration:underline;' }, ['U']),
       el('input', { type: 'color', class: 'tp-tool-color', id: 'fg-color', title: 'Text Color', value: '#ff0000' }),
       el('input', { type: 'color', class: 'tp-tool-color', id: 'bg-color', title: 'Highlight Color', value: '#ffff00' })
    ]);
    const scriptWrapper = el('div', { class: 'tp-script-wrapper' }, [toolbar, scriptContainer]);

    toolbar.addEventListener('mousedown', (e) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON') {
         e.preventDefault(); // keep focus on script
         document.execCommand(target.dataset.cmd!, false, '');
         rebuild(); saveScript(); ctx.services.publishParam?.('script', script.innerHTML);
      }
    });
    toolbar.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.tagName === 'INPUT') {
         document.execCommand(target.id === 'fg-color' ? 'foreColor' : 'backColor', false, target.value);
         script.focus(); rebuild(); saveScript(); ctx.services.publishParam?.('script', script.innerHTML);
      }
    });

    const updateGutter = () => {
      const lines = script.innerText.split('\n').length;
      gutter.textContent = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
    };
    script.addEventListener('scroll', () => { gutter.scrollTop = script.scrollTop; });
    
    // Seat memory & script loading
    const scriptKey = `spog.prompter.${ctx.twist.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    let savedScript: string | null = null;
    try { savedScript = localStorage.getItem(scriptKey); } catch { /* private mode */ }
    script.innerHTML = savedScript ?? `
      <div>GOOD EVENING, AND WELCOME TO THE BROADCAST.</div><br>
      <div>OUR TOP STORY TONIGHT — THE ROUTING MATRIX IS FULLY ONLINE.</div><br>
      <div>[STORY: WEATHER]</div>
      <div>[GPO: STUDIO_LIGHTS]</div>
      <div>COMING UP: WEATHER, SPORTS, AND A LOOK AT THE WEEK AHEAD.</div><br>
      <div>[TAKE CAMERA 2]</div>
      <div>BUT FIRST, LET US GO LIVE TO THE FIELD.</div>
      <div>[GPO: FIELD_MIC]</div><br>
      <div>STAND BY... AND WE ARE ON AIR.</div>
    `;
    const saveScript = (): void => { try { localStorage.setItem(scriptKey, script.innerHTML); } catch { /* ignore */ } };
    updateGutter();
    // New Meta Options
    let uppercase = true;
    let stripCues = false;
    let lineHeight = 1.6;
    let textColor = '#ffffff';
    let bgColor = '#000000';

    const scroll = el('div', { class: 'tp-scroll' });
    const stage = el('div', { class: 'tp-stage' }, [scroll, el('div', { class: 'tp-mid' })]);

    const rebuild = (): void => {
      stage.style.backgroundColor = bgColor;
      scroll.style.color = textColor;
      scroll.style.lineHeight = String(lineHeight);
      scroll.style.textTransform = uppercase ? 'uppercase' : 'none';
      
      let html = script.innerHTML;
      
      html = html.replace(/\[GPO:\s*(.+?)\]/gi, (match, cmd) => {
         return `<div class="gpo-marker" data-cmd="${cmd}" style="${stripCues ? 'visibility:hidden;height:0;margin:0;padding:0;border:none;' : ''}">⚡ GPO: ${cmd}</div>`;
      });
      
      html = html.replace(/\[STORY:\s*(.+?)\]/gi, (match, title) => {
         if (stripCues) return '';
         return `<div class="story-marker">${title}</div>`;
      });
      
      if (stripCues) {
         html = html.replace(/\[.*?\]/g, ''); 
      }
      
      scroll.innerHTML = html;
    };

    // Re-flow on edit + publish the script text (throttled — safe for keystroke bursts).
    script.addEventListener('input', () => { updateGutter(); rebuild(); saveScript(); ctx.services.publishParam?.('script', script.innerHTML); }); 

    const playBtn = el('button', { class: 'tp-btn on' }, ['▶ Run']);
    const mirrorBtn = el('button', { class: 'tp-btn' }, ['Mirror']);
    let speed = 40, size = 34, running = true, mirrored = false;
    const setSize = (): void => { scroll.style.fontSize = `${size}px`; };
    const applyTransform = (): void => { scroll.style.transform = `translateY(${y}px)${mirrored ? ' scaleX(-1)' : ''}`; };
    
    // Reflect run / mirror state → DOM only (no publish — shared by local + inbound writes).
    const reflectPlay = (): void => { playBtn.classList.toggle('on', running); playBtn.textContent = running ? '▶ Run' : '⏸ Hold'; };
    const reflectMirror = (): void => { mirrorBtn.classList.toggle('on', mirrored); applyTransform(); };
    
    const speedIn = el('input', { type: 'range', min: '-160', max: '160', value: String(speed) }) as HTMLInputElement;
    const sizeIn = el('input', { type: 'range', min: '18', max: '64', value: String(size) }) as HTMLInputElement;
    const wheelIn = el('input', { class: 'tp-wheel', type: 'range', min: '-160', max: '160', value: String(speed), orient: 'vertical' } as any) as HTMLInputElement;

    const onSpeedChange = (v: number) => {
      speed = v; speedIn.value = String(v); wheelIn.value = String(v); ctx.services.publishParam?.('speed', speed);
    };

    speedIn.addEventListener('input', () => onSpeedChange(+speedIn.value));
    wheelIn.addEventListener('input', () => onSpeedChange(+wheelIn.value));
    sizeIn.addEventListener('input', () => { size = +sizeIn.value; setSize(); ctx.services.publishParam?.('size', size); }); 

    host.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      let newSpeed: number | null = null;
      switch(e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          running = !running; reflectPlay(); ctx.services.publishParam?.('play', running, { throttle: false });
          break;
        case 'q': newSpeed = -80; break;
        case '1': newSpeed = 0; break;
        case '2': newSpeed = 20; break;
        case '3': newSpeed = 40; break;
        case '4': newSpeed = 80; break;
        case '5': newSpeed = 120; break;
      }
      if (newSpeed !== null) onSpeedChange(newSpeed);
    });

    // Play/pause is a discrete one-shot → publish un-throttled so it lands immediately.
    playBtn.addEventListener('click', () => { running = !running; reflectPlay(); ctx.services.publishParam?.('play', running, { throttle: false }); });
    mirrorBtn.addEventListener('click', () => { mirrored = !mirrored; reflectMirror(); ctx.services.publishParam?.('mirror', mirrored, { throttle: false }); });
    const rewind = el('button', { class: 'tp-btn' }, ['⟲ Top']);
    let y = stage.clientHeight || 300;
    let prevY = y;
    rewind.addEventListener('click', () => { y = stage.clientHeight || 300; prevY = y; ctx.services.publishParam?.('position', y); });

    // File Import / Export / Add/Remove Line Numbers
    const importBtn = el('button', { class: 'tp-file-btn' }, ['Import .txt']);
    const exportBtn = el('button', { class: 'tp-file-btn' }, ['Export .txt']);
    const addLineNumBtn = el('button', { class: 'tp-file-btn' }, ['Add Line #s']);
    const removeLineNumBtn = el('button', { class: 'tp-file-btn' }, ['Remove Line #s']);
    const fileInput = el('input', { type: 'file', accept: '.txt', style: 'display:none' }) as HTMLInputElement;
    
    addLineNumBtn.addEventListener('click', () => {
      let counter = 1;
      const blocks = script.querySelectorAll('div, p');
      if (blocks.length > 0) {
        blocks.forEach(b => {
           const t = (b as HTMLElement).innerText;
           if (t.trim() && !/^\d+:\s/.test(t)) {
             b.insertAdjacentText('afterbegin', `${counter++}: `);
           } else if (/^\d+:\s/.test(t)) counter++;
        });
      } else {
         if (!/^\d+:\s/.test(script.innerText)) script.insertAdjacentText('afterbegin', `1: `);
      }
      updateGutter(); rebuild(); saveScript();
      ctx.services.publishParam?.('script', script.innerHTML);
    });

    removeLineNumBtn.addEventListener('click', () => {
      script.innerHTML = script.innerHTML.replace(/(^|>)\d+:\s*/g, '$1');
      updateGutter(); rebuild(); saveScript();
      ctx.services.publishParam?.('script', script.innerHTML);
    });

    importBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        script.innerHTML = text.split('\n').map(line => `<div>${line}</div>`).join('');
        updateGutter(); rebuild(); saveScript();
        ctx.services.publishParam?.('script', script.innerHTML);
      }
      fileInput.value = '';
    });

    exportBtn.addEventListener('click', () => {
      const blob = new Blob([script.innerText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = el('a', { href: url, download: 'prompter_script.txt', style: 'display:none' });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    // Configuration Checkboxes
    const upperCheck = el('input', { type: 'checkbox', checked: uppercase }) as HTMLInputElement;
    const stripCheck = el('input', { type: 'checkbox', checked: stripCues }) as HTMLInputElement;
    const lineIn = el('input', { type: 'range', min: '1.0', max: '3.0', step: '0.1', value: String(lineHeight) }) as HTMLInputElement;
    const tcIn = el('input', { type: 'color', value: textColor }) as HTMLInputElement;
    const bgIn = el('input', { type: 'color', value: bgColor }) as HTMLInputElement;

    const bindCfg = (input: HTMLInputElement, key: string, setter: (v: any) => void) => {
      input.addEventListener('input', () => {
        const val = input.type === 'checkbox' ? input.checked : (input.type === 'range' ? +input.value : input.value);
        setter(val); rebuild(); ctx.services.publishParam?.(key, val);
      });
    };
    bindCfg(upperCheck, 'uppercase', v => uppercase = v);
    bindCfg(stripCheck, 'stripCues', v => stripCues = v);
    bindCfg(lineIn, 'lineHeight', v => lineHeight = v);
    bindCfg(tcIn, 'textColor', v => textColor = v);
    bindCfg(bgIn, 'bgColor', v => bgColor = v);

    const gpoLog = el('div', { class: 'tp-gpo-log' });
    const triggerGPO = (cmd: string) => {
      ctx.services.publishParam?.('gpo', cmd, { throttle: false });
      const entry = el('div', { class: 'tp-gpo-entry' }, [`${new Date().toLocaleTimeString()} - Triggered: ${cmd}`]);
      gpoLog.prepend(entry);
      if (gpoLog.children.length > 10) gpoLog.removeChild(gpoLog.lastChild!);
    };

    const shortcutWin = el('div', { class: 'tp-shortcuts' }, [
      el('h4', {}, ['Shortcuts']),
      el('div', {}, ['[Space] Play / Pause']),
      el('div', {}, ['[ Q ] Reverse (-80)']),
      el('div', {}, ['[ 1 ] Stop (0)']),
      el('div', {}, ['[ 2 ] Slow (20)']),
      el('div', {}, ['[ 3 ] Normal (40)']),
      el('div', {}, ['[ 4 ] Fast (80)']),
      el('div', {}, ['[ 5 ] Max (120)']),
    ]);

    const wheelCol = el('div', { class: 'tp-wheel-col' }, [
      el('div', { style: 'text-align:center;color:#7e93b5;font:16px monospace;margin-top:10px;font-weight:bold;' }, ['Fwd']),
      el('div', { class: 'tp-wheel-container' }, [wheelIn]),
      el('div', { style: 'text-align:center;color:#7e93b5;font:16px monospace;margin-bottom:10px;font-weight:bold;' }, ['Rev']),
    ]);

    host.append(el('div', { class: 'tp' }, [
      el('div', { class: 'tp-col' }, [
        el('div', { style: 'display:flex; justify-content:space-between; align-items:center;' }, [
          el('h4', {}, ['Script']),
          el('div', { style: 'display:flex; gap:8px;' }, [addLineNumBtn, removeLineNumBtn, importBtn, exportBtn, fileInput])
        ]),
        scriptWrapper,
        el('div', { class: 'tp-config' }, [
          el('label', {}, [upperCheck, 'ALL CAPS']),
          el('label', {}, [stripCheck, 'STRIP CUES']),
          el('label', {}, ['LINE HT', lineIn]),
          el('label', {}, ['TEXT', tcIn]),
          el('label', {}, ['BG', bgIn]),
        ]),
        el('div', { class: 'tp-ctrls' }, [playBtn, mirrorBtn, rewind]),
        el('div', { class: 'tp-slide' }, ['SPEED', speedIn]),
        el('div', { class: 'tp-slide' }, ['SIZE', sizeIn]),
        el('h4', { style: 'margin-top:10px;' }, ['Trigger Outputs']),
        gpoLog
      ]),
      el('div', { class: 'tp-col' }, [
        el('h4', {}, ['On-air feed']), 
        el('div', { style: 'display:flex; flex:1; min-height:0; gap:14px;' }, [
          stage,
          wheelCol
        ])
      ]),
      shortcutWin
    ]));

    // Advertise every control R/W so an external prompter controller can drive it.
    ctx.services.advertiseParams?.([
      { name: 'speed', type: 'number', unit: 'px/s', min: 5, max: 160, writable: true },
      { name: 'size', type: 'number', unit: 'px', min: 18, max: 64, writable: true },
      { name: 'position', type: 'number', unit: 'px', writable: true },
      { name: 'play', type: 'bool', writable: true },
      { name: 'mirror', type: 'bool', writable: true },
      { name: 'script', type: 'string', writable: true },
      { name: 'uppercase', type: 'bool', writable: true },
      { name: 'stripCues', type: 'bool', writable: true },
      { name: 'lineHeight', type: 'number', writable: true },
      { name: 'textColor', type: 'string', writable: true },
      { name: 'bgColor', type: 'string', writable: true },
    ]);
    
    // Honour inbound writes from the bus / other consoles — apply WITHOUT re-publishing.
    ctx.services.onParam?.('speed', (v) => { if (typeof v === 'number') { speed = v; speedIn.value = String(speed); wheelIn.value = String(speed); } });
    ctx.services.onParam?.('size', (v) => { if (typeof v === 'number') { size = v; sizeIn.value = String(size); setSize(); } });
    ctx.services.onParam?.('position', (v) => { if (typeof v === 'number') { y = v; prevY = v; applyTransform(); } });
    ctx.services.onParam?.('play', (v) => { running = !!v; reflectPlay(); });
    ctx.services.onParam?.('mirror', (v) => { mirrored = !!v; reflectMirror(); });
    ctx.services.onParam?.('script', (v) => { if (typeof v === 'string') { script.innerHTML = v; updateGutter(); rebuild(); saveScript(); } });
    
    ctx.services.onParam?.('uppercase', (v) => { if (typeof v === 'boolean') { uppercase = v; upperCheck.checked = v; rebuild(); } });
    ctx.services.onParam?.('stripCues', (v) => { if (typeof v === 'boolean') { stripCues = v; stripCheck.checked = v; rebuild(); } });
    ctx.services.onParam?.('lineHeight', (v) => { if (typeof v === 'number') { lineHeight = v; lineIn.value = String(v); rebuild(); } });
    ctx.services.onParam?.('textColor', (v) => { if (typeof v === 'string') { textColor = v; tcIn.value = v; rebuild(); } });
    ctx.services.onParam?.('bgColor', (v) => { if (typeof v === 'string') { bgColor = v; bgIn.value = v; rebuild(); } });

    // Seed retained values so a late-joining consumer sees current state.
    ctx.services.publishParam?.('speed', speed);
    ctx.services.publishParam?.('size', size);
    ctx.services.publishParam?.('play', running, { throttle: false });
    ctx.services.publishParam?.('mirror', mirrored, { throttle: false });
    ctx.services.publishParam?.('script', script.innerHTML);
    ctx.services.publishParam?.('uppercase', uppercase);
    ctx.services.publishParam?.('stripCues', stripCues);
    ctx.services.publishParam?.('lineHeight', lineHeight);
    ctx.services.publishParam?.('textColor', textColor);
    ctx.services.publishParam?.('bgColor', bgColor);

    rebuild();
    setSize();

    y = stage.clientHeight || 300;
    prevY = y;
    ctx.dispose.raf(() => {
      if (running) {
        y -= speed / 60;
        const stageH = stage.clientHeight || 300;
        if (y < -scroll.offsetHeight) {
          y = stageH;   // loop forward
          prevY = y; // prevent false triggers on loop wrap
        } else if (y > stageH) {
          y = -scroll.offsetHeight; // loop reverse
          prevY = y;
        }
        ctx.services.publishParam?.('position', y);   // throttled scroll telemetry
        
        const midY = stage.clientHeight * 0.68;
        const markers = scroll.querySelectorAll('.gpo-marker') as NodeListOf<HTMLElement>;
        markers.forEach(m => {
           const top = m.offsetTop;
           const curr = y + top;
           const prev = prevY + top;
           if (curr <= midY && prev > midY) {
             triggerGPO(m.dataset.cmd!);
           }
        });
      }
      applyTransform();
      prevY = y;
    });
  },
};

export default plugin;

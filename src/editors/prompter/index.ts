// src/editors/prompter/index.ts — teleprompter feed for a Person (People/Places/Things §2).
//
// One of the "things" routed to a person: their prompter. A scrolling script with
// speed / font / mirror controls and a title-safe reading area. Self-contained.

import { VOICE_COMMANDS } from './VOICE.js';
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
.tp-stage{aspect-ratio:1/1;max-height:100%;margin:0 auto;position:relative;overflow:hidden;background:#000;border:1px solid #1d2942;border-radius:10px;}
.tp-scroll{position:absolute;left:0;right:0;top:0;padding:0 9%;color:#fff;font-weight:800;text-align:center;
  text-shadow:0 2px 8px rgba(0,0,0,.8);will-change:transform;}
.tp-scroll.show-lines { counter-reset: tp-line; }
.tp-scroll.show-lines > div, .tp-scroll.show-lines > p { counter-increment: tp-line; }
.tp-scroll.show-lines > div::before, .tp-scroll.show-lines > p::before { content: counter(tp-line) ": "; opacity: 0.5; margin-right: 8px; }
.tp-scroll p{margin:0 0 .7em;}
.story-marker{color:#ffcc33;font-weight:700;font-size:0.65em;border-top:1px dashed rgba(255,255,255,0.35);padding-top:4px;margin-top:8px;text-transform:uppercase;}
.gpo-marker{color:#ff3366;font-weight:700;font-size:0.65em;border-top:1px dashed rgba(255,51,102,0.35);padding-top:4px;margin-top:8px;text-transform:uppercase;}
.tp-gpo-log{height:80px;overflow-y:auto;background:#0a1122;border:1px solid #1d2942;border-radius:8px;padding:8px;font:14px monospace;color:#ff3366;}
.tp-gpo-entry{margin-bottom:4px;border-bottom:1px dashed #1d2942;padding-bottom:4px;}
.tp-shortcuts{position:absolute;bottom:20px;right:100px;background:rgba(10,17,34,0.9);border:1px solid #1d2942;border-radius:8px;padding:12px;font:14px monospace;color:#7e93b5;box-shadow:0 4px 12px rgba(0,0,0,0.5);z-index:100;pointer-events:none;}
.tp-shortcuts h4{margin:0 0 10px 0;color:#6FC8F0;font-size:16px;text-transform:uppercase;}
.tp-shortcuts div{margin-bottom:6px;}
.tp-wheel-col{background:#03060f;border:1px solid #1d2942;border-radius:10px;display:flex;flex-direction:column;align-items:center;padding:15px 0;width:80px;}
.tp-pace-container { position:relative; flex:1; width:48px; background:#03060f; border:2px solid #1d2942; border-radius:8px; cursor:pointer; user-select:none; overflow:hidden; margin-bottom:10px; }
.tp-wheel-bg { position:absolute; top:0; left:0; right:0; bottom:0; background-image:repeating-linear-gradient(transparent, transparent 18px, rgba(111,200,240,0.15) 18px, rgba(111,200,240,0.15) 20px); background-size:100% 20px; z-index:1; }
.tp-pace-track { position:absolute; left:50%; width:8px; top:10px; bottom:10px; margin-left:-4px; background:rgba(29,41,66,0.5); border-radius:4px; z-index:2; }
.tp-pace-fill { position:absolute; left:0; right:0; border-radius:4px; z-index:3; }
.tp-pace-thumb { position:absolute; left:-8px; right:-8px; height:16px; margin-top:-8px; background:#fff; border:3px solid #6FC8F0; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.8); z-index:4; pointer-events:none; }
.tp-pace-center { position:absolute; top:50%; left:5px; right:5px; height:2px; margin-top:-1px; background:#fff; opacity:0.3; z-index:2; }
.tp-wheel-label { color:#6FC8F0; font:bold 18px monospace; margin-bottom:10px; text-shadow:0 2px 4px #000; }
.tp-mid{position:absolute;left:0;right:0;top:50%;height:2px;background:rgba(111,200,240,.35);pointer-events:none;margin-top:-1px;}
.tp-mid::before{content:'▶';position:absolute;left:3%;top:-10px;color:#6FC8F0;font-size:22px;line-height:22px;text-shadow:0 2px 4px rgba(0,0,0,0.8);}
.tp-mid::after{content:'◀';position:absolute;right:3%;top:-10px;color:#6FC8F0;font-size:22px;line-height:22px;text-shadow:0 2px 4px rgba(0,0,0,0.8);}
`;

const plugin: EditorPlugin = {
  id: 'prompter',
  title: 'PROMPTER · TELEPROMPTER',
  order: 9,
  match: (n) => /prompt/i.test(n),
  voiceCommands: VOICE_COMMANDS,
  render(host, ctx) {
    host.tabIndex = 0; // Make host focusable for keyboard shortcuts
    addStyles('twist-editor-prompter', CSS);
    const script = el('div', { class: 'tp-script', contentEditable: 'true', spellcheck: false }) as HTMLDivElement;
    const gutter = el('div', { class: 'tp-gutter' });
    const scriptContainer = el('div', { class: 'tp-script-container' }, [gutter, script]);
    
    const toolbar = el('div', { class: 'tp-toolbar' }, [
       el('button', { class: 'tp-tool-btn', dataset: { cmd: 'bold' } }, ['B']),
       el('button', { class: 'tp-tool-btn', dataset: { cmd: 'italic' }, style: 'font-style:italic;' }, ['I']),
       el('button', { class: 'tp-tool-btn', dataset: { cmd: 'underline' }, style: 'text-decoration:underline;' }, ['U']),
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

    const wheelLabel = el('div', { class: 'tp-wheel-label' }, [String(speed)]);
    const wheelBg = el('div', { class: 'tp-wheel-bg' });
    const paceFill = el('div', { class: 'tp-pace-fill' });
    const paceThumb = el('div', { class: 'tp-pace-thumb' });
    const paceTrack = el('div', { class: 'tp-pace-track' }, [paceFill, paceThumb]);
    const paceContainer = el('div', { class: 'tp-pace-container' }, [
       wheelBg, el('div', { class: 'tp-pace-center' }), paceTrack
    ]);

    const updateWheelVisual = () => {
       const pct = (speed + 160) / 320;
       const top = (1 - pct) * 100;
       paceThumb.style.top = `${top}%`;
       if (speed >= 0) {
          paceFill.style.top = `${top}%`;
          paceFill.style.bottom = `50%`;
          paceFill.style.background = '#6FC8F0';
          paceFill.style.boxShadow = '0 0 10px #6FC8F0';
       } else {
          paceFill.style.top = `50%`;
          paceFill.style.bottom = `${100 - top}%`;
          paceFill.style.background = '#ff3366';
          paceFill.style.boxShadow = '0 0 10px #ff3366';
       }
       wheelLabel.textContent = Math.round(speed).toString();
    };

    const onSpeedChange = (v: number) => {
      speed = v; speedIn.value = String(v); updateWheelVisual(); ctx.services.publishParam?.('speed', speed);
    };

    let isPaceDragging = false;
    const updateSpeedFromEvent = (e: MouseEvent) => {
       const rect = paceContainer.getBoundingClientRect();
       const y = e.clientY - rect.top;
       const pct = 1 - (y / rect.height);
       const newSpeed = (pct * 320) - 160;
       onSpeedChange(Math.max(-160, Math.min(160, newSpeed)));
    };
    paceContainer.addEventListener('mousedown', (e) => { isPaceDragging = true; updateSpeedFromEvent(e); });
    window.addEventListener('mousemove', (e) => { if (isPaceDragging) updateSpeedFromEvent(e); });
    window.addEventListener('mouseup', () => isPaceDragging = false);

    speedIn.addEventListener('input', () => onSpeedChange(+speedIn.value));
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

    // File Import / Export / Line Numbers Toggle
    const importBtn = el('button', { class: 'tp-file-btn' }, ['Import .txt']);
    const exportBtn = el('button', { class: 'tp-file-btn' }, ['Export .txt']);
    const lineNumBtn = el('button', { class: 'tp-btn' }, ['Line #s']);
    lineNumBtn.style.fontSize = '16px';
    lineNumBtn.style.padding = '8px 16px';
    const fileInput = el('input', { type: 'file', accept: '.txt', style: 'display:none' }) as HTMLInputElement;
    
    let showLineNumbers = false;
    const reflectLineNumbers = (): void => {
      lineNumBtn.classList.toggle('on', showLineNumbers);
      scroll.classList.toggle('show-lines', showLineNumbers);
    };

    lineNumBtn.addEventListener('click', () => {
      showLineNumbers = !showLineNumbers;
      reflectLineNumbers();
      ctx.services.publishParam?.('lines', showLineNumbers, { throttle: false });
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
      wheelLabel,
      paceContainer,
      el('div', { style: 'text-align:center;color:#7e93b5;font:16px monospace;margin-bottom:10px;font-weight:bold;' }, ['Rev']),
    ]);

    host.append(el('div', { class: 'tp' }, [
      el('div', { class: 'tp-col' }, [
        el('div', { style: 'display:flex; justify-content:space-between; align-items:center;' }, [
          el('h4', {}, ['Script']),
          el('div', { style: 'display:flex; gap:8px;' }, [lineNumBtn, importBtn, exportBtn, fileInput])
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
      { name: 'lines', type: 'bool', writable: true },
    ]);
    
    // Honour inbound writes from the bus / other consoles — apply WITHOUT re-publishing.
    ctx.services.onParam?.('speed', (v) => { if (typeof v === 'number') { speed = v; speedIn.value = String(speed); updateWheelVisual(); } });
    ctx.services.onParam?.('size', (v) => { if (typeof v === 'number') { size = v; sizeIn.value = String(size); setSize(); } });
    ctx.services.onParam?.('position', (v) => { 
      if (typeof v === 'number') { 
        // If both consoles are playing, avoid network fighting ("up then down") by ignoring small drifts
        if (running && Math.abs(y - v) < 50) return;
        y = v; prevY = v; applyTransform(); 
      } 
    });
    ctx.services.onParam?.('play', (v) => { running = !!v; reflectPlay(); });
    ctx.services.onParam?.('mirror', (v) => { mirrored = !!v; reflectMirror(); });
    ctx.services.onParam?.('script', (v) => { if (typeof v === 'string') { script.innerHTML = v; updateGutter(); rebuild(); saveScript(); } });
    
    ctx.services.onParam?.('uppercase', (v) => { if (typeof v === 'boolean') { uppercase = v; upperCheck.checked = v; rebuild(); } });
    ctx.services.onParam?.('stripCues', (v) => { if (typeof v === 'boolean') { stripCues = v; stripCheck.checked = v; rebuild(); } });
    ctx.services.onParam?.('lineHeight', (v) => { if (typeof v === 'number') { lineHeight = v; lineIn.value = String(v); rebuild(); } });
    ctx.services.onParam?.('textColor', (v) => { if (typeof v === 'string') { textColor = v; tcIn.value = v; rebuild(); } });
    ctx.services.onParam?.('bgColor', (v) => { if (typeof v === 'string') { bgColor = v; bgIn.value = v; rebuild(); } });
    ctx.services.onParam?.('lines', (v) => { if (typeof v === 'boolean') { showLineNumbers = v; reflectLineNumbers(); } });

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
    ctx.services.publishParam?.('lines', showLineNumbers);

    rebuild();
    setSize();

    y = stage.clientHeight || 300;
    prevY = y;
    let bgY = 0;
    let prevTime = performance.now();
    ctx.dispose.raf(() => {
      const now = performance.now();
      const dt = (now - prevTime) / 1000;
      prevTime = now;
      
      if (running) {
        y -= speed * dt;
        bgY += (speed * dt) * 2;
        if (bgY > 20) bgY -= 20;
        else if (bgY < -20) bgY += 20;
        wheelBg.style.backgroundPositionY = `${bgY}px`;
        
        const stageH = stage.clientHeight || 300;
        if (y < -scroll.offsetHeight) {
          y = stageH;   // loop forward
          prevY = y; // prevent false triggers on loop wrap
        } else if (y > stageH) {
          y = -scroll.offsetHeight; // loop reverse
          prevY = y;
        }
        ctx.services.publishParam?.('position', y);   // throttled scroll telemetry
        
        const midY = stageH * 0.50;
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

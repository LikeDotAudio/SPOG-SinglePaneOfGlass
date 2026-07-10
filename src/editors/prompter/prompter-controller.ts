import { el } from '../../ui/dom.js';
import type { EditorContext } from '../types.js';
import { PrompterEngine } from './prompter-engine.js';
import { buildPrompterUI } from './prompter-ui.js';

export function wirePrompter(host: HTMLElement, ctx: EditorContext, ui: ReturnType<typeof buildPrompterUI>, engine: PrompterEngine) {
  const {
    script, gutter, toolbar, scroll, stage,
    playBtn, mirrorBtn, rewind, speedIn, sizeIn,
    wheelLabel, wheelBg, paceFill, paceThumb, paceContainer,
    importBtn, exportBtn, lineNumBtn, fileInput,
    upperCheck, stripCheck, lineIn, tcIn, bgIn, gpoLog
  } = ui;

  const scriptKey = `spog.prompter.${ctx.twist.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const saveScript = (): void => { try { localStorage.setItem(scriptKey, script.innerHTML); } catch { /* ignore */ } };
  
  const updateGutter = () => {
    const lines = script.innerText.split('\n').length;
    gutter.textContent = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
  };

  const rebuild = (): void => {
    stage.style.backgroundColor = engine.bgColor;
    scroll.style.color = engine.textColor;
    scroll.style.lineHeight = String(engine.lineHeight);
    scroll.style.textTransform = engine.uppercase ? 'uppercase' : 'none';
    
    let html = script.innerHTML;
    html = html.replace(/\[GPO:\s*(.+?)\]/gi, (match, cmd) => {
       return `<div class="gpo-marker" data-cmd="${cmd}" style="${engine.stripCues ? 'visibility:hidden;height:0;margin:0;padding:0;border:none;' : ''}">⚡ GPO: ${cmd}</div>`;
    });
    html = html.replace(/\[STORY:\s*(.+?)\]/gi, (match, title) => {
       if (engine.stripCues) return '';
       return `<div class="story-marker">${title}</div>`;
    });
    if (engine.stripCues) html = html.replace(/\[.*?\]/g, ''); 
    scroll.innerHTML = html;
  };

  script.addEventListener('scroll', () => { gutter.scrollTop = script.scrollTop; });
  script.addEventListener('input', () => { updateGutter(); rebuild(); saveScript(); ctx.services.publishParam?.('script', script.innerHTML); }); 

  toolbar.addEventListener('mousedown', (e) => {
    const target = (e.target as HTMLElement).closest('button');
    if (!target) return;
    e.preventDefault();
    if (target.dataset['hl'] !== undefined) {
       document.execCommand('hiliteColor', false, target.dataset['hl']!) ||
       document.execCommand('backColor', false, target.dataset['hl']!);
    } else if (target.dataset['cmd']) {
       document.execCommand(target.dataset['cmd']!, false, '');
    }
    script.focus(); rebuild(); saveScript(); ctx.services.publishParam?.('script', script.innerHTML);
  });

  const setSize = (): void => { scroll.style.fontSize = `${engine.size}px`; };
  const reflectPlay = (): void => { playBtn.classList.toggle('on', engine.running); playBtn.textContent = engine.running ? '▶ Run' : '⏸ Hold'; };
  const reflectMirror = (): void => { mirrorBtn.classList.toggle('on', engine.mirrored); };
  const reflectLineNumbers = (): void => { lineNumBtn.classList.toggle('on', engine.showLineNumbers); scroll.classList.toggle('show-lines', engine.showLineNumbers); };

  const updateWheelVisual = () => {
     const pct = (engine.speed + 160) / 320;
     const top = (1 - pct) * 100;
     paceThumb.style.top = `${top}%`;
     if (engine.speed >= 0) {
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
     wheelLabel.textContent = Math.round(engine.speed).toString();
  };

  const onSpeedChange = (v: number) => {
    engine.speed = v; speedIn.value = String(v); updateWheelVisual(); ctx.services.publishParam?.('speed', engine.speed);
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
  sizeIn.addEventListener('input', () => { engine.size = +sizeIn.value; setSize(); ctx.services.publishParam?.('size', engine.size); }); 

  host.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
    let newSpeed: number | null = null;
    switch(e.key.toLowerCase()) {
      case ' ': e.preventDefault(); engine.running = !engine.running; reflectPlay(); ctx.services.publishParam?.('play', engine.running, { throttle: false }); break;
      case 'q': newSpeed = -80; break;
      case '1': newSpeed = 0; break;
      case '2': newSpeed = 20; break;
      case '3': newSpeed = 40; break;
      case '4': newSpeed = 80; break;
      case '5': newSpeed = 120; break;
    }
    if (newSpeed !== null) onSpeedChange(newSpeed);
  });

  playBtn.addEventListener('click', () => { engine.running = !engine.running; reflectPlay(); ctx.services.publishParam?.('play', engine.running, { throttle: false }); });
  mirrorBtn.addEventListener('click', () => { engine.mirrored = !engine.mirrored; reflectMirror(); ctx.services.publishParam?.('mirror', engine.mirrored, { throttle: false }); });
  rewind.addEventListener('click', () => { engine.initY(stage.clientHeight || 300); ctx.services.publishParam?.('position', engine.y); });
  lineNumBtn.addEventListener('click', () => { engine.showLineNumbers = !engine.showLineNumbers; reflectLineNumbers(); ctx.services.publishParam?.('lines', engine.showLineNumbers, { throttle: false }); });

  importBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const text = await file.text();
      script.innerHTML = text.split('\n').map(line => `<div>${line}</div>`).join('');
      updateGutter(); rebuild(); saveScript(); ctx.services.publishParam?.('script', script.innerHTML);
    }
    fileInput.value = '';
  });

  exportBtn.addEventListener('click', () => {
    const blob = new Blob([script.innerText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: 'prompter_script.txt', style: 'display:none' });
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  });

  const bindCfg = (input: HTMLInputElement, key: keyof PrompterEngine, setter: (v: any) => void) => {
    input.addEventListener('input', () => {
      const val = input.type === 'checkbox' ? input.checked : (input.type === 'range' ? +input.value : input.value);
      setter(val); rebuild(); ctx.services.publishParam?.(key, val);
    });
  };
  bindCfg(upperCheck, 'uppercase', v => engine.uppercase = v);
  bindCfg(stripCheck, 'stripCues', v => engine.stripCues = v);
  bindCfg(lineIn, 'lineHeight', v => engine.lineHeight = v);
  bindCfg(tcIn, 'textColor', v => engine.textColor = v);
  bindCfg(bgIn, 'bgColor', v => engine.bgColor = v);

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
  updateGutter();
  rebuild();
  setSize();
  engine.initY(stage.clientHeight || 300);

  return { reflectPlay, reflectMirror, reflectLineNumbers, updateWheelVisual, setSize, updateGutter, rebuild, saveScript };
}

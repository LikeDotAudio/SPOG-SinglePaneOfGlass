// src/editors/prompter/index.ts — teleprompter feed for a Person (People/Places/Things §2).
import { VOICE_COMMANDS } from './VOICE.js';
import type { EditorPlugin } from '../types.js';
import { addStyles, el } from '../../ui/dom.js';
import { PROMPTER_CSS as CSS } from './prompter-css.js';
import { buildPrompterUI } from './prompter-ui.js';
import { PrompterEngine } from './prompter-engine.js';
import { wirePrompter } from './prompter-controller.js';

const plugin: EditorPlugin = {
  id: 'prompter',
  title: 'PROMPTER · TELEPROMPTER',
  order: 9,
  match: (n) => /prompt/i.test(n),
  voiceCommands: VOICE_COMMANDS,
  render(host, ctx) {
    host.tabIndex = 0; // Make host focusable for keyboard shortcuts
    addStyles('twist-editor-prompter', CSS);
    
    const ui = buildPrompterUI();
    host.append(ui.root);

    const engine = new PrompterEngine({
      onPublish: (key, val, opts) => ctx.services.publishParam?.(key, val, opts),
      onTriggerGPO: (cmd) => {
        ctx.services.publishParam?.('gpo', cmd, { throttle: false });
        const entry = el('div', { class: 'tp-gpo-entry' }, [`${new Date().toLocaleTimeString()} - Triggered: ${cmd}`]);
        ui.gpoLog.prepend(entry);
        if (ui.gpoLog.children.length > 10) ui.gpoLog.removeChild(ui.gpoLog.lastChild!);
      },
      applyTransform: () => {
        ui.scroll.style.transform = `translateY(${engine.y}px)${engine.mirrored ? ' scaleX(-1)' : ''}`;
      },
      stageHeight: () => ui.stage.clientHeight || 300,
      scrollHeight: () => ui.scroll.offsetHeight,
      wheelBgStyle: (bgY) => ui.wheelBg.style.backgroundPositionY = `${bgY}px`
    });

    const fns = wirePrompter(host, ctx, ui, engine);

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
    ctx.services.onParam?.('speed', (v) => { if (typeof v === 'number') { engine.speed = v; ui.speedIn.value = String(v); fns.updateWheelVisual(); } });
    ctx.services.onParam?.('size', (v) => { if (typeof v === 'number') { engine.size = v; ui.sizeIn.value = String(v); fns.setSize(); } });
    ctx.services.onParam?.('position', (v) => {
      if (typeof v === 'number') {
        engine.setY(v);
      }
    });
    ctx.services.onParam?.('play', (v) => { engine.running = !!v; fns.reflectPlay(); });
    ctx.services.onParam?.('mirror', (v) => { engine.mirrored = !!v; fns.reflectMirror(); });
    ctx.services.onParam?.('script', (v) => { if (typeof v === 'string') { ui.script.innerHTML = v; fns.updateGutter(); fns.rebuild(); fns.saveScript(); } });
    
    ctx.services.onParam?.('uppercase', (v) => { if (typeof v === 'boolean') { engine.uppercase = v; ui.upperCheck.checked = v; fns.rebuild(); } });
    ctx.services.onParam?.('stripCues', (v) => { if (typeof v === 'boolean') { engine.stripCues = v; ui.stripCheck.checked = v; fns.rebuild(); } });
    ctx.services.onParam?.('lineHeight', (v) => { if (typeof v === 'number') { engine.lineHeight = v; ui.lineIn.value = String(v); fns.rebuild(); } });
    ctx.services.onParam?.('textColor', (v) => { if (typeof v === 'string') { engine.textColor = v; ui.tcIn.value = v; fns.rebuild(); } });
    ctx.services.onParam?.('bgColor', (v) => { if (typeof v === 'string') { engine.bgColor = v; ui.bgIn.value = v; fns.rebuild(); } });
    ctx.services.onParam?.('lines', (v) => { if (typeof v === 'boolean') { engine.showLineNumbers = v; fns.reflectLineNumbers(); } });

    // Seed retained values so a late-joining consumer sees current state.
    ctx.services.publishParam?.('speed', engine.speed);
    ctx.services.publishParam?.('size', engine.size);
    ctx.services.publishParam?.('play', engine.running, { throttle: false });
    ctx.services.publishParam?.('mirror', engine.mirrored, { throttle: false });
    ctx.services.publishParam?.('script', ui.script.innerHTML);
    ctx.services.publishParam?.('uppercase', engine.uppercase);
    ctx.services.publishParam?.('stripCues', engine.stripCues);
    ctx.services.publishParam?.('lineHeight', engine.lineHeight);
    ctx.services.publishParam?.('textColor', engine.textColor);
    ctx.services.publishParam?.('bgColor', engine.bgColor);
    ctx.services.publishParam?.('lines', engine.showLineNumbers);

    ctx.dispose.raf(() => {
      const res = engine.tick();
      if (res) {
        const markers = ui.scroll.querySelectorAll('.gpo-marker') as NodeListOf<HTMLElement>;
        markers.forEach(m => {
           const top = m.offsetTop;
           const curr = res.currY + top;
           const prev = res.prevY + top;
           if (curr <= res.midY && prev > res.midY) {
             engine['onTriggerGPO'](m.dataset['cmd']!);
           }
        });
      }
    });
  },
};

export default plugin;

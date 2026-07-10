import { el } from '../../ui/dom.js';

export function buildPrompterUI() {
  const script = el('div', { class: 'tp-script', contentEditable: 'true', spellcheck: false }) as HTMLDivElement;
  const gutter = el('div', { class: 'tp-gutter' });
  const scriptContainer = el('div', { class: 'tp-script-container' }, [gutter, script]);
  
  const HIGHLIGHTS = ['#ff5b2e', '#ffd21e', '#39d353', '#2ec5ff', '#c46bff', '#ff5fa2'];
  const hlPens = HIGHLIGHTS.map(c =>
    el('button', { class: 'tp-tool-hl', dataset: { hl: c }, style: `background:${c};`, title: `Highlight ${c}` }));
  const hlClear = el('button', { class: 'tp-tool-hl clear', dataset: { hl: 'transparent' }, title: 'Clear highlight' }, ['⌫']);

  const toolbar = el('div', { class: 'tp-toolbar' }, [
     el('button', { class: 'tp-tool-btn', dataset: { cmd: 'bold' } }, ['B']),
     el('button', { class: 'tp-tool-btn', dataset: { cmd: 'italic' }, style: 'font-style:italic;' }, ['I']),
     el('button', { class: 'tp-tool-btn', dataset: { cmd: 'underline' }, style: 'text-decoration:underline;' }, ['U']),
     el('div', { class: 'tp-tool-sep' }),
     ...hlPens,
     hlClear,
  ]);
  const scriptWrapper = el('div', { class: 'tp-script-wrapper' }, [toolbar, scriptContainer]);

  const scroll = el('div', { class: 'tp-scroll' });
  const stage = el('div', { class: 'tp-stage' }, [scroll, el('div', { class: 'tp-mid' })]);

  const playBtn = el('button', { class: 'tp-btn on' }, ['▶ Run']);
  const mirrorBtn = el('button', { class: 'tp-btn' }, ['Mirror']);
  const rewind = el('button', { class: 'tp-btn' }, ['⟲ Top']);
  
  const speedIn = el('input', { type: 'range', min: '-160', max: '160', value: '40' }) as HTMLInputElement;
  const sizeIn = el('input', { type: 'range', min: '18', max: '64', value: '34' }) as HTMLInputElement;

  const wheelLabel = el('div', { class: 'tp-wheel-label' }, ['40']);
  const wheelBg = el('div', { class: 'tp-wheel-bg' });
  const paceFill = el('div', { class: 'tp-pace-fill' });
  const paceThumb = el('div', { class: 'tp-pace-thumb' });
  const paceTrack = el('div', { class: 'tp-pace-track' }, [paceFill, paceThumb]);
  const paceContainer = el('div', { class: 'tp-pace-container' }, [
     wheelBg, el('div', { class: 'tp-pace-center' }), paceTrack
  ]);

  const importBtn = el('button', { class: 'tp-file-btn' }, ['Import .txt']);
  const exportBtn = el('button', { class: 'tp-file-btn' }, ['Export .txt']);
  const lineNumBtn = el('button', { class: 'tp-btn' }, ['Line #s']);
  lineNumBtn.style.fontSize = '16px';
  lineNumBtn.style.padding = '8px 16px';
  const fileInput = el('input', { type: 'file', accept: '.txt', style: 'display:none' }) as HTMLInputElement;
  
  const upperCheck = el('input', { type: 'checkbox', checked: true }) as HTMLInputElement;
  const stripCheck = el('input', { type: 'checkbox', checked: false }) as HTMLInputElement;
  const lineIn = el('input', { type: 'range', min: '1.0', max: '3.0', step: '0.1', value: '1.6' }) as HTMLInputElement;
  const tcIn = el('input', { type: 'color', value: '#ffffff' }) as HTMLInputElement;
  const bgIn = el('input', { type: 'color', value: '#000000' }) as HTMLInputElement;

  const gpoLog = el('div', { class: 'tp-gpo-log' });
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

  const root = el('div', { class: 'tp' }, [
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
  ]);

  return {
    root, script, gutter, toolbar, scroll, stage,
    playBtn, mirrorBtn, rewind, speedIn, sizeIn,
    wheelLabel, wheelBg, paceFill, paceThumb, paceContainer,
    importBtn, exportBtn, lineNumBtn, fileInput,
    upperCheck, stripCheck, lineIn, tcIn, bgIn, gpoLog
  };
}

import type { EditorPlugin } from '../types.js';
import { el, ctx2d } from '../../ui/dom.js';
import { injectWirelessStyles } from './styles.js';

const plugin: EditorPlugin = {
  id: 'wireless',
  title: 'WIRELESS TELEMETRY & RF MANAGEMENT',
  order: 8,
  match: (n) => /\bwireless\b/i.test(n),
  render(host, ctx) {
    injectWirelessStyles();

    const isController = (ctx.twist.config as any)?.type === 'wireless-controller';
    const titleText = isController ? 'Matrix & Coordination Controller' : 'Mic / IEM Telemetry';

    // 1. Dashboard (Traffic Light, Link Quality, Battery)
    let batteryLevel = 85;
    let linkQuality = 98;
    let trafficClass = 'status-ok';

    const renderMeter = (val: number, color: string) => {
      return el('div', { class: 'wl-meter-bg' }, [
        el('div', { class: 'wl-meter-fg', style: `width: ${val}%; background: ${color};` })
      ]);
    };

    const dashCard = el('div', { class: 'wl-card' }, [
      el('h4', {}, ['Dashboard Overview']),
      el('div', { class: 'wl-stat' }, [
        el('div', {}, [el('span', { class: `wl-traffic ${trafficClass}` }), 'Global Health']),
        el('span', { class: 'wl-stat-val' }, ['OPTIMAL'])
      ]),
      el('div', { class: 'wl-stat' }, [
        'Link Quality (SNR)',
        el('div', { style: 'display: flex; align-items: center;' }, [
          el('span', { class: 'wl-stat-val' }, [`${linkQuality}%`]),
          renderMeter(linkQuality, '#39d353')
        ])
      ]),
      el('div', { class: 'wl-stat' }, [
        'Battery Remaining',
        el('div', { style: 'display: flex; align-items: center;' }, [
          el('span', { class: 'wl-stat-val' }, ['07:45 (85%)']),
          renderMeter(batteryLevel, '#f1e05a')
        ])
      ]),
      el('div', { class: 'wl-stat' }, [
        'Active Antenna',
        el('span', { class: 'wl-stat-val' }, ['Diversity: B'])
      ])
    ]);

    // 2. Transmit / Receive Control (Gain, Mute, IEM)
    let rxGain = 0;
    const gainVal = el('span', { class: 'val' }, [`${rxGain} dB`]);
    const gainInp = el('input', { type: 'range', min: '-18', max: '42', step: '1', value: String(rxGain) }) as HTMLInputElement;
    gainInp.addEventListener('input', () => { gainVal.textContent = `${gainInp.value} dB`; });
    
    let iemMode = 'Stereo';
    const modeVal = el('span', { class: 'val' }, [iemMode]);
    const modeBtn = el('button', { class: 'wl-btn' }, ['Toggle Mode']);
    modeBtn.addEventListener('click', () => {
      iemMode = iemMode === 'Stereo' ? 'MixMode' : (iemMode === 'MixMode' ? 'Mono' : 'Stereo');
      modeVal.textContent = iemMode;
    });

    const txRxCard = el('div', { class: 'wl-card' }, [
      el('h4', {}, ['Transmitter & IEM Controls']),
      el('div', { class: 'wl-knobs' }, [
        el('div', { class: 'wl-knob' }, ['Audio Gain', gainInp, gainVal])
      ]),
      el('div', { class: 'wl-btn-row' }, [
        el('button', { class: 'wl-btn' }, ['RF MUTE']),
        el('button', { class: 'wl-btn' }, ['BLINK / IDENTIFY'])
      ]),
      el('div', { class: 'wl-iem-section' }, [
        el('h4', {}, ['IEM Mix Parameters']),
        el('div', { class: 'wl-stat' }, ['Transmission Mode', modeVal]),
        el('div', { class: 'wl-btn-row' }, [modeBtn])
      ])
    ]);

    // 3. Spectrum Analyzer (Canvas)
    const specCanvas = el('canvas') as HTMLCanvasElement;
    const specCard = el('div', { class: 'wl-card', style: 'grid-column: 1 / -1;' }, [
      el('h4', {}, ['Real-Time RF Spectrum (470 - 608 MHz)']),
      el('div', { class: 'wl-spectrum' }, [specCanvas]),
      el('div', { class: 'wl-btn-row', style: 'justify-content: space-between;' }, [
        el('div', { style: 'display: flex; gap: 10px;' }, [
          el('button', { class: 'wl-btn' }, ['Scan Environment']),
          el('button', { class: 'wl-btn' }, ['Calculate IMD'])
        ]),
        el('button', { class: 'wl-btn panic' }, ['DEPLOY BACKUP FREQ (PANIC)'])
      ])
    ]);

    // Draw Spectrum Mock
    ctx.dispose.raf(() => {
      const g = ctx2d(specCanvas);
      if (!g) return;
      const w = specCanvas.width = specCanvas.clientWidth;
      const h = specCanvas.height = specCanvas.clientHeight;
      
      g.clearRect(0, 0, w, h);
      g.strokeStyle = '#3a4c68';
      g.lineWidth = 1;
      
      // Draw grid
      for (let x = 0; x < w; x += 50) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      
      // Draw noise floor
      g.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      g.beginPath();
      const time = performance.now() / 500;
      for (let x = 0; x < w; x++) {
        const noise = h - 10 - Math.random() * 15 - Math.sin(x/20 + time) * 10;
        x === 0 ? g.moveTo(x, noise) : g.lineTo(x, noise);
      }
      g.stroke();

      // Draw active carrier
      const cx = w / 3;
      g.fillStyle = '#39d353';
      g.fillRect(cx - 2, 20, 4, h - 20);
      g.fillStyle = '#fff';
      g.font = '10px monospace';
      g.fillText('512.400 MHz (Active)', cx + 8, 30);
    });

    const grid = el('div', { class: 'wl-grid' }, [
      dashCard,
      txRxCard,
      specCard
    ]);

    host.append(el('div', { class: 'wl-editor' }, [
      el('h3', {}, [titleText]),
      grid
    ]));
  }
};

export default plugin;

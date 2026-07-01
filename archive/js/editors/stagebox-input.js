// js/editors/stagebox-input.js — Stage Box Input "Smart Object" editor. Full
// technical visibility of a physical input from the console: preamp gain +
// headroom, software-interlocked +48V phantom (Smart-Verify against the mic
// library — blocks ribbon mics), auto impedance match, cable-length HF
// compensation, stand-based high-pass, a channel alias, a PPM meter with a
// rolling 30-second history plot, and confidence monitoring.
import { register, addStyles, pushTimer, open } from './core.js';

const MICS = [
    { name: 'Sennheiser MKH 416', type: 'Shotgun', gain: [30, 60], imp: 25, ribbon: false, hpf: 80, sens: -32 },
    { name: 'Shure SM7B', type: 'Dynamic', gain: [50, 70], imp: 150, ribbon: false, hpf: 50, sens: -59 },
    { name: 'Royer R-121', type: 'Ribbon', gain: [45, 70], imp: 300, ribbon: true, hpf: 40, sens: -50 },
    { name: 'DPA 4061', type: 'Lavalier', gain: [25, 55], imp: 30, ribbon: false, hpf: 100, sens: -44 },
    { name: 'Neumann U87', type: 'Condenser', gain: [15, 50], imp: 200, ribbon: false, hpf: 60, sens: -38 },
];
const STANDS = { 'Boom Arm': 70, 'Floor Tripod': 110, 'Desk Mount': 90, 'Hand-Held': 60 };

const CSS = `
.sb{display:grid;grid-template-columns:300px minmax(0,1fr) 280px;gap:16px;height:100%;}
.sb-card{background:#0a1326;border:1px solid #1d2942;border-radius:12px;padding:16px;}
.sb-card h4{margin:0 0 12px;color:#6FC8F0;font-size:12px;letter-spacing:2px;text-transform:uppercase;}
.sb-col{display:flex;flex-direction:column;gap:14px;overflow:auto;}
.sb-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;font-size:13px;color:#aec6e4;}
.sb-row b{color:#fff;font-family:'Courier New',monospace;}
.sb-alias{width:100%;box-sizing:border-box;background:#070f1f;border:1px solid #2c3e5e;border-radius:8px;color:#fff;font:bold 15px 'Courier New',monospace;padding:9px 12px;letter-spacing:1px;}
.sb-sel{width:100%;box-sizing:border-box;background:#070f1f;border:1px solid #2c3e5e;border-radius:8px;color:#cfe6ff;font:13px sans-serif;padding:9px;}
.sb-knrow{display:flex;justify-content:space-around;margin:6px 0;}
.sb-kn{display:flex;flex-direction:column;align-items:center;gap:7px;}
.sb-dial{width:84px;height:84px;border-radius:50%;position:relative;cursor:ns-resize;touch-action:none;
    background:repeating-conic-gradient(from -136deg,#33486a 0 1.5deg,transparent 1.5deg 14deg),#070f1f;box-shadow:0 5px 13px rgba(0,0,0,.55);}
.sb-dial::before{content:'';position:absolute;inset:9%;border-radius:50%;background:conic-gradient(from 225deg,var(--c,#6FC8F0) calc(var(--p,50%) * 0.75),#15233c 0);
    -webkit-mask:radial-gradient(circle,transparent 53%,#000 55%);mask:radial-gradient(circle,transparent 53%,#000 55%);filter:drop-shadow(0 0 5px var(--c,#6FC8F0));}
.sb-dial::after{content:'';position:absolute;inset:24%;border-radius:50%;background:radial-gradient(circle at 42% 32%,#41618a,#13233c 72%);box-shadow:inset 0 2px 5px rgba(255,255,255,.2),0 2px 5px rgba(0,0,0,.5);}
.sb-dial i{position:absolute;left:50%;top:50%;width:4px;height:36%;border-radius:3px;background:var(--c,#6FC8F0);box-shadow:0 0 6px var(--c,#6FC8F0);transform-origin:50% 100%;transform:translate(-50%,-100%) rotate(var(--rot,0deg));}
.sb-kn b{font:bold 14px 'Courier New',monospace;color:#cfe6ff;} .sb-kn span{font-size:11px;color:#9fb6cc;}
.sb-key{display:block;width:100%;padding:14px;border-radius:10px;border:1px solid #2c3e5e;background:#0c1730;color:#bcd3ee;font:bold 13px sans-serif;letter-spacing:1px;text-transform:uppercase;cursor:pointer;text-align:center;margin-top:10px;}
.sb-key.on{background:#39d353;color:#04140a;border-color:#39d353;box-shadow:0 0 10px rgba(57,211,83,.5);}
.sb-key.conf.on{background:#6FC8F0;color:#001019;border-color:#6FC8F0;}
.sb-warn{margin-top:10px;padding:10px;border-radius:8px;background:rgba(255,59,59,.12);border:1px solid #ff3b3b;color:#ff9a9a;font:bold 11px sans-serif;display:none;}
.sb-warn.on{display:block;}
/* centre: meter + history */
.sb-mid{display:flex;flex-direction:column;gap:14px;}
.sb-metwrap{display:flex;gap:16px;align-items:stretch;flex:0 0 auto;}
.sb-meter{position:relative;width:34px;height:200px;border-radius:6px;overflow:hidden;box-shadow:inset 0 0 0 1px #1d2942;
    background:linear-gradient(to top,#0f7a39,#39d353 55%,#ffd400 80%,#ff2b2b 100%);}
.sb-meter .mask{position:absolute;left:0;right:0;top:0;background:#070f1f;}
.sb-meter .pk{position:absolute;left:0;right:0;height:2px;background:#fff;}
.sb-headroom{flex:1;font:13px 'Courier New',monospace;color:#aec6e4;line-height:2;}
.sb-headroom b{color:#fff;} .sb-headroom .hot{color:#ff6a6a;}
.sb-hist{flex:1;position:relative;background:#03060f;border:1px solid #1d2942;border-radius:10px;overflow:hidden;min-height:150px;}
.sb-hist canvas{position:absolute;inset:0;width:100%;height:100%;}
.sb-hist .cap{position:absolute;left:8px;top:6px;font:bold 10px 'Courier New',monospace;color:#6FC8F0;letter-spacing:1px;z-index:2;}
/* channel jump bar */
.sb-nav{display:flex;gap:8px;align-items:center;flex-wrap:wrap;flex:0 0 auto;}
.sb-nav .orig{font:bold 11px 'Courier New',monospace;color:#6FC8F0;letter-spacing:1px;margin-right:8px;}
.sb-tab{padding:9px 15px;border-radius:8px;border:1px solid #2c3e5e;background:#0c1730;color:#9fb6cc;font:bold 12px sans-serif;letter-spacing:1px;cursor:pointer;}
.sb-tab:hover{background:#16243d;}
.sb-tab.sel{background:#F2B74B;color:#1a1206;border-color:#F2B74B;}
.sb-bankl{font:bold 11px 'Courier New',monospace;color:#F2B74B;letter-spacing:1px;margin-right:4px;}
.sb-arrow{padding:9px 13px;border-radius:8px;border:1px solid #2c3e5e;background:#0c1730;color:#cfe6ff;font:900 13px sans-serif;cursor:pointer;}
.sb-arrow:hover{background:#16243d;}
.sb-slope{flex:1;padding:8px 4px;border-radius:6px;border:1px solid #2c3e5e;background:#0c1730;color:#9fb6cc;font:bold 10px sans-serif;letter-spacing:.5px;cursor:pointer;}
.sb-slope:hover{background:#16243d;} .sb-slope.sel{background:#6FC8F0;color:#001019;border-color:#6FC8F0;}
.sb-host .sb{height:100%;}
/* bank quad — 4 channels at 1/4 screen each */
.sb-bankgrid{flex:1;min-height:0;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:12px;overflow:auto;}
.sb-host{position:relative;min-width:0;min-height:0;overflow:auto;border:1px solid #1d2942;border-radius:10px;}
.sb-cell-tag{position:absolute;right:8px;top:6px;z-index:6;background:#F2B74B;color:#1a1206;font:900 11px sans-serif;letter-spacing:1px;border-radius:6px;padding:3px 9px;pointer-events:none;}
/* HPF response chart */
.sb-hpchart{width:100%;height:84px;margin-top:10px;background:#070f1f;border:1px solid #1d2942;border-radius:8px;display:block;}
`;

function buildPanel(body, chName) {
    addStyles('sb-styles', CSS);
    const s = { gain: 0.5, hpf: 0.3, pan: 0.5, phantom: false, conf: false, mic: 0, stand: 'Boom Arm', cable: 15, level: 0.3, target: 0.4, peak: 0.3 };
    const hist = [];

    body.innerHTML = `
      <div class="sb">
        <div class="sb-col">
          <div class="sb-card"><h4>Input Asset</h4>
            <div class="sb-row" style="display:block"><span>Channel Alias</span><input class="sb-alias" value="${chName.replace(/\s+/g, '_')}_Boom"></div>
            <div class="sb-row" style="display:block;margin-top:10px"><span>Microphone Library</span>
              <select class="sb-sel sb-mic">${MICS.map((m, i) => `<option value="${i}">${m.name} · ${m.type}</option>`).join('')}</select></div>
            <div class="sb-row" style="display:block;margin-top:10px"><span>Mic Stand / Mount</span>
              <select class="sb-sel sb-stand">${Object.keys(STANDS).map(k => `<option>${k}</option>`).join('')}</select></div>
            <div class="sb-row" style="margin-top:10px"><span>Cable Length</span><span><input class="sb-cable" type="range" min="1" max="120" value="15" style="width:120px;vertical-align:middle"> <b class="sb-cablev">15 m</b></span></div>
          </div>
          <div class="sb-card"><h4>Electrical Integrity</h4>
            <div class="sb-row"><span>Impedance (auto)</span><b class="sb-imp">25 Ω</b></div>
            <div class="sb-row"><span>Sensitivity</span><b class="sb-sens">-32 dBV</b></div>
            <div class="sb-row"><span>HF Comp (cable)</span><b class="sb-hf">+0.0 dB</b></div>
            <div class="sb-key phantom">+48V Phantom</div>
            <div class="sb-warn">⚠ RIBBON MIC — phantom power locked (would damage element)</div>
          </div>
        </div>

        <div class="sb-mid">
          <div class="sb-card sb-metwrap">
            <div class="sb-meter"><div class="mask"></div><div class="pk"></div></div>
            <div class="sb-headroom"></div>
          </div>
          <div class="sb-card" style="flex:1;display:flex;flex-direction:column">
            <h4>Meter History · rolling 30 s</h4>
            <div class="sb-hist"><div class="cap">PPM · troubleshoot crackle / consistent peaking</div><canvas></canvas></div>
          </div>
        </div>

        <div class="sb-col">
          <div class="sb-card"><h4>Noise Reduction · Pre-Gain</h4>
            <div class="sb-row"><span>Mode</span>
              <select class="sb-sel sb-nrmode"><option>Off</option><option>Broadband (NS)</option><option>Adaptive AI</option><option>De-Hum 50/60Hz</option><option>De-Ess</option></select></div>
            <div class="sb-row" style="margin-top:8px"><span>Reduction</span><span><input class="sb-nr" type="range" min="0" max="24" value="0" style="width:120px;vertical-align:middle"> <b class="sb-nrv">0 dB</b></span></div>
          </div>
          <div class="sb-card"><h4>High-Pass Filter</h4>
            <div class="sb-row"><span>Window</span>
              <select class="sb-sel sb-hpw"><option>Butterworth</option><option>Linkwitz-Riley</option><option>Bessel</option><option>Chebyshev</option><option>Hann</option><option>Blackman</option></select></div>
            <div class="sb-row" style="margin-top:8px"><span>Frequency</span><span><input class="sb-hpf2" type="range" min="20" max="300" value="80" style="width:120px;vertical-align:middle"> <b class="sb-hpfv">80 Hz</b></span></div>
            <div class="sb-row" style="margin-top:8px;display:block"><span>Slope</span>
              <div class="sb-slopes" style="display:flex;gap:6px;margin-top:6px"></div></div>
            <canvas class="sb-hpchart"></canvas>
          </div>
          <div class="sb-card"><h4>Preamp</h4>
            <div class="sb-knrow"></div>
            <div class="sb-key conf">Confidence Monitor</div>
          </div>
        </div>
      </div>`;

    const $ = (q) => body.querySelector(q);
    const knrow = $('.sb-knrow'); const dials = [];
    [['gain', 'Gain', '#39d353'], ['hpf', 'HPF', '#6FC8F0'], ['pan', 'Pan', '#cba6ff']].forEach(([key, label, c]) => {
        const kn = document.createElement('div'); kn.className = 'sb-kn';
        kn.innerHTML = `<div class="sb-dial" style="--c:${c}"><i></i></div><b></b><span>${label}</span>`;
        const dial = kn.querySelector('.sb-dial'), val = kn.querySelector('b');
        const paint = () => {
            const v = s[key]; dial.style.setProperty('--p', (v * 100) + '%'); dial.style.setProperty('--rot', (v * 270 - 135) + 'deg');
            const m = MICS[s.mic];
            val.textContent = key === 'gain' ? Math.round(m.gain[0] + v * (m.gain[1] - m.gain[0])) + ' dB'
                : key === 'hpf' ? Math.round(20 + v * 280) + ' Hz'
                    : (v < .48 ? 'L' + Math.round((.5 - v) * 200) : v > .52 ? 'R' + Math.round((v - .5) * 200) : 'C');
        };
        let sy = 0, sv = 0, dr = false;
        dial.addEventListener('mousedown', e => { dr = true; sy = e.clientY; sv = s[key]; e.preventDefault(); });
        window.addEventListener('mousemove', e => { if (!dr) return; s[key] = Math.max(0, Math.min(1, sv + (sy - e.clientY) / 130)); paint(); });
        window.addEventListener('mouseup', () => dr = false);
        knrow.appendChild(kn); dials.push(paint); paint();
    });

    function applyMic() {
        const m = MICS[s.mic];
        $('.sb-imp').textContent = m.imp + ' Ω';
        $('.sb-sens').textContent = m.sens + ' dBV';
        s.hpf = Math.min(1, (STANDS[s.stand] - 20) / 280);   // stand drives the HPF
        if (m.ribbon && s.phantom) { s.phantom = false; }
        $('.phantom').classList.toggle('on', s.phantom);
        $('.phantom').style.opacity = m.ribbon ? .5 : 1;
        $('.sb-warn').classList.toggle('on', m.ribbon);
        dials.forEach(p => p());
    }
    $('.sb-mic').addEventListener('change', e => { s.mic = +e.target.value; applyMic(); });
    $('.sb-stand').addEventListener('change', e => { s.stand = e.target.value; applyMic(); });
    $('.sb-cable').addEventListener('input', e => { s.cable = +e.target.value; $('.sb-cablev').textContent = s.cable + ' m'; $('.sb-hf').textContent = '+' + (s.cable * 0.012).toFixed(1) + ' dB'; });
    $('.phantom').addEventListener('click', () => { if (MICS[s.mic].ribbon) return; s.phantom = !s.phantom; $('.phantom').classList.toggle('on', s.phantom); });
    $('.sb-conf, .sb-key.conf').addEventListener('click', e => { s.conf = !s.conf; e.currentTarget.classList.toggle('on', s.conf); });
    // noise reduction + HPF window / frequency / slope — visualised as a response chart
    const redrawHPF = () => {
        const fc = +$('.sb-hpf2').value;
        const sel = $('.sb-slope.sel');
        const sl = sel ? (parseInt(sel.textContent, 10) || 12) : 12;
        drawHPF($('.sb-hpchart'), fc, sl, $('.sb-hpw').value);
    };
    $('.sb-nr').addEventListener('input', e => { $('.sb-nrv').textContent = e.target.value + ' dB'; });
    $('.sb-hpf2').addEventListener('input', e => { $('.sb-hpfv').textContent = e.target.value + ' Hz'; redrawHPF(); });
    $('.sb-hpw').addEventListener('change', redrawHPF);
    const slopes = $('.sb-slopes');
    ['6', '12', '18', '24'].forEach((db, i) => {
        const btn = document.createElement('button'); btn.className = 'sb-slope' + (i === 1 ? ' sel' : ''); btn.textContent = db + ' dB/oct';
        btn.addEventListener('click', () => { slopes.querySelectorAll('.sb-slope').forEach(x => x.classList.remove('sel')); btn.classList.add('sel'); redrawHPF(); });
        slopes.appendChild(btn);
    });
    setTimeout(redrawHPF, 0);   // after layout so the canvas has a size
    applyMic();

    const mask = $('.sb-meter .mask'), pk = $('.sb-meter .pk'), hr = $('.sb-headroom'), hc = $('.sb-hist canvas');
    let f = 0;
    pushTimer(setInterval(() => {
        f++;
        if (f % 6 === 0) s.target = Math.max(0.05, Math.min(1, s.target + (Math.random() - 0.5) * 0.45));
        // occasional "cable crackle" spike for the history view
        const crackle = (s.cable > 60 && Math.random() < 0.03) ? Math.random() * 0.5 : 0;
        const goal = Math.min(1, s.target * (0.5 + s.gain) + crackle);
        s.level += (goal - s.level) * (goal > s.level ? 0.5 : 0.12);
        s.peak = s.level > s.peak ? s.level : Math.max(s.level, s.peak - 0.006);
        mask.style.height = (100 - s.level * 100) + '%'; pk.style.bottom = (s.peak * 100) + '%';
        const dbfs = Math.round((s.peak - 1) * 60), head = Math.round((1 - s.peak) * 60);
        hr.innerHTML = `Peak&nbsp; <b>${dbfs} dBFS</b><br>Headroom&nbsp; <b class="${head < 6 ? 'hot' : ''}">${head} dB</b><br>`
            + `Phantom&nbsp; <b>${s.phantom ? '+48V ON' : 'OFF'}</b><br>Monitor&nbsp; <b>${s.conf ? 'CUE→BUS' : '—'}</b>`;
        hist.push(s.level); if (hist.length > 300) hist.shift();
        drawHist(hc, hist);
    }, 100));
}

function drawHist(cv, hist) {
    const w = cv.width = cv.clientWidth, h = cv.height = cv.clientHeight, ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(80,110,150,.18)'; [0.25, 0.5, 0.75].forEach(p => { const y = h - p * h; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); });
    ctx.beginPath();
    hist.forEach((v, i) => { const x = i / 300 * w, y = h - 3 - v * (h - 8); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.strokeStyle = '#39d353'; ctx.lineWidth = 1.5; ctx.stroke();
    // red peak markers
    ctx.fillStyle = '#ff3b3b'; hist.forEach((v, i) => { if (v > 0.95) ctx.fillRect(i / 300 * w, 2, 2, 6); });
}

// High-pass filter frequency response — log freq (20–20k) × gain (dB), with the
// roll-off set by the slope and the knee character by the window type.
function drawHPF(cv, fc, slope, win) {
    if (!cv) return;
    const w = cv.width = cv.clientWidth, h = cv.height = cv.clientHeight; if (!w || !h) return;
    const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, w, h);
    const lmin = Math.log10(20), lmax = Math.log10(20000);
    const xOf = f => (Math.log10(f) - lmin) / (lmax - lmin) * w;
    const dbTop = 6, dbBot = -36, yOf = db => h - (db - dbBot) / (dbTop - dbBot) * h;
    ctx.font = '8px Courier New, monospace'; ctx.strokeStyle = 'rgba(80,110,150,.16)'; ctx.fillStyle = 'rgba(120,150,190,.6)';
    [-24, -12, 0].forEach(db => { const y = yOf(db); ctx.beginPath(); ctx.moveTo(22, y); ctx.lineTo(w, y); ctx.stroke(); ctx.fillText(db + '', 2, y - 2); });
    [100, 1000, 10000].forEach(f => { const x = xOf(f); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); ctx.fillText(f >= 1000 ? f / 1000 + 'k' : '' + f, x + 2, h - 2); });
    ctx.strokeStyle = 'rgba(111,200,240,.4)'; ctx.beginPath(); ctx.moveTo(xOf(fc), 0); ctx.lineTo(xOf(fc), h); ctx.stroke();
    const n = slope / 6, ripple = win === 'Chebyshev' ? 1 : 0, gentle = win === 'Bessel' ? 1 : 0;
    ctx.beginPath();
    for (let px = 22; px <= w; px++) {
        const f = Math.pow(10, lmin + (px / w) * (lmax - lmin));
        let db = 20 * Math.log10(1 / Math.sqrt(1 + Math.pow(fc / f, 2 * n)));
        const near = Math.exp(-Math.pow(Math.log10(f / fc), 2) / 0.05);
        db += ripple * near * 2.5 - gentle * near * 1.5;
        const y = yOf(Math.max(dbBot, Math.min(dbTop, db)));
        px === 22 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
    }
    ctx.strokeStyle = '#6FC8F0'; ctx.lineWidth = 2; ctx.stroke();
    ctx.lineTo(w, h); ctx.lineTo(22, h); ctx.closePath(); ctx.fillStyle = 'rgba(111,200,240,.1)'; ctx.fill();
    ctx.fillStyle = '#6FC8F0'; ctx.font = 'bold 9px Courier New, monospace'; ctx.fillText(`${win} · ${fc}Hz · ${slope}dB/oct`, 26, 11);
}

function render(body, twist) {
    buildPanel(body, ((twist.querySelector('.twist-title') || {}).innerText || 'INPUT').replace(/^[^A-Za-z0-9]*/, '').trim());
}
// Open the full Stage Box Input panel for a channel from anywhere (e.g. a mixer
// strip's preamp GAIN) — the complete digital twin: sensitivity, VU + 30s history,
// gain, +48V phantom, alias, mic library, cable length, stand, impedance. A channel
// tab bar lets you jump between the box's channels, and the URL is distinct.
const sbSlug = (x) => (x || '').toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
window.openStageBox = (name, color, channels, origin) => {
    const list = (channels && channels.length) ? channels : [{ label: name }];
    const BANK = 4, nBanks = Math.ceil(list.length / BANK);
    const openBank = (bank) => {
        bank = Math.max(0, Math.min(nBanks - 1, bank));
        try { history.replaceState(null, '', '#/stagebox/' + (sbSlug(origin) || 'box') + '/bank-' + (bank + 1)); } catch (e) {}
        open(`${origin || 'STAGE BOX'} · BANK ${bank + 1}/${nBanks}`, color || '#F2B74B', (b) => {
            b.style.display = 'flex'; b.style.flexDirection = 'column'; b.style.gap = '10px';
            // bank nav — page through the routed grouping 4 at a time
            const nav = document.createElement('div'); nav.className = 'sb-nav';
            if (origin) { const o = document.createElement('span'); o.className = 'orig'; o.textContent = origin; nav.appendChild(o); }
            if (nBanks > 1) {
                const bl = document.createElement('span'); bl.className = 'sb-bankl'; bl.textContent = `BANK ${bank + 1}/${nBanks}`; nav.appendChild(bl);
                const pv = document.createElement('button'); pv.className = 'sb-arrow'; pv.textContent = '◀'; pv.addEventListener('click', () => openBank(bank - 1)); nav.appendChild(pv);
                for (let bi = 0; bi < nBanks; bi++) {
                    const bt = document.createElement('button'); bt.className = 'sb-tab' + (bi === bank ? ' sel' : '');
                    bt.textContent = `${list[bi * BANK].label}–${list[Math.min(list.length - 1, bi * BANK + BANK - 1)].label}`;
                    bt.addEventListener('click', () => openBank(bi)); nav.appendChild(bt);
                }
                const nx = document.createElement('button'); nx.className = 'sb-arrow'; nx.textContent = '▶'; nx.addEventListener('click', () => openBank(bank + 1)); nav.appendChild(nx);
            }
            b.appendChild(nav);
            // 2×2 grid — the bank's 4 channels, each its own 1/4-screen panel
            const grid = document.createElement('div'); grid.className = 'sb-bankgrid'; b.appendChild(grid);
            list.slice(bank * BANK, bank * BANK + BANK).forEach(ch => {
                const cell = document.createElement('div'); cell.className = 'sb-host';
                grid.appendChild(cell);
                buildPanel(cell, ch.label);
                const tag = document.createElement('div'); tag.className = 'sb-cell-tag'; tag.textContent = ch.label; cell.appendChild(tag);
            });
        });
    };
    const idx = Math.max(0, list.findIndex(c => c.label === name));
    openBank(Math.floor(idx / BANK));
};

register(n => /stage\s*box|pre.?amp|input asset|mic input/i.test(n), 'STAGE BOX INPUT · SMART OBJECT', render);

// js/editors/camera-control.js — the CCU / RCP "Single Pane of Glass" camera
// control console. Opens when a Camera Input twist is touched.
//
// One fused surface: the "glass" shows the live preview with the shading scopes
// (RGB waveform + vectorscope) AND the robotics maps (top-down + side elevation)
// overlaid like meters. The right rail is the tactile control surface (5-axis
// joystick, shading encoders incl. an RGB-Venn for the colour channels). The
// footer carries the camera tally bank and the robotics/camera presets.
import { register, addStyles, pushTimer } from './core.js';

const CSS = `
.cc-wrap{display:grid;grid-template-columns:minmax(0,1fr) 470px;grid-template-rows:minmax(0,1fr) auto;gap:16px;height:100%;}

/* ---- the glass (everything overlaid) ---- */
.cc-glass{grid-column:1;grid-row:1;position:relative;background:#03060f;border:1px solid #1d2942;border-radius:12px;overflow:hidden;min-height:320px;}
.cc-scene{position:absolute;inset:0;transition:filter .12s;}
.cc-scene::before{content:'';position:absolute;inset:0;
    background:
      radial-gradient(120px 120px at var(--sx,50%) 40%, #ffe9b0 0%, #caa15a 30%, transparent 70%),
      linear-gradient(180deg,#23406b 0%,#16263f 55%,#0a1322 100%);}
.cc-subject{position:absolute;left:var(--subx,50%);top:54%;transform:translate(-50%,-50%);
    width:64px;height:96px;border-radius:30px 30px 12px 12px;background:linear-gradient(#e7b48a,#b67a52);
    box-shadow:0 8px 24px rgba(0,0,0,.5);transition:left .1s linear;}
.cc-subject::after{content:'';position:absolute;left:50%;top:-30px;transform:translateX(-50%);
    width:40px;height:40px;border-radius:50%;background:#e7b48a;}
.cc-bars{position:absolute;inset:0;display:none;}
.cc-bars.on{display:flex;} .cc-bars i{flex:1;height:100%;}
.cc-osd{position:absolute;left:50%;transform:translateX(-50%);top:8px;font:bold 12px 'Courier New',monospace;
    color:#caffd6;letter-spacing:1px;text-shadow:0 0 4px #000;z-index:4;}
.cc-rec{position:absolute;right:14px;top:8px;color:#ff5b5b;font:bold 12px 'Courier New',monospace;z-index:4;display:none;}
.cc-rec.on{display:block;animation:ccBlink 1s steps(2) infinite;}
@keyframes ccBlink{50%{opacity:.2;}}

/* RGB waveform monitor (luminance/chroma vs frame X) — overlaid at the bottom */
.cc-wf{position:absolute;left:0;right:0;bottom:0;height:128px;background:rgba(0,6,12,.66);border-top:1px solid #1d3354;z-index:2;}
.cc-wf-tag{position:absolute;left:30px;bottom:108px;z-index:3;font:bold 10px 'Courier New',monospace;letter-spacing:2px;color:#6FC8F0;}
.cc-vec{position:absolute;right:10px;top:26px;width:96px;height:96px;border-radius:50%;
    background:radial-gradient(circle,rgba(0,0,0,.6),rgba(0,0,0,.85));border:1px solid #2c3e5e;z-index:3;}
.cc-vec .dot{position:absolute;width:8px;height:8px;border-radius:50%;background:#ffe14d;box-shadow:0 0 6px #ffe14d;left:50%;top:50%;transition:transform .12s;}
.cc-vec .cross{position:absolute;inset:0;}
.cc-vec .cross::before,.cc-vec .cross::after{content:'';position:absolute;background:#2c3e5e;}
.cc-vec .cross::before{left:50%;top:6%;bottom:6%;width:1px;} .cc-vec .cross::after{top:50%;left:6%;right:6%;height:1px;}

/* robotics maps — translucent overlays (like the meters) */
.cc-map{position:absolute;left:10px;z-index:3;border:1px solid rgba(111,200,240,.32);border-radius:8px;overflow:hidden;background:rgba(3,9,18,.5);}
.cc-map.top{top:30px;width:216px;height:150px;}
.cc-map.side{top:190px;width:216px;height:118px;}
.cc-map .lbl{position:absolute;left:7px;top:4px;z-index:2;font:bold 8px 'Courier New',monospace;letter-spacing:1px;color:#6FC8F0;}
.cc-map svg{width:100%;height:100%;}

/* ---- right rail (tactile controls) ---- */
.cc-rail{grid-column:2;grid-row:1;display:flex;flex-direction:column;gap:14px;overflow:auto;padding-right:4px;}
.cc-card{background:#0a1326;border:1px solid #1d2942;border-radius:12px;padding:16px;}
.cc-card h4{margin:0 0 12px;color:#6FC8F0;font-size:13px;letter-spacing:2px;text-transform:uppercase;}

.cc-knobs{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;}
.cc-kn{display:flex;flex-direction:column;align-items:center;gap:6px;}
/* motorized rotary encoder: notched bezel, glowing value arc, metallic cap, lit pointer */
.cc-dial{width:80px;height:80px;border-radius:50%;position:relative;cursor:ns-resize;touch-action:none;
    background:repeating-conic-gradient(from -136deg,#33486a 0 1.5deg,transparent 1.5deg 14deg), #070f1f;
    box-shadow:0 5px 13px rgba(0,0,0,.55);}
.cc-dial::before{content:'';position:absolute;inset:9%;border-radius:50%;
    background:conic-gradient(from 225deg,var(--c,#6FC8F0) calc(var(--p,50%) * 0.75),#15233c 0);
    -webkit-mask:radial-gradient(circle,transparent 53%,#000 55%);mask:radial-gradient(circle,transparent 53%,#000 55%);
    filter:drop-shadow(0 0 5px var(--c,#6FC8F0));}
.cc-dial::after{content:'';position:absolute;inset:24%;border-radius:50%;
    background:radial-gradient(circle at 42% 32%,#41618a,#13233c 72%);
    box-shadow:inset 0 2px 5px rgba(255,255,255,.2),inset 0 -3px 6px rgba(0,0,0,.55),0 2px 5px rgba(0,0,0,.5);}
.cc-dial .ptr{position:absolute;left:50%;top:50%;width:4px;height:36%;border-radius:3px;background:var(--c,#6FC8F0);
    box-shadow:0 0 6px var(--c,#6FC8F0);transform-origin:50% 100%;transform:translate(-50%,-100%) rotate(var(--rot,0deg));z-index:2;}
.cc-kn span{font-size:11px;color:#9fb6cc;letter-spacing:.5px;text-align:center;}
.cc-kn b{font:bold 13px 'Courier New',monospace;color:#cfe6ff;}

/* RGB Venn cluster: 3 colour-gain circles overlap (screen blend → CMY/white),
   the three Black encoders cluster in the central overlap "on top". */
.cc-venn{position:relative;width:300px;height:250px;margin:14px auto 2px;}
.cc-venn-bg{position:absolute;inset:0;pointer-events:none;}
.cc-venn-bg span{position:absolute;width:160px;height:160px;border-radius:50%;mix-blend-mode:screen;opacity:.45;filter:blur(3px);}
.cc-venn-bg .r{background:#ff2d2d;left:30px;top:14px;}
.cc-venn-bg .g{background:#1fd83a;left:110px;top:14px;}
.cc-venn-bg .b{background:#2d6bff;left:70px;top:84px;}
.cc-venn .slot{position:absolute;transform:translate(-50%,-50%);}
.cc-venn .slot .cc-dial{width:68px;height:68px;}
.cc-venn .slot.blk .cc-dial{width:48px;height:48px;border-color:#04101f;}
.cc-venn .slot.blk .cc-dial::after{height:15px;transform-origin:50% 19px;}
.cc-venn .slot .cc-kn{gap:3px;}
.cc-venn .slot.blk .cc-kn b,.cc-venn .slot.blk .cc-kn span{font-size:9px;}

/* joystick + sliders */
.cc-stick{position:relative;width:230px;height:230px;margin:6px auto;border-radius:50%;
    background:radial-gradient(circle,#16243d,#0a1326);border:3px solid #2c3e5e;touch-action:none;cursor:grab;}
.cc-stick .puck{position:absolute;left:50%;top:50%;width:74px;height:74px;border-radius:50%;
    background:radial-gradient(circle at 35% 30%,#9fdcff,#3f86b6);box-shadow:0 8px 18px rgba(0,0,0,.6);transform:translate(-50%,-50%);}
.cc-stick .ring{position:absolute;inset:20px;border-radius:50%;border:2px dashed #2c3e5e;}
.cc-axis{display:flex;gap:12px;margin-top:8px;}
.cc-rocker{flex:1;display:flex;align-items:center;gap:10px;}
.cc-rocker label{font-size:12px;color:#9fb6cc;letter-spacing:1px;width:42px;font-weight:bold;}
.cc-rocker input[type=range]{flex:1;-webkit-appearance:none;appearance:none;height:14px;border-radius:8px;background:#16243d;outline:none;box-shadow:inset 0 0 0 1px #2c3e5e;}
.cc-rocker input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:30px;height:30px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#9fdcff,#3f86b6);border:2px solid #001019;cursor:pointer;}
.cc-rocker input[type=range]::-moz-range-thumb{width:30px;height:30px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#9fdcff,#3f86b6);border:2px solid #001019;cursor:pointer;}
.cc-hint{font-size:11px;color:#6b82a3;margin-top:6px;letter-spacing:.5px;}

.cc-keys{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
.cc-key{padding:16px 6px;border-radius:10px;border:1px solid #2c3e5e;background:#0c1730;color:#bcd3ee;
    font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;cursor:pointer;text-align:center;}
.cc-key:hover{background:#16243d;} .cc-key.on{background:#6FC8F0;color:#001019;border-color:#6FC8F0;}
.cc-tel{font:14px 'Courier New',monospace;color:#aee0ff;line-height:1.9;} .cc-tel b{color:#fff;}

/* ---- footer (camera bank + presets) ---- */
.cc-foot{grid-column:1 / -1;grid-row:2;display:flex;gap:16px;align-items:stretch;}
.cc-foot .cc-card{flex:1;min-width:0;}
.cc-tallies{display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between;}
.cc-tally{flex:1;min-width:64px;height:58px;border-radius:9px;border:2px solid #33415f;background:#0a1326;color:#9fb6cc;
    font-weight:900;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;position:relative;}
.cc-tally .st{position:absolute;top:5px;right:6px;width:10px;height:10px;border-radius:50%;background:#33415f;}
.cc-tally.sel{outline:2px solid #6FC8F0;color:#fff;}
.cc-tally.live{border-color:#ff3b3b;color:#ff6a6a;} .cc-tally.live .st{background:#ff3b3b;box-shadow:0 0 8px #ff3b3b;}
.cc-tally.pvw{border-color:#39d353;color:#7ef29a;} .cc-tally.pvw .st{background:#39d353;}
.cc-foot .cc-pre{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;}
.cc-foot .cc-pre .cc-key{padding:18px 6px;font-size:15px;}
.cc-foot .cc-pre .cc-key.set{border-color:#39d353;color:#7ef29a;}
.cc-foot .cc-keys{margin-top:10px;max-width:460px;}
`;

const clamp = (v) => Math.max(0, Math.min(1, v));

function render(body, twist) {
    addStyles('cc-styles', CSS);
    const camName = ((twist.querySelector('.twist-title') || {}).innerText || 'CAM').replace(/^[^A-Za-z0-9]*/, '').trim();
    const myNum = (parseInt((camName.match(/\d+/) || [1])[0], 10) || 1);

    const mk = () => ({
        pan: 0.5, tilt: 0.5, zoom: 0.32, dolly: 0.5, ped: 0.5,
        iris: 0.56, mblack: 0.5, rGain: 0.5, gGain: 0.5, bGain: 0.5,
        rBlk: 0.5, gBlk: 0.5, bBlk: 0.5, shutter: 0.5, mgain: 0.18, gamma: 0.5,
        presets: [null, null, null, null, null, null],
    });
    const cams = Array.from({ length: 8 }, mk);
    const ui = { active: Math.min(7, myNum - 1), bars: false, autoiris: false, rec: false, drag: false, t: 0 };
    const S = () => cams[ui.active];

    body.innerHTML = `
      <div class="cc-wrap">
        <div class="cc-glass">
          <div class="cc-scene"><div class="cc-subject"></div></div>
          <div class="cc-bars"></div>
          <div class="cc-osd"></div>
          <div class="cc-rec">● REC</div>
          <div class="cc-map top"><div class="lbl">TOP-DOWN · PAN / DOLLY</div>${topSVG()}</div>
          <div class="cc-map side"><div class="lbl">SIDE · TILT / PED</div>${sideSVG()}</div>
          <div class="cc-vec"><div class="cross"></div><div class="dot"></div></div>
          <div class="cc-wf-tag">RGB WAVEFORM · IRE</div>
          <canvas class="cc-wf"></canvas>
        </div>

        <div class="cc-rail">
          <div class="cc-card"><h4>5-Axis Master Joystick</h4>
            <div class="cc-stick"><div class="ring"></div><div class="puck"></div></div>
            <div class="cc-axis"><div class="cc-rocker"><label>Zoom</label><input type="range" min="0" max="1" step="0.01" data-ax="zoom"></div></div>
            <div class="cc-axis">
              <div class="cc-rocker"><label>Dolly</label><input type="range" min="0" max="1" step="0.01" data-ax="dolly"></div>
              <div class="cc-rocker"><label>Ped</label><input type="range" min="0" max="1" step="0.01" data-ax="ped"></div>
            </div>
            <div class="cc-hint">Drag the puck to Pan / Tilt</div>
          </div>

          <div class="cc-card"><h4>Shading Encoders</h4>
            <div class="cc-knobs cc-mono"></div>
            <div class="cc-venn">
              <div class="cc-venn-bg"><span class="r"></span><span class="g"></span><span class="b"></span></div>
            </div>
          </div>

          <div class="cc-card"><h4>Functions</h4>
            <div class="cc-keys">
              <div class="cc-key" data-act="bars">Color Bars</div>
              <div class="cc-key" data-act="autoiris">Auto Iris</div>
              <div class="cc-key" data-act="wb">White Bal</div>
            </div>
          </div>

          <div class="cc-card"><h4>Telemetry</h4><div class="cc-tel"></div></div>
        </div>

        <div class="cc-foot">
          <div class="cc-card cc-foot-bank"><h4>Camera Bank · Tally</h4><div class="cc-tallies"></div></div>
          <div class="cc-card cc-foot-pre"><h4>Robotics &amp; Camera Presets · Scene Memory</h4>
            <div class="cc-pre"></div>
            <div class="cc-keys">
              <div class="cc-key" data-act="save">Save</div>
              <div class="cc-key" data-act="path">Rec Path</div>
              <div class="cc-key" data-act="lookat">Look-At</div>
            </div>
          </div>
        </div>
      </div>`;

    const $ = (s) => body.querySelector(s);
    const glass = $('.cc-glass');
    let knobEls = [];

    // A rotary encoder bound to a state key (vertical drag = value).
    function buildDial(key, label, color, small) {
        const wrap = document.createElement('div'); wrap.className = 'cc-kn';
        const dial = document.createElement('div'); dial.className = 'cc-dial'; if (color) dial.style.setProperty('--c', color);
        const val = document.createElement('b');
        const lab = document.createElement('span'); lab.textContent = label;
        wrap.append(dial, val, lab);
        const paint = () => { const v = S()[key]; dial.style.setProperty('--p', (v * 100) + '%'); dial.style.setProperty('--rot', (v * 270 - 135) + 'deg'); val.textContent = fmt(key, v); };
        let sy = 0, sv = 0, dr = false;
        const start = (y) => { dr = true; sy = y; sv = S()[key]; };
        const move = (y) => { if (!dr) return; S()[key] = clamp(sv + (sy - y) / 130); paint(); shade(); };
        dial.addEventListener('mousedown', e => { start(e.clientY); e.preventDefault(); });
        window.addEventListener('mousemove', e => move(e.clientY));
        window.addEventListener('mouseup', () => dr = false);
        dial.addEventListener('touchstart', e => start(e.touches[0].clientY), { passive: true });
        window.addEventListener('touchmove', e => { if (dr) move(e.touches[0].clientY); }, { passive: true });
        window.addEventListener('touchend', () => dr = false);
        knobEls.push(paint); paint();
        return wrap;
    }

    // ---- shading encoders: mono row + RGB Venn ----
    [['iris', 'Iris'], ['mblack', 'M.Black'], ['gamma', 'Gamma'], ['shutter', 'Shutter'], ['mgain', 'M.Gain']]
        .forEach(([k, l]) => $('.cc-mono').appendChild(buildDial(k, l)));
    const venn = $('.cc-venn');
    const place = (key, label, color, x, y, blk) => {
        const slot = document.createElement('div'); slot.className = 'slot' + (blk ? ' blk' : '');
        slot.style.left = x + 'px'; slot.style.top = y + 'px';
        slot.appendChild(buildDial(key, label, color));
        venn.appendChild(slot);
    };
    // gains form the outer triangle (at the colour-circle centres)…
    place('rGain', 'R Gain', '#ff4d4d', 110, 94);
    place('gGain', 'G Gain', '#28e04a', 190, 94);
    place('bGain', 'B Gain', '#4d83ff', 150, 164);
    // …the blacks cluster in the central overlap, on top.
    place('rBlk', 'R Blk', '#ff7a7a', 132, 120, true);
    place('gBlk', 'G Blk', '#74ef8a', 168, 120, true);
    place('bBlk', 'B Blk', '#86acff', 150, 142, true);
    function syncKnobs() { knobEls.forEach(p => p()); shade(); }

    // ---- tally bank (footer) ----
    const tallies = $('.cc-tallies');
    for (let i = 0; i < 8; i++) {
        const b = document.createElement('div');
        b.className = 'cc-tally' + (i === ui.active ? ' sel' : '') + (i === 0 ? ' live' : i === 1 ? ' pvw' : '');
        b.innerHTML = `CAM ${i + 1}<span class="st"></span>`;
        b.addEventListener('click', () => { ui.active = i; syncBank(); syncKnobs(); syncAxes(); syncPresets(); });
        tallies.appendChild(b);
    }
    function syncBank() { [...tallies.children].forEach((b, i) => b.classList.toggle('sel', i === ui.active)); }

    // ---- joystick (pan / tilt) ----
    const stick = $('.cc-stick'), puck = stick.querySelector('.puck');
    function placePuck() { const r = 74; puck.style.left = `calc(50% + ${(S().pan - 0.5) * 2 * r}px)`; puck.style.top = `calc(50% + ${(0.5 - S().tilt) * 2 * r}px)`; }
    const stickMove = (e) => {
        const r = stick.getBoundingClientRect();
        const px = (e.touches ? e.touches[0].clientX : e.clientX) - r.left - r.width / 2;
        const py = (e.touches ? e.touches[0].clientY : e.clientY) - r.top - r.height / 2;
        S().pan = clamp(0.5 + px / r.width); S().tilt = clamp(0.5 - py / r.height); placePuck();
    };
    const down = (e) => { ui.drag = true; stick.style.cursor = 'grabbing'; stickMove(e); };
    const up = () => { ui.drag = false; stick.style.cursor = 'grab'; };
    stick.addEventListener('mousedown', down); window.addEventListener('mousemove', e => ui.drag && stickMove(e)); window.addEventListener('mouseup', up);
    stick.addEventListener('touchstart', down, { passive: true }); stick.addEventListener('touchmove', e => stickMove(e), { passive: true }); stick.addEventListener('touchend', up);

    // ---- axis sliders ----
    body.querySelectorAll('input[data-ax]').forEach(inp => inp.addEventListener('input', () => { S()[inp.dataset.ax] = parseFloat(inp.value); }));
    function syncAxes() { body.querySelectorAll('input[data-ax]').forEach(inp => inp.value = S()[inp.dataset.ax]); placePuck(); }

    // ---- presets (footer) ----
    const preHost = $('.cc-pre'); let pendingSave = false; let fly = null;
    for (let i = 0; i < 6; i++) {
        const k = document.createElement('div'); k.className = 'cc-key'; k.textContent = 'P' + (i + 1);
        k.addEventListener('click', () => {
            if (pendingSave) { S().presets[i] = { pan: S().pan, tilt: S().tilt, zoom: S().zoom, dolly: S().dolly, ped: S().ped }; pendingSave = false; $('[data-act="save"]').classList.remove('on'); syncPresets(); }
            else if (S().presets[i]) { const from = { pan: S().pan, tilt: S().tilt, zoom: S().zoom, dolly: S().dolly, ped: S().ped }; fly = { from, to: S().presets[i], t: 0 }; }
        });
        preHost.appendChild(k);
    }
    function syncPresets() { [...preHost.children].forEach((k, i) => k.classList.toggle('set', !!S().presets[i])); }

    // ---- function keys ----
    body.querySelectorAll('.cc-key[data-act]').forEach(k => k.addEventListener('click', () => {
        const a = k.dataset.act;
        if (a === 'bars') { ui.bars = !ui.bars; k.classList.toggle('on', ui.bars); glass.querySelector('.cc-bars').classList.toggle('on', ui.bars); }
        else if (a === 'autoiris') { ui.autoiris = !ui.autoiris; k.classList.toggle('on', ui.autoiris); }
        else if (a === 'wb') { S().rGain = 0.5; S().gGain = 0.5; S().bGain = 0.5; syncKnobs(); }
        else if (a === 'save') { pendingSave = !pendingSave; k.classList.toggle('on', pendingSave); }
        else if (a === 'path') { ui.rec = !ui.rec; k.classList.toggle('on', ui.rec); glass.querySelector('.cc-rec').classList.toggle('on', ui.rec); }
        else if (a === 'lookat') { k.classList.toggle('on'); }
    }));

    // color bars + waveform canvas
    const barsEl = glass.querySelector('.cc-bars');
    ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0', '#101010'].forEach(c => { const i = document.createElement('i'); i.style.background = c; barsEl.appendChild(i); });
    const wfCanvas = glass.querySelector('.cc-wf');

    // ---- live render ----
    const scene = glass.querySelector('.cc-scene'), subject = glass.querySelector('.cc-subject');
    const osd = glass.querySelector('.cc-osd'), vecDot = glass.querySelector('.cc-vec .dot'), tel = $('.cc-tel');
    function shade() {
        const s = S();
        const bright = 0.45 + s.iris * 0.9 + s.mgain * 0.5 + (ui.autoiris ? 0.1 : 0);
        const hue = (s.rGain - s.bGain) * 40;
        const sat = 0.7 + (Math.abs(s.rGain - 0.5) + Math.abs(s.bGain - 0.5)) * 1.2;
        const contrast = 0.8 + s.gamma * 0.6;
        scene.style.filter = `brightness(${bright.toFixed(2)}) contrast(${contrast.toFixed(2)}) saturate(${sat.toFixed(2)}) hue-rotate(${hue.toFixed(0)}deg)`;
        const vx = (s.rGain - s.bGain) * 70, vy = (s.gGain - 0.5) * -70;
        vecDot.style.transform = `translate(calc(-50% + ${vx}px), calc(-50% + ${vy}px))`;
    }
    function frame() {
        ui.t += 0.05; const s = S();
        if (fly) {
            fly.t = Math.min(1, fly.t + 0.04);
            const e = fly.t < .5 ? 2 * fly.t * fly.t : 1 - Math.pow(-2 * fly.t + 2, 2) / 2;
            ['pan', 'tilt', 'zoom', 'dolly', 'ped'].forEach(k => s[k] = fly.from[k] + (fly.to[k] - fly.from[k]) * e);
            placePuck(); syncAxes(); if (fly.t >= 1) fly = null;
        }
        scene.style.setProperty('--sx', (50 + (s.pan - 0.5) * 60) + '%');
        subject.style.setProperty('--subx', (50 - (s.pan - 0.5) * 80) + '%');
        const zoomScale = 0.7 + s.zoom * 2.6 + s.dolly * 0.4;
        const tiltY = (s.tilt - 0.5) * -40 + (s.ped - 0.5) * -30;
        subject.style.transform = `translate(-50%,-50%) scale(${zoomScale.toFixed(2)}) translateY(${tiltY}px)`;
        drawWaveform(wfCanvas, s, ui.bars);
        updateMaps(s);
        const focal = Math.round(8 + s.zoom * 280), fstop = (1.8 + (1 - s.iris) * 14).toFixed(1);
        osd.innerHTML = `CAM ${ui.active + 1} &nbsp; LIVE &nbsp; f/${fstop} &nbsp; ${focal}mm`;
        tel.innerHTML = `Focal&nbsp; <b>${focal}mm</b><br>Iris&nbsp;&nbsp; <b>f/${fstop}</b><br>Zoom&nbsp; <b>${Math.round(s.zoom * 100)}%</b><br>`
            + `Pan&nbsp;&nbsp; <b>${Math.round((s.pan - .5) * 340)}°</b> &nbsp; Tilt <b>${Math.round((s.tilt - .5) * 120)}°</b><br>`
            + `Dolly <b>${Math.round(s.dolly * 100)}%</b> &nbsp; Ped <b>${Math.round(s.ped * 100)}%</b>`;
    }
    function updateMaps(s) {
        // top-down: dolly (x), pan (rotation), zoom (cone)
        const cam = body.querySelector('#cc-tcam'), cone = body.querySelector('#cc-tcone');
        if (cam) {
            const x = 40 + s.dolly * 220, y = 250 - s.ped * 30, ang = (s.pan - 0.5) * 150, half = 14 + (1 - s.zoom) * 34, len = 120 + s.zoom * 80;
            cam.setAttribute('transform', `translate(${x},${y})`); cone.setAttribute('transform', `rotate(${ang})`);
            const a = half * Math.PI / 180;
            cone.setAttribute('points', `0,0 ${Math.sin(-a) * len},${-Math.cos(-a) * len} ${Math.sin(a) * len},${-Math.cos(a) * len}`);
        }
        // side: pedestal (y), tilt (cone vertical angle), zoom (cone), dolly (x)
        const scam = body.querySelector('#cc-scam'), scone = body.querySelector('#cc-scone');
        if (scam) {
            const x = 40 + s.dolly * 150, y = 250 - s.ped * 150, tilt = (s.tilt - 0.5) * 90, half = 12 + (1 - s.zoom) * 26, len = 150 + s.zoom * 90;
            scam.setAttribute('transform', `translate(${x},${y})`); scone.setAttribute('transform', `rotate(${tilt})`);
            const a = half * Math.PI / 180;
            scone.setAttribute('points', `0,0 ${Math.cos(-a) * len},${Math.sin(-a) * len} ${Math.cos(a) * len},${Math.sin(a) * len}`);
        }
    }

    syncAxes(); syncPresets(); placePuck(); shade();
    pushTimer(setInterval(frame, 33));
}

function fmt(key, v) {
    if (key === 'iris') return 'f/' + (1.8 + (1 - v) * 14).toFixed(1);
    if (key === 'shutter') return '1/' + Math.round(50 + v * 950);
    if (key === 'zoom') return Math.round(v * 100) + '%';
    if (/Gain|Blk|mblack|mgain|gamma/.test(key)) return (v >= .5 ? '+' : '') + Math.round((v - .5) * 200);
    return Math.round(v * 100) + '';
}

const BARS75 = [[.75, .75, .75], [.75, .75, 0], [0, .75, .75], [0, .75, 0], [.75, 0, .75], [.75, 0, 0], [0, 0, .75], [.06, .06, .06]];
const RGBCOL = ['255,64,64', '64,235,96', '92,128,255'];

// RGB waveform monitor — X mirrors frame horizontal, Y is intensity (0-100 IRE).
// With Colour Bars on, the monitor shows the bar test signal (the SMPTE staircase)
// instead of the scene — exactly what an operator sees on the output waveform.
function drawWaveform(cv, s, barsOn) {
    const w = cv.clientWidth | 0, h = cv.clientHeight | 0;
    if (!w || !h) return;
    if (cv.width !== w) cv.width = w;
    if (cv.height !== h) cv.height = h;
    const ctx = cv.getContext('2d'), padL = 26, top = 10, bot = h - 6, span = bot - top;
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1; ctx.font = '9px Courier New, monospace';
    [0, 25, 50, 75, 100].forEach(p => {
        const y = bot - (p / 100) * span;
        ctx.strokeStyle = p === 100 ? 'rgba(255,90,90,.35)' : 'rgba(80,110,150,.22)';
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - 2, y); ctx.stroke();
        ctx.fillStyle = 'rgba(120,150,190,.7)'; ctx.fillText(String(p), 3, y + 3);
    });
    const expoGain = 0.42 + s.iris * 1.15 + s.mgain * 0.55;
    const floor = Math.max(0, s.mblack - 0.5) * 0.55, gammaExp = 0.55 + (1 - s.gamma) * 0.9;
    const lightX = 0.5 + (s.pan - 0.5) * 0.6, subjX = 0.5 - (s.pan - 0.5) * 0.8;
    const g = (x, m, sg) => Math.exp(-((x - m) * (x - m)) / (2 * sg * sg));
    const chan = (cg, cb, base) => { let v = floor + base * expoGain; v = Math.pow(clamp(v), gammaExp); v = v * (0.62 + cg * 0.82) + (cb - 0.5) * 0.28; return clamp(v); };
    ctx.globalCompositeOperation = 'lighter';
    const N = 160;
    for (let i = 0; i < N; i++) {
        const x = i / (N - 1);
        const px = padL + x * (w - padL - 2);
        let vals;
        if (barsOn) {
            vals = BARS75[Math.min(7, Math.floor(x * 8))];     // the bar test signal
        } else {
            const base = 0.12 + g(x, lightX, 0.16) * 0.78 + (Math.abs(x - subjX) < 0.13 ? 0.42 : 0) + 0.12 * (1 - Math.abs(x - 0.5) * 2);
            vals = [chan(s.rGain, s.rBlk, base), chan(s.gGain, s.gBlk, base), chan(s.bGain, s.bBlk, base)];
        }
        const jitAmt = barsOn ? 0.012 : (0.03 + s.mgain * 0.12);
        for (let c = 0; c < 3; c++) {
            for (let k = 0; k < 4; k++) { const jit = (Math.random() - 0.5) * jitAmt; ctx.fillStyle = `rgba(${RGBCOL[c]},.5)`; ctx.fillRect(px, bot - clamp(vals[c] + jit) * span, 2, 2); }
        }
    }
    ctx.globalCompositeOperation = 'source-over';
}

// Top-down studio map (pan / dolly / zoom).
function topSVG() {
    return `<svg viewBox="0 0 300 290" preserveAspectRatio="xMidYMid meet">
      <line x1="40" y1="250" x2="260" y2="250" stroke="#2c466e" stroke-dasharray="4 4"/>
      <text x="40" y="266" fill="#3f5a82" font-size="9" font-family="monospace">DOLLY TRACK</text>
      <rect x="120" y="60" width="60" height="90" rx="14" fill="#13243f" stroke="#2c466e"/>
      <text x="133" y="110" fill="#4a6a98" font-size="9" font-family="monospace">TALENT</text>
      <g id="cc-tcam"><polygon id="cc-tcone" points="0,0 -30,-120 30,-120" fill="rgba(111,200,240,.16)" stroke="rgba(111,200,240,.5)"/><circle r="10" fill="#6FC8F0" stroke="#001019" stroke-width="2"/></g>
    </svg>`;
}
// Side elevation (tilt / pedestal / zoom).
function sideSVG() {
    return `<svg viewBox="0 0 300 290" preserveAspectRatio="xMidYMid meet">
      <line x1="20" y1="250" x2="280" y2="250" stroke="#3f5a82" stroke-width="2"/>
      <text x="22" y="266" fill="#3f5a82" font-size="9" font-family="monospace">FLOOR</text>
      <line x1="40" y1="250" x2="40" y2="90" stroke="#2c466e" stroke-dasharray="4 4"/>
      <text x="46" y="86" fill="#3f5a82" font-size="9" font-family="monospace">PED COLUMN</text>
      <rect x="190" y="150" width="34" height="100" rx="8" fill="#13243f" stroke="#2c466e"/>
      <circle cx="207" cy="140" r="13" fill="#13243f" stroke="#2c466e"/>
      <text x="180" y="270" fill="#4a6a98" font-size="9" font-family="monospace">TALENT</text>
      <g id="cc-scam"><polygon id="cc-scone" points="0,0 150,-26 150,26" fill="rgba(111,200,240,.16)" stroke="rgba(111,200,240,.5)"/><circle r="10" fill="#6FC8F0" stroke="#001019" stroke-width="2"/></g>
    </svg>`;
}

register(n => /\bcam\b|camera/i.test(n), 'Camera Control · CCU / RCP', render);

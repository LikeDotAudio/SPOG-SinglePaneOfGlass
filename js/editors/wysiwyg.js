// js/editors/wysiwyg.js — the studio WYSIWYG / Pre-Viz visualizer. A top-down
// render of the rig that mirrors the DMX console (sACN/Art-Net): beam cones, a
// foot-candle HEAT MAP on the floor, virtual talent + shadow, a camera frustum
// (it only matters how it looks to the lens), and per-fixture tally glow.
import { register, addStyles, pushTimer } from './core.js';

const FIX = [
    { k: 'KEY', x: .34, y: .30, on: .9, hue: 38 },
    { k: 'FILL', x: .66, y: .30, on: .5, hue: 210 },
    { k: 'BACK', x: .50, y: .14, on: .7, hue: 0 },
    { k: 'BG', x: .50, y: .86, on: .6, hue: 205 },
    { k: 'CYC', x: .14, y: .74, on: .55, hue: 195 },
    { k: 'FX', x: .86, y: .74, on: .5, hue: 275 },
];

const CSS = `
.wy{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:16px;height:100%;}
.wy-card{background:#0a1326;border:1px solid #1d2942;border-radius:12px;padding:14px;}
.wy-card h4{margin:0 0 10px;color:#6FC8F0;font-size:12px;letter-spacing:2px;text-transform:uppercase;}
.wy-stage{position:relative;flex:1;min-height:360px;border-radius:12px;overflow:hidden;background:#05080f;}
.wy-stage canvas{position:absolute;inset:0;width:100%;height:100%;}
.wy-right{display:flex;flex-direction:column;gap:14px;overflow:auto;}
.wy-toggles{display:flex;flex-direction:column;gap:8px;}
.wy-tg{display:flex;align-items:center;justify-content:space-between;padding:11px 12px;border-radius:9px;border:1px solid #2c3e5e;background:#0c1730;color:#bcd3ee;font:bold 12px sans-serif;letter-spacing:1px;cursor:pointer;}
.wy-tg.on{background:#6FC8F0;color:#001019;border-color:#6FC8F0;}
.wy-fx{display:flex;flex-direction:column;gap:8px;}
.wy-fxr{display:flex;align-items:center;gap:10px;}
.wy-fxr .nm{width:42px;font:bold 12px sans-serif;color:#cfe6ff;}
.wy-fxr input{flex:1;-webkit-appearance:none;height:12px;border-radius:7px;background:#16243d;box-shadow:inset 0 0 0 1px #2c3e5e;outline:none;cursor:pointer;}
.wy-fxr input::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#fff,#9cf);border:2px solid #001019;}
.wy-tag{font:10px 'Courier New',monospace;color:#6b82a3;letter-spacing:1px;line-height:1.7;}
.wy-leg{display:flex;align-items:center;gap:6px;font:10px 'Courier New',monospace;color:#9fb6cc;}
.wy-leg i{flex:1;height:10px;border-radius:5px;background:linear-gradient(90deg,#1f3a6e,#21d8c0,#ffe14d,#ff3b3b);}
`;

function render(body, twist) {
    addStyles('wy-styles', CSS);
    const fx = FIX.map(f => ({ ...f }));
    const ui = { heat: true, beams: true, frustum: true, talentRot: 0.5 };

    body.innerHTML = `
      <div class="wy">
        <div class="wy-card" style="display:flex;flex-direction:column">
          <h4>Studio Pre-Viz · sACN / Art-Net mirror</h4>
          <div class="wy-stage"><canvas></canvas></div>
        </div>
        <div class="wy-right">
          <div class="wy-card"><h4>Overlays</h4><div class="wy-toggles">
            <div class="wy-tg on" data-t="heat">Foot-Candle Heat Map</div>
            <div class="wy-tg on" data-t="beams">Beam Cones</div>
            <div class="wy-tg on" data-t="frustum">Camera Frustum</div>
          </div><div class="wy-leg" style="margin-top:10px">LOW <i></i> HIGH</div></div>
          <div class="wy-card"><h4>Fixtures · DMX</h4><div class="wy-fx"></div></div>
          <div class="wy-card"><h4>Virtual Talent</h4>
            <div class="wy-fxr"><div class="nm">Face</div><input id="wy-rot" type="range" min="0" max="1" step="0.01" value="0.5"></div>
            <div class="wy-tag"></div>
          </div>
        </div>
      </div>`;

    const $ = (s) => body.querySelector(s);
    const cv = $('.wy-stage canvas'), tag = $('.wy-tag');
    body.querySelectorAll('.wy-tg').forEach(t => t.addEventListener('click', () => { ui[t.dataset.t] = !ui[t.dataset.t]; t.classList.toggle('on', ui[t.dataset.t]); }));
    const fxHost = $('.wy-fx');
    fx.forEach(f => {
        const r = document.createElement('div'); r.className = 'wy-fxr';
        r.innerHTML = `<div class="nm">${f.k}</div><input type="range" min="0" max="1" step="0.01" value="${f.on}">`;
        r.querySelector('input').addEventListener('input', e => f.on = +e.target.value);
        fxHost.appendChild(r);
    });
    $('#wy-rot').addEventListener('input', e => ui.talentRot = +e.target.value);

    function frame() {
        const w = cv.width = cv.clientWidth, h = cv.height = cv.clientHeight; if (!w || !h) return;
        const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, w, h);
        // floor + truss
        ctx.fillStyle = '#0a1322'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(60,90,130,.25)'; for (let i = 1; i < 8; i++) { const x = i / 8 * w; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
        for (let i = 1; i < 6; i++) { const y = i / 6 * h; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
        const sx = 0.5 * w, sy = 0.46 * h;
        // heat map (coarse grid of accumulated intensity)
        if (ui.heat) {
            const G = 26, cw = w / G, chh = h / G;
            for (let gx = 0; gx < G; gx++) for (let gy = 0; gy < G; gy++) {
                const px = (gx + .5) * cw, py = (gy + .5) * chh; let lux = 0;
                fx.forEach(f => { const fxp = f.x * w, fyp = f.y * h; const d = Math.hypot(px - fxp, py - fyp); lux += f.on * Math.max(0, 1 - d / (w * .5)); });
                lux = Math.min(1, lux * .7);
                if (lux > .02) { ctx.fillStyle = heatColor(lux); ctx.globalAlpha = .5; ctx.fillRect(gx * cw, gy * chh, cw + 1, chh + 1); ctx.globalAlpha = 1; }
            }
        }
        // beam cones
        if (ui.beams) fx.forEach(f => {
            const fxp = f.x * w, fyp = f.y * h, ang = Math.atan2(sy - fyp, sx - fxp), spread = .32;
            ctx.fillStyle = `hsla(${f.hue},90%,60%,${(.06 + f.on * .14).toFixed(2)})`;
            ctx.beginPath(); ctx.moveTo(fxp, fyp);
            ctx.lineTo(fxp + Math.cos(ang - spread) * w, fyp + Math.sin(ang - spread) * w);
            ctx.lineTo(fxp + Math.cos(ang + spread) * w, fyp + Math.sin(ang + spread) * w);
            ctx.closePath(); ctx.fill();
        });
        // camera frustum (from bottom-centre toward subject)
        if (ui.frustum) {
            const cxp = .5 * w, cyp = .98 * h; ctx.strokeStyle = 'rgba(111,200,240,.7)'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(cxp, cyp); ctx.lineTo(sx - 130, sy - 40); ctx.moveTo(cxp, cyp); ctx.lineTo(sx + 130, sy - 40); ctx.stroke();
            ctx.fillStyle = 'rgba(111,200,240,.06)'; ctx.beginPath(); ctx.moveTo(cxp, cyp); ctx.lineTo(sx - 130, sy - 40); ctx.lineTo(sx + 130, sy - 40); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#6FC8F0'; ctx.font = '10px Courier New, monospace'; ctx.fillText('CAM', cxp - 11, cyp - 4);
        }
        // talent + shadow (shadow opposite the key)
        const key = fx[0]; const shAng = Math.atan2(sy - key.y * h, sx - key.x * w);
        ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(sx + Math.cos(shAng) * 26, sy + Math.sin(shAng) * 26, 30, 16, shAng, 0, 7); ctx.fill();
        ctx.fillStyle = '#e7b48a'; ctx.beginPath(); ctx.arc(sx, sy, 18, 0, 7); ctx.fill();
        ctx.fillStyle = '#caa15a'; ctx.beginPath(); ctx.arc(sx + (ui.talentRot - .5) * 18, sy - 3, 7, 0, 7); ctx.fill();  // nose = facing dir
        // fixtures (circle + crosshair) with tally glow
        fx.forEach(f => {
            const fxp = f.x * w, fyp = f.y * h; const lit = f.on > .03;
            ctx.strokeStyle = lit ? `hsl(${f.hue},90%,65%)` : '#33415f'; ctx.fillStyle = '#0a1326'; ctx.lineWidth = 2;
            if (lit) { ctx.shadowColor = `hsl(${f.hue},90%,60%)`; ctx.shadowBlur = 12; }
            ctx.beginPath(); ctx.arc(fxp, fyp, 11, 0, 7); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
            ctx.beginPath(); ctx.moveTo(fxp - 11, fyp); ctx.lineTo(fxp + 11, fyp); ctx.moveTo(fxp, fyp - 11); ctx.lineTo(fxp, fyp + 11); ctx.stroke();
            ctx.fillStyle = '#9fb6cc'; ctx.font = 'bold 9px Courier New, monospace'; ctx.fillText(f.k, fxp - 9, fyp + 24);
        });
        const active = fx.filter(f => f.on > .03).length;
        tag.innerHTML = `Universe 1 · ${active * 2} ch live<br>${active}/${fx.length} fixtures on<br>Ray-traced · shadow ${Math.round((1 - key.on) * 100)}% soft`;
    }
    pushTimer(setInterval(frame, 60));
}

function heatColor(v) {
    // blue → cyan → yellow → red
    const stops = [[31, 58, 110], [33, 216, 192], [255, 225, 77], [255, 59, 59]];
    const t = v * 3, i = Math.min(2, Math.floor(t)), f = t - i;
    const a = stops[i], b = stops[i + 1];
    return `rgb(${a[0] + (b[0] - a[0]) * f | 0},${a[1] + (b[1] - a[1]) * f | 0},${a[2] + (b[2] - a[2]) * f | 0})`;
}

register(n => /wysiwyg|pre.?viz|visuali[sz]er/i.test(n), 'WYSIWYG · STUDIO PRE-VIZ', render);

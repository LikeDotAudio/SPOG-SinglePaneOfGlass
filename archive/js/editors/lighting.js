// js/editors/lighting.js — the studio LIGHTING (DMX) console. Opens on a floor's
// lighting destination. A three/four-point rig (Key / Fill / Back / Background)
// plus set lighting (Cyc, Effect, Practical, Base) — each an LED fixture with
// intensity + colour temperature, controlled live over DMX from one pane.
import { register, addStyles, pushTimer } from './core.js';

const FIXTURES = [
    { k: 'KEY', sub: 'Key · 30–45°', x: 32, y: 30, color: '#ffd9a0' },
    { k: 'FILL', sub: 'Fill · soft', x: 68, y: 30, color: '#cfe0ff' },
    { k: 'BACK', sub: 'Back / Hair', x: 50, y: 14, color: '#ffffff' },
    { k: 'BG', sub: 'Background', x: 50, y: 82, color: '#9fd6ff' },
    { k: 'CYC', sub: 'Cyclorama', x: 16, y: 70, color: '#7ad0ff' },
    { k: 'FX', sub: 'Effect / Gobo', x: 84, y: 70, color: '#c79bff' },
];

const CSS = `
.lt{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:16px;height:100%;}
.lt-card{background:#0a1326;border:1px solid #1d2942;border-radius:12px;padding:16px;}
.lt-card h4{margin:0 0 12px;color:#6FC8F0;font-size:12px;letter-spacing:2px;text-transform:uppercase;}
/* the rig diagram */
.lt-stage{position:relative;flex:1;border-radius:12px;overflow:hidden;min-height:340px;
    background:radial-gradient(circle at 50% 42%, #20304a 0%, #0a1322 70%);}
.lt-subj{position:absolute;left:50%;top:46%;transform:translate(-50%,-50%);width:70px;height:104px;border-radius:32px 32px 14px 14px;
    background:linear-gradient(#e7b48a,#b67a52);box-shadow:0 10px 26px rgba(0,0,0,.5);}
.lt-subj::after{content:'';position:absolute;left:50%;top:-34px;transform:translateX(-50%);width:44px;height:44px;border-radius:50%;background:#e7b48a;}
.lt-fix{position:absolute;transform:translate(-50%,-50%);width:46px;height:46px;border-radius:8px;cursor:pointer;
    display:flex;align-items:center;justify-content:center;font:900 10px sans-serif;color:#001019;border:2px solid #001019;box-shadow:0 0 14px currentColor;}
.lt-fix .lbl{position:absolute;top:48px;white-space:nowrap;font:bold 9px 'Courier New',monospace;color:#9fb6cc;letter-spacing:1px;}
.lt-fix.sel{outline:2px solid #fff;}
.lt-beam{position:absolute;inset:0;pointer-events:none;}
/* fixture strips */
.lt-strips{display:flex;flex-direction:column;gap:10px;overflow:auto;}
.lt-strip{display:flex;align-items:center;gap:12px;background:#0c1730;border:1px solid #2c3e5e;border-radius:10px;padding:10px;}
.lt-strip.sel{border-color:#6FC8F0;}
.lt-strip .nm{width:84px;font:bold 12px sans-serif;color:#cfe6ff;} .lt-strip .nm small{display:block;color:#7e93b5;font-weight:normal;font-size:9px;}
.lt-strip .int{flex:1;-webkit-appearance:none;appearance:none;height:14px;border-radius:8px;background:#16243d;box-shadow:inset 0 0 0 1px #2c3e5e;outline:none;cursor:pointer;}
.lt-strip .int::-webkit-slider-thumb{-webkit-appearance:none;width:26px;height:26px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#fff,#cfa);border:2px solid #001019;cursor:pointer;}
.lt-strip .pc{width:40px;text-align:right;font:bold 12px 'Courier New',monospace;color:#fff;}
.lt-strip .ct{width:84px;-webkit-appearance:none;appearance:none;height:14px;border-radius:8px;outline:none;cursor:pointer;
    background:linear-gradient(90deg,#ffd9a0,#fff,#bcd8ff);box-shadow:inset 0 0 0 1px #2c3e5e;}
.lt-strip .ct::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:22px;border-radius:5px;background:#13233c;border:2px solid #fff;cursor:pointer;}
.lt-strip .kv{width:48px;font:11px 'Courier New',monospace;color:#aec6e4;}
.lt-dmx{margin-top:10px;font:11px 'Courier New',monospace;color:#6b82a3;letter-spacing:1px;}
.lt-rcol{display:flex;flex-direction:column;gap:16px;overflow:auto;min-height:0;}
.lt-scenes{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
.lt-scene{padding:13px 4px;border-radius:8px;border:1px solid #2c3e5e;background:#0c1730;color:#cfe6ff;font:900 10px sans-serif;letter-spacing:1px;cursor:pointer;}
.lt-scene:hover{background:#16243d;} .lt-scene.on{background:#F2B74B;color:#1a1206;border-color:#F2B74B;}
.lt-cues{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:10px;}
.lt-cue{padding:12px 4px;border-radius:8px;border:1px solid #2c3e5e;background:#0c1730;color:#9fb6cc;font:bold 10px sans-serif;letter-spacing:1px;cursor:pointer;}
.lt-cue:hover{background:#16243d;} .lt-cue.fire{background:#6FC8F0;color:#001019;border-color:#6FC8F0;}
`;

function render(body, twist) {
    addStyles('lt-styles', CSS);
    const st = FIXTURES.map(f => ({ ...f, intensity: f.k === 'KEY' ? 0.85 : f.k === 'FILL' ? 0.45 : 0.6, temp: 0.5 }));
    let sel = 0;

    body.innerHTML = `
      <div class="lt">
        <div class="lt-card" style="display:flex;flex-direction:column">
          <h4>Three / Four-Point Rig · Top-Down</h4>
          <div class="lt-stage"><div class="lt-beam"></div><div class="lt-subj"></div></div>
        </div>
        <div class="lt-rcol">
          <div class="lt-card lt-strips">
            <h4>LED Fixtures · DMX</h4>
            <div class="lt-list"></div>
            <div class="lt-dmx"></div>
          </div>
          <div class="lt-card">
            <h4>Scenes · Recall · Cues</h4>
            <div class="lt-scenes"></div>
            <div class="lt-cues"></div>
          </div>
        </div>
      </div>`;

    const $ = (s) => body.querySelector(s);
    const stage = $('.lt-stage'), beam = $('.lt-beam'), list = $('.lt-list'), dmx = $('.lt-dmx');

    const fixEls = st.map((f, i) => {
        const el = document.createElement('div'); el.className = 'lt-fix';
        el.style.left = f.x + '%'; el.style.top = f.y + '%';
        el.innerHTML = `${f.k}<div class="lbl">${f.sub}</div>`;
        el.addEventListener('click', () => { sel = i; paintSel(); });
        stage.appendChild(el); return el;
    });

    const strips = st.map((f, i) => {
        const el = document.createElement('div'); el.className = 'lt-strip';
        el.innerHTML = `<div class="nm">${f.k}<small>${f.sub}</small></div>
            <input class="int" type="range" min="0" max="1" step="0.01" value="${f.intensity}">
            <div class="pc"></div>
            <input class="ct" type="range" min="0" max="1" step="0.01" value="${f.temp}"><div class="kv"></div>`;
        el.addEventListener('mousedown', () => { sel = i; paintSel(); });
        el.querySelector('.int').addEventListener('input', e => { f.intensity = +e.target.value; paint(); });
        el.querySelector('.ct').addEventListener('input', e => { f.temp = +e.target.value; paint(); });
        list.appendChild(el); return el;
    });

    function tempK(t) { return Math.round(3200 + t * 2400); }   // 3200K → 5600K
    function paint() {
        st.forEach((f, i) => {
            const k = tempK(f.temp), warm = `hsl(${38 - f.temp * 30},90%,${55 + f.intensity * 20}%)`;
            fixEls[i].style.background = warm;
            fixEls[i].style.color = warm;
            fixEls[i].style.opacity = (0.35 + f.intensity * 0.65).toFixed(2);
            strips[i].querySelector('.pc').textContent = Math.round(f.intensity * 100) + '%';
            strips[i].querySelector('.kv').textContent = k + 'K';
        });
        // subject illumination = sum of intensities, tinted by the key
        const key = st[0], fill = st[1];
        const lum = 0.3 + (key.intensity * 0.5 + fill.intensity * 0.3);
        beam.style.background = `radial-gradient(circle at ${30 + (key.intensity - fill.intensity) * 20}% 42%, rgba(255,240,210,${(lum * 0.5).toFixed(2)}), transparent 60%)`;
        const ch = st.reduce((a, f) => a + (f.intensity > 0.01 ? 2 : 0), 0);
        dmx.textContent = `DMX Universe 1 · ${ch} channels active · ${st.length} fixtures · ${tempK(st[0].temp)}K key`;
    }
    function paintSel() { strips.forEach((s, i) => s.classList.toggle('sel', i === sel)); fixEls.forEach((e, i) => e.classList.toggle('sel', i === sel)); }

    // ---- scenes / recall + cue triggers into the console ----
    const SCENES = [['NEWS', [.85, .45, .7, .6, .5, .4]], ['INTERVIEW', [.7, .6, .6, .5, .4, .3]], ['WIDE', [.9, .7, .8, .8, .7, .5]],
        ['DRAMATIC', [.95, .2, .8, .3, .6, .7]], ['PROMO', [.6, .5, .6, .7, .9, .9]], ['BLACKOUT', [0, 0, 0, 0, 0, 0]]];
    const scHost = $('.lt-scenes');
    SCENES.forEach(([nm, set]) => {
        const b = document.createElement('button'); b.className = 'lt-scene'; b.textContent = nm;
        b.addEventListener('click', () => {
            set.forEach((v, i) => { if (st[i]) { st[i].intensity = v; strips[i].querySelector('.int').value = v; } });
            paint(); scHost.querySelectorAll('.lt-scene').forEach(x => x.classList.remove('on')); b.classList.add('on');
        });
        scHost.appendChild(b);
    });
    const cueHost = $('.lt-cues');
    ['CUE GO ▶', 'CUE BACK ◀', 'SNAP', 'FADE 3 s', 'STORE', 'TRIGGER → CONSOLE'].forEach(l => {
        const b = document.createElement('button'); b.className = 'lt-cue'; b.textContent = l;
        b.addEventListener('click', () => { b.classList.add('fire'); setTimeout(() => b.classList.remove('fire'), 350); });
        cueHost.appendChild(b);
    });

    paint(); paintSel();
    pushTimer(setInterval(() => { /* live DMX heartbeat */ }, 1000));
}

register(n => /\blight(ing)?\b|key light|fill light|back light|cyc|gobo|\bdmx\b|fixture/i.test(n) && !/on.?air/i.test(n), 'LIGHTING · DMX CONSOLE', render);

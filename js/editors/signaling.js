// js/editors/signaling.js — the control-room SIGNALING panel. The vision mixer is
// the brain that knows what's on the Program bus; this surface distributes that as
// TALLY (red = PGM/on-air, green = PVW/next, amber = ISO/standby), drives the
// studio On-Air light, switches Live/Rehearsal, and is a "panel maker" of GPI/SCTE
// production triggers.
import { register, addStyles, pushTimer } from './core.js';

const CSS = `
.sg{display:grid;grid-template-columns:240px minmax(0,1fr) 300px;gap:16px;height:100%;}
.sg-card{background:#0a1326;border:1px solid #1d2942;border-radius:12px;padding:16px;}
.sg-card h4{margin:0 0 12px;color:#6FC8F0;font-size:12px;letter-spacing:2px;text-transform:uppercase;}
.sg-col{display:flex;flex-direction:column;gap:14px;overflow:auto;}
/* On-Air */
.sg-onair{border-radius:14px;padding:26px 10px;text-align:center;font:900 30px sans-serif;letter-spacing:4px;
    background:#16110a;color:#5a4a2a;border:2px solid #2a3a55;transition:.2s;}
.sg-onair.live{background:#3a0808;color:#fff;border-color:#ff2b2b;box-shadow:0 0 26px rgba(255,43,43,.6);animation:sgPulse 1.4s ease-in-out infinite;}
.sg-onair.reh{background:#3a2c08;color:#ffd76b;border-color:#ffd400;box-shadow:0 0 18px rgba(255,212,0,.4);}
@keyframes sgPulse{50%{filter:brightness(1.25)}}
.sg-mode{display:flex;gap:8px;margin-top:14px;}
.sg-mode .b{flex:1;padding:12px;border-radius:9px;border:1px solid #2c3e5e;background:#0c1730;color:#9fb6cc;font:900 12px sans-serif;letter-spacing:1px;cursor:pointer;text-align:center;}
.sg-mode .b.sel{background:#6FC8F0;color:#001019;border-color:#6FC8F0;}
/* tally bus */
.sg-bus{display:flex;flex-direction:column;gap:12px;}
.sg-take{align-self:flex-start;padding:12px 26px;border-radius:10px;border:none;background:#ff3b3b;color:#fff;font:900 14px sans-serif;letter-spacing:2px;cursor:pointer;box-shadow:0 0 14px rgba(255,59,59,.5);}
.sg-take:hover{filter:brightness(1.1);}
.sg-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;}
.sg-cam{position:relative;border-radius:10px;border:2px solid #33415f;background:#0a1326;padding:14px 8px 10px;text-align:center;}
.sg-cam .nm{font:900 14px sans-serif;color:#cfe6ff;letter-spacing:1px;}
.sg-cam .st{font:bold 9px 'Courier New',monospace;letter-spacing:1px;color:#7e93b5;margin-top:4px;min-height:11px;}
.sg-cam.pgm{border-color:#ff2b2b;box-shadow:0 0 12px rgba(255,43,43,.6);} .sg-cam.pgm .nm{color:#ff6a6a;} .sg-cam.pgm .st{color:#ff6a6a;}
.sg-cam.pvw{border-color:#39d353;} .sg-cam.pvw .nm{color:#7ef29a;} .sg-cam.pvw .st{color:#7ef29a;}
.sg-cam.iso{border-color:#ffd400;} .sg-cam.iso .st{color:#ffd76b;}
.sg-cam .row{display:flex;gap:4px;margin-top:8px;}
.sg-cam .row button{flex:1;padding:5px 0;border-radius:5px;border:1px solid #2c3e5e;background:#0c1730;color:#9fb6cc;font:bold 9px sans-serif;cursor:pointer;}
.sg-cam .row .pgmb:hover{background:#3a0808;color:#ff9a9a;} .sg-cam .row .pvwb:hover{background:#0c3a18;color:#9effb0;} .sg-cam .row .isob:hover{background:#3a2c08;color:#ffd76b;}
/* trigger panel maker */
.sg-trigs{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;}
.sg-trig{padding:16px 8px;border-radius:10px;border:1px solid #2c3e5e;background:#0c1730;color:#cfe6ff;font:900 11px sans-serif;letter-spacing:1px;text-transform:uppercase;cursor:pointer;text-align:center;}
.sg-trig:hover{background:#16243d;} .sg-trig.fire{background:#6FC8F0;color:#001019;border-color:#6FC8F0;}
.sg-trig.scte{border-color:#ff6a6a;color:#ff9a9a;} .sg-trig.scte.fire{background:#ff3b3b;color:#fff;border-color:#ff3b3b;}
.sg-add{grid-column:1 / -1;padding:12px;border-radius:10px;border:1px dashed #2c3e5e;background:transparent;color:#6b82a3;font:bold 11px sans-serif;letter-spacing:1px;cursor:pointer;}
.sg-log{margin-top:12px;font:11px 'Courier New',monospace;color:#7e93b5;line-height:1.7;max-height:120px;overflow:auto;}
.sg-log b{color:#cfe6ff;}
`;

function render(body, twist) {
    addStyles('sg-styles', CSS);
    const N = 8;
    const ui = { pgm: 0, pvw: 1, iso: new Set(), mode: 'live', log: [] };

    body.innerHTML = `
      <div class="sg">
        <div class="sg-col">
          <div class="sg-card"><h4>Studio State</h4>
            <div class="sg-onair">OFF AIR</div>
            <div class="sg-mode"><div class="b sel" data-mode="live">Live</div><div class="b" data-mode="reh">Rehearsal</div></div>
          </div>
          <div class="sg-card"><h4>On-Air Light</h4>
            <div class="sg-onlight" style="text-align:center;font:900 14px sans-serif;letter-spacing:2px;padding:18px;border-radius:10px;">DOOR LIGHT</div>
          </div>
        </div>

        <div class="sg-card sg-bus"><h4>Tally Bus · Switcher Program / Preview</h4>
          <button class="sg-take">▶ TAKE / CUT</button>
          <div class="sg-grid"></div>
        </div>

        <div class="sg-card sg-col"><h4>Production Triggers · GPI / SCTE</h4>
          <div class="sg-trigs"></div>
          <div class="sg-log"></div>
        </div>
      </div>`;

    const $ = (s) => body.querySelector(s);
    const grid = $('.sg-grid'), onair = $('.sg-onair'), onlight = $('.sg-onlight'), logEl = $('.sg-log');

    function log(msg) { ui.log.unshift(msg); ui.log = ui.log.slice(0, 8); logEl.innerHTML = ui.log.map(l => l).join('<br>'); }

    // ---- tally cams ----
    const cams = [];
    for (let i = 0; i < N; i++) {
        const el = document.createElement('div'); el.className = 'sg-cam';
        el.innerHTML = `<div class="nm">CAM ${i + 1}</div><div class="st"></div>
            <div class="row"><button class="pgmb">PGM</button><button class="pvwb">PVW</button><button class="isob">ISO</button></div>`;
        el.querySelector('.pgmb').addEventListener('click', () => { ui.pgm = i; paint(); log(`<b>CUT</b> → CAM ${i + 1} on Program`); });
        el.querySelector('.pvwb').addEventListener('click', () => { ui.pvw = i; paint(); });
        el.querySelector('.isob').addEventListener('click', () => { ui.iso.has(i) ? ui.iso.delete(i) : ui.iso.add(i); paint(); });
        grid.appendChild(el); cams.push(el);
    }
    $('.sg-take').addEventListener('click', () => { const t = ui.pgm; ui.pgm = ui.pvw; ui.pvw = t; paint(); log(`<b>TAKE</b> → CAM ${ui.pgm + 1} live (was preview)`); });

    function paint() {
        cams.forEach((el, i) => {
            el.classList.toggle('pgm', i === ui.pgm);
            el.classList.toggle('pvw', i === ui.pvw);
            el.classList.toggle('iso', ui.iso.has(i) && i !== ui.pgm && i !== ui.pvw);
            el.querySelector('.st').textContent = i === ui.pgm ? '● PROGRAM' : i === ui.pvw ? '● PREVIEW' : ui.iso.has(i) ? '● ISO REC' : 'STANDBY';
        });
        const live = ui.mode === 'live';
        onair.className = 'sg-onair ' + (live ? 'live' : 'reh');
        onair.textContent = live ? 'ON AIR' : 'REHEARSAL';
        onlight.style.background = live ? '#3a0808' : '#3a2c08';
        onlight.style.color = live ? '#ff6a6a' : '#ffd76b';
        onlight.style.boxShadow = live ? '0 0 16px rgba(255,43,43,.5)' : '0 0 12px rgba(255,212,0,.35)';
        onlight.textContent = live ? 'DOOR LIGHT · RED (LIVE)' : 'DOOR LIGHT · AMBER (REH)';
    }

    body.querySelectorAll('.sg-mode .b').forEach(b => b.addEventListener('click', () => {
        ui.mode = b.dataset.mode;
        body.querySelectorAll('.sg-mode .b').forEach(x => x.classList.toggle('sel', x === b));
        paint(); log(`Mode → <b>${ui.mode === 'live' ? 'LIVE' : 'REHEARSAL'}</b>`);
    }));

    // ---- trigger panel ("buttons on a panel maker") ----
    const trigsHost = $('.sg-trigs');
    const TRIGS = [
        { l: 'SCTE-35 Ad Cue', c: 'scte' }, { l: 'On-Air Light', c: '' }, { l: 'GPI 1', c: '' }, { l: 'GPI 2', c: '' },
        { l: 'Fade To Black', c: '' }, { l: 'Instant Replay', c: '' },
    ];
    function addTrig(t) {
        const b = document.createElement('div'); b.className = 'sg-trig ' + (t.c || '');
        b.textContent = t.l;
        b.addEventListener('click', () => { b.classList.add('fire'); setTimeout(() => b.classList.remove('fire'), 400); log(`⦿ TRIGGER · <b>${t.l}</b> fired`); });
        trigsHost.insertBefore(b, trigsHost.querySelector('.sg-add'));
    }
    TRIGS.forEach(addTrig);
    const add = document.createElement('div'); add.className = 'sg-add'; add.textContent = '＋ ADD TRIGGER';
    add.addEventListener('click', () => { const l = prompt('Trigger button label:', 'Custom Cue'); if (l) addTrig({ l, c: '' }); });
    trigsHost.appendChild(add);

    paint(); log('Signaling online · tally distributed via GPI / NMOS IS-07');
    pushTimer(setInterval(() => { }, 1000));
}

register(n => /signal|\btally\b|on.?air/i.test(n), 'SIGNALING · TALLY & TRIGGERS', render);

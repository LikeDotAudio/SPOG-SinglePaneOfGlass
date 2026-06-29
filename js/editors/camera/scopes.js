// js/editors/camera/scopes.js — the RGB PARADE waveform monitor + vectorscope.
// Three side-by-side graphs (R | G | B): X mirrors the frame horizontal axis,
// Y is intensity (0–100 IRE). With Colour Bars on, the bar test signal drives it.
import { clamp } from './state.js';

const BARS75 = [[.75, .75, .75], [.75, .75, 0], [0, .75, .75], [0, .75, 0], [.75, 0, .75], [.75, 0, 0], [0, 0, .75]];
const RGBCOL = ['255,64,64', '64,235,96', '92,128,255'];
const LBL = ['R', 'G', 'B'];

function channel(s, c, x) {
    const expoGain = 0.42 + s.iris * 1.15 + s.mgain * 0.55, floor = Math.max(0, s.mblack - 0.5) * 0.55, gammaExp = 0.55 + (1 - s.gamma) * 0.9;
    const lightX = 0.5 + (s.pan - 0.5) * 0.6, subjX = 0.5 - (s.pan - 0.5) * 0.8;
    const g = (xx, m, sg) => Math.exp(-((xx - m) * (xx - m)) / (2 * sg * sg));
    const base = 0.12 + g(x, lightX, 0.16) * 0.78 + (Math.abs(x - subjX) < 0.13 ? 0.42 : 0) + 0.12 * (1 - Math.abs(x - 0.5) * 2);
    const gains = [s.rGain, s.gGain, s.bGain], blks = [s.rBlk, s.gBlk, s.bBlk];
    let v = floor + base * expoGain; v = Math.pow(clamp(v), gammaExp); v = v * (0.62 + gains[c] * 0.82) + (blks[c] - 0.5) * 0.28;
    return clamp(v);
}

export function drawParade(cv, s, barsOn) {
    const w = cv.clientWidth | 0, h = cv.clientHeight | 0; if (!w || !h) return;
    if (cv.width !== w) cv.width = w; if (cv.height !== h) cv.height = h;
    const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, w, h);
    const top = 12, bot = h - 6, span = bot - top, padL = 22, gap = 10;
    const pw = (w - padL - 4 - gap * 2) / 3;
    ctx.font = '9px Courier New, monospace';
    for (let c = 0; c < 3; c++) {
        const x0 = padL + c * (pw + gap);
        ctx.fillStyle = 'rgba(255,255,255,.02)'; ctx.fillRect(x0, top, pw, span);
        [0, 25, 50, 75, 100].forEach(p => {
            const y = bot - (p / 100) * span;
            ctx.strokeStyle = p === 100 ? 'rgba(255,90,90,.3)' : 'rgba(80,110,150,.16)';
            ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + pw, y); ctx.stroke();
            if (c === 0) { ctx.fillStyle = 'rgba(120,150,190,.7)'; ctx.fillText(String(p), 2, y + 3); }
        });
        ctx.fillStyle = `rgba(${RGBCOL[c]},.9)`; ctx.fillText(LBL[c], x0 + 5, top + 9);
        ctx.globalCompositeOperation = 'lighter';
        const N = 90;
        for (let i = 0; i < N; i++) {
            const fx = i / (N - 1), px = x0 + fx * pw;
            const val = barsOn ? BARS75[Math.min(6, Math.floor(fx * 7))][c] : channel(s, c, fx);
            const jit = barsOn ? 0.012 : (0.03 + s.mgain * 0.12);
            for (let k = 0; k < 3; k++) { ctx.fillStyle = `rgba(${RGBCOL[c]},.5)`; ctx.fillRect(px, bot - clamp(val + (Math.random() - 0.5) * jit) * span, 2, 2); }
        }
        ctx.globalCompositeOperation = 'source-over';
    }
}

// A real vectorscope: a 2D projection of colour (chrominance) — RGB is converted
// to YPbPr, luminance discarded, and the colour-difference (Pb,Pr) plotted on a
// polar graph (angle = hue, radius = saturation). Target boxes mark the SMPTE
// primaries/secondaries; the I-line is the skin-tone axis. Balance to centre = WB.
const TARGETS = { R: [.75, 0, 0], Yl: [.75, .75, 0], G: [0, .75, 0], Cy: [0, .75, .75], B: [0, 0, .75], Mg: [.75, 0, .75] };

function ypbpr(r, g, b) {
    const Y = 0.299 * r + 0.587 * g + 0.114 * b;
    return [(b - Y) * 0.564, (r - Y) * 0.713];   // Pb, Pr
}

export function drawVectorscope(cv, s, barsOn) {
    const w = cv.width = cv.clientWidth | 0, h = cv.height = cv.clientHeight | 0; if (!w || !h) return;
    const ctx = cv.getContext('2d'), cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 4, K = R * 1.78;
    ctx.clearRect(0, 0, w, h);
    const xy = (r, g, b) => { const [pb, pr] = ypbpr(r, g, b); return [cx + pb * K, cy - pr * K]; };
    // graticule
    ctx.strokeStyle = 'rgba(80,110,150,.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.5, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.stroke();
    // skin-tone / I-line
    const [sx, sy] = xy(0.78, 0.55, 0.42);
    ctx.strokeStyle = 'rgba(255,200,120,.35)'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + (sx - cx) * 1.5, cy + (sy - cy) * 1.5); ctx.stroke();
    // target boxes
    ctx.font = '8px Courier New, monospace'; ctx.strokeStyle = 'rgba(150,180,220,.6)'; ctx.fillStyle = 'rgba(150,180,220,.7)';
    for (const k in TARGETS) { const [x, y] = xy(...TARGETS[k]); ctx.strokeRect(x - 4, y - 4, 8, 8); ctx.fillText(k, x + 6, y + 3); }
    // trace
    if (barsOn) {
        [[.75, .75, .75], ...Object.values(TARGETS)].forEach(c => { const [x, y] = xy(...c); ctx.fillStyle = '#dff0ff'; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 7); ctx.fill(); });
    } else {
        const gr = (v, k) => v * (0.62 + s[k] * 0.82);
        // skin-tone cluster (lands on the I-line when WB is correct)
        ctx.fillStyle = 'rgba(255,224,96,.85)';
        for (let i = 0; i < 50; i++) { const [x, y] = xy(gr(0.78, 'rGain'), gr(0.55, 'gGain'), gr(0.42, 'bGain')); ctx.fillRect(x + (Math.random() - 0.5) * 10, y + (Math.random() - 0.5) * 10, 1.5, 1.5); }
        // neutral-grey dot: collapses to centre only when RGB gains are balanced
        const [nx, ny] = xy(gr(0.5, 'rGain'), gr(0.5, 'gGain'), gr(0.5, 'bGain'));
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(nx, ny, 3, 0, 7); ctx.fill();
    }
}

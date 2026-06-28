// js/lcars-pulse.js — a 20px LCARS "data pulse" column down the right edge.
//
// A tall strip of horizontal data lines (mostly dim, some blue) with a cyan pulse
// sweeping up the column and random flicker — the scrolling-readout look from
// mewho.com/trek. Purely decorative (pointer-events:none); nudges the
// bottom-right corner buttons inward so they clear the strip. Self-mounting.
(function () {
    'use strict';
    const STYLE_ID = 'lcars-pulse-styles';
    const WIDTH = 20;
    let stripEl = null, linesEl = null, flickerTimer = null, resizeTimer = null;

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = `
        .lcp-strip{position:fixed;top:0;right:0;height:100vh;height:100dvh;width:${WIDTH}px;z-index:950;
            background:#050505;display:flex;flex-direction:column;overflow:hidden;pointer-events:none;}
        .lcp-cap{flex:0 0 auto;height:26px;background:#c1502a;}
        .lcp-cap.top{border-radius:0 0 0 11px;}
        .lcp-cap.bot{border-radius:11px 0 0 0;}
        .lcp-lines{position:relative;flex:1 1 auto;min-height:0;display:flex;flex-direction:column;
            justify-content:space-between;padding:5px 0;overflow:hidden;}
        .lcp-line{height:2px;border-radius:1px;background:#2c2c2c;transition:background .15s,box-shadow .15s;}
        .lcp-line.dim{background:#1c1c1c;}
        .lcp-line.mid{background:#3a3a3a;}
        .lcp-line.blue{background:#3aa0ff;box-shadow:0 0 5px rgba(58,160,255,.8);}
        .lcp-line.red{background:#ff5a3c;box-shadow:0 0 5px rgba(255,90,60,.7);}
        /* The pulse: a glowing band sweeping up the column. */
        .lcp-lines::after{content:'';position:absolute;left:0;right:0;top:0;height:42%;pointer-events:none;
            background:linear-gradient(to bottom,transparent,rgba(90,190,255,.30),rgba(160,220,255,.10),transparent);
            animation:lcpPulse 2.6s linear infinite;}
        @keyframes lcpPulse{0%{transform:translateY(140%);}100%{transform:translateY(-160%);}}
        /* Make room: pull the bottom-right corner widgets in past the strip. */
        .credit-button{right:${WIDTH + 14}px !important;}
        .rv-btn{right:${WIDTH + 14}px !important;}
        .ptp-clock{right:${WIDTH + 14}px !important;}
        @media (prefers-reduced-motion: reduce){ .lcp-lines::after{animation:none;} }
        `;
        document.head.appendChild(s);
    }

    function fillLines() {
        if (!linesEl) return;
        const n = Math.max(24, Math.floor((window.innerHeight - 60) / 7));
        let html = '';
        for (let i = 0; i < n; i++) {
            const r = Math.random();
            const cls = r < 0.30 ? 'dim' : r < 0.55 ? 'mid' : r < 0.72 ? 'blue' : r < 0.76 ? 'red' : '';
            html += `<div class="lcp-line ${cls}"></div>`;
        }
        linesEl.innerHTML = html;
    }

    function flicker() {
        if (!linesEl) return;
        const lines = linesEl.children;
        for (let k = 0; k < 4; k++) {
            const l = lines[Math.floor(Math.random() * lines.length)];
            if (!l) continue;
            l.className = 'lcp-line ' + (Math.random() < 0.5 ? 'blue' : Math.random() < 0.3 ? 'red' : Math.random() < 0.5 ? 'mid' : 'dim');
        }
    }

    function build() {
        injectStyles();
        if (stripEl) return;
        stripEl = document.createElement('div');
        stripEl.className = 'lcp-strip';
        stripEl.innerHTML = `<div class="lcp-cap top"></div><div class="lcp-lines"></div><div class="lcp-cap bot"></div>`;
        document.body.appendChild(stripEl);
        linesEl = stripEl.querySelector('.lcp-lines');
        fillLines();
        flickerTimer = setInterval(flicker, 130);
        window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(fillLines, 200); });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
    else build();
})();

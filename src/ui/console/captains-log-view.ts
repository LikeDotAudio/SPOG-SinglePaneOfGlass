// src/ui/console/captains-log-view — the Captain's Log CSS + the list renderer.
// Owns the `listEl` DOM ref (set by the orchestrator's build()); render() reads
// the shared narratives / selected state and repaints the panel + the badge.
import { narratives, selected, narKey } from './captains-log-state.js';

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const esc = (s: string): string => String(s).replace(/[&<>"]/g, (c) => ESC[c] ?? c);
const hms = (ts: number): string => new Date(ts).toISOString().slice(11, 19);
const VOY_COLORS = ['#C2B74B', '#FF9C63', '#3FC1C9', '#A06EB4', '#cc6a3a', '#6cdf4a', '#9C6B9C'];

export const CL_CSS = `
.cl-btn{display:block;width:100%;z-index:1000;background:#C2B74B;color:#1a1206;border:none;font-family:'Courier New',monospace;font-weight:900;letter-spacing:2px;text-transform:uppercase;padding:9px 16px;margin-bottom:10px;border-radius:18px 6px 6px 18px;cursor:pointer;box-shadow:inset 6px 0 0 #8f8a35;text-align:left;}
.cl-btn:hover{background:#ffcf6b;color:#000;}
.cl-badge{display:inline-block;min-width:16px;margin-left:6px;padding:0 5px;border-radius:8px;background:#1a1206;color:#C2B74B;font-size:10px;}
.cl-panel{position:fixed;top:0;right:0;width:500px;max-width:94vw;height:100%;z-index:2600;background:#0a0805;color:#ffcf6b;font-family:Arial,Helvetica,sans-serif;display:flex;flex-direction:column;transform:translateX(101%);transition:transform .25s ease;box-shadow:-10px 0 40px rgba(0,0,0,.7);}
.cl-panel.open{transform:translateX(0);}
.cl-head{display:flex;align-items:stretch;height:46px;background:#C2B74B;}
.cl-title{flex:1;display:flex;align-items:center;padding-left:22px;color:#000;font-weight:900;letter-spacing:3px;font-size:15px;}
.cl-x{flex:0 0 auto;width:62px;display:flex;align-items:center;justify-content:center;color:#000;font-weight:900;letter-spacing:1px;cursor:pointer;box-shadow:inset 2px 0 0 rgba(0,0,0,.25);}
.cl-x:hover{background:rgba(0,0,0,.15);}
.cl-tools{display:flex;gap:8px;padding:10px 12px;background:#140f06;}
.cl-rev,.cl-new{font-family:inherit;font-weight:900;font-size:11px;letter-spacing:1px;cursor:pointer;padding:8px 16px;border:none;border-radius:14px;text-transform:uppercase;color:#000;}
.cl-rev{background:#cc3a3a;} .cl-new{background:#6cdf4a;}
.cl-rev:hover,.cl-new:hover{filter:brightness(1.12);}
.cl-list{flex:1;overflow:auto;padding:10px 10px 10px 0;background:#0a0805;}
.cl-empty{color:#6a5a30;padding:30px 10px;text-align:center;letter-spacing:1px;}
.cl-nar{margin:0 0 16px 14px;}
.cl-nar-h{display:flex;align-items:center;gap:8px;height:30px;padding:0 14px;color:#000;font-weight:900;letter-spacing:2px;font-size:12px;border-radius:14px 14px 3px 3px;cursor:pointer;text-transform:uppercase;}
.cl-nar-h .cl-edit{margin-left:auto;font-size:9px;font-weight:bold;opacity:.7;text-transform:none;}
.cl-entry{display:flex;align-items:stretch;margin-top:3px;cursor:pointer;background:#12100a;border-radius:3px 12px 12px 3px;overflow:hidden;}
.cl-entry:hover{background:#1c1810;}
.cl-cap{flex:0 0 12px;}
.cl-mid{flex:1;min-width:0;padding:7px 11px;font-size:12px;line-height:1.42;color:#ffe9b0;}
.cl-val{flex:0 0 auto;align-self:stretch;display:flex;flex-direction:column;align-items:flex-end;justify-content:center;padding:4px 13px;background:#1c1408;color:#ffcf6b;font-family:'Courier New',monospace;font-weight:bold;font-size:12px;min-width:78px;text-align:right;}
.cl-val small{font-size:8px;color:#8a7430;letter-spacing:1px;}
.cl-entry.sel{outline:2px solid rgb(244, 144, 44);outline-offset:-2px;background:rgba(244, 144, 44, 0.15);}
.cl-entry.sel .cl-cap{background:rgb(244, 144, 44) !important;color:#fff;}
.cl-entry.reversed{opacity:.4;}
.cl-entry.reversed .cl-mid{text-decoration:line-through;}
.cl-rb{color:#ff8a8a;font-style:italic;font-size:10px;}`;

let listEl: HTMLElement | null = null;
/** The orchestrator's build() hands the freshly-queried list element here. */
export const setListEl = (el: HTMLElement | null): void => { listEl = el; };

export function render(): void {
  // Update the badge even when the panel is closed (so layout edits & routing
  // changes both bump the count before the log is ever opened).
  const total = narratives.reduce((a, n) => a + n.entries.length, 0);
  const badge = document.querySelector('.cl-badge');
  if (badge) badge.textContent = String(total);
  if (!listEl) return;
  if (!total) { listEl.innerHTML = `<div class="cl-empty">— ship's log empty —<br>routing decisions appear here</div>`; return; }
  let html = '';
  [...narratives].reverse().forEach((n) => {
    const color = VOY_COLORS[narratives.indexOf(n) % VOY_COLORS.length] ?? '#C2B74B';
    html += `<div class="cl-nar"><div class="cl-nar-h" data-nar="${narKey(n.origin, n.id)}" style="background:${color}">${esc(n.title)}<span class="cl-edit">row=select · header=all · ✎</span></div>`;
    [...n.entries].reverse().forEach((e) => {
      html += `<div class="cl-entry${selected.has(e.id) ? ' sel' : ''}${e.reversed ? ' reversed' : ''}" data-entry="${e.id}">
        <div class="cl-cap" style="background:${color}"></div>
        <div class="cl-mid">${esc(e.text)}${e.reversed ? ' <span class="cl-rb">[course reversed]</span>' : ''}</div>
        <div class="cl-val">${hms(e.ts)}<small>UTC</small></div></div>`;
    });
    html += `</div>`;
  });
  listEl.innerHTML = html;
}

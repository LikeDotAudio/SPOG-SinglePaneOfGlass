// src/ui/console/captains-log-timeline-css — the Timeline Viewer stylesheet. Split
// out of captains-log-timeline (200-line rule). Geometry constants are inlined here
// (lane 30 / group 19 / ruler 26 / gutter 220) to match the layout maths in the view.
export const TL_CSS = `
.tl-panel{position:fixed;inset:0;z-index:2700;display:none;flex-direction:column;background:#06070c;color:#cfe6ff;font-family:Arial,Helvetica,sans-serif;}
.tl-panel.open{display:flex;}
.tl-head{display:flex;align-items:center;gap:10px;min-height:46px;padding:4px 14px;background:#C2B74B;color:#000;flex:0 0 auto;flex-wrap:wrap;}
.tl-title{font-weight:900;letter-spacing:2px;}
.tl-head .tl-spacer{flex:1;}
.tl-legend{display:flex;gap:10px;flex-wrap:wrap;font:10px 'Courier New',monospace;}
.tl-legend span{display:inline-flex;align-items:center;gap:4px;}
.tl-legend i{width:10px;height:10px;border-radius:50%;display:inline-block;}
.tl-filter{font:12px 'Courier New',monospace;border:none;border-radius:12px;padding:7px 12px;width:180px;background:#140f06;color:#ffcf6b;outline:none;}
.tl-filter::placeholder{color:#8a7430;}
.tl-chipbar{display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:8px 14px;background:#0a0c14;border-bottom:1px solid #1d2942;flex:0 0 auto;}
.tl-groups{display:flex;gap:6px;flex-wrap:wrap;align-items:center;}
.tl-chip{font:800 10px 'Courier New',monospace;letter-spacing:1px;text-transform:uppercase;border:2px solid var(--c,#3FC1C9);border-radius:12px;padding:5px 11px;cursor:pointer;background:#06070c;color:var(--c,#3FC1C9);white-space:nowrap;}
.tl-chip:hover{background:color-mix(in srgb, var(--c,#3FC1C9) 30%, #06070c);}
.tl-chip.on{background:var(--c,#3FC1C9);color:#06070c;}
.tl-chip.all{--c:#C2B74B;}
.tl-btn{font:900 11px sans-serif;letter-spacing:1px;text-transform:uppercase;border:none;border-radius:12px;padding:7px 12px;cursor:pointer;background:#140f06;color:#ffcf6b;}
.tl-btn:hover{filter:brightness(1.15);}
.tl-x{cursor:pointer;font-weight:900;padding:0 6px;}
.tl-body{flex:1;min-height:0;overflow:auto;position:relative;background:#06070c;}
.tl-grid{position:relative;}
.tl-sec,.tl-group{cursor:pointer;user-select:none;height:19px;position:relative;}
.tl-sec{font:900 10px sans-serif;letter-spacing:2px;color:#06070c;}
.tl-sec.where{background:#6FC8F0;} .tl-sec.how{background:#3FC1C9;} .tl-sec.who{background:#A06EB4;} .tl-sec.whom{background:#ff5fa2;}
.tl-group{color:#9a8845;font:9px 'Courier New',monospace;letter-spacing:1px;text-transform:uppercase;background:#0a0805;}
.tl-group.folded{color:#7f8fa6;}
/* The header TEXT (title + fold flap) sticks to the left edge — like the lane labels —
   so it stays put while the graph scrolls horizontally. The full-width bar behind it is
   a solid colour, so the row still reads correctly at any scroll offset. */
.tl-hd-in{position:sticky;left:0;z-index:6;display:inline-flex;align-items:center;gap:6px;height:100%;padding:0 8px;box-sizing:border-box;background:inherit;}
.tl-group .tl-hd-in{padding-left:18px;}
/* Summary marks on a folded group/section header row — thin bands + small dots. */
.tl-band.tl-sum{top:7px;height:5px;opacity:.55;}
.tl-kf.tl-sum{top:5px;width:8px;height:8px;margin-left:-4px;border-width:1.5px;}
.tl-count{color:#6FC8F0;font-style:italic;text-transform:none;letter-spacing:0;}
.tl-lane{position:relative;height:30px;border-bottom:1px solid #10141f;}
.tl-lane:nth-of-type(even){background:rgba(255,255,255,.015);}
.tl-lane.tl-comp{background:rgba(111,200,240,.06);}
.tl-lane.tl-comp .tl-lanelabel{color:#6FC8F0;font-style:italic;padding-left:18px;}
.tl-lanelabel{position:sticky;left:0;z-index:4;display:inline-flex;align-items:center;height:100%;width:220px;box-sizing:border-box;padding:0 8px 0 30px;font:11px 'Courier New',monospace;color:#9fb6cc;background:#0a0c14;border-right:1px solid #1d2942;box-shadow:2px 0 6px rgba(0,0,0,.4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.tl-band{position:absolute;top:11px;height:8px;border-radius:4px;opacity:.5;}
.tl-plan{position:absolute;top:7px;height:16px;border-radius:5px;border:1.5px solid var(--pc,#5a6a8c);background:color-mix(in srgb,var(--pc,#5a6a8c) 24%,transparent);color:#e6ecf7;font:9px 'Courier New',monospace;line-height:16px;padding:0 6px;overflow:hidden;white-space:nowrap;box-sizing:border-box;}
.tl-plan.reh{border-style:dashed;background:color-mix(in srgb,var(--pc,#5a6a8c) 10%,transparent);color:#aeb9d0;font-style:italic;}
.tl-conflict{font-style:normal;font-weight:900;color:#ff6a6a;margin-left:5px;}
.room-onair { background: rgba(255, 0, 0, 0.15) !important; }
.room-onair .tl-lanelabel { background: #660000; color: #ffcccc; border-right-color: #ff3b3b; animation: pulseBg 1.5s infinite alternate; }
.room-reh { background: rgba(255, 165, 0, 0.15) !important; }
.room-reh .tl-lanelabel { background: #663300; color: #ffe5cc; border-right-color: #ff9900; }
.r-badge { margin-left: 8px; padding: 2px 5px; border-radius: 4px; font-weight: bold; font-size: 9px; }
.r-badge.onair { background: #ff3b3b; color: #fff; }
.r-badge.reh { background: #ff9900; color: #fff; }
@keyframes pulseBg { from { background: #660000; } to { background: #cc0000; } }
.tl-onair-banner { flex: 1; display: flex; justify-content: center; gap: 24px; font-size: 18px; font-weight: 900; color: #ff3b3b; letter-spacing: 2px; text-transform: uppercase; white-space: nowrap; overflow: hidden; }
.tl-onair-banner.active span { animation: pulseText 1.5s infinite alternate; }
@keyframes pulseText { from { opacity: 0.6; text-shadow: 0 0 4px #ff3b3b; } to { opacity: 1; text-shadow: 0 0 12px #ff3b3b; } }
.tl-kf{position:absolute;top:8px;width:12px;height:12px;margin-left:-6px;border-radius:50%;border:2px solid #06070c;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.6);z-index:3;}
.tl-kf:hover{transform:scale(1.4);z-index:6;}
.tl-kf.rev{opacity:.35;}
.tl-tick{position:absolute;top:0;bottom:26px;width:1px;background:#12182a;}
.tl-ruler{position:sticky;bottom:0;height:26px;z-index:5;background:#0a0c14;border-top:1px solid #1d2942;}
.tl-rlabel{position:absolute;bottom:0;height:100%;display:flex;flex-direction:column;justify-content:center;font:10px 'Courier New',monospace;color:#7e93b5;padding-left:3px;border-left:1px solid #16233d;}
.tl-rlabel b{color:#6FC8F0;font-size:9px;}
.tl-now{position:absolute;top:0;bottom:26px;width:2px;background:#ff3b3b;box-shadow:0 0 8px #ff3b3b;z-index:4;pointer-events:none;}
.tl-empty{padding:40px;text-align:center;color:#6a5a30;letter-spacing:1px;}
.tl-detail{position:fixed;z-index:2800;max-width:380px;min-width:220px;background:#0a1120;border:1px solid #2a3b5c;border-radius:10px;box-shadow:0 12px 36px rgba(0,0,0,.65);color:#e6f2ff;font:12px/1.5 'Courier New',monospace;overflow:hidden;}
.tl-detail-h{display:flex;align-items:center;gap:8px;padding:7px 11px;background:#16233d;color:#6FC8F0;font-weight:bold;letter-spacing:1px;}
.tl-detail-h .x{margin-left:auto;cursor:pointer;color:#7e93b5;}
.tl-detail-b{padding:9px 12px;}
.tl-detail-b .rev{color:#ff8a8a;font-style:italic;}
.tl-nav{position:absolute;right:16px;bottom:36px;z-index:8;width:280px;height:46px;background:rgba(10,14,24,.92);border:1px solid #2a3b5c;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.6);cursor:pointer;overflow:hidden;}
.tl-nav-mark{position:absolute;top:6px;height:22px;width:1.5px;border-radius:1px;opacity:.85;}
.tl-nav-now{position:absolute;top:0;bottom:0;width:2px;background:#ff3b3b;}
.tl-nav-view{position:absolute;top:0;bottom:0;background:rgba(111,200,240,.18);border:1px solid #6FC8F0;border-radius:3px;cursor:grab;}
.tl-nav-h{position:absolute;top:0;bottom:0;width:8px;background:#6FC8F0;border-radius:2px;cursor:ew-resize;opacity:.85;}
.tl-nav-h[data-h="l"]{left:-4px;} .tl-nav-h[data-h="r"]{right:-4px;}
.tl-nav-h:hover{opacity:1;}
.tl-nav-cap{position:absolute;left:5px;bottom:2px;font:8px 'Courier New',monospace;color:#7e93b5;letter-spacing:1px;pointer-events:none;}
`;

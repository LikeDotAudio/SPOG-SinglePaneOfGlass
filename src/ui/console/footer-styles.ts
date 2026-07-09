// src/ui/console/footer-styles — visual constants for the DESTINATIONS footer,
// split out of footer.ts to keep that file under the size cap: the LCARS tab
// palette, a hex→"r,g,b" helper, and the footer's injected CSS.

export const LCARS_COLORS = [
  '193,152,176', '180,103,87', '174,105,125', '151,88,123',
  '198,120,37', '178,132,82', '194,183,75', '190,188,223',
];

export function hexToRgb(hex: string | undefined): string | null {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex || '');
  if (!m || !m[1]) return null;
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

export const FOOTER_CSS = `
.lcars-topbar{display:flex;flex-wrap:wrap;align-items:flex-end;gap:18px;padding:8px;margin-bottom:16px;border:none;}
.lcars-group{--group-lcars:255,170,0;display:flex;align-items:flex-end;gap:6px;padding:4px;border-radius:20px;background:rgba(var(--group-lcars),0.08);position:relative;}
.lcars-group-label{display:flex;align-items:center;gap:8px;font-weight:900;letter-spacing:2px;text-transform:uppercase;font-size:12px;line-height:1;color:#000;background:rgb(var(--group-lcars));padding:11px 18px;border-radius:16px 4px 4px 16px;white-space:nowrap;cursor:pointer;}
.lcars-group-caret{font-size:10px;transition:transform 0.2s;}
.lcars-group:not(.collapsed) > .lcars-group-label .lcars-group-caret{transform:rotate(90deg);}
.lcars-group.collapsed > .lcars-group-body{display:none;}
.lcars-group-body{display:flex;flex-direction:column;gap:6px;align-items:flex-start;}
/* An OPEN group's body FLOATS above the console as a pop-up panel anchored to
   its label — expanding never grows the footer, so the main window never shifts. */
.lcars-group:not(.collapsed) > .lcars-group-body{
  position:absolute;bottom:calc(100% + 8px);left:0;z-index:1550;
  border-top:6px solid rgb(var(--group-lcars));border-radius:12px;
  padding:8px;min-width:max-content;overflow:visible;
  background:rgba(5,10,21,.95);border-left:1px solid rgba(var(--group-lcars),.35);
  border-right:1px solid rgba(var(--group-lcars),.35);border-bottom:1px solid rgba(var(--group-lcars),.35);
  box-shadow:0 -10px 34px rgba(0,0,0,.65);}
/* Leaf panels (tabs only, no nested groups) cap + scroll; panels holding nested
   groups stay overflow-visible so their side fan-outs are not clipped. */
.lcars-group:not(.collapsed) > .lcars-group-body:not(:has(.lcars-group)){max-height:72vh;overflow-y:auto;}
/* Nested groups fan out SIDEWAYS from the parent panel, not stacked into it. */
.lcars-group-body .lcars-group:not(.collapsed) > .lcars-group-body{
  bottom:0;left:calc(100% + 10px);}
html[data-chirality="right"] .lcars-group:not(.collapsed) > .lcars-group-body{left:auto;right:0;}
html[data-chirality="right"] .lcars-group-body .lcars-group:not(.collapsed) > .lcars-group-body{
  bottom:0;right:calc(100% + 10px);left:auto;}
/* Leaf tabs — the END of the tree — stack VERTICALLY in alphanumeric order (tab 1
   at the TOP, descending), not a horizontal sprawl. */
.lcars-group-tabs{display:flex;flex-direction:column;gap:4px;align-items:stretch;}
/* Override the shared lcars.css right-chirality rule (which flips to column-reverse):
   this <style> is injected after the stylesheet <link>, so equal specificity wins here.
   Both hands stack alphanumerically top-down (tab 1 at the top). */
html[data-chirality="right"] .lcars-group-tabs{flex-direction:column;}
.lcars-group-tabs .lcars-tab{text-align:left;}
.lcars-tab{--lcars:0,0,0;font-weight:900;letter-spacing:2px;text-transform:uppercase;font-size:13px;line-height:1;color:#000;background:rgb(var(--lcars));opacity:0.45;padding:9px 26px;border:none;border-radius:0 999px 999px 0;cursor:pointer;user-select:none;white-space:nowrap;transition:opacity .2s,box-shadow .2s,transform .08s;}
.lcars-tab:hover:not(.active){opacity:0.8;}
.lcars-tab.active{opacity:1;box-shadow:0 0 12px rgba(var(--lcars),0.75);}
.lcars-tab:active{transform:translateY(1px);}`;

// src/editors/ifb/template — the static markup for one IFB strip.
//
// Pure string builder for buildOne's body.innerHTML; only the mix-minus caption
// varies per strip. Kept out of view.ts so the render logic reads uncluttered.

export function ifbTemplate(mmCaption: string): string {
  return `
      <div class="ifb">
        <div class="ifb-card ifb-ins">
          <div>
            <div class="ifb-strip"><div class="ifb-meter ifb-mm"><div class="mask"></div></div>
              <div class="ifb-stripinfo"><b>MIX-MINUS</b><span>${mmCaption}</span><span class="ifb-mmv"></span></div></div>
          </div>
          <div>
            <div class="ifb-strip"><div class="ifb-meter ifb-int"><div class="mask"></div></div>
              <div class="ifb-stripinfo"><b>IFB INPUT</b><span>interrupt bus</span><span class="ifb-intv"></span></div></div>
          </div>
        </div>

        <div class="ifb-conf">
          <div class="ifb-cap">TALENT CONFIDENCE FEED — what the earpiece hears</div>
          <div class="ifb-feed"><canvas></canvas><div class="ifb-status">● CLEAR</div></div>
          <div class="ifb-duckwrap"><div class="ifb-cap">DUCKER — program ↓ while talking</div><div class="ifb-duck"><canvas></canvas></div></div>
        </div>

        <div class="ifb-right">
          <div class="ifb-card"><h4>IFB Encoders</h4><div class="ifb-knobs"></div></div>
          <div class="ifb-card"><h4>Interrupt Hierarchy · Hold to Talk</h4><div class="ifb-talks"></div></div>
          <div class="ifb-card"><h4>Delivery · Feed Split</h4>
            <div class="ifb-routes">
              <button class="ifb-route" data-route="wired">WIRED</button>
              <button class="ifb-route" data-route="wireless">RF</button>
              <button class="ifb-route" data-route="split">SPLIT</button>
            </div>
            <div class="ifb-leg" data-leg="wired"><span class="led"></span>
              <div class="nm">STAGE BOX RETURN<small>wired earpiece feed</small></div>
              <button class="open">⚙ OPEN</button></div>
            <div class="ifb-leg" data-leg="wireless"><span class="led"></span>
              <div class="nm">WIRELESS IFB<small>RF beltpack / IEM</small></div>
              <button class="open">📶 OPEN</button></div>
          </div>
        </div>
      </div>`;
}

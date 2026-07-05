// src/editors/stagebox-input/template — the static host innerHTML for one channel
// panel. Pure builder: takes the channel name (seeds the alias) and returns the
// markup string; the mic library / stand table drive the two <select> lists.

import { MICS, STANDS } from './state.js';

/** Full markup for one Stage Box Input channel panel. `chName` seeds the alias. */
export function panelTemplate(chName: string): string {
  return `
      <div class="sb">
        <div class="sb-col">
          <div class="sb-card"><h4>Input Asset</h4>
            <div class="sb-row" style="display:block"><span>Channel Alias</span><input class="sb-alias" value="${chName.replace(/\s+/g, '_')}_Boom"></div>
            <div class="sb-row" style="display:block;margin-top:10px"><span>Microphone Library</span>
              <select class="sb-sel sb-mic">${MICS.map((m, i) => `<option value="${i}">${m.name} · ${m.type}</option>`).join('')}</select></div>
            <div class="sb-row" style="display:block;margin-top:10px"><span>Mic Stand / Mount</span>
              <select class="sb-sel sb-stand">${Object.keys(STANDS).map((k) => `<option>${k}</option>`).join('')}</select></div>
            <div class="sb-row" style="margin-top:10px"><span>Cable Length</span><span><input class="sb-cable" type="range" min="1" max="120" value="15" style="width:120px;vertical-align:middle"> <b class="sb-cablev">15 m</b></span></div>
          </div>
          <div class="sb-card"><h4>Electrical Integrity</h4>
            <div class="sb-row"><span>Impedance (auto)</span><b class="sb-imp">25 Ω</b></div>
            <div class="sb-row"><span>Sensitivity</span><b class="sb-sens">-32 dBV</b></div>
            <div class="sb-row"><span>HF Comp (cable)</span><b class="sb-hf">+0.0 dB</b></div>
            <div class="sb-key phantom">+48V Phantom</div>
            <div class="sb-warn">⚠ RIBBON MIC — phantom power locked (would damage element)</div>
          </div>
        </div>

        <div class="sb-mid">
          <div class="sb-card sb-metwrap">
            <div class="sb-meter"><div class="mask"></div><div class="pk"></div></div>
            <div class="sb-headroom"></div>
          </div>
          <div class="sb-card" style="flex:1;display:flex;flex-direction:column">
            <h4>Meter History · rolling 30 s</h4>
            <div class="sb-hist"><div class="cap">PPM · troubleshoot crackle / consistent peaking</div><canvas></canvas></div>
          </div>
        </div>

        <div class="sb-col">
          <div class="sb-card"><h4>Noise Reduction · Pre-Gain</h4>
            <div class="sb-row"><span>Mode</span>
              <select class="sb-sel sb-nrmode"><option>Off</option><option>Broadband (NS)</option><option>Adaptive AI</option><option>De-Hum 50/60Hz</option><option>De-Ess</option></select></div>
            <div class="sb-row" style="margin-top:8px"><span>Reduction</span><span><input class="sb-nr" type="range" min="0" max="24" value="0" style="width:120px;vertical-align:middle"> <b class="sb-nrv">0 dB</b></span></div>
          </div>
          <div class="sb-card"><h4>High-Pass Filter</h4>
            <div class="sb-row"><span>Window</span>
              <select class="sb-sel sb-hpw"><option>Butterworth</option><option>Linkwitz-Riley</option><option>Bessel</option><option>Chebyshev</option><option>Hann</option><option>Blackman</option></select></div>
            <div class="sb-row" style="margin-top:8px"><span>Frequency</span><span><input class="sb-hpf2" type="range" min="20" max="300" value="80" style="width:120px;vertical-align:middle"> <b class="sb-hpfv">80 Hz</b></span></div>
            <div class="sb-row" style="margin-top:8px;display:block"><span>Slope</span>
              <div class="sb-slopes" style="display:flex;gap:6px;margin-top:6px"></div></div>
            <canvas class="sb-hpchart"></canvas>
          </div>
          <div class="sb-card"><h4>Preamp</h4>
            <div class="sb-knrow"></div>
            <div class="sb-key conf">Confidence Monitor</div>
          </div>
        </div>
      </div>`;
}

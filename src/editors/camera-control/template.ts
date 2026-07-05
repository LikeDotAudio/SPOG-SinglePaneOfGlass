// src/editors/camera-control/template — the console's static host markup and the
// scope-resizing helper. Extracted verbatim from index.ts (host.innerHTML const +
// makeResizable / ResizeOpts) so the assembler stays under the 200-line rule.

import { topSVG, sideSVG } from './maps.js';

export interface ResizeOpts {
  minW?: number;
  minH?: number;
  square?: boolean;
  max?: number;
}

/** The full console layout — assigned to `host.innerHTML` in render(). */
export const HTML = `
      <div class="cc-wrap">
        <div class="cc-glass">
          <div class="cc-video">
            <div class="cc-scene"><div class="cc-subject"></div></div>
          </div>
          <div class="cc-smpte"><canvas></canvas><div class="cc-dvd"></div></div>
          <div class="cc-osd"></div>
          <div class="cc-rec">● REC</div>
          <!-- camera ROBOTICS visualization — docked RIGHT. chir-exempt: pan/tilt
               geometry is stage L/R — the box may ride to the other side but its
               contents must NEVER mirror (audit §4). -->
          <div class="cc-map top chir-exempt"><div class="lbl">TOP-DOWN · PAN / DOLLY</div>${topSVG()}</div>
          <div class="cc-map side chir-exempt"><div class="lbl">SIDE · TILT / PED</div>${sideSVG()}</div>
          <!-- scopes — docked LEFT, each with a drag handle to grow. chir-exempt: I/Q
               and IRE axes are semantic — never mirror. -->
          <div class="cc-vecbox cc-scope chir-exempt"><canvas class="cc-vec"></canvas><div class="cc-rsz" title="Drag to resize"></div></div>
          <div class="cc-wfbox cc-scope chir-exempt"><div class="cc-wf-tag">RGB PARADE · IRE</div><canvas class="cc-wf"></canvas><div class="cc-rsz" title="Drag to resize"></div></div>
          <div class="cc-tel-box"><div class="cap">TELEMETRY</div><div class="cc-tel"></div></div>
          <div class="cc-fbtn cc-bars-btn">Color Bars</div>
          <div class="cc-fbtn cc-wb-btn">Auto WB<div class="fill"></div></div>
        </div>

        <div class="cc-rail">
          <div class="cc-card"><h4>5-Axis Master Controller</h4>
            <div class="cc-rate"><label>RATE</label><input type="range" min="0.2" max="3" step="0.05" value="1"><span class="cc-ratev">1.0×</span></div>
            <div class="cc-jsgrid">
              <div class="cc-vside"><label>PED</label><input class="cc-vbar" type="range" min="0" max="1" step="0.01" data-ax="ped"></div>
              <div class="cc-stick"><div class="ring"></div><div class="puck"></div></div>
              <div class="cc-vside"><label>ZOOM</label><input class="cc-vbar" type="range" min="0" max="1" step="0.01" data-ax="zoom"></div>
              <div class="cc-dollybar"><label>DOLLY</label><input type="range" min="0" max="1" step="0.01" data-ax="dolly"></div>
            </div>
            <div class="cc-hint">Drag the puck to Pan / Tilt · twist Zoom · slide Dolly / Ped</div>
          </div>

          <div class="cc-card" data-cap="shade"><h4>Shading Encoders</h4>
            <div class="cc-knobs cc-mono"></div>
            <div class="cc-venn"><div class="cc-venn-bg"><span class="r"></span><span class="g"></span><span class="b"></span></div></div>
          </div>

        </div>

        <div class="cc-foot">
          <div class="cc-card"><h4>Camera Bank · Tally</h4><input class="cc-nick" placeholder="Nickname — e.g. ANCHOR 1 (trickles to mixer/MV)"><div class="cc-tallies"></div></div>
          <div class="cc-card"><h4>Robotics &amp; Camera Presets · Scene Memory</h4>
            <div class="cc-pre"></div>
            <div class="cc-keys"><div class="cc-key" data-act="save">Save</div><div class="cc-key" data-act="path">Rec Path</div><div class="cc-key" data-act="lookat">Look-At</div></div>
          </div>
        </div>
      </div>`;

/**
 * Drag the corner handle to grow a scope. The canvas redraws to its new client
 * size on the next frame (drawParade / drawVectorscope read clientWidth/Height).
 */
export function makeResizable(box: HTMLElement, handle: HTMLElement, opts: ResizeOpts): void {
  let sx = 0;
  let sy = 0;
  let sw = 0;
  let sh = 0;
  const move = (e: PointerEvent): void => {
    // Handle is TOP-RIGHT. A square scope (top-anchored) tracks the rightward
    // drag; a free box (bottom-anchored) grows right + upward.
    if (opts.square) {
      let m = Math.max(opts.minW || 120, sw + (e.clientX - sx));
      if (opts.max) m = Math.min(m, opts.max);
      box.style.width = m + 'px';
      box.style.height = m + 'px';
      return;
    }
    let w = Math.max(opts.minW || 120, sw + (e.clientX - sx));
    let h = Math.max(opts.minH || 100, sh + (sy - e.clientY));
    if (opts.max) {
      w = Math.min(w, opts.max);
      h = Math.min(h, opts.max);
    }
    box.style.width = w + 'px';
    box.style.height = h + 'px';
  };
  const up = (): void => {
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', up);
  };
  handle.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const r = box.getBoundingClientRect();
    sw = r.width;
    sh = r.height;
    sx = e.clientX;
    sy = e.clientY;
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  });
}

// src/editors/audio-positioner/index.ts — the CMDP 3D AUDIO POSITIONER.
// Re-integrates the original CMDP circular fader UI into the center,
// with Left/Right POVs and Height (Z-axis) control via the wheel (potentiometers).

import type { EditorPlugin, EditorContext } from '../types.js';
import { el } from '../../ui/dom.js';
import type { ParamSpec } from '../../platform/mqtt/types.js';
import { injectAudioPositionerStyles } from './styles.js';

const NEAR_RADIUS = 120;
const FAR_RADIUS = 380;

interface Group { name: string; color: string; }
interface Chan { label: string; color: string; group: number; }

function commonPrefix(labels: string[]): string {
  if (!labels.length) return '';
  let p = labels[0] ?? '';
  for (const l of labels) { let i = 0; while (i < p.length && i < l.length && p[i] === l[i]) i++; p = p.slice(0, i); }
  return p.replace(/[\s\-_·:]+$/, '').trim();
}

function buildGroups(ctx: EditorContext): { groups: Group[]; chans: Chan[] } {
  const feeds: Array<{ label: string; color: string }> = ctx.sources.length
    ? ctx.sources.map((f) => ({ label: f.label, color: f.color }))
    : (ctx.twist.config?.inputs?.length
        ? ctx.twist.config.inputs.map((l) => ({ label: l, color: '#4d94ff' }))
        : Array.from({ length: 8 }, (_, i) => ({ label: `CH ${i + 1}`, color: '#4d94ff' })));
  
  const order: string[] = [];
  const byColor = new Map<string, Array<{ label: string; color: string }>>();
  for (const f of feeds) { if (!byColor.has(f.color)) { byColor.set(f.color, []); order.push(f.color); } byColor.get(f.color)!.push(f); }
  const groups: Group[] = [];
  const chans: Chan[] = [];
  order.forEach((color, gi) => {
    const items = byColor.get(color)!;
    groups.push({ name: commonPrefix(items.map((x) => x.label)) || `BUNDLE ${gi + 1}`, color });
    items.forEach((it) => chans.push({ label: it.label, color, group: gi }));
  });
  return { groups, chans };
}

class Fader {
  label: string; angle: number; group: number; color: string;
  visible = true; hovered = false; dragging = false;
  val: number; rot: number; height: number; x = 0; y = 0;
  readonly trackLen = FAR_RADIUS - NEAR_RADIUS;
  constructor(label: string, angleDeg: number, color: string, group: number, val: number, rot: number, height: number = 50) {
    this.label = label; this.angle = angleDeg; this.color = color; this.group = group; this.val = val; this.rot = rot; this.height = height;
  }
  updatePosition(cx: number, cy: number): void {
    const rad = this.angle * Math.PI / 180, dist = NEAR_RADIUS + this.trackLen / 2;
    this.x = cx + dist * Math.cos(rad); this.y = cy + dist * Math.sin(rad);
  }
  hitTest(mx: number, my: number, cx: number, cy: number): boolean {
    const rad = this.angle * Math.PI / 180;
    const x1 = cx + (NEAR_RADIUS - 20) * Math.cos(rad), y1 = cy + (NEAR_RADIUS - 20) * Math.sin(rad);
    const x2 = cx + (FAR_RADIUS + 20) * Math.cos(rad), y2 = cy + (FAR_RADIUS + 20) * Math.sin(rad);
    const l2 = (x1 - x2) ** 2 + (y1 - y2) ** 2;
    if (l2 === 0) return Math.hypot(mx - x1, my - y1) < 30;
    const t = Math.max(0, Math.min(1, ((mx - x1) * (x2 - x1) + (my - y1) * (y2 - y1)) / l2));
    return Math.hypot(mx - (x1 + t * (x2 - x1)), my - (y1 + t * (y2 - y1))) < 30;
  }
  render(c: CanvasRenderingContext2D, cx: number, cy: number): void {
    if (!this.visible) return;
    c.save();
    c.translate(this.x, this.y);
    c.rotate((this.angle + 90) * Math.PI / 180);
    const tl = this.trackLen;
    c.lineCap = 'round';
    c.lineWidth = 6; c.strokeStyle = '#000'; c.beginPath(); c.moveTo(0, -tl / 2); c.lineTo(0, tl / 2); c.stroke();
    c.lineWidth = 2; c.strokeStyle = '#222'; c.beginPath(); c.moveTo(0, -tl / 2); c.lineTo(0, tl / 2); c.stroke();
    c.lineWidth = 1; c.strokeStyle = '#666';
    for (let i = 0; i <= 10; i++) {
      const ly = -tl / 2 + tl * (i / 10), len = i % 5 === 0 ? 10 : 5;
      c.beginPath(); c.moveTo(-15, ly); c.lineTo(-15 - len, ly); c.stroke();
      c.beginPath(); c.moveTo(15, ly); c.lineTo(15 + len, ly); c.stroke();
    }
    const capY = -tl / 2 + (this.val / 100) * tl;
    c.translate(0, capY);
    c.rotate(-((this.angle + 90) * Math.PI / 180));
    const r = 22;
    c.fillStyle = '#333'; c.strokeStyle = this.hovered ? '#fff' : this.color; c.lineWidth = this.hovered ? 3 : 2;
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill(); c.stroke();
    const startDeg = 135, curDeg = 135 + (this.rot / 100) * 270, ar = r - 5;
    c.strokeStyle = this.color; c.lineWidth = 4;
    c.beginPath(); c.arc(0, 0, ar, startDeg * Math.PI / 180, curDeg * Math.PI / 180); c.stroke();
    const indRad = curDeg * Math.PI / 180;
    c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo((r - 2) * Math.cos(indRad), (r - 2) * Math.sin(indRad)); c.stroke();
    c.beginPath(); c.arc(0, 0, 3, 0, Math.PI * 2); c.fillStyle = this.color; c.fill();
    c.font = '10px Arial'; c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText('Z:' + this.height.toFixed(0), 0, -30); // Show height on cap
    c.fillStyle = '#aaa'; c.font = '9px Arial'; c.fillText(this.val.toFixed(0), 0, 35);
    c.restore();
    c.save();
    const labRad = this.angle * Math.PI / 180, active = this.dragging || this.hovered;
    const labDist = FAR_RADIUS + 35 + this.group * 30 + (active ? 20 : 0);
    c.translate(cx + labDist * Math.cos(labRad), cy + labDist * Math.sin(labRad));
    let textRot = (this.angle + 90) * Math.PI / 180, chk = (this.angle + 90) % 360; if (chk < 0) chk += 360;
    if (chk > 90 && chk < 270) textRot += Math.PI;
    c.rotate(textRot);
    c.fillStyle = this.color; c.font = 'bold 12px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(this.label, 0, 0);
    c.restore();
  }
}

const plugin: EditorPlugin = {
  id: 'audio-positioner',
  title: 'CMDP · SPATIAL AUDIO PANNER',
  order: 5,
  match: (n) => /audio\s*position|positioner|\bCMDP\b|surround\s*pan/i.test(n),
  requiredCaps: ['audio'],
  render(host, ctx) {
    injectAudioPositionerStyles();
    const { groups, chans } = buildGroups(ctx);

    const wrap = el('div', { class: 'ap-wrap' });

    // HEADER
    const header = el('div', { class: 'ap-header' }, [
      el('div', { class: 'ap-title' }, ['CMDP · SPATIAL AUDIO PANNER']),
      el('div', { class: 'ap-toolbar' }, [
        el('select', { class: 'ap-select' }, [
          el('option', { value: '9.1.4' }, ['Target: 9.1.4']),
          el('option', { value: '5.1.2' }, ['Target: 5.1.2']),
          el('option', { value: 'stereo' }, ['Target: Stereo']),
        ])
      ])
    ]);
    wrap.append(header);

    // MAIN AREA (POVs and CMDP)
    const main = el('div', { class: 'ap-main' });
    
    // POV 1 (Top)
    const pov1Wrap = el('div', { class: 'ap-pov' }, [el('div', { class: 'ap-pov-title' }, ['POV 1 (TOP)'])]);
    const cvsTop = el('canvas') as HTMLCanvasElement;
    pov1Wrap.append(cvsTop);
    
    // CMDP Center
    const centerWrap = el('div', { class: 'ap-center' });
    const canvas = el('canvas') as HTMLCanvasElement;
    centerWrap.append(canvas);
    
    // POV 2 (Side)
    const pov2Wrap = el('div', { class: 'ap-pov' }, [el('div', { class: 'ap-pov-title' }, ['POV 2 (SIDE - HEIGHT)'])]);
    const cvsSide = el('canvas') as HTMLCanvasElement;
    pov2Wrap.append(cvsSide);

    main.append(pov1Wrap, centerWrap, pov2Wrap);
    wrap.append(main);

    // BOTTOM METERS
    const bottom = el('div', { class: 'ap-bottom' });
    const inputMeters = el('div', { class: 'ap-meters' }, [el('div', { class: 'ap-meters-title' }, ['INPUT (VU)'])]);
    const inBox = el('div', { class: 'ap-meters-box' });
    chans.forEach((ch, i) => {
      if (i > 7) return;
      inBox.append(el('div', { class: 'ap-meter', title: ch.label }, [
        el('div', { class: 'ap-meter-fill', style: `height: ${40 + Math.random() * 40}%; background: ${ch.color}` }),
        el('div', { class: 'ap-meter-label' }, [`CH${i+1}`])
      ]));
    });
    inputMeters.append(inBox);
    
    const outputMeters = el('div', { class: 'ap-meters', style: 'flex: 2;' }, [el('div', { class: 'ap-meters-title' }, ['OUTPUT (9.1.4 FOLDDOWN)'])]);
    const outBox = el('div', { class: 'ap-meters-box' });
    ['L', 'C', 'R', 'Lw', 'Rw', 'Ls', 'Rs', 'Lrs', 'Rrs', 'LFE', 'Ltf', 'Rtf', 'Ltr', 'Rtr'].forEach(lbl => {
      outBox.append(el('div', { class: 'ap-meter' }, [
        el('div', { class: 'ap-meter-fill', style: `height: ${20 + Math.random() * 60}%` }),
        el('div', { class: 'ap-meter-label' }, [lbl])
      ]));
    });
    outputMeters.append(outBox);
    bottom.append(inputMeters, outputMeters);
    wrap.append(bottom);

    // FOOTER (Controls)
    wrap.append(el('div', { class: 'ap-footer' }, [
      'Control Mode: ', el('strong', {}, ['POTENTIOMETERS ASSIGNED TO HEIGHT (Z-AXIS)']), ' | CMDP Left-Drag: Depth | Alt-Drag: Azimuth | Wheel: Height'
    ]));

    if (!ctx.sources.length) {
      wrap.append(el('div', { class: 'ap-empty' }, ['No audio bundle routed. Test mode active.']));
    }

    host.append(wrap);

    const c = canvas.getContext('2d');
    if (!c) return;

    // Build faders
    const faders: Fader[] = [];
    const total = Math.max(1, chans.length);
    let a = -90;
    groups.forEach((g, gi) => {
      const items = chans.filter((ch) => ch.group === gi);
      const span = 360 * (items.length / total);
      items.forEach((ch, k) => {
        const ang = a + span * ((k + 0.5) / Math.max(1, items.length));
        faders.push(new Fader(ch.label, ang, ch.color, gi, 20 + ((k * 37) % 70), 60 + ((k * 23) % 30), 40 + ((k * 15) % 60)));
      });
      a += span;
    });

    ctx.services.advertiseParams?.(faders.flatMap((_, i): ParamSpec[] => {
      const n = i + 1;
      return [
        { name: `ch${n}_azimuth`, type: 'number', unit: 'deg', min: 0, max: 360, writable: true },
        { name: `ch${n}_level`, type: 'number', unit: '%', min: 0, max: 100, writable: true },
        { name: `ch${n}_depth`, type: 'number', unit: '%', min: 0, max: 100, writable: true },
        { name: `ch${n}_height`, type: 'number', unit: '%', min: 0, max: 100, writable: true },
      ];
    }));

    const pubFader = (f: Fader): void => {
      const p = ctx.services.publishParam; if (!p) return;
      const i = faders.indexOf(f); if (i < 0) return;
      const n = i + 1;
      let az = f.angle % 360; if (az < 0) az += 360;
      p(`ch${n}_azimuth`, +az.toFixed(1));
      p(`ch${n}_level`, +f.rot.toFixed(1));
      p(`ch${n}_depth`, +f.val.toFixed(1));
      p(`ch${n}_height`, +f.height.toFixed(1));
    };

    let W = 0, H = 0, cx = 0, cy = 0;
    const fit = (): void => {
      const w = centerWrap.clientWidth, h = centerWrap.clientHeight;
      if (w === W && h === H) return;
      W = w; H = h; canvas.width = w; canvas.height = h; cx = w / 2; cy = h / 2;
      faders.forEach((f) => f.updatePosition(cx, cy));
      cvsTop.width = pov1Wrap.clientWidth; cvsTop.height = pov1Wrap.clientHeight;
      cvsSide.width = pov2Wrap.clientWidth; cvsSide.height = pov2Wrap.clientHeight;
    };

    let active: Fader | null = null, hovered: Fader | null = null;
    let startX = 0, startY = 0, startVal = 0, startRot = 0;
    const clamp = (v: number): number => Math.max(0, Math.min(100, v));
    const at = (e: MouseEvent): [number, number] => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    
    const topAt = (mx: number, my: number): Fader | null => {
      for (let i = faders.length - 1; i >= 0; i--) { const f = faders[i]; if (f && f.visible && f.hitTest(mx, my, cx, cy)) return f; }
      return null;
    };

    const onDown = (e: MouseEvent): void => {
      const [mx, my] = at(e); const hit = topAt(mx, my);
      if (hit) { active = hit; startX = mx; startY = my; startVal = hit.val; startRot = hit.rot; hit.dragging = true; }
    };
    
    const onMove = (e: MouseEvent): void => {
      const [mx, my] = at(e);
      if (!active) { hovered = topAt(mx, my); faders.forEach((f) => (f.hovered = f === hovered)); canvas.style.cursor = hovered ? 'pointer' : 'default'; return; }
      const f = active, isAlt = e.altKey, isRight = e.buttons === 2, isLeft = e.buttons === 1, isMid = e.buttons === 4;
      if ((isAlt && isLeft) || isMid) { f.angle = Math.atan2(my - cy, mx - cx) * 180 / Math.PI; f.updatePosition(cx, cy); }
      else if (isRight) { f.rot = clamp(startRot + (mx - startX) * 0.5); }
      else if (isLeft) { const rad = f.angle * Math.PI / 180; const proj = (mx - startX) * Math.cos(rad) + (my - startY) * Math.sin(rad); f.val = clamp(startVal - proj / f.trackLen * 100); }
      pubFader(f);
    };
    
    const onUp = (): void => { if (active) { active.dragging = false; active = null; } };
    
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault(); const d = -Math.sign(e.deltaY);
      if (hovered) { 
        if (e.altKey || e.ctrlKey) { hovered.angle += d * 3; hovered.updatePosition(cx, cy); } 
        else { hovered.height = clamp(hovered.height + d * 5); } // Wheel maps to HEIGHT
        pubFader(hovered); 
      }
    };
    
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('mousemove', onMove);
    window.addEventListener('window:mouseup', onUp);
    ctx.dispose.add(() => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); });

    faders.forEach((f, i) => {
      const n = i + 1;
      ctx.services.onParam?.(`ch${n}_azimuth`, (v) => { if (typeof v === 'number') { f.angle = v; f.updatePosition(cx, cy); } });
      ctx.services.onParam?.(`ch${n}_level`, (v) => { if (typeof v === 'number') f.rot = clamp(v); });
      ctx.services.onParam?.(`ch${n}_depth`, (v) => { if (typeof v === 'number') f.val = clamp(v); });
      ctx.services.onParam?.(`ch${n}_height`, (v) => { if (typeof v === 'number') f.height = clamp(v); });
    });
    faders.forEach(pubFader);

    const drawFace = (): void => {
      const r = 40, orange = '#f4902c'; c.save(); c.translate(cx, cy);
      c.fillStyle = '#333'; c.strokeStyle = orange; c.lineWidth = 2;
      c.beginPath(); c.ellipse(-r - 5, 0, 10, 15, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      c.beginPath(); c.ellipse(r + 5, 0, 10, 15, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = '#444'; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill(); c.stroke();
      const target = active || hovered;
      if (target) { c.fillStyle = '#fff'; c.font = 'bold 10px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; let t = target.label; if (t.length > 10) t = t.slice(0, 8) + '..'; c.fillText(t, 0, 0); }
      c.fillStyle = orange; c.beginPath(); c.moveTo(0, -r - 10); c.lineTo(-10, -r + 5); c.lineTo(10, -r + 5); c.closePath(); c.fill(); c.stroke();
      c.restore();
    };

    const ctxTop = cvsTop.getContext('2d')!;
    const ctxSide = cvsSide.getContext('2d')!;

    const drawPOVs = () => {
      const w1 = cvsTop.width, h1 = cvsTop.height;
      ctxTop.clearRect(0,0,w1,h1);
      ctxTop.strokeStyle = '#333'; ctxTop.beginPath(); ctxTop.arc(w1/2, h1/2, w1*0.35, 0, Math.PI*2); ctxTop.stroke();
      ctxTop.beginPath(); ctxTop.moveTo(w1/2, 0); ctxTop.lineTo(w1/2, h1); ctxTop.stroke();
      ctxTop.beginPath(); ctxTop.moveTo(0, h1/2); ctxTop.lineTo(w1, h1/2); ctxTop.stroke();
      ctxTop.fillStyle = '#888'; ctxTop.beginPath(); ctxTop.arc(w1/2, h1/2, 4, 0, Math.PI*2); ctxTop.fill();

      const w2 = cvsSide.width, h2 = cvsSide.height;
      ctxSide.clearRect(0,0,w2,h2);
      ctxSide.strokeStyle = '#333'; ctxSide.beginPath(); ctxSide.moveTo(w2/2, 0); ctxSide.lineTo(w2/2, h2); ctxSide.stroke();
      ctxSide.setLineDash([5,5]); ctxSide.beginPath(); ctxSide.moveTo(0, h2 - 40); ctxSide.lineTo(w2, h2 - 40); ctxSide.stroke(); ctxSide.setLineDash([]);
      ctxSide.fillStyle = '#888'; ctxSide.beginPath(); ctxSide.arc(w2/2, h2 - 40, 4, 0, Math.PI*2); ctxSide.fill();

      faders.forEach(f => {
        if(!f.visible) return;
        const rad = (f.angle - 90) * Math.PI / 180;
        const r = (f.val / 100) * (w1 * 0.35);
        const tx = w1/2 + r * Math.cos(rad);
        const ty = h1/2 + r * Math.sin(rad);
        ctxTop.fillStyle = f.color; ctxTop.beginPath(); ctxTop.arc(tx, ty, 6, 0, Math.PI*2); ctxTop.fill();
        if (f === active || f === hovered) { ctxTop.strokeStyle='#fff'; ctxTop.lineWidth=2; ctxTop.stroke(); }

        const sx = w2/2 + r * Math.cos(rad); // X projection (Left/Right)
        const sy = h2 - 40 - (f.height / 100) * (h2 - 80); // Y projection (Height)
        ctxSide.fillStyle = f.color; ctxSide.beginPath(); ctxSide.arc(sx, sy, 6, 0, Math.PI*2); ctxSide.fill();
        if (f === active || f === hovered) { ctxSide.strokeStyle='#fff'; ctxSide.lineWidth=2; ctxSide.stroke(); }
      });
    };

    ctx.dispose.raf(() => {
      fit();
      c.fillStyle = '#181818'; c.fillRect(0, 0, W, H);
      drawFace();
      c.strokeStyle = '#f4902c'; c.setLineDash([5, 5]); c.lineWidth = 2;
      c.beginPath(); c.arc(cx, cy, NEAR_RADIUS, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(cx, cy, FAR_RADIUS, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
      c.fillStyle = '#f4902c'; c.font = 'bold 12px Arial'; c.textAlign = 'center';
      c.fillText('NEAR', cx, cy - NEAR_RADIUS - 10); c.fillText('FAR', cx, cy - FAR_RADIUS - 10);
      faders.forEach((f) => f.render(c, cx, cy));
      drawPOVs();
    });
  },
};

export default plugin;

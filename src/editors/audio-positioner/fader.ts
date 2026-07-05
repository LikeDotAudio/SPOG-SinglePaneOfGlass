// src/editors/audio-positioner/fader.ts — the CMDP circular Fader model + group builder.
import type { EditorContext } from '../types.js';

export const NEAR_RADIUS = 120;
export const FAR_RADIUS = 380;

export interface Group { name: string; color: string; }
export interface Chan { label: string; color: string; group: number; }

function commonPrefix(labels: string[]): string {
  if (!labels.length) return '';
  let p = labels[0] ?? '';
  for (const l of labels) { let i = 0; while (i < p.length && i < l.length && p[i] === l[i]) i++; p = p.slice(0, i); }
  return p.replace(/[\s\-_·:]+$/, '').trim();
}

export function buildGroups(ctx: EditorContext): { groups: Group[]; chans: Chan[] } {
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

export class Fader {
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

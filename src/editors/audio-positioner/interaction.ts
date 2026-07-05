// src/editors/audio-positioner/interaction.ts — pointer/wheel handlers for the CMDP panner.
import type { Fader } from './fader.js';

export const clamp = (v: number): number => Math.max(0, Math.min(100, v));

export interface InteractionState {
  active: Fader | null;
  hovered: Fader | null;
  startX: number; startY: number; startVal: number; startRot: number;
}

export const newInteractionState = (): InteractionState => ({
  active: null, hovered: null, startX: 0, startY: 0, startVal: 0, startRot: 0,
});

export interface Geom { cx: number; cy: number; }

export function createInteraction(
  canvas: HTMLCanvasElement,
  faders: Fader[],
  state: InteractionState,
  geom: Geom,
  pubFader: (f: Fader) => void,
): { onDown: (e: MouseEvent) => void; onMove: (e: MouseEvent) => void; onUp: () => void; onWheel: (e: WheelEvent) => void } {
  const at = (e: MouseEvent): [number, number] => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };

  const topAt = (mx: number, my: number): Fader | null => {
    for (let i = faders.length - 1; i >= 0; i--) { const f = faders[i]; if (f && f.visible && f.hitTest(mx, my, geom.cx, geom.cy)) return f; }
    return null;
  };

  const onDown = (e: MouseEvent): void => {
    const [mx, my] = at(e); const hit = topAt(mx, my);
    if (hit) { state.active = hit; state.startX = mx; state.startY = my; state.startVal = hit.val; state.startRot = hit.rot; hit.dragging = true; }
  };

  const onMove = (e: MouseEvent): void => {
    const [mx, my] = at(e);
    if (!state.active) { state.hovered = topAt(mx, my); faders.forEach((f) => (f.hovered = f === state.hovered)); canvas.style.cursor = state.hovered ? 'pointer' : 'default'; return; }
    const f = state.active, isAlt = e.altKey, isRight = e.buttons === 2, isLeft = e.buttons === 1, isMid = e.buttons === 4;
    if ((isAlt && isLeft) || isMid) { f.angle = Math.atan2(my - geom.cy, mx - geom.cx) * 180 / Math.PI; f.updatePosition(geom.cx, geom.cy); }
    else if (isRight) { f.rot = clamp(state.startRot + (mx - state.startX) * 0.5); }
    else if (isLeft) { const rad = f.angle * Math.PI / 180; const proj = (mx - state.startX) * Math.cos(rad) + (my - state.startY) * Math.sin(rad); f.val = clamp(state.startVal - proj / f.trackLen * 100); }
    pubFader(f);
  };

  const onUp = (): void => { if (state.active) { state.active.dragging = false; state.active = null; } };

  const onWheel = (e: WheelEvent): void => {
    e.preventDefault(); const d = -Math.sign(e.deltaY);
    if (state.hovered) {
      if (e.altKey || e.ctrlKey) { state.hovered.angle += d * 3; state.hovered.updatePosition(geom.cx, geom.cy); }
      else { state.hovered.height = clamp(state.hovered.height + d * 5); } // Wheel maps to HEIGHT
      pubFader(state.hovered);
    }
  };

  return { onDown, onMove, onUp, onWheel };
}

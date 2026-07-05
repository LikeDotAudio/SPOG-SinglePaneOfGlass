// src/editors/meter-input/cards — the scope/meter CARD DOM. Split from index.ts:
// every card builder, the grid, the cardMap keying, the LCARS header palette and
// the drag-move/resize `floatCard` behaviour. Pure DOM — no render-loop state.
import { el } from '../../ui/dom.js';

// A card becomes drag-move (via its header) + resize (native corner handle); its
// position/size is set by a layout preset (see PRESETS / applyPreset). Double-
// double-clicking the header snaps it back to the preset spot.
export function floatCard(card: HTMLElement, bringToFront: () => number, onRestore: () => void): void {
  Object.assign(card.style, { position: 'absolute', margin: '0', resize: 'both', overflow: 'hidden' });
  const handle = card.querySelector<HTMLElement>('h4');
  if (!handle) return;
  handle.style.cursor = 'move'; handle.style.userSelect = 'none';
  // × closes (hides) this card; double-clicking the title (or a preset) restores it.
  const x = document.createElement('span');
  x.className = 'mi-btnicon mi-x'; x.textContent = '×'; x.title = 'Close (a preset restores it)';
  x.addEventListener('pointerdown', (e) => e.stopPropagation());
  x.addEventListener('click', (e) => { e.stopPropagation(); card.style.display = 'none'; });
  handle.append(x);
  handle.addEventListener('dblclick', (e) => { e.preventDefault(); onRestore(); });
  handle.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    const sx = e.clientX, sy = e.clientY, ox = card.offsetLeft, oy = card.offsetTop;
    card.style.zIndex = String(bringToFront());
    const move = (ev: PointerEvent): void => { card.style.left = `${Math.max(0, ox + ev.clientX - sx)}px`; card.style.top = `${Math.max(0, oy + ev.clientY - sy)}px`; };
    const up = (): void => { handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); };
    handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', up);
  });
}

// Per-card LCARS header colour (the "okudagram" palette) — the edit-detector
// trio gets the amber/blue/orange of the mock; the scopes cycle the LCARS hues.
export const HC: Record<string, string> = {
  video: '#f2b25c', lumin: '#8fcdf0', editlog: '#f2955c',
  parade: '#c19eb0', wave: '#b46757', chroma: '#ae697d', vec: '#97587b',
  aud: '#c67d3a', meter: '#b28452', vu: '#c2b74b', gonio: '#bcb9df', rec: '#b0679b',
  rgba: '#c19eb0', stack: '#97587b', cie: '#c2b74b', diamond: '#b46757', hsl: '#ae697d', loud: '#8fcdf0',
};

export interface MeterCards {
  cPreview: HTMLCanvasElement;
  cardVideo: HTMLElement; cardWave: HTMLElement;
  luminBar: HTMLElement; luminVal: HTMLElement; luminMin: HTMLElement; luminMax: HTMLElement;
  luminCount: HTMLElement; luminTempo: HTMLElement;
  editList: HTMLElement; editCountEl: HTMLElement; bClear: HTMLElement;
  grid: HTMLElement;
  cardMap: Record<string, HTMLElement>;
}

// Build every card. `video` is the LiveInput's <video> (the Input Under Test);
// the SENS pills live inside the luminance card so they're passed in from the bar.
export function buildCards(video: HTMLVideoElement, sSub: HTMLElement, sNorm: HTMLElement, sHard: HTMLElement): MeterCards {
  const scope = (tag: string, hClass: string, canvasClass: string): HTMLElement =>
    el('div', { class: `mi-scope ${hClass}` }, [el('span', { class: 'mi-tag' }, [tag]), el('canvas', { class: canvasClass })]);

  // A preview canvas shows the offline test pattern (the <video> element only has
  // real pixels for file/capture sources); one is shown, the other hidden, per mode.
  const cPreview = el('canvas', { class: 'mi-vid mi-preview' });
  const cardVideo = el('div', { class: 'mi-vidcard' }, [el('h4', {}, ['Input Under Test']), video, cPreview]);
  const cardParade = el('div', { class: 'mi-card' }, [el('h4', {}, ['RGB Parade · IRE']), scope('R · G · B', '', 'c-parade')]);
  const cardWave = el('div', { class: 'mi-card' }, [el('h4', {}, ['Luma Waveform']), scope("Y'", '', 'c-wave')]);
  const cardChroma = el('div', { class: 'mi-card' }, [el('h4', {}, ['Chroma Waveform · Saturation']), scope('SAT %', '', 'c-chroma')]);
  const cardVec = el('div', { class: 'mi-card' }, [el('h4', {}, ['Vectorscope']), scope('', '', 'c-vec')]);
  const cardAud = el('div', { class: 'mi-card' }, [el('h4', {}, ['Audio Oscilloscope · L / R / L+R']), scope('', '', 'c-aud')]);
  const cardMeter = el('div', { class: 'mi-card' }, [el('h4', {}, ['Meters · L / R dBFS']), scope('', '', 'c-meter')]);
  const cardVU = el('div', { class: 'mi-card' }, [el('h4', {}, ['VU · Analog']), scope('', '', 'c-vu')]);
  const cardGonio = el('div', { class: 'mi-card' }, [el('h4', {}, ['Goniometer · Lissajous']), scope('', '', 'c-gonio')]);
  const cardRec = el('div', { class: 'mi-card' }, [el('h4', {}, ['Level Recorder · dBFS over time']), scope('', '', 'c-rec')]);
  const cardRGBA = el('div', { class: 'mi-card' }, [el('h4', {}, ['RGB Overlay · Waveform (RGBA)']), scope('R·G·B·A', '', 'c-rgba')]);
  const cardStack = el('div', { class: 'mi-card' }, [el('h4', {}, ['RGB Stacked · Waveform']), scope('R / G / B', '', 'c-stack')]);
  const cardCIE = el('div', { class: 'mi-card' }, [el('h4', {}, ['CIE 1931 · xy Gamut']), scope('', '', 'c-cie')]);
  const cardDiamond = el('div', { class: 'mi-card' }, [el('h4', {}, ['Diamond · RGB Gamut']), scope('', '', 'c-diamond')]);
  const cardHSL = el('div', { class: 'mi-card' }, [el('h4', {}, ['Lightness / Saturation']), scope('', '', 'c-hsl')]);
  const cardLoud = el('div', { class: 'mi-card' }, [
    el('h4', {}, ['Loudness Over Time · ITU-R BS.1770']),
    el('div', { class: 'mi-loudrow' }, [
      el('div', { class: 'mi-lufs' }, [el('span', { class: 'lufs-v' }, ['-∞']), el('small', {}, ['LUFS'])]),
      el('div', { class: 'mi-scope', style: 'flex:1' }, [el('canvas', { class: 'c-loud' })]),
    ]),
  ]);
  // Edit detector — average luminance (AVG bar) + a time-stamped log of scene cuts.
  const luminBar = el('i', { class: 'mi-lumin-bar' });
  const luminVal = el('span', { class: 'mi-lumin-val' }, ['—']);
  const luminMin = el('b', {}, ['—']);
  const luminMax = el('b', {}, ['—']);
  const luminCount = el('b', {}, ['0']);
  const luminTempo = el('b', {}, ['0.0']);
  const cardLumin = el('div', { class: 'mi-card' }, [
    el('h4', {}, ['Luminance']),
    el('div', { class: 'mi-lumin' }, [
      el('div', { class: 'mi-luminrow' }, [el('span', { class: 'mi-lumin-lbl' }, ['AVG']), el('div', { class: 'mi-lumin-track' }, [luminBar]), luminVal]),
      el('div', { class: 'mi-lumin-range' }, [el('span', {}, ['LOW ', luminMin]), el('span', {}, ['HIGH ', luminMax])]),
      el('div', { class: 'mi-lumin-count' }, ['edits detected: ', luminCount]),
      el('div', { class: 'mi-lumin-tempo' }, ['edit tempo: ', luminTempo, ' / min']),
      // Edit-detection sensitivity lives with the luminance meter (drives the edit log below).
      el('div', { class: 'mi-lumin-sens' }, [el('span', { class: 'mi-lumin-lbl' }, ['SENS']), sSub, sNorm, sHard]),
    ]),
  ]);
  const editList = el('div', { class: 'mi-editlist' }, [el('div', { class: 'mi-edit-empty' }, ['watching for edits…'])]);
  const editCountEl = el('span', { class: 'mi-editlog-count' }, ['0 events']);
  const bClear = el('button', { class: 'mi-pill mi-clear' }, ['Clear']);
  const cardEditLog = el('div', { class: 'mi-card' }, [
    el('h4', {}, ['Edit Log']),
    el('div', { class: 'mi-editlog' }, [el('div', { class: 'mi-editlog-top' }, [bClear, editCountEl]), editList]),
  ]);

  // The video is a floating card too (first → painted behind), so scopes/meters
  // can be dragged on top of it, or the video moved + resized.
  const grid = el('div', { class: 'mi-grid' }, [cardVideo, cardParade, cardWave, cardChroma, cardVec, cardAud, cardMeter, cardVU, cardGonio, cardRec, cardRGBA, cardStack, cardCIE, cardDiamond, cardHSL, cardLoud, cardLumin, cardEditLog]);

  const cardMap: Record<string, HTMLElement> = {
    video: cardVideo, parade: cardParade, wave: cardWave, chroma: cardChroma, vec: cardVec,
    aud: cardAud, meter: cardMeter, vu: cardVU, gonio: cardGonio, rec: cardRec,
    rgba: cardRGBA, stack: cardStack, cie: cardCIE, diamond: cardDiamond, hsl: cardHSL, loud: cardLoud,
    lumin: cardLumin, editlog: cardEditLog,
  };

  return { cPreview, cardVideo, cardWave, luminBar, luminVal, luminMin, luminMax, luminCount, luminTempo, editList, editCountEl, bClear, grid, cardMap };
}

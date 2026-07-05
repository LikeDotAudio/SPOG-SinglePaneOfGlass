// src/editors/meter-input/presets — the LAYOUT PRESET table + the apply/restore
// engine. Split from index.ts. A preset positions the cards it lists AND hides
// the rest, so it also selects WHICH analyzers are shown.
type Dims = [number, number, number, number];

const PRESETS: Record<string, Record<string, Dims>> = {
  default: {   // video with its luma waveform beneath; edit detector along the bottom
    video: [330, 0, 560, 300], parade: [0, 0, 320, 250], wave: [330, 310, 560, 200],
    vec: [900, 0, 300, 300], aud: [330, 515, 560, 185], meter: [8, 405, 314, 294],
    vu: [0, 260, 327, 139], gonio: [900, 310, 300, 240], loud: [900, 560, 300, 150],
    chroma: [900, 715, 300, 175], lumin: [0, 715, 590, 240], editlog: [600, 715, 290, 240],
  },
  audio: {   // big audio instruments + the video source tucked top-right
    video: [1100, 0, 300, 180],
    aud: [0, 310, 570, 250],
    meter: [480, 0, 300, 300],
    vu: [0, 0, 470, 300],
    gonio: [790, 0, 300, 300],
    rec: [0, 570, 1090, 170],
    loud: [580, 310, 510, 250],
  },
  video: {   // ALL VIDEO: source + every chroma/luma scope, no audio instruments
    video: [0, 0, 640, 320], parade: [650, 0, 320, 270], wave: [0, 330, 640, 230],
    vec: [650, 280, 625, 462], rgba: [14, 649, 970, 220], stack: [1303, 0, 589, 549],
    cie: [1017, 567, 320, 320], diamond: [976, 0, 306, 289], hsl: [1299, 552, 441, 302],
  },
  colour: {   // full colour bench: video + every chroma scope; audio hidden
    video: [340, 0, 560, 300], wave: [340, 310, 560, 180],
    parade: [0, 0, 330, 240], rgba: [0, 250, 330, 250],
    vec: [910, 0, 300, 300], cie: [910, 310, 300, 320],
    stack: [0, 505, 330, 320], diamond: [340, 495, 320, 320], hsl: [670, 495, 540, 320],
    chroma: [910, 635, 300, 190],
  },
  luma: {   // brightness + edit detection: video, luma waveform, luminance + edit log
    video: [420, 0, 600, 330], wave: [420, 340, 600, 300],
    parade: [0, 0, 410, 310], stack: [0, 320, 410, 320],
    chroma: [420, 645, 600, 190], lumin: [1030, 0, 380, 190], editlog: [1030, 200, 380, 430],
  },
};

export interface PresetEngine {
  applyPreset(name: string): void;
  restoreCard(key: string): void;
}

// `front` bumps the z-index counter (owned by index) so a restored card comes up
// on top. The engine keeps its own `activePreset` state.
export function createPresets(cardMap: Record<string, HTMLElement>, front: () => number): PresetEngine {
  let activePreset = 'default';
  const setDims = (card: HTMLElement, d: Dims): void => { card.style.display = ''; Object.assign(card.style, { left: `${d[0]}px`, top: `${d[1]}px`, width: `${d[2]}px`, height: `${d[3]}px` }); };
  const applyPreset = (name: string): void => {
    const layout = PRESETS[name]; if (!layout) return;
    activePreset = name;
    for (const [key, card] of Object.entries(cardMap)) {
      const d = layout[key];
      if (d) setDims(card, d); else card.style.display = 'none';
    }
  };
  // ⤢ / double-click on a card snaps it back to its slot in the active preset
  // (falling back to the default preset if this preset doesn't place it).
  const restoreCard = (key: string): void => {
    const d = (PRESETS[activePreset] ?? {})[key] ?? PRESETS.default?.[key];
    const card = cardMap[key]; if (!card || !d) return;
    setDims(card, d); card.style.zIndex = String(front());
  };
  return { applyPreset, restoreCard };
}

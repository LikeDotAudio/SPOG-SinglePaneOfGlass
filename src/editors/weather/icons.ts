// src/editors/weather/icons — the on-air seasonal glyph library (P1, audit §4).
//
// 21 broadcast weather glyphs built from ~8 shared primitives (sun, moon, cloud,
// raindrop, flake, bolt, wind-lines, fog-bars). Every glyph is a single-colour
// inline <svg> drawn in `currentColor`, so the LCARS palette + Colour Engine
// (low-vis / high-vis / grey / mono) drive its ink — unlike the board's emoji,
// which render per-OS and can't be brand-controlled. Season is emergent: the WMO
// code for the location's date already encodes it (snow codes only appear in
// winter), so `glyphFor(code, isDay)` needs no manual season pick.
//
// Layering convention: distant elements (sun/moon behind a cloud) drop to a
// lighter opacity so the nearer cloud reads first; precipitation is full ink.

const NS = 'http://www.w3.org/2000/svg';

export type WxGlyph =
  | 'clear-day' | 'clear-night'
  | 'partly-day' | 'partly-night'
  | 'overcast' | 'fog'
  | 'wind'
  | 'drizzle' | 'rain' | 'rain-heavy' | 'showers'
  | 'freezing-rain' | 'sleet'
  | 'thunder' | 'thunder-severe'
  | 'flurries' | 'snow' | 'snow-heavy' | 'blowing-snow'
  | 'ice' | 'hail';

// ---- tiny SVG builders ------------------------------------------------------
type Attrs = Record<string, string | number>;
function n(tag: string, attrs: Attrs = {}, kids: SVGElement[] = []): SVGElement {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  for (const c of kids) e.appendChild(c);
  return e;
}
const g = (transform: string, kids: SVGElement[], attrs: Attrs = {}): SVGElement =>
  n('g', { transform, ...attrs }, kids);
/** A stroked line — the workhorse for rays, rain, wind and flake arms. */
const line = (x1: number, y1: number, x2: number, y2: number, w = 1.8): SVGElement =>
  n('line', { x1, y1, x2, y2, 'stroke-width': w });
const path = (d: string, attrs: Attrs = {}): SVGElement => n('path', { d, ...attrs });

// ---- primitives (24×24 space) ----------------------------------------------
/** Sun disc + 8 rays, centred at (cx,cy). */
function sun(cx: number, cy: number, r = 3.2, ray = 3): SVGElement[] {
  const rays: SVGElement[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const dx = Math.cos(a), dy = Math.sin(a);
    rays.push(line(cx + dx * (r + 1.4), cy + dy * (r + 1.4), cx + dx * (r + 1.4 + ray), cy + dy * (r + 1.4 + ray)));
  }
  return [n('circle', { cx, cy, r, fill: 'currentColor', stroke: 'none' }), ...rays];
}
/** Crescent moon centred near (cx,cy). */
function moon(cx = 12, cy = 11, r = 6): SVGElement {
  // Big disc minus an offset disc, expressed as one even-odd crescent path.
  const off = r * 0.62;
  const d = `M ${cx} ${cy - r} A ${r} ${r} 0 1 0 ${cx} ${cy + r} A ${r * 0.9} ${r * 0.9} 0 1 1 ${cx} ${cy - r} Z`;
  return path(d, { fill: 'currentColor', stroke: 'none', transform: `translate(${off * 0.2},0)` });
}
/** Feather-style cloud, whose bounding box is ~ (2..22, 6..20) before transform. */
function cloud(transform = '', opacity = 1): SVGElement {
  return g(transform, [
    path('M18 19H8A5 5 0 1 1 9.2 9.2 A6 6 0 0 1 20.7 11 A4 4 0 0 1 18 19 Z',
      { fill: 'currentColor', stroke: 'none' }),
  ], opacity === 1 ? {} : { opacity });
}
/** A short falling stroke (rain). */
const drop = (x: number, y: number, len = 3.2): SVGElement => line(x, y, x - 1, y + len, 1.9);
/** Six-armed snowflake centred at (cx,cy). */
function flake(cx: number, cy: number, r = 2.6): SVGElement[] {
  const arms: SVGElement[] = [];
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI) / 3;
    const dx = Math.cos(a) * r, dy = Math.sin(a) * r;
    arms.push(line(cx - dx, cy - dy, cx + dx, cy + dy, 1.5));
  }
  return arms;
}
/** Lightning bolt hanging below a cloud. */
const bolt = (): SVGElement =>
  path('M12 13 L8.5 18.5 L11.5 18.5 L9.5 23 L15.5 16 L12.5 16 Z',
    { fill: 'currentColor', stroke: 'none' });
/** Wind: two curling gusts. */
function wind(): SVGElement[] {
  return [
    path('M3 10 H13 A2.4 2.4 0 1 0 10.6 7.6', { fill: 'none', 'stroke-width': 1.8 }),
    path('M3 15 H16 A2.4 2.4 0 1 1 13.6 17.4', { fill: 'none', 'stroke-width': 1.8 }),
  ];
}

// ---- glyph assembly ---------------------------------------------------------
function build(glyph: WxGlyph): SVGElement[] {
  switch (glyph) {
    case 'clear-day':   return sun(12, 12, 4, 3.4);
    case 'clear-night': return [moon(13, 12, 6.4)];
    case 'partly-day':  return [...sun(8, 8, 2.8, 2.4), cloud('translate(2,3) scale(0.92)')];
    case 'partly-night':return [g('translate(-2,-1) scale(0.8)', [moon(9, 8, 5.5)], { opacity: 0.9 }),
                                cloud('translate(2,3) scale(0.92)')];
    case 'overcast':    return [cloud('translate(-2,-2) scale(0.8)', 0.5), cloud('translate(2,3) scale(0.92)')];
    case 'fog':         return [cloud('translate(1,-2) scale(0.85)', 0.85),
                                line(4, 19, 20, 19, 1.7), line(6, 22, 18, 22, 1.7)];
    case 'wind':        return wind();

    case 'drizzle':     return [cloud('translate(1,-3) scale(0.85)'),
                                drop(9, 18, 2.4), drop(15, 18, 2.4)];
    case 'rain':        return [cloud('translate(1,-3) scale(0.85)'),
                                drop(8, 18), drop(12, 18), drop(16, 18)];
    case 'rain-heavy':  return [cloud('translate(1,-3) scale(0.85)'),
                                drop(7, 18, 4), drop(11, 18, 4), drop(15, 18, 4), drop(19, 18, 4)];
    case 'showers':     return [...sun(7, 7, 2.4, 2), cloud('translate(2,-1) scale(0.82)'),
                                drop(9, 20, 2.6), drop(14, 20, 2.6)];

    case 'freezing-rain':return [cloud('translate(1,-3) scale(0.85)'),
                                drop(8, 18), drop(16, 18), ...flake(12, 20, 2.2)];
    case 'sleet':       return [cloud('translate(1,-3) scale(0.85)'),
                                drop(8, 18), ...flake(12, 19, 2), drop(16, 18)];

    case 'thunder':     return [cloud('translate(1,-3) scale(0.85)'), bolt()];
    case 'thunder-severe':return [cloud('translate(1,-3) scale(0.85)'), bolt(),
                                drop(6, 18, 3), drop(18, 18, 3)];

    case 'flurries':    return [cloud('translate(1,-3) scale(0.85)'), ...flake(12, 19, 2.4)];
    case 'snow':        return [cloud('translate(1,-3) scale(0.85)'),
                                ...flake(8, 19, 2.2), ...flake(16, 19, 2.2)];
    case 'snow-heavy':  return [cloud('translate(1,-3) scale(0.85)'),
                                ...flake(8, 18, 2.2), ...flake(12, 21, 2.2), ...flake(16, 18, 2.2)];
    case 'blowing-snow':return [...wind(), ...flake(8, 20, 2), ...flake(16, 20, 2)];

    case 'ice':         return [
      // A hex crystal with inner spokes over a frozen baseline.
      path('M12 4 L18 8 L18 15 L12 19 L6 15 L6 8 Z', { fill: 'none', 'stroke-width': 1.6 }),
      ...flake(12, 11.5, 3.2), line(4, 22, 20, 22, 1.7),
    ];
    case 'hail':        return [cloud('translate(1,-3) scale(0.85)'),
                                n('circle', { cx: 9, cy: 19, r: 1.5, fill: 'currentColor', stroke: 'none' }),
                                n('circle', { cx: 15, cy: 19, r: 1.5, fill: 'currentColor', stroke: 'none' }),
                                n('circle', { cx: 12, cy: 22, r: 1.5, fill: 'currentColor', stroke: 'none' })];
  }
}

/** Map a WMO weather code (+ day/night) to one canonical glyph. */
export function glyphFor(code: number, isDay: boolean): WxGlyph {
  switch (code) {
    case 0: case 1:   return isDay ? 'clear-day' : 'clear-night';
    case 2:           return isDay ? 'partly-day' : 'partly-night';
    case 3:           return 'overcast';
    case 45: case 48: return 'fog';
    case 51: case 53: return 'drizzle';
    case 55:          return 'rain';
    case 56: case 57: return 'freezing-rain';
    case 61:          return 'drizzle';
    case 63:          return 'rain';
    case 65:          return 'rain-heavy';
    case 66: case 67: return 'freezing-rain';
    case 71: case 77: return 'flurries';
    case 73: case 85: return 'snow';
    case 75: case 86: return 'snow-heavy';
    case 80: case 81: return 'showers';
    case 82:          return 'rain-heavy';
    case 95:          return 'thunder';
    case 96: case 99: return 'thunder-severe';
    default:          return isDay ? 'partly-day' : 'partly-night';
  }
}

/** Render a glyph as a self-contained inline <svg> in `currentColor`. */
export function svgFor(glyph: WxGlyph, opts: { size?: number; title?: string } = {}): SVGElement {
  const size = opts.size ?? 48;
  const svg = n('svg', {
    viewBox: '0 0 24 24', width: size, height: size,
    fill: 'none', stroke: 'currentColor',
    'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    role: 'img', 'aria-label': opts.title ?? glyph,
    class: `wx-glyph wx-glyph-${glyph}`,
  }, build(glyph));
  return svg;
}

/** Convenience: glyph straight from a WMO code. */
export const svgForCode = (code: number, isDay: boolean, opts?: { size?: number; title?: string }): SVGElement =>
  svgFor(glyphFor(code, isDay), opts);

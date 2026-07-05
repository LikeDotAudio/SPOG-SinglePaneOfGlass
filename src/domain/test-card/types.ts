// src/domain/test-card/types — the shared test-frame vocabulary.
//
// A "test card" is SPOG's synthetic, self-identifying frame of video: square
// SMPTE bars + a burned-in slate + a moving shape ident, rendered for whatever
// source is routed to a given preview surface. See
// docs/Audit/Test-Frame-Routing-Audit.md §8-9 for the identity/format design.

/** The ~12-form roster — chosen to stay distinct at 24px and in silhouette, so
 *  a source is recognisable on shape ALONE (the only channel left in mono mode). */
export type ShapeKind =
  | 'circle' | 'square' | 'triangleUp' | 'triangleDown' | 'diamond' | 'pentagon'
  | 'hexagon' | 'star5' | 'plus' | 'chevron' | 'ring' | 'bowtie';

export const SHAPE_ROSTER: ShapeKind[] = [
  'circle', 'square', 'triangleUp', 'triangleDown', 'diamond', 'pentagon',
  'hexagon', 'star5', 'plus', 'chevron', 'ring', 'bowtie',
];

/** A logical raster. SPOG's mezzanine is square, 100fps progressive — the frame
 *  counter counts at fps, decoupled from the display-capped render (see §9). */
export interface VideoFormat {
  w: number;
  h: number;
  fps: number;
  scan: 'p' | 'i';
  label: string;
}

export const MEZZANINE: VideoFormat = { w: 1080, h: 1080, fps: 100, scan: 'p', label: '1080²p100' };

/** The three orthogonal identity channels, all derived from a source's own
 *  fields: name (text), hue (from authored colour), shape+num (from id/label). */
export interface CardIdent {
  name: string;
  hue: number;
  shape: ShapeKind;
  num: number;
}

export interface CardSpec {
  ident: CardIdent;
  format: VideoFormat;
  /** The authored source colour (hex) — drives the border, slate wash and shape fill. */
  color: string;
}

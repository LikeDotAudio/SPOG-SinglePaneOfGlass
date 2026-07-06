// src/domain/tsg/types — the Test Signal Generator (TSG) vocabulary.
//
// A TSG pattern is a standardised, self-describing frame of video (SMPTE / EBU /
// ITU-R test patterns + HDR ramps) that a TSG source can generate and route onto
// any monitor. Each carries the SPEC it verifies (the `title` tooltip) and a link
// to the governing document (`href`) — surfaced verbatim in the selector gallery.

/** Which colour-volume family a pattern belongs to (gallery grouping). */
export type TsgGroup = 'SDR' | 'HDR';

/** A pure canvas painter: fill the (0,0)-(W,H) box in CSS-pixel space. `t` (ms)
 *  drives any live motion (e.g. the plasma / burn-in sweep); omit for a still. */
export type TsgDraw = (g: CanvasRenderingContext2D, W: number, H: number, t: number) => void;

export interface TsgPattern {
  /** Stable id — persisted + published over MQTT; never rename. */
  id: string;
  /** The routable feed label (matches a `video[]` entry in the source JSON). */
  label: string;
  /** Short human name shown on the tile + big preview. */
  name: string;
  group: TsgGroup;
  /** The tooltip: WHAT the pattern measures and WHY it matters (verbatim spec text). */
  title: string;
  /** The governing SMPTE / EBU / ITU / VESA document (opens in a new tab). */
  href: string;
  /** Gallery sort key (lower first); preserves the authored roster order. */
  order?: number;
  /** Paint the pattern. */
  draw: TsgDraw;
}

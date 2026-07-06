// src/editors/tsg — the TEST SIGNAL GENERATOR (TSG) editor (a graphics source).
//
// Opened when a TEST SIGNAL GENERATORS feed (extraClass:"tsg-source") is routed onto
// any twist / monitor, or a twist is literally named "TSG" / "Test Signal …". Lets the
// operator pick which standardised pattern the generator outputs — SMPTE / EBU / ITU /
// VESA, SDR + HDR — from the shared picker gallery, each with its spec tooltip + a link
// to the governing document. The pattern painters live one-per-file in src/domain/tsg.
//
// order:9 beats signaling (order 11, whose /signal/ would otherwise grab a
// "TEST SIGNAL …" twist name); the picker itself is ui/tsg-gallery (shared with
// the meter-input test tools).

import { VOICE_COMMANDS } from './VOICE.js';
import type { EditorPlugin } from '../types.js';
import { renderTsg } from './view.js';

const plugin: EditorPlugin = {
  id: 'tsg',
  title: 'TEST SIGNAL GENERATOR',
  order: 9,
  blurb: 'Generate a standardised SMPTE / EBU / ITU / VESA test pattern (SDR colour bars, alignment grid, luminance ramps, solid fields, plus HDR Rec. 2100 PQ/HLG bars, PQ ramps and a 1000-nit window) and route it onto any monitor. Each pattern names the spec it verifies and links to the governing document.',
  match: (n) => /\btsg\b|test\s*signal/i.test(n),
  voiceCommands: VOICE_COMMANDS,
  render: renderTsg,
};
export default plugin;

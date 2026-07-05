// src/app/blurbs.ts — the editor catalogue "what this window does" leads.
//
// Split out of main.ts (composition root) so the entry stays thin (200-line rule).

/** "What this window does" — the one-line lead of each editor's context-derived
 *  expectation tip (Kind A). Keyed by plugin.id; an editor may override via its
 *  own `plugin.blurb`. Sourced from the README editor catalogue. */
export const BLURBS: Record<string, string> = {
  'vision-mixer': 'Broadcast switcher — cut/mix/wipe PGM & PVW; keyers for lower-thirds & logos. This drives tally.',
  'multi-viewer': 'Configurable monitor wall (2×2→16×16) with PiP, tally states, and inline UMD labels.',
  'iso-recorder': 'Per-camera clean ISO recording + instant replay: jog/shuttle, angle select, mark-to-air.',
  'audio-mixer': 'Audio console — channel strips (fader/EQ/pan/aux), group buses; ⚙ jumps to Stage Box preamps.',
  'audio-monitor': 'Confidence monitor: 1–24-ch PPM/VU, phase correlation, and ITU-R BS.1770 loudness.',
  'audio-positioner': 'Object-based audio positioning (CMDP) — place beds and objects in the sound field.',
  'intercom': 'Comms key panel — TALK/LISTEN keys and gangable talk groups. The source layer for IFB.',
  'ifb': 'Talent earpiece: mix-minus (program minus own mic, to kill echo) plus the director interrupt.',
  'camera-control': 'CCU / RCP — PTZ plus shading (iris/gamma/gain/blacks), scopes, and the robotics map.',
  'encoder': 'Transcode/stream engine — 1:1 mezzanine → ABR ladder → RTMP/SRT, 2022-7 failover, DRM.',
  'signaling': 'Distributes tally (red PGM / green PVW / amber ISO), the On-Air light, and GPI/SCTE triggers.',
  'stagebox-input': 'Smart-object mic input — preamp gain/headroom, interlocked +48V phantom, impedance, HF comp.',
  'signal-conditioner': 'Frame-sync / delay / proc-amp — legalise and align signal at the studio edge.',
  'lighting': 'DMX console for a 3/4-point rig (Key/Fill/Back/Background) + set light; scene recall.',
  'wysiwyg': 'Top-down pre-viz of the DMX rig: beam cones, foot-candle heat-map, camera frustum, tally glow.',
  'graphics-engine': 'CG / title engine — lower-thirds, full-screen titles, and crawls on the rundown spine.',
  'meter-input': 'Real-video/audio scope bench — waveform, vectorscope, meters: an objective source of truth.',
  'person': 'A person as a routable virtual channel strip — identity, mic preference, and EQ/comp.',
  'prompter': 'Teleprompter source — a script + live playhead fanned to prompt heads (mirrored) & confidence.',
  'clock': 'Broadcast clock source — UTC + local ±3h zones as an LED ring (ticking) or a smooth analog sweep.',
  'chronos': 'Chronos graphic set — dual A/B chronometers + local time on configurable seven-segment or Arial faces (red/white on black).',
  'timer': 'Dual-channel up/down production timer — two 6-digit counts, 20 presets, follow buffer, calculator, and GPI on the bus.',
};

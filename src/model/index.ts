// src/model — the typed domain shapes the app reads. Barrel over the per-domain
// modules; import path (`../model/index.js`) stays stable for every consumer.
//
// These are the real-TS form of the contracts that the legacy app kept only in
// comments (see docs/TYPESCRIPT-WASM-REPORT.md §A.2). Every layer above depends
// on these and nothing else for "what the data looks like".

export type * from './common.js';
export type * from './sources.js';
export type * from './destinations.js';
export type * from './switcher.js';
export type * from './auth.js';

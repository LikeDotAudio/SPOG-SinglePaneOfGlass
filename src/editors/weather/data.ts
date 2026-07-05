// src/editors/weather/data — the WEATHER data layer (barrel).
//
// Everything network- and model-shaped that used to live inline here now lives
// in siblings (audit §4.7): Open-Meteo geocoding + forecast fetch (net), the
// data-model types (types), the WMO code table + unit/time-zone/label helpers
// (format), and the on-air `strip`'s dayparts projection (dayparts). This file
// re-exports them all so BOTH faces — the operator `board` and the on-air
// `strip` — keep reading one data pipe from './data.js' byte-for-byte.
export * from './types.js';
export * from './net.js';
export * from './format.js';
export * from './dayparts.js';

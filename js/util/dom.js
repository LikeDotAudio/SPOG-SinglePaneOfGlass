// js/util/dom.js — small DOM/string helpers shared across renderers.
// faultTag and the id-slug regex were duplicated across poolVideo.js /
// poolAudio.js / productions.js.
import { isFaultStatus } from '../globals.js';

// LCARS fault badge markup for a pool/program header (empty when not faulted).
export function faultTag(status) {
    return isFaultStatus(status) ? `<span class="fault-tag">⚠ ${status}</span>` : '';
}

// Sanitise an arbitrary label into a DOM-id-safe slug (collapses runs of
// non-alphanumerics to a single dash).
export function slugId(s) {
    return String(s == null ? '' : s).replace(/[^a-zA-Z0-9]+/g, '-');
}

// Strip the backend-only ordering prefix ("001_") from a folder / file name so it
// is used for sort order but never shown to the user.
export function stripOrder(name) {
    return String(name == null ? '' : name).replace(/^\d{3,}_/, '');
}

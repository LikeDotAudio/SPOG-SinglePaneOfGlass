// src/ui/console/dest-fixtures — the standing fixtures every destination carries.
//
// renderPrograms mounts these into EVERY room's body, so no matter what twists a
// destination declares it always has:
//   • CLOCK        — a live time-of-day read-out; click it to open the CLOCK editor.
//   • DUAL COUNTER — TWO always-present counters (A + B) with ▶/↺ transports, plus
//                    a THIRD independent count: an old-time pocket stopwatch (its
//                    TOP crown is start/stop, its SIDE pusher is reset — chronos
//                    stopwatch look). Click a count to open the dual-count TIMER
//                    editor.
//   • CHAT LOG     — a per-destination transcript that rides the retained TwistBus
//                    chat/dest/# tree and narrates into the Captain's Log.
// When the room is OFFLINE (a fault status), the clock + counters BLINK.
//
// Clicking a fixture opens the matching editor by handing renderPrograms's own
// openEditor a synthetic twist element named "Clock"/"Timer" (the same dispatch
// path a real twist uses). The clock/counter rAF loops self-terminate when their
// node leaves the DOM (the pane is rebuilt per activation), so re-rendering leaks
// nothing.
//
// This file is the slim orchestrator: the fixtures themselves live in flat
// siblings (-shared / -clock / -counters / -chat).

import { el, addStyles } from '../dom.js';
import { CSS, synthTwist } from './dest-fixtures-shared.js';
import { clockCard } from './dest-fixtures-clock.js';
import { counterCard } from './dest-fixtures-counters.js';
import { chatCard } from './dest-fixtures-chat.js';
import type { OpenEditor } from './matrix.js';
import type { Production } from '../../model/index.js';

export { synthTwist } from './dest-fixtures-shared.js';

/** Mount the standing fixtures into a destination's program body.
 *  `openEditor` opens the clock/timer editors; `offline` blinks the clock + counters. */
export function mountDestFixtures(body: HTMLElement, pgm: Production, openEditor?: OpenEditor, offline = false): void {
  addStyles('twist-dest-fixtures', CSS);
  const openClock = (): void => openEditor?.(synthTwist(pgm, 'Clock'));
  const openTimer = (): void => openEditor?.(synthTwist(pgm, 'Timer'));
  body.append(el('div', { class: 'dfx' }, [
    clockCard(openClock, offline),
    counterCard(pgm, openTimer, offline),
    chatCard(pgm),
  ]));
}

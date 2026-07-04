import type { TransitionAction } from './types.js';

export const wipeTransition: TransitionAction = {
  id: 'WIPE',
  name: 'WIPE',
  emulate: (pct) => ({ opacity: 1, clipPath: `polygon(0 0, ${pct * 100}% 0, ${pct * 100}% 100%, 0 100%)`, transform: 'none' })
};

export const lWipeTransition: TransitionAction = {
  id: 'L-WIPE',
  name: 'L-WIPE',
  emulate: (pct) => ({ opacity: 1, clipPath: `polygon(0 0, ${pct * 100}% 0, ${pct * 100}% 100%, 0 100%)`, transform: 'none' })
};

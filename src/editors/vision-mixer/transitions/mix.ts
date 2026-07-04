import type { TransitionAction } from './types.js';

export const mixTransition: TransitionAction = {
  id: 'MIX',
  name: 'MIX',
  emulate: (pct) => ({ opacity: pct, clipPath: 'none', transform: 'none' })
};

export const famTransition: TransitionAction = {
  id: 'FAM',
  name: 'FAM',
  emulate: (pct) => ({ opacity: pct, clipPath: 'none', transform: 'none' })
};

export const namTransition: TransitionAction = {
  id: 'NAM',
  name: 'NAM',
  emulate: (pct) => ({ opacity: pct, clipPath: 'none', transform: 'none' })
};

export const dipTransition: TransitionAction = {
  id: 'DIP',
  name: 'DIP',
  emulate: (pct) => ({ opacity: pct, clipPath: 'none', transform: 'none' })
};

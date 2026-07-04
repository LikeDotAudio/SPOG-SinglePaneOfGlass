import type { TransitionAction } from './types.js';

export const irisTransition: TransitionAction = {
  id: 'IRIS',
  name: 'IRIS',
  emulate: (pct) => ({ opacity: 1, clipPath: `circle(${pct * 75}% at 50% 50%)`, transform: 'none' })
};

export const circleTransition: TransitionAction = {
  id: 'CIRCLE',
  name: 'CIRCLE',
  emulate: (pct) => ({ opacity: 1, clipPath: `circle(${pct * 75}% at 50% 50%)`, transform: 'none' })
};

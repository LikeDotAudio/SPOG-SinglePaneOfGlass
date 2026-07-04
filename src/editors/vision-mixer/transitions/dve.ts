import type { TransitionAction } from './types.js';

export const dvePushTransition: TransitionAction = {
  id: 'DVE PUSH',
  name: 'DVE PUSH',
  emulate: (pct) => ({ opacity: 1, clipPath: 'none', transform: `translateX(${(1 - pct) * 100}%)` })
};

export const dveTransition: TransitionAction = {
  id: 'DVE',
  name: 'DVE',
  emulate: (pct) => ({ opacity: 1, clipPath: 'none', transform: `translateX(${(1 - pct) * 100}%)` })
};

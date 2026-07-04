import type { TransitionAction } from './types.js';

export const boxTransition: TransitionAction = {
  id: 'BOX',
  name: 'BOX',
  emulate: (pct) => ({ opacity: 1, clipPath: `inset(${50 - pct*50}% ${50 - pct*50}% ${50 - pct*50}% ${50 - pct*50}%)`, transform: 'none' })
};

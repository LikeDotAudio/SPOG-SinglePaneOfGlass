import type { TransitionAction } from './types.js';

export const barnDoorsTransition: TransitionAction = {
  id: 'BARN DOORS',
  name: 'BARN DOORS',
  emulate: (pct) => ({ opacity: 1, clipPath: `polygon(${50 - pct*50}% 0, ${50 + pct*50}% 0, ${50 + pct*50}% 100%, ${50 - pct*50}% 100%)`, transform: 'none' })
};

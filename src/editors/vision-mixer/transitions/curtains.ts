import type { TransitionAction } from './types.js';

export const curtainsTransition: TransitionAction = {
  id: 'CURTAINS',
  name: 'CURTAINS',
  emulate: (pct) => ({ 
    opacity: 1, 
    clipPath: `polygon(0 0, ${pct*50}% 0, ${pct*50}% 100%, 0 100%, 100% 0, ${100 - pct*50}% 0, ${100 - pct*50}% 100%, 100% 100%)`, 
    transform: 'none' 
  })
};

import type { TransitionAction } from './types.js';

export const starWipeTransition: TransitionAction = {
  id: 'STAR WIPE',
  name: 'STAR WIPE',
  emulate: (pct) => ({ 
    opacity: 1, 
    clipPath: `polygon(50% ${50 - pct*50}%, ${50 + pct*15}% ${50 - pct*15}%, ${50 + pct*50}% 50%, ${50 + pct*15}% ${50 + pct*15}%, 50% ${50 + pct*50}%, ${50 - pct*15}% ${50 + pct*15}%, ${50 - pct*50}% 50%, ${50 - pct*15}% ${50 - pct*15}%)`, 
    transform: 'none' 
  })
};

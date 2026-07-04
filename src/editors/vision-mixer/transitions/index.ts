import type { TransitionAction } from './types.js';
import { mixTransition, famTransition, namTransition, dipTransition } from './mix.js';
import { wipeTransition, lWipeTransition } from './wipe.js';
import { boxTransition } from './box.js';
import { irisTransition, circleTransition } from './iris.js';
import { barnDoorsTransition } from './barn-doors.js';
import { curtainsTransition } from './curtains.js';
import { dveTransition, dvePushTransition } from './dve.js';
import { starWipeTransition } from './star-wipe.js';

export const TRANSITION_REGISTRY: Record<string, TransitionAction> = {
  [mixTransition.id]: mixTransition,
  [famTransition.id]: famTransition,
  [namTransition.id]: namTransition,
  [dipTransition.id]: dipTransition,
  [wipeTransition.id]: wipeTransition,
  [lWipeTransition.id]: lWipeTransition,
  [boxTransition.id]: boxTransition,
  [irisTransition.id]: irisTransition,
  [circleTransition.id]: circleTransition,
  [barnDoorsTransition.id]: barnDoorsTransition,
  [curtainsTransition.id]: curtainsTransition,
  [dveTransition.id]: dveTransition,
  [dvePushTransition.id]: dvePushTransition,
  [starWipeTransition.id]: starWipeTransition,
};

export const emulateTransition = (id: string, pct: number) => {
  const t = TRANSITION_REGISTRY[id];
  if (t) return t.emulate(pct);
  return { opacity: pct, clipPath: 'none', transform: 'none' };
};

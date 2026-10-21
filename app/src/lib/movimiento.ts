// ============================================================================
// THE PHONE'S OWN *REDUCE MOTION*, READ ONCE AND FOLLOWED.
//
// Inicio's figures roll and its streak blooms; `8g`'s tutorial moves a finger
// over the Vender screen. Each stands still when the person has asked her phone
// for less motion, and the switch is followed live: turning it on in Settings
// while Wera is open stops the next animation, not the next launch.
//
// ⚠️ IT STARTS `false` AND LEARNS: the first frame may move before the answer
// arrives, which is why every caller starts its animation in an effect that
// re-runs when this flips, never once on mount.
// ============================================================================

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** `true` while the phone asks for reduced motion. */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (live) setReduce(on);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

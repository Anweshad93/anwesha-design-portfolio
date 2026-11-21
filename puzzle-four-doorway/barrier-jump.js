import {createGardenMotion} from '../puzzle-three-chamber/motion.js';

// Reuse the traveller's established stepping pose for a small hop over the
// threshold. The regular controller still owns the horizontal movement.
export function createBarrierJump(THREE, walker, effects) {
  const pose = createGardenMotion(THREE, walker);
  let jump = null;
  let previous = 0;
  let airborne = false;

  return {
    begin() {
      jump = {jumping: true, phase: 'move', pathProgress: 0,
        jumpStart: .16, jumpEnd: .84};
      previous = 0;
      airborne = false;
    },

    // Call after positioning along the crossing; add the return value to y.
    height(progress) {
      if (!jump) return 0;
      const t = Math.max(0, Math.min(1, progress));
      jump.pathProgress = t;
      if (previous < jump.jumpStart && t >= jump.jumpStart) effects.jump();
      if (previous < jump.jumpEnd && t >= jump.jumpEnd) effects.landing();
      previous = t;
      airborne = t >= jump.jumpStart && t < jump.jumpEnd;
      return pose.height(t, jump);
    },

    inFlight() { return airborne; },
    // Restore before the animation mixer, then apply after it. This prevents
    // procedural leg rotations accumulating and leaves the lantern carry pose
    // free to be applied last.
    restore() { pose.restore(); },
    apply() { if (jump) pose.apply(jump); },
  };
}

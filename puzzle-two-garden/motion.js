// Preserve the traveller's rigged walking cycle while adding a small,
// asymmetric clearance motion only for the actual water gap. This module is
// deliberately separate from the approved first courtyard's traveller.
export function createGardenMotion(THREE, walker) {
  const names = ['Spine', 'LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm',
    'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg', 'LeftFoot', 'RightFoot',
    'LeftToeBase', 'RightToeBase'];
  const bones = Object.fromEntries(names.map(name => {
    const bone = walker.getObjectByName(name);
    return [name, bone ? { bone, base: bone.quaternion.clone() } : null];
  }));
  const leftFoot = walker.getObjectByName('LeftToeBase') || walker.getObjectByName('LeftFoot');
  const rightFoot = walker.getObjectByName('RightToeBase') || walker.getObjectByName('RightFoot');
  const offset = new THREE.Quaternion(), euler = new THREE.Euler();
  let active = false, currentJump = null, leading = 'Left', takeoffPose = null;

  function progress(t) {
    // Walk to the edge first, then use a short step-hop across the gap.
    // The feet can reach beyond the body's centre, so a narrower airborne
    // interval keeps them supported while leaving time for a natural step.
    return THREE.MathUtils.clamp((t - .29) / .42, 0, 1);
  }
  function height(t) {
    const u = progress(t);
    if (u <= 0 || u >= 1) return 0;
    const wave = Math.sin(Math.PI * u);
    // A rounded arc with a gently eased takeoff and landing reads as a small
    // hop rather than floating slowly over the water. It has zero velocity
    // exactly at either end while rising more briskly than a squared sine.
    return .20 * Math.pow(wave, 1.35);
  }
  function restore() {
    if (active) for (const item of Object.values(bones)) if (item) item.bone.quaternion.copy(item.base);
    active = false;
  }
  function findLead() {
    if (!leftFoot || !rightFoot) return 'Left';
    walker.updateWorldMatrix(true, true);
    const l = walker.worldToLocal(leftFoot.getWorldPosition(new THREE.Vector3()));
    const r = walker.worldToLocal(rightFoot.getWorldPosition(new THREE.Vector3()));
    return l.z >= r.z ? 'Left' : 'Right';
  }
  function apply(movement) {
    if (!movement?.jumping || movement.phase !== 'move') { currentJump = null; takeoffPose = null; return; }
    const t = Math.min(1, movement.time / movement.duration), u = progress(t);
    if (u <= 0 || u >= 1) { if (u >= 1) { currentJump = null; takeoffPose = null; } return; }
    if (currentJump !== movement) {
      currentJump = movement;
      leading = findLead();
      // The existing walk's leading foot defines the launch pose. Holding
      // that pose softly in flight prevents the feet from continuing to
      // walk in midair; the normal gait resumes as the traveller lands.
      takeoffPose = Object.fromEntries(Object.entries(bones).map(([name, item]) =>
        [name, item ? item.bone.quaternion.clone() : null]));
    }
    // Keep the takeoff pose through the central airborne portion, then extend
    // the leading leg before easing back into the existing walking cycle.
    // This avoids the feet cycling in midair and makes touchdown less abrupt.
    const flightBlend = THREE.MathUtils.smoothstep(u, .02, .20)
      * (1 - THREE.MathUtils.smoothstep(u, .64, .98));
    const landing = THREE.MathUtils.smoothstep(u, .36, .88);
    const trail = leading === 'Left' ? 'Right' : 'Left';
    // The lead knee rises during the crossing and then extends toward the
    // next stone. The trailing leg folds under the body before recovering.
    // The walk animation remains the underlying pose on both sides of a hop.
    const adjustments = {
      Spine: [.035, 0, 0],
      [leading + 'UpLeg']: [-.18 + .10 * landing, 0, 0],
      [leading + 'Leg']: [.20 - .14 * landing, 0, 0],
      [trail + 'UpLeg']: [.08 * (1 - landing), 0, 0],
      [trail + 'Leg']: [.18 - .10 * landing, 0, 0],
      // The ankles and toes hold their launch pose too; letting them keep
      // walking while the knees are airborne makes the feet flicker.
      LeftFoot: [0, 0, 0], RightFoot: [0, 0, 0],
      LeftToeBase: [0, 0, 0], RightToeBase: [0, 0, 0],
      [leading + 'Arm']: [.035, 0, 0],
      [trail + 'Arm']: [-.035, 0, 0],
    };
    for (const [name, angles] of Object.entries(adjustments)) {
      const item = bones[name];
      if (!item) continue;
      item.base.copy(item.bone.quaternion);
      euler.set(...angles); offset.setFromEuler(euler);
      const target = (takeoffPose[name] || item.base).clone().multiply(offset);
      item.bone.quaternion.slerp(target, flightBlend);
    }
    active = true;
  }
  return { restore, apply, height, progress };
}

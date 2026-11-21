// A garden-local two-hand carrying pose. The first chapter's traveller and
// its animations remain untouched. Call restore before updating the animation
// mixer, then apply after it has updated for the current frame.
export function createTwoHandCarry(THREE, traveller) {
  const arms = ['Left', 'Right'].map(side => ({
    upper: traveller.getObjectByName(`${side}Arm`),
    elbow: traveller.getObjectByName(`${side}ForeArm`),
    hand: traveller.getObjectByName(`${side}Hand`),
  })).filter(arm => arm.upper && arm.elbow && arm.hand);
  let saved = null;

  function restore() {
    if (!saved) return;
    for (const entry of saved) {
      entry.arm.upper.quaternion.copy(entry.upper);
      entry.arm.elbow.quaternion.copy(entry.elbow);
    }
    saved = null;
  }

  function aim(bone, child, target) {
    traveller.updateWorldMatrix(true, true);
    const origin = bone.getWorldPosition(new THREE.Vector3());
    const from = child.getWorldPosition(new THREE.Vector3()).sub(origin);
    const to = target.clone().sub(origin);
    if (from.lengthSq() < 1e-8 || to.lengthSq() < 1e-8 || !bone.parent) return;
    const delta = new THREE.Quaternion().setFromUnitVectors(from.normalize(), to.normalize());
    const parentRotation = bone.parent.getWorldQuaternion(new THREE.Quaternion());
    bone.quaternion.premultiply(parentRotation.clone().invert().multiply(delta).multiply(parentRotation));
  }

  function solve(arm, target, side, blend) {
    traveller.updateWorldMatrix(true, true);
    const shoulder = arm.upper.getWorldPosition(new THREE.Vector3());
    const elbow = arm.elbow.getWorldPosition(new THREE.Vector3());
    const hand = arm.hand.getWorldPosition(new THREE.Vector3());
    const upperLength = shoulder.distanceTo(elbow), lowerLength = elbow.distanceTo(hand);
    const toward = target.clone().sub(shoulder);
    if (toward.lengthSq() < 1e-8 || upperLength < 1e-4 || lowerLength < 1e-4) return;
    const distance = THREE.MathUtils.clamp(toward.length(), Math.abs(upperLength-lowerLength)+.001, (upperLength+lowerLength)*.97);
    toward.normalize();
    const along = (upperLength*upperLength-lowerLength*lowerLength+distance*distance)/(2*distance);
    const bendHeight = Math.sqrt(Math.max(0, upperLength*upperLength-along*along));
    // Elbows fall outward and down rather than flipping through the torso.
    const bend = new THREE.Vector3(side*.55, -1, -.20).applyQuaternion(traveller.quaternion);
    bend.addScaledVector(toward, -bend.dot(toward));
    if (bend.lengthSq() < 1e-8) bend.set(side, 0, 0);
    bend.normalize();
    const elbowTarget = shoulder.clone().addScaledVector(toward, along).addScaledVector(bend, bendHeight);
    const handTarget = shoulder.clone().addScaledVector(toward, distance);
    const upperBase = arm.upper.quaternion.clone(), elbowBase = arm.elbow.quaternion.clone();
    aim(arm.upper, arm.elbow, elbowTarget);
    aim(arm.elbow, arm.hand, handTarget);
    const upperPose = arm.upper.quaternion.clone(), elbowPose = arm.elbow.quaternion.clone();
    arm.upper.quaternion.copy(upperBase).slerp(upperPose, blend);
    arm.elbow.quaternion.copy(elbowBase).slerp(elbowPose, blend);
  }

  return {
    // A small globe is held in front of the torso, not inside the body.
    position() {
      traveller.updateWorldMatrix(true, true);
      return traveller.localToWorld(new THREE.Vector3(0, .68, .35));
    },
    restore,
    // Apply after the character's own animation. The two hands aim at the
    // opposite sides of the same globe, including while the character walks.
    apply(globeWorldPosition, weight = 1) {
      restore();
      if (!globeWorldPosition || weight <= 0 || !arms.length) return;
      const blend = THREE.MathUtils.clamp(weight, 0, 1);
      saved = arms.map(arm => ({ arm, upper: arm.upper.quaternion.clone(), elbow: arm.elbow.quaternion.clone() }));
      for (const arm of arms) {
        traveller.updateWorldMatrix(true, true);
        const shoulder = traveller.worldToLocal(arm.upper.getWorldPosition(new THREE.Vector3()));
        const side = shoulder.x < 0 ? -1 : 1;
        // The palms touch the near sides of the sphere. Reaching toward the
        // back half keeps the targets within this model's short arm length.
        const offset = new THREE.Vector3(side*.14, -.09, -.17).applyQuaternion(traveller.quaternion);
        solve(arm, globeWorldPosition.clone().add(offset), side, blend);
      }
    },
    supported: arms.length === 2,
  };
}

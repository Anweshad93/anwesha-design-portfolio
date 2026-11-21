// A one-handed gesture toward the selected carving. The carving can float
// above the traveller's reach, so the arm aims at it without stretching past
// the model's real shoulder/elbow lengths or claiming physical contact.
export function createMemoryGesture(THREE, traveller) {
  const arm={upper:traveller.getObjectByName('RightArm'),elbow:traveller.getObjectByName('RightForeArm'),hand:traveller.getObjectByName('RightHand')};
  let saved=null;
  function restore(){if(!saved)return;arm.upper.quaternion.copy(saved.upper);arm.elbow.quaternion.copy(saved.elbow);saved=null;}
  function aim(bone,child,target){
    traveller.updateWorldMatrix(true,true);
    const origin=bone.getWorldPosition(new THREE.Vector3());
    const from=child.getWorldPosition(new THREE.Vector3()).sub(origin),to=target.clone().sub(origin);
    if(from.lengthSq()<1e-8||to.lengthSq()<1e-8||!bone.parent)return;
    const delta=new THREE.Quaternion().setFromUnitVectors(from.normalize(),to.normalize());
    const parent=bone.parent.getWorldQuaternion(new THREE.Quaternion());
    bone.quaternion.premultiply(parent.clone().invert().multiply(delta).multiply(parent));
  }
  function apply(target,progress){
    if(!arm.upper||!arm.elbow||!arm.hand||!target)return;
    // Blend in, hold as the piece turns, and ease back to the resting pose.
    const p=THREE.MathUtils.clamp(progress,0,1);
    const blend=THREE.MathUtils.smoothstep(p,.02,.27)*(1-THREE.MathUtils.smoothstep(p,.68,.98));
    if(blend<=0)return;
    traveller.updateWorldMatrix(true,true);
    const shoulder=arm.upper.getWorldPosition(new THREE.Vector3()),elbow=arm.elbow.getWorldPosition(new THREE.Vector3()),hand=arm.hand.getWorldPosition(new THREE.Vector3());
    const upper=shoulder.distanceTo(elbow),lower=elbow.distanceTo(hand),toward=target.clone().sub(shoulder);
    if(upper<1e-4||lower<1e-4||toward.lengthSq()<1e-8)return;
    const distance=THREE.MathUtils.clamp(toward.length(),Math.abs(upper-lower)+.001,(upper+lower)*.95);toward.normalize();
    const along=(upper*upper-lower*lower+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,upper*upper-along*along));
    // The elbow falls outward/down and never folds through the torso.
    const bend=new THREE.Vector3(.7,-1,-.15).applyQuaternion(traveller.quaternion);bend.addScaledVector(toward,-bend.dot(toward));if(bend.lengthSq()<1e-8)bend.set(1,0,0);bend.normalize();
    const elbowTarget=shoulder.clone().addScaledVector(toward,along).addScaledVector(bend,height),handTarget=shoulder.clone().addScaledVector(toward,distance);
    saved={upper:arm.upper.quaternion.clone(),elbow:arm.elbow.quaternion.clone()};
    aim(arm.upper,arm.elbow,elbowTarget);aim(arm.elbow,arm.hand,handTarget);
    const upperPose=arm.upper.quaternion.clone(),elbowPose=arm.elbow.quaternion.clone();
    arm.upper.quaternion.copy(saved.upper).slerp(upperPose,blend);arm.elbow.quaternion.copy(saved.elbow).slerp(elbowPose,blend);
  }
  return {restore,apply};
}

import { GLTFLoader } from "../game-demo/vendor/GLTFLoader.js";

/**
 * Create the grounded traveller and its walk / button-press interaction.
 *
 * The group position is the feet position. Set the group to a walkable node;
 * never add a height offset for the character. Model forward is +Z, matching
 * Object3D.lookAt and atan2(direction.x, direction.z).
 *
 * update(delta, { moving, turning, onFootstep }) is called every animation frame.
 * onFootstep receives the landing foot ("left" or "right") as it touches down.
 * turning is null, or { wheel: THREE.Group, progress: 0..1 }. The wheel group
 * exposes the raised button's visible top at wheel.userData.buttonSurface.
 */
export async function createTraveler(THREE, scene) {
  const group = new THREE.Group();
  group.name = "The traveller";
  scene.add(group);

  let mixer = null;
  let idleAction = null;
  let walkAction = null;
  let animationMode = "";
  let arms = [];
  let loaded = false;
  let pressRest = null;

  function aimBone(bone, child, target) {
    if (!bone || !child || !bone.parent) return;
    group.updateMatrixWorld(true);
    const origin = bone.getWorldPosition(new THREE.Vector3());
    const from = child.getWorldPosition(new THREE.Vector3()).sub(origin);
    const to = target.clone().sub(origin);
    if (from.lengthSq() < 0.000001 || to.lengthSq() < 0.000001) return;
    const delta = new THREE.Quaternion().setFromUnitVectors(from.normalize(), to.normalize());
    const parentRotation = bone.parent.getWorldQuaternion(new THREE.Quaternion());
    bone.quaternion.premultiply(parentRotation.clone().invert().multiply(delta).multiply(parentRotation));
  }

  function reach(arm, target) {
    for (let iteration = 0; iteration < 5; iteration += 1) {
      aimBone(arm.forearm, arm.hand, target);
      aimBone(arm.upper, arm.hand, target);
    }
    group.updateMatrixWorld(true);
  }

  // Solve the shoulder and elbow together. A repeated aim-at-hand solve can
  // make the elbow flip or pass through the button during the reach.
  function reachWheel(arm, target, blend, side) {
    group.updateMatrixWorld(true);
    const shoulder = arm.upper.getWorldPosition(new THREE.Vector3());
    const elbow = arm.forearm.getWorldPosition(new THREE.Vector3());
    const hand = arm.hand.getWorldPosition(new THREE.Vector3());
    const upperLength = shoulder.distanceTo(elbow);
    const lowerLength = elbow.distanceTo(hand);
    const toward = target.clone().sub(shoulder);
    const distance = THREE.MathUtils.clamp(toward.length(), Math.abs(upperLength - lowerLength) + .001, (upperLength + lowerLength) * .97);
    if (toward.lengthSq() < 0.000001 || upperLength < .001 || lowerLength < .001) return;
    toward.normalize();
    const along = (upperLength * upperLength - lowerLength * lowerLength + distance * distance) / (2 * distance);
    const bendHeight = Math.sqrt(Math.max(0, upperLength * upperLength - along * along));
    // Bend the elbow down and back toward the traveller. From the fixed
    // camera this separates the forearm from the hand at the button.
    const bend = new THREE.Vector3(0, -1, 1);
    bend.addScaledVector(toward, -bend.dot(toward));
    if (bend.lengthSq() < .000001) bend.set(side || 1, 0, 0);
    bend.normalize();
    const elbowTarget = shoulder.clone().addScaledVector(toward, along).addScaledVector(bend, bendHeight);
    const reachableTarget = shoulder.clone().addScaledVector(toward, distance);
    const upperRest = arm.upper.quaternion.clone();
    const lowerRest = arm.forearm.quaternion.clone();
    aimBone(arm.upper, arm.forearm, elbowTarget);
    aimBone(arm.forearm, arm.hand, reachableTarget);
    const upperReach = arm.upper.quaternion.clone();
    const lowerReach = arm.forearm.quaternion.clone();
    arm.upper.quaternion.copy(upperRest).slerp(upperReach, blend);
    arm.forearm.quaternion.copy(lowerRest).slerp(lowerReach, blend);
  }

  try {
    const gltf = await new GLTFLoader().loadAsync("../game-demo/assets/casual-traveler.glb");
    const model = gltf.scene;
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const height = bounds.max.y - bounds.min.y;
    if (height > 0) model.scale.setScalar(1.05 / height);
    model.position.y = -bounds.min.y * model.scale.y;
    // The existing controller also rotates the parent in the walking
    // direction. Adding PI here made the traveller walk backwards.
    model.rotation.y = 0;
    group.add(model);
    model.traverse((object) => {
      if (!object.isMesh) return;
      object.castShadow = true;
      object.receiveShadow = true;
      object.frustumCulled = false;
    });

    arms = ["Left", "Right"].map((side) => ({
      side,
      upper: model.getObjectByName(side + "Arm"),
      forearm: model.getObjectByName(side + "ForeArm"),
      hand: model.getObjectByName(side + "Hand"),
    })).filter((arm) => arm.upper && arm.forearm && arm.hand);

    // Establish an ordinary relaxed stance instead of the imported T-pose.
    group.updateMatrixWorld(true);
    arms.forEach((arm) => {
      const target = arm.upper.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, -0.34, 0.02));
      reach(arm, target);
    });

    mixer = new THREE.AnimationMixer(model);
    const idleTracks = [];
    model.traverse((object) => {
      if (!object.isBone) return;
      idleTracks.push(new THREE.QuaternionKeyframeTrack(
        object.name + ".quaternion", [0, 1],
        [...object.quaternion.toArray(), ...object.quaternion.toArray()],
      ));
      idleTracks.push(new THREE.VectorKeyframeTrack(
        object.name + ".position", [0, 1],
        [...object.position.toArray(), ...object.position.toArray()],
      ));
    });
    idleAction = mixer.clipAction(new THREE.AnimationClip("Relaxed stance", 1, idleTracks));
    const walkClip = gltf.animations.find((clip) => clip.name === "Walk")?.clone();
    if (walkClip) {
      // Translation is driven along the actual stone path. Removing root
      // motion prevents the imported animation from drifting off the surface.
      walkClip.tracks.forEach((track) => {
        if (track.name !== "Hips.position") return;
        for (let index = 3; index < track.values.length; index += 3) {
          track.values[index] = track.values[0];
          track.values[index + 2] = track.values[2];
        }
      });
      walkAction = mixer.clipAction(walkClip);
      walkAction.timeScale = 0.82;
    }
    idleAction.play();
    animationMode = "idle";
    loaded = true;
  } catch (error) {
    console.error("Traveller model could not load", error);
    const fallback = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.18, 0.55, 5, 10),
      new THREE.MeshStandardMaterial({ color: 0xa85645 }),
    );
    fallback.position.y = 0.45;
    fallback.castShadow = true;
    group.add(fallback);
  }

  function face(target) {
    if (!target) return;
    const dx = target.x - group.position.x;
    const dz = target.z - group.position.z;
    if (Math.hypot(dx, dz) > 0.0001) group.rotation.y = Math.atan2(dx, dz);
  }

  function update(delta, { moving = false, turning = null, onFootstep = null } = {}) {
    if (!mixer) return;
    const shouldWalk = moving && !!walkAction;
    const nextName = shouldWalk ? "walk" : "idle";
    const nextAction = shouldWalk ? walkAction : idleAction;
    if (animationMode !== nextName && nextAction) {
      const previous = animationMode === "walk" ? walkAction : idleAction;
      nextAction.reset().play();
      if (previous) previous.crossFadeTo(nextAction, 0.18, false);
      animationMode = nextName;
    }
    const previousWalkTime = shouldWalk ? walkAction.time : 0;
    mixer.update(delta);

    // These contact phases are measured from the toe bones in the imported
    // walk clip. Following the action's time, instead of a separate timer,
    // keeps footsteps aligned when animation speed or frame rate changes.
    if (shouldWalk && typeof onFootstep === "function") {
      const duration = walkAction.getClip().duration;
      const current = walkAction.time;
      const crossed = (time) => current >= previousWalkTime
        ? previousWalkTime < time && current >= time
        : previousWalkTime < time || current >= time;
      if (crossed(duration * .33)) onFootstep("left");
      if (crossed(duration * .85)) onFootstep("right");
    }

    if (!turning?.wheel || !arms.length) {
      if (pressRest) {
        pressRest.arm.upper.quaternion.copy(pressRest.upper);
        pressRest.arm.forearm.quaternion.copy(pressRest.forearm);
        pressRest = null;
      }
      return;
    }
    const button = turning.wheel.userData.buttonSurface;
    if (!button) return;
    const progress = THREE.MathUtils.clamp(turning.progress ?? 0, 0, 1);
    turning.wheel.updateWorldMatrix(true, false);
    button.updateWorldMatrix(true, false);
    group.updateMatrixWorld(true);
    const arm = arms.find((item) => item.side === "Right") || arms[0];
    if (!pressRest) {
      pressRest = {
        arm,
        upper: arm.upper.quaternion.clone(),
        forearm: arm.forearm.quaternion.clone(),
        hand: arm.hand.getWorldPosition(new THREE.Vector3()),
      };
    }
    // AnimationMixer can leave a constant idle track unchanged between
    // frames. Reset the procedural bones before solving so their rotations
    // never accumulate or leave the hand inside the button after release.
    arm.upper.quaternion.copy(pressRest.upper);
    arm.forearm.quaternion.copy(pressRest.forearm);
    group.updateMatrixWorld(true);
    if (progress <= 0) return;
    const top = button.getWorldPosition(new THREE.Vector3());
    // Lift the near arm first, then reach towards the front-facing button.
    // Blend joint poses rather than aiming through intermediate positions,
    // which can otherwise make the elbow flip abruptly.
    const lift = pressRest.hand.clone().add(new THREE.Vector3(.07, .14, 0));
    // RightHand is the wrist joint, not the fingertips: keep that joint
    // behind the cap so the visible hand reaches its surface without clipping.
    const contact = top.clone().add(new THREE.Vector3(0, .02, .104));
    const shoulder = arm.upper.getWorldPosition(new THREE.Vector3());
    const side = shoulder.x >= contact.x ? 1 : -1;
    function solvePose(target) {
      arm.upper.quaternion.copy(pressRest.upper);
      arm.forearm.quaternion.copy(pressRest.forearm);
      group.updateMatrixWorld(true);
      reachWheel(arm, target, 1, side);
      return { upper: arm.upper.quaternion.clone(), forearm: arm.forearm.quaternion.clone() };
    }
    const liftPose = solvePose(lift);
    const contactPose = solvePose(contact);
    let from = pressRest;
    let to = liftPose;
    let blend = THREE.MathUtils.smoothstep(progress, 0, .15);
    if (progress >= .15 && progress < .30) {
      from = liftPose; to = contactPose;
      blend = THREE.MathUtils.smoothstep(progress, .15, .30);
    } else if (progress >= .30 && progress < .62) {
      from = contactPose; to = contactPose; blend = 0;
    } else if (progress >= .62 && progress < .82) {
      from = contactPose; to = liftPose;
      blend = THREE.MathUtils.smoothstep(progress, .62, .82);
    } else if (progress >= .82) {
      from = liftPose; to = pressRest;
      blend = THREE.MathUtils.smoothstep(progress, .82, 1);
    }
    arm.upper.quaternion.copy(from.upper).slerp(to.upper, blend);
    arm.forearm.quaternion.copy(from.forearm).slerp(to.forearm, blend);
  }

  return { group, update, face, loaded };
}

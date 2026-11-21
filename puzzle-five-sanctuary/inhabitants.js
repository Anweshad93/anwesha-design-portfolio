import {GLTFLoader} from '../game-demo/vendor/GLTFLoader.js';

// Independent, fully rigged character with its own walking and idle clips.
export async function createInhabitant(THREE, parent, source, height = 1.55, colours = {}) {
  const group = new THREE.Group();
  parent.add(group);
  group.userData.greetingHeight = height * .66;
  const gltf = await new GLTFLoader().loadAsync(source);
  const model = gltf.scene;
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model, true);
  const size = bounds.max.y - bounds.min.y;
  if (!(size > 0)) throw new Error('Inhabitant model has no height');
  const factor = height / size;
  const centre = bounds.getCenter(new THREE.Vector3());
  model.scale.multiplyScalar(factor);
  model.position.x -= centre.x * factor;
  model.position.y -= bounds.min.y * factor;
  model.position.z -= centre.z * factor;
  group.add(model);
  model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; const materials = Array.isArray(o.material) ? o.material : [o.material]; for (const material of materials) { const name = material?.name?.toLowerCase(); if (name === 'shirt' && colours.shirt) material.color.set(colours.shirt); if (name === 'pants' && colours.pants) material.color.set(colours.pants); } } });
  const mixer = new THREE.AnimationMixer(model);
  const walkClip = gltf.animations.find(c => c.name.toLowerCase() === 'walk')?.clone();
  if (!walkClip) throw new Error('Inhabitant model is missing its walking animation');
  // Some CC0 characters include a walk but no idle. Build a standing pose
  // from the rig's rest position, and gently lower both arms. A walk frame
  // can have one knee raised, so freezing one makes the person look stuck.
  let idleClip = gltf.animations.find(c => c.name.toLowerCase() === 'idle');
  if (!idleClip) {
    function aimBone(bone, child, target) {
      if (!bone || !child || !bone.parent) return;
      group.updateMatrixWorld(true);
      const origin = bone.getWorldPosition(new THREE.Vector3());
      const from = child.getWorldPosition(new THREE.Vector3()).sub(origin);
      const to = target.clone().sub(origin);
      if (from.lengthSq() < 1e-8 || to.lengthSq() < 1e-8) return;
      const delta = new THREE.Quaternion().setFromUnitVectors(from.normalize(), to.normalize());
      const parentRotation = bone.parent.getWorldQuaternion(new THREE.Quaternion());
      bone.quaternion.premultiply(parentRotation.clone().invert().multiply(delta).multiply(parentRotation));
    }
    for (const side of ['Left', 'Right']) {
      const upper = model.getObjectByName(side + 'Arm');
      const forearm = model.getObjectByName(side + 'ForeArm');
      const hand = model.getObjectByName(side + 'Hand');
      if (!upper || !forearm || !hand) continue;
      group.updateMatrixWorld(true);
      const target = upper.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, -.34, .02));
      for (let n = 0; n < 5; n++) { aimBone(forearm, hand, target); aimBone(upper, hand, target); }
    }
    const tracks = [];
    model.traverse(bone => {
      if (!bone.isBone) return;
      tracks.push(new THREE.QuaternionKeyframeTrack(bone.name + '.quaternion', [0, 1], [...bone.quaternion.toArray(), ...bone.quaternion.toArray()]));
      tracks.push(new THREE.VectorKeyframeTrack(bone.name + '.position', [0, 1], [...bone.position.toArray(), ...bone.position.toArray()]));
    });
    idleClip = new THREE.AnimationClip('Relaxed standing', 1, tracks);
  }
  // Navigation supplies world movement; remove any incidental root drift.
  const rootName = model.children[0]?.name;
  for (const track of walkClip.tracks) {
    if (track.name !== `${rootName}.position` && track.name !== 'Hips.position') continue;
    for (let n = 3; n < track.values.length; n += 3) { track.values[n] = track.values[0]; track.values[n + 2] = track.values[2]; }
  }
  const idle = mixer.clipAction(idleClip), walk = mixer.clipAction(walkClip);
  // Let a character's gait match its actual travel speed instead of running
  // the same quick cycle while barely advancing across the floor.
  walk.timeScale = colours.walkTimeScale ?? 1;
  idle.play(); let mode = 'idle';
  return {
    group, loaded: true,
    update(dt, {moving = false} = {}) {
      const next = moving ? 'walk' : 'idle';
      if (mode !== next) {
        const previous = mode === 'walk' ? walk : idle, action = next === 'walk' ? walk : idle;
        action.reset().play(); previous.crossFadeTo(action, .2, false); mode = next;
      }
      mixer.update(dt);
    }
  };
}

// A foot probe evaluates the actually skinned vertices, not the rig's ankle
// origin or an unanimated bounding box. The lowest sole touches the paving on
// every walking and idle frame, including after scaling or a change of pose.
export function createGroundProbe(THREE, group, floor = .126) {
  const probes = [];
  group.traverse(mesh => {
    if (!mesh.isSkinnedMesh || !mesh.geometry?.attributes?.position) return;
    const attribute = mesh.geometry.attributes.position;
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < attribute.count; i++) { const y = attribute.getY(i); min = Math.min(min, y); max = Math.max(max, y); }
    const limit = min + (max - min) * .22;
    const candidates = [];
    for (let i = 0; i < attribute.count; i++) if (attribute.getY(i) <= limit) candidates.push(i);
    // A bounded set keeps the correction affordable even on a phone.
    const stride = Math.max(1, Math.floor(candidates.length / 3000));
    const selected = candidates.filter((_, i) => i % stride === 0);
    probes.push({mesh, indices:selected});
  });
  const point = new THREE.Vector3();
  return function ground() {
    if (!probes.length) return;
    // SkinnedMesh refreshes its bind-matrix inverse in updateMatrixWorld(),
    // not updateWorldMatrix(). Calling the latter on its own makes vertices
    // drift whenever this parent moves.
    group.updateWorldMatrix(true, false);
    group.updateMatrixWorld(true);
    let minimum = Infinity;
    for (const {mesh, indices} of probes) for (const index of indices) {
      mesh.getVertexPosition(index, point);
      point.applyMatrix4(mesh.matrixWorld);
      minimum = Math.min(minimum, point.y);
    }
    if (Number.isFinite(minimum)) group.position.y += floor - minimum;
  };
}

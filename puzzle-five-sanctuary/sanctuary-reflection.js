import {Reflector} from '../game-demo/vendor/Reflector.js';

// The pool mirrors the actual sanctuary, rather than drawing a separate symbol
// over the water. A small transparent tint keeps the reflected architecture
// legible while giving the surface its own quiet blue-green colour.
export function createSanctuaryReflection(THREE, scene) {
  const surface = new Reflector(new THREE.CircleGeometry(4.38, 96), {
    color: 0xa8c2bc,
    textureWidth: 768,
    textureHeight: 768,
    multisample: 0,
    clipBias: .003
  });
  surface.rotation.x = -Math.PI / 2;
  surface.position.set(0, .355, -.7);
  scene.add(surface);

  // Use the actual camera and scene in a reflected render. A world clipping
  // plane removes the pool and floor below the surface while retaining the
  // full height and colours of the real sanctuary architecture.
  const mirrorPosition = new THREE.Vector3();
  const cameraPosition = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const view = new THREE.Vector3();
  const target = new THREE.Vector3();
  const lookAt = new THREE.Vector3();
  const rotation = new THREE.Matrix4();
  const clipping = new THREE.Plane(new THREE.Vector3(0, 1, 0), -.355);
  const textureMatrix = surface.material.uniforms.textureMatrix.value;
  const virtualCamera = surface.camera;
  // The raised lip of the pool straddles the reflection plane. Rendering it
  // from the virtual camera makes it reflect into its own surface as dark,
  // irregular patches along the edge. Keep it in the real scene but omit it
  // from the reflection pass, just like the reflector surface itself.
  const reflectionExcluded = new Set();
  // Render the mirror as a separate pass before the real scene. Running a
  // nested render from onBeforeRender lets Three.js restore the water clip
  // plane into the parent pass, cutting the characters off at ankle height.
  // A subsequent top-level scene render resets clipping to the real state.
  surface.onBeforeRender = () => {};
  function renderReflection(renderer, renderedScene, camera) {
    renderedScene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    mirrorPosition.setFromMatrixPosition(surface.matrixWorld);
    cameraPosition.setFromMatrixPosition(camera.matrixWorld);
    rotation.extractRotation(surface.matrixWorld);
    normal.set(0, 0, 1).applyMatrix4(rotation);
    view.subVectors(mirrorPosition, cameraPosition);
    if (view.dot(normal) > 0) return;

    view.reflect(normal).negate().add(mirrorPosition);
    rotation.extractRotation(camera.matrixWorld);
    lookAt.set(0, 0, -1).applyMatrix4(rotation).add(cameraPosition);
    target.subVectors(mirrorPosition, lookAt).reflect(normal).negate().add(mirrorPosition);
    virtualCamera.position.copy(view);
    virtualCamera.up.set(0, 1, 0).applyMatrix4(rotation).reflect(normal);
    virtualCamera.lookAt(target);
    virtualCamera.far = camera.far;
    virtualCamera.updateMatrixWorld();
    virtualCamera.projectionMatrix.copy(camera.projectionMatrix);

    textureMatrix.set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1)
      .multiply(virtualCamera.projectionMatrix)
      .multiply(virtualCamera.matrixWorldInverse)
      .multiply(surface.matrixWorld);
    virtualCamera.projectionMatrixInverse.copy(virtualCamera.projectionMatrix).invert();

    const previousTarget = renderer.getRenderTarget();
    const xrEnabled = renderer.xr.enabled;
    const shadowsUpdate = renderer.shadowMap.autoUpdate;
    const previousClipping = renderer.clippingPlanes;
    const excludedVisibility = [...reflectionExcluded].map(object => [object, object.visible]);
    surface.visible = false;
    excludedVisibility.forEach(([object]) => { object.visible = false; });
    renderer.xr.enabled = false;
    renderer.shadowMap.autoUpdate = false;
    renderer.clippingPlanes = [clipping];
    try {
      renderer.setRenderTarget(surface.getRenderTarget());
      renderer.state.buffers.depth.setMask(true);
      if (!renderer.autoClear) renderer.clear();
      renderer.render(renderedScene, virtualCamera);
    } finally {
      renderer.xr.enabled = xrEnabled;
      renderer.shadowMap.autoUpdate = shadowsUpdate;
      renderer.clippingPlanes = previousClipping;
      renderer.setRenderTarget(previousTarget);
      if (camera.viewport !== undefined) renderer.state.viewport(camera.viewport);
      surface.visible = true;
      excludedVisibility.forEach(([object, visible]) => { object.visible = visible; });
    }
  }

  const tint = new THREE.Mesh(
    new THREE.CircleGeometry(4.37, 96),
    new THREE.MeshBasicMaterial({color: '#54918d', transparent: true, opacity: .15, depthWrite: false})
  );
  tint.rotation.x = -Math.PI / 2;
  tint.position.set(0, .359, -.7);
  tint.renderOrder = 2;
  scene.add(tint);

  const ripples = [];
  for (let i = 0; i < 4; i++) {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(1, 1.012, 96),
      new THREE.MeshBasicMaterial({color: '#d5eee0', transparent: true, opacity: 0, depthWrite: false})
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(0, .365 + i * .0002, -.7);
    mesh.renderOrder = 4;
    scene.add(mesh);
    ripples.push(mesh);
  }
  // Three quiet lights lie within the actual mirrored surface. Their order is
  // revealed in the water and repeated using matching labelled controls.
  const colours = [0xf5cf80, 0x84e4d4, 0xc8a4ee];
  const names = ['Gold', 'Aqua', 'Lilac'];
  const beacons = colours.map((colour, index) => {
    const group = new THREE.Group();
    group.position.set((index - 1) * 2.15, .378, -.7);
    const halo = new THREE.Mesh(new THREE.CircleGeometry(.48, 32), new THREE.MeshBasicMaterial({color:colour, transparent:true, opacity:.08, depthWrite:false, side:THREE.DoubleSide}));
    halo.rotation.x = -Math.PI / 2; group.add(halo);
    const rim = new THREE.Mesh(new THREE.RingGeometry(.22,.255,32), new THREE.MeshBasicMaterial({color:colour, transparent:true, opacity:.5, depthWrite:false, side:THREE.DoubleSide}));
    rim.rotation.x = -Math.PI / 2; rim.position.y = .001; group.add(rim);
    const centre = new THREE.Mesh(new THREE.CircleGeometry(.13,24), new THREE.MeshBasicMaterial({color:colour, transparent:true, opacity:.65, depthWrite:false, side:THREE.DoubleSide}));
    centre.rotation.x = -Math.PI / 2; centre.position.y = .002; group.add(centre);
    group.visible = false; group.renderOrder = 5; group.traverse(o=>{o.renderOrder=5});
    scene.add(group); return {group, halo, rim, centre};
  });
  const choices = [...document.querySelectorAll('[data-memory-choice]')];
  const cue = document.getElementById('reflection-cue');
  // Each of the three visible lights appears exactly once in the memory.
  const sequence = [2, 0, 1];
  let memoryActive = false, memoryTime = 0, memoryPlaying = false, count = 0, cueIndex = -2, lastCuePlaying = null;
  const initialDelay = .7, cueLength = 1.15, cueShow = .78;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  // A correct answer releases a light from its actual place in the pool.
  // Separate flying lights let fast choices each
  // have their own visible response without moving the puzzle's clue markers.
  const flights = [];
  const orbGeometry = new THREE.SphereGeometry(.17, 20, 14);
  const haloGeometry = new THREE.SphereGeometry(.33, 18, 12);
  const sparkGeometry = new THREE.SphereGeometry(.045, 10, 8);
  function removeFlight(index) {
    const [flight] = flights.splice(index, 1);
    if (!flight) return;
    scene.remove(flight.group);
    flight.materials.forEach(material => material.dispose());
  }
  function clearFlights() { while (flights.length) removeFlight(flights.length - 1); }
  function releaseLight(index) {
    const origin = beacons[index].group.position;
    const group = new THREE.Group();
    group.position.copy(origin);
    group.renderOrder = 6;
    const coreMaterial = new THREE.MeshBasicMaterial({color: colours[index], transparent: true, opacity: .98, depthWrite: false});
    const haloMaterial = new THREE.MeshBasicMaterial({color: colours[index], transparent: true, opacity: .20, depthWrite: false, blending: THREE.AdditiveBlending});
    const sparkMaterial = new THREE.MeshBasicMaterial({color: colours[index], transparent: true, opacity: .7, depthWrite: false, blending: THREE.AdditiveBlending});
    const core = new THREE.Mesh(orbGeometry, coreMaterial);
    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    group.add(core, halo);
    const sparks = [];
    for (let i = 0; i < 3; i++) {
      const spark = new THREE.Mesh(sparkGeometry, sparkMaterial);
      group.add(spark); sparks.push(spark);
    }
    group.traverse(object => { object.renderOrder = 6; });
    scene.add(group);
    flights.push({group, origin: origin.clone(), core, halo, sparks, materials:[coreMaterial, haloMaterial, sparkMaterial], time:0});
  }
  function updateFlights(dt) {
    for (let i = flights.length - 1; i >= 0; i--) {
      const flight = flights[i];
      flight.time += dt;
      const duration = reducedMotion?.matches ? .85 : 2.35;
      const t = THREE.MathUtils.clamp(flight.time / duration, 0, 1);
      if (t >= 1) { removeFlight(i); continue; }
      // Give the player a moment to see the glow emerge, then lift it slowly
      // into the air; a few small glints trail back toward the water.
      const lift = reducedMotion?.matches ? 0 : THREE.MathUtils.smoothstep(t, .05, .9) * 1.85;
      const opacity = THREE.MathUtils.smoothstep(t, 0, .1) * (1 - THREE.MathUtils.smoothstep(t, .72, 1));
      flight.group.position.set(flight.origin.x, flight.origin.y + .12 + lift, flight.origin.z);
      flight.core.scale.setScalar(1 + .13 * Math.sin(t * Math.PI));
      flight.halo.scale.setScalar(1 + .25 * Math.sin(t * Math.PI));
      flight.materials[0].opacity = .98 * opacity;
      flight.materials[1].opacity = .20 * opacity;
      flight.materials[2].opacity = .6 * opacity;
      flight.sparks.forEach((spark, n) => {
        const angle = n * Math.PI * 2 / 3 + t * 2;
        spark.position.set(Math.cos(angle) * (.2 + .1*t), -.2 - n*.12, Math.sin(angle) * (.2 + .1*t));
        spark.visible = !reducedMotion?.matches;
      });
    }
  }
  function refreshChoices(index = -1) {
    choices.forEach((button, n) => {
      const matched = sequence.slice(0, count).includes(n);
      button.classList.toggle('is-glowing', n === index);
      button.classList.toggle('is-matched', matched);
      button.disabled = memoryPlaying || matched;
      button.setAttribute('aria-label', `${names[n]}${matched ? ', matched' : ''}`);
    });
  }
  function showCue(index) {
    if (index === cueIndex && lastCuePlaying === memoryPlaying) return;
    cueIndex = index; lastCuePlaying = memoryPlaying;
    refreshChoices(index);
    if (cue) cue.textContent = index < 0 ? (memoryPlaying ? '' : 'Your turn: repeat the lights in order.') : names[index] + ' light.';
    if (!memoryPlaying && index < 0) { const status = document.getElementById('memory-status'); if (status) status.textContent = count ? `${count} of ${sequence.length} lights matched. Choose the next light.` : 'Your turn. Match each light once in order.'; }
  }
  function replayMemory() {
    if (!memoryActive) return;
    clearFlights();
    beacons.forEach((beacon, index) => { beacon.group.visible = !sequence.slice(0, count).includes(index); });
    // Rewatching the clues does not undo matches already made.
    memoryTime = 0; memoryPlaying = true; cueIndex = -2;
    showCue(-1);
  }
  function drawMemory() {
    const slot = Math.floor((memoryTime - initialDelay) / cueLength);
    const within = (memoryTime - initialDelay) - slot * cueLength;
    const remaining = sequence.length - count;
    const active = memoryPlaying && memoryTime >= initialDelay && slot >= 0 && slot < remaining && within < cueShow ? sequence[count + slot] : -1;
    if (memoryPlaying && memoryTime >= initialDelay + remaining * cueLength) { memoryPlaying = false; showCue(-1); }
    else if (memoryPlaying) showCue(active);
    beacons.forEach((beacon, index) => {
      // Matched lights stay released, including while remaining clues replay.
      beacon.group.visible = !sequence.slice(0, count).includes(index);
      const lit = active === index || (!memoryPlaying && index === sequence[count - 1] && count > 0);
      beacon.halo.material.opacity = lit ? .42 : .09;
      beacon.rim.material.opacity = lit ? 1 : .52;
      beacon.centre.material.opacity = lit ? 1 : .65;
      beacon.halo.scale.setScalar(lit ? 1.36 : 1);
    });
  }
  let time = 0;
  let settling = false;
  let strength = 1;
  return {
    render: renderReflection,
    excludeFromReflection(object) { if (object) reflectionExcluded.add(object); },
    beginMemory() { memoryActive = true; count = 0; beacons.forEach(b=>b.group.visible=true); replayMemory(); },
    replayMemory,
    chooseMemory(index) {
      if (!memoryActive || memoryPlaying) return {result:'playing',count,total:sequence.length};
      // A mistake leaves the lights already released in place; the player
      // can retry the next light without having to match Lilac again.
      if (index !== sequence[count]) return {result:'wrong',count,total:sequence.length};
      releaseLight(index);
      // A matched light stays released even when the player retries or replays.
      beacons[index].group.visible = false;
      count++;
      refreshChoices();
      if (count === sequence.length) { memoryActive = false; beacons.forEach(b=>b.group.visible=false); return {result:'complete',count,total:sequence.length}; }
      return {result:'correct',count,total:sequence.length};
    },
    get isPlaying() { return memoryPlaying; },
    calm() { settling = true; if (reducedMotion?.matches) strength = 0; },
    update(dt) {
      if (memoryActive) { if (memoryPlaying) memoryTime += dt; drawMemory(); }
      updateFlights(dt);
      if (!reducedMotion?.matches) time += dt;
      if (settling) strength = Math.max(0, strength - dt * .45);
      ripples.forEach((ripple, index) => {
        const phase = (time * .13 + index / ripples.length) % 1;
        const radius = .5 + phase * 3.5;
        ripple.scale.setScalar(radius);
        ripple.material.opacity = Math.sin(Math.PI * phase) * .24 * strength;
      });
    },
    dispose() {
      clearFlights();
      scene.remove(surface, tint, ...ripples, ...beacons.map(b=>b.group));
      beacons.forEach(b=>b.group.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose()}}));
      surface.getRenderTarget().dispose();
      surface.geometry.dispose();
      surface.material.dispose();
      tint.geometry.dispose();
      tint.material.dispose();
      ripples.forEach(mesh => { mesh.geometry.dispose(); mesh.material.dispose(); });
      orbGeometry.dispose(); haloGeometry.dispose(); sparkGeometry.dispose();
    }
  };
}

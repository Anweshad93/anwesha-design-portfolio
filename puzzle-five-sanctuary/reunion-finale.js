// A small, player-triggered welcome brings warmth back to the sanctuary.
// The lights are set into the floor, so they never obstruct the people or path.
export function createReunionFinale({THREE, scene, reducedMotion = false}) {
  const group = new THREE.Group();
  group.name = 'The sanctuary welcomes its people home';
  group.visible = false;
  scene.add(group);

  const lights = [];
  const sparkles = [];
  const discGeometry = new THREE.CircleGeometry(.14, 20);
  const haloGeometry = new THREE.RingGeometry(.15, .30, 32);
  const sparkGeometry = new THREE.SphereGeometry(.045, 8, 6);
  for (let index = 0; index < 12; index++) {
    const angle = index * Math.PI * 2 / 12;
    const x = Math.sin(angle) * 7.6;
    const z = Math.cos(angle) * 7.6;
    const node = new THREE.Group();
    node.position.set(x, .19, z);
    const discMaterial = new THREE.MeshBasicMaterial({color: '#ffe2a2', transparent: true, opacity: 0, depthWrite: false});
    const haloMaterial = new THREE.MeshBasicMaterial({color: '#e9bd72', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide});
    const disc = new THREE.Mesh(discGeometry, discMaterial);
    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    disc.rotation.x = halo.rotation.x = -Math.PI / 2;
    halo.position.y = .006;
    node.add(disc, halo);
    group.add(node);
    lights.push({discMaterial, haloMaterial});
  }
  // Sparse, slow rising glimmers give the reunion life without filling the
  // view. They are omitted entirely when the player prefers reduced motion.
  if (!reducedMotion) {
    for (let index = 0; index < 18; index++) {
      const material = new THREE.MeshBasicMaterial({color: index % 2 ? '#ffe2a6' : '#fff2d1', transparent: true, opacity: 0, depthWrite: false});
      const sparkle = new THREE.Mesh(sparkGeometry, material);
      const angle = index * 2.399963;
      const radius = 5.2 + (index % 4) * .72;
      sparkle.position.set(Math.cos(angle) * radius, .45, Math.sin(angle) * radius);
      group.add(sparkle);
      sparkles.push({mesh: sparkle, material, offset: index * .37, baseX: sparkle.position.x, baseZ: sparkle.position.z});
    }
  }
  let active = false;
  let elapsed = 0;
  return {
    start() { active = true; elapsed = 0; group.visible = true; },
    update(dt) {
      if (!active) return;
      elapsed += Math.max(0, Math.min(dt, .1));
      lights.forEach(({discMaterial, haloMaterial}, index) => {
        const amount = reducedMotion ? 1 : THREE.MathUtils.smoothstep(elapsed - index * .13, 0, .8);
        discMaterial.opacity = .86 * amount;
        haloMaterial.opacity = .30 * amount;
      });
      sparkles.forEach(({mesh, material, offset, baseX, baseZ}) => {
        const phase = (elapsed * .15 + offset) % 1;
        mesh.position.set(baseX + Math.sin(elapsed * .4 + offset) * .09, .45 + phase * 1.7, baseZ);
        material.opacity = Math.sin(phase * Math.PI) * .55 * Math.min(1, elapsed / 2);
      });
    },
    dispose() {
      scene.remove(group);
      discGeometry.dispose(); haloGeometry.dispose(); sparkGeometry.dispose();
      lights.forEach(({discMaterial, haloMaterial}) => { discMaterial.dispose(); haloMaterial.dispose(); });
      sparkles.forEach(({material}) => material.dispose());
    }
  };
}

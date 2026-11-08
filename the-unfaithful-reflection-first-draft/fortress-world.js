// A small original Three.js courtyard. Coordinates below are shared with the
// movement controller: all walkable positions use y = 1.3.
export function createFortressWorld(THREE) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xefd0cd);
  scene.fog = new THREE.Fog(0xefd0cd, 25, 55);

  const camera = new THREE.OrthographicCamera(-9, 9, 7, -7, 0.1, 100);
  camera.position.set(13, 17, 20);
  camera.lookAt(0, 1.2, 0.5);

  scene.add(new THREE.HemisphereLight(0xffeddb, 0xb18391, 2.3));
  const sunlight = new THREE.DirectionalLight(0xffdcaf, 3.0);
  sunlight.position.set(-8, 16, 11);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(2048, 2048);
  sunlight.shadow.camera.left = -14;
  sunlight.shadow.camera.right = 14;
  sunlight.shadow.camera.top = 14;
  sunlight.shadow.camera.bottom = -14;
  sunlight.shadow.bias = -0.0002;
  scene.add(sunlight);
  const fill = new THREE.DirectionalLight(0xcce9e7, 0.8);
  fill.position.set(7, 5, -8);
  scene.add(fill);

  const mats = {
    stone: new THREE.MeshStandardMaterial({ color: 0xe8b992, roughness: 0.92 }),
    light: new THREE.MeshStandardMaterial({ color: 0xf6d5ad, roughness: 0.9 }),
    edge: new THREE.MeshStandardMaterial({ color: 0xf9dfbc, roughness: 0.9 }),
    dark: new THREE.MeshStandardMaterial({ color: 0xc78e78, roughness: 0.96 }),
    grout: new THREE.MeshStandardMaterial({ color: 0xd1a083, roughness: 1 }),
    teal: new THREE.MeshStandardMaterial({ color: 0x477f7c, roughness: 0.74 }),
    dome: new THREE.MeshStandardMaterial({ color: 0x397d7b, roughness: 0.68, metalness: 0.05 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xba8741, roughness: 0.4, metalness: 0.65 }),
    goldLight: new THREE.MeshStandardMaterial({ color: 0xeec77f, roughness: 0.35, metalness: 0.55 }),
    water: new THREE.MeshStandardMaterial({ color: 0x60b9b1, roughness: 0.23, metalness: 0.1, transparent: true, opacity: 0.86 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x749469, roughness: 1 }),
    flower: new THREE.MeshStandardMaterial({ color: 0xc96579, roughness: 1 }),
    door: new THREE.MeshStandardMaterial({ color: 0x79504a, roughness: 0.92 }),
    glow: new THREE.MeshBasicMaterial({ color: 0xffe4a2 }),
    reflection: new THREE.MeshBasicMaterial({ color: 0xe4f6d9, transparent: true, opacity: 0.57, depthWrite: false, side: THREE.DoubleSide }),
  };
  const clickable = { wheel: [], dais: [], landings: [], door: [], ground: [], falseDoor: [], memoryTile: [], pathGate: [] };

  function box(parent, w, h, d, mat, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function column(parent, x, z, height = 2.8, radius = 0.16) {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.8, radius, height, 10), mats.light);
    shaft.position.set(x, height / 2, z);
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    parent.add(shaft);
    box(parent, radius * 2.5, 0.17, radius * 2.5, mats.edge, x, 0.085, z);
    box(parent, radius * 2.3, 0.16, radius * 2.3, mats.edge, x, height - 0.08, z);
  }
  function platform(parent, w, d, x, z, top = 1.3, thickness = 0.6, { trim = true, openSide = null } = {}) {
    const group = new THREE.Group();
    group.position.set(x, top - thickness / 2, z);
    parent.add(group);
    const base = box(group, w, thickness, d, mats.stone, 0, 0, 0);
    const topMesh = box(group, w - 0.07, 0.055, d - 0.07, mats.light, 0, thickness / 2 + 0.01, 0);
    const line = 0.035;
    const inset = 0.14;
    if (trim && w > 0.55 && d > 0.55) {
      const lineY = thickness / 2 + 0.045;
      const opens = (side) => Array.isArray(openSide) ? openSide.includes(side) : openSide === side;
      // Leave the border open where the connecting bridge enters a landing.
      // Drawing a complete rectangle there creates a line across the path.
      function edge(axis, length, fixed, isOpen) {
        const gap = Math.min(1.12, length - 0.08);
        const part = isOpen ? (length - gap) / 2 : length;
        const offsets = isOpen ? [-(gap + part) / 2, (gap + part) / 2] : [0];
        offsets.forEach((offset) => {
          if (axis === "x") box(group, part, 0.009, line, mats.teal, offset, lineY, fixed);
          else box(group, line, 0.009, part, mats.teal, fixed, lineY, offset);
        });
      }
      edge("x", w - inset * 2, d / 2 - inset, opens("south"));
      edge("x", w - inset * 2, -d / 2 + inset, opens("north"));
      edge("z", d - inset * 2, w / 2 - inset, opens("east"));
      edge("z", d - inset * 2, -w / 2 + inset, opens("west"));
    }
    clickable.ground.push(topMesh);
    return { group, base, top: topMesh };
  }
  function pointedArch(width, height, depth, material) {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, 0);
    shape.lineTo(width / 2, 0);
    shape.lineTo(width / 2, height * 0.56);
    shape.quadraticCurveTo(width * 0.28, height * 0.86, 0, height);
    shape.quadraticCurveTo(-width * 0.28, height * 0.86, -width / 2, height * 0.56);
    shape.closePath();
    const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }), material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
  function archWall(width, height, depth, count) {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, 0);
    shape.lineTo(width / 2, 0);
    shape.lineTo(width / 2, height);
    shape.lineTo(-width / 2, height);
    shape.closePath();
    const bay = width / count;
    for (let i = 0; i < count; i += 1) {
      const cx = -width / 2 + bay * (i + 0.5);
      const r = Math.min(bay * 0.31, height * 0.23);
      const hole = new THREE.Path();
      hole.moveTo(cx - r, -0.01);
      hole.lineTo(cx - r, height * 0.42);
      hole.quadraticCurveTo(cx - r, height * 0.63, cx, height * 0.74);
      hole.quadraticCurveTo(cx + r, height * 0.63, cx + r, height * 0.42);
      hole.lineTo(cx + r, -0.01);
      hole.closePath();
      shape.holes.push(hole);
    }
    const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    geometry.translate(0, 0, -depth / 2);
    const mesh = new THREE.Mesh(geometry, mats.stone);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
  function vine(parent, x, y, z, side = 1) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    parent.add(group);
    for (let i = 0; i < 15; i += 1) {
      const t = i / 14;
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12 + i % 3 * 0.025, 1), mats.leaf);
      leaf.position.set(Math.sin(t * 9) * 0.17 * side, -t * 1.8, Math.cos(t * 7) * 0.08);
      leaf.scale.set(1.2, 0.75, 0.8);
      group.add(leaf);
      if (i % 3 === 0) {
        const bloom = new THREE.Mesh(new THREE.IcosahedronGeometry(0.115, 1), mats.flower);
        bloom.position.copy(leaf.position).add(new THREE.Vector3(0.12 * side, 0.02, 0.05));
        group.add(bloom);
      }
    }
  }

  // Floating island and pool. Top of all pathways is y=1.3.
  const islandBase = box(scene, 10.3, 0.8, 9.8, mats.dark, 0, -0.85, 0.7);
  const poolFloor = box(scene, 10.15, 0.32, 9.65, mats.stone, 0, -0.29, 0.7);
  // The water is translucent: shadows received by the pool floor show through
  // it even when the water itself does not receive shadows. Keep both layers
  // shadow-free so a wrong bridge position cannot resemble a complete path.
  islandBase.receiveShadow = false;
  poolFloor.receiveShadow = false;
  const water = new THREE.Mesh(new THREE.PlaneGeometry(8.55, 6.8, 1, 1), mats.water);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -0.08, -0.1);
  // Keep the water free of ordinary cast shadows: those dark bridge-shaped
  // silhouettes can be mistaken for the luminous, puzzle-solving reflection.
  // The surrounding stonework still receives and casts its normal shadows.
  water.receiveShadow = false;
  scene.add(water);
  for (const x of [-4.65, 4.65]) box(scene, 0.24, 0.45, 7.6, mats.edge, x, 0.16, -0.1);
  box(scene, 9.5, 0.45, 0.24, mats.edge, 0, 0.16, -3.9);

  const front = platform(scene, 9.9, 2.65, 0, 4.3, 1.3, 0.6, { openSide: "north" });
  // The fixed approach meets the hub and front platform instead of overlapping
  // both of their top surfaces. Its paired lines stop neatly at each junction.
  const approach = platform(scene, 1.18, 1.355, 0, 2.3625, 1.3, 0.6, { trim: false });
  platform(scene, 1.55, 1.3, 0, 1.1, 1.3, 0.6, { trim: false });
  for (const x of [-0.34, 0.34]) box(scene, 0.025, 0.012, 1.25, mats.teal, x, 1.35, 2.36);
  const north = platform(scene, 2.3, 1.35, 0, -2.85, 1.3, 0.6, { openSide: "south" });
  const west = platform(scene, 1.35, 2.2, -3.9, 1.1, 1.3, 0.6, { openSide: "east" });
  // The final landing keeps its west edge at the bridge endpoint, while its
  // centre now follows the gallery to the door. Both adjoining borders open
  // onto the path, and the gallery meets each platform instead of overlapping.
  const east = platform(scene, 1.85, 2.2, 4.15, 1.1, 1.3, 0.6, { openSide: ["west", "north"] });
  platform(scene, 1.35, 1.3, 4.15, -0.65, 1.3, 0.6, { trim: false });
  for (const x of [3.81, 4.49]) box(scene, 0.025, 0.012, 1.2, mats.teal, x, 1.35, -0.65);
  const doorTerrace = platform(scene, 2.15, 1.9, 4.15, -2.25, 1.3, 0.6, { openSide: "south" });
  clickable.landings.push(north.top, west.top, east.top);

  // The same small eight-point tile is repeated on a landing, its continuous
  // walkway and the threshold. It is an architectural clue, not an arrow: the
  // player still has to inspect which bridge orientation reaches that landing.
  function starInlay(x, z, radius = 0.22) {
    const group = new THREE.Group();
    group.position.set(x, 1.353, z);
    scene.add(group);
    const disk = new THREE.Mesh(new THREE.CircleGeometry(radius * 1.25, 32), mats.teal);
    disk.rotation.x = -Math.PI / 2;
    group.add(disk);
    for (let n = 0; n < 2; n += 1) {
      const diamond = new THREE.Mesh(new THREE.PlaneGeometry(radius * 1.35, radius * 1.35), mats.goldLight);
      diamond.rotation.x = -Math.PI / 2;
      diamond.rotation.z = n * Math.PI / 4;
      diamond.position.y = 0.004 + n * 0.002;
      group.add(diamond);
    }
    const centre = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.3, 16), mats.teal);
    centre.rotation.x = -Math.PI / 2;
    centre.position.y = 0.009;
    group.add(centre);
  }
  starInlay(3.9, 1.0);
  starInlay(4.15, -0.45, 0.17);
  starInlay(4.15, -2.05, 0.2);

  // The north landing appears to lead through an open, inviting arch. Its
  // shutter descends only when the puzzle controller discovers the false door.
  const falseArch = new THREE.Group();
  falseArch.position.set(0, 1.3, -3.43);
  scene.add(falseArch);
  const archShape = new THREE.Shape();
  archShape.moveTo(-0.82, 0);
  archShape.lineTo(0.82, 0);
  archShape.lineTo(0.82, 1.22);
  archShape.quadraticCurveTo(0.48, 1.78, 0, 1.98);
  archShape.quadraticCurveTo(-0.48, 1.78, -0.82, 1.22);
  archShape.closePath();
  const opening = new THREE.Path();
  opening.moveTo(-0.58, -0.02);
  opening.lineTo(0.58, -0.02);
  opening.lineTo(0.58, 1.15);
  opening.quadraticCurveTo(0.33, 1.52, 0, 1.68);
  opening.quadraticCurveTo(-0.33, 1.52, -0.58, 1.15);
  opening.closePath();
  archShape.holes.push(opening);
  const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(archShape, { depth: 0.2, bevelEnabled: false }), mats.edge);
  frame.castShadow = true;
  frame.receiveShadow = true;
  falseArch.add(frame);
  clickable.falseDoor.push(frame);
  const doorwayRecess = pointedArch(1.12, 1.65, 0.035, mats.door);
  doorwayRecess.position.set(0, 0.02, 0.205);
  falseArch.add(doorwayRecess);
  // Nested lit arches and a converging floor depict a passage receding beyond
  // the threshold. These sit behind the shutter when it is lowered.
  const interiorMaterial = new THREE.MeshBasicMaterial({ color: 0x52434b });
  const distantGlow = pointedArch(0.86, 1.42, 0.035, interiorMaterial);
  distantGlow.position.set(0, 0.02, 0.25);
  falseArch.add(distantGlow);
  const innerFrame = pointedArch(0.62, 1.08, 0.008, new THREE.MeshBasicMaterial({ color: 0xd7a479 }));
  innerFrame.position.set(0, 0.19, 0.29);
  falseArch.add(innerFrame);
  const innerPassage = pointedArch(0.46, 0.91, 0.008, new THREE.MeshBasicMaterial({ color: 0x6d5150 }));
  innerPassage.position.set(0, 0.23, 0.305);
  falseArch.add(innerPassage);
  const farArch = pointedArch(0.25, 0.57, 0.008, new THREE.MeshBasicMaterial({ color: 0xf0c88e }));
  farArch.position.set(0, 0.29, 0.32);
  falseArch.add(farArch);
  const passageFloor = new THREE.Shape();
  passageFloor.moveTo(-0.41, 0.03);
  passageFloor.lineTo(0.41, 0.03);
  passageFloor.lineTo(0.11, 0.31);
  passageFloor.lineTo(-0.11, 0.31);
  passageFloor.closePath();
  const floorView = new THREE.Mesh(new THREE.ShapeGeometry(passageFloor), new THREE.MeshBasicMaterial({ color: 0xe5b383, side: THREE.DoubleSide }));
  floorView.position.z = 0.33;
  falseArch.add(floorView);

  // A translucent, floating memory guide, facing the camera. The tapered robe,
  // halo and slowly drifting sparks keep the figure legible at game scale.
  const guideGroup = new THREE.Group();
  guideGroup.visible = false;
  scene.add(guideGroup);
  const guideMaterials = [];
  function guideMaterial(color, opacity = 1) {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    guideMaterials.push({ material, opacity });
    return material;
  }
  // Warm, contrasting colours make the guide legible above turquoise water
  // and light stone without losing the softly translucent ghost treatment.
  const haloMat = guideMaterial(0xffce81, 0.25);
  const outlineMat = guideMaterial(0x76505b, 0.75);
  const robeMat = guideMaterial(0xc8745d, 0.88);
  const robeLightMat = guideMaterial(0xffe5b8, 0.93);
  const skinMat = guideMaterial(0xeec9a7, 0.94);
  const hoodMat = guideMaterial(0x744d59, 0.94);
  const goldMat = guideMaterial(0xffd676, 0.98);
  const wispMat = guideMaterial(0xffd6a0, 0.57);
  function guideShape(points, mat, z) {
    const shape = new THREE.Shape();
    shape.moveTo(points[0][0], points[0][1]);
    for (const [x, y] of points.slice(1)) shape.lineTo(x, y);
    shape.closePath();
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat);
    mesh.position.z = z;
    guideGroup.add(mesh);
    return mesh;
  }
  const guideHalo = new THREE.Mesh(new THREE.CircleGeometry(0.53, 40), haloMat);
  guideHalo.position.set(0, 0.85, -0.035);
  guideHalo.scale.y = 1.45;
  guideGroup.add(guideHalo);
  guideShape([[-0.33, 0.14], [-0.23, 0.78], [-0.31, 1.04], [0, 1.24], [0.31, 1.04], [0.23, 0.78], [0.35, 0.14], [0.12, 0.05], [0.03, -0.11], [-0.1, 0.04]], outlineMat, -0.015);
  guideShape([[-0.27, 0.18], [-0.18, 0.77], [-0.26, 1.02], [0, 1.18], [0.26, 1.02], [0.18, 0.77], [0.29, 0.18], [0.1, 0.1], [0.03, -0.05], [-0.08, 0.08]], robeMat, 0);
  guideShape([[-0.20, 0.18], [-0.10, 0.77], [0, 0.89], [0.1, 0.77], [0.2, 0.18], [0.06, 0.13], [0, 0.01], [-0.07, 0.12]], robeLightMat, 0.01);
  guideShape([[-0.11, 0.16], [0.06, 0.17], [0.02, -0.10], [-0.07, -0.19], [-0.03, -0.04]], wispMat, -0.005);
  guideShape([[-0.23, 0.96], [-0.30, 0.63], [-0.18, 0.58], [-0.08, 0.85]], robeMat, 0.02);
  guideShape([[0.23, 0.96], [0.33, 0.70], [0.23, 0.64], [0.08, 0.85]], robeMat, 0.02);
  const hood = new THREE.Mesh(new THREE.CircleGeometry(0.22, 32), hoodMat);
  hood.position.set(0, 1.12, 0.025);
  hood.scale.set(0.86, 1.2, 1);
  guideGroup.add(hood);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.115, 24), skinMat);
  face.position.set(0, 1.13, 0.035);
  face.scale.y = 1.22;
  guideGroup.add(face);
  guideShape([[-0.14, 0.76], [0.14, 0.76], [0.14, 0.72], [-0.14, 0.72]], goldMat, 0.04);
  guideShape([[-0.025, 0.71], [0.025, 0.71], [0.035, 0.18], [0, 0.14], [-0.035, 0.18]], goldMat, 0.04);
  const guideSparkles = [];
  for (let i = 0; i < 8; i += 1) {
    const star = new THREE.Shape();
    const size = i % 3 === 0 ? 0.075 : 0.045;
    star.moveTo(0, size * 1.6);
    star.lineTo(size * 0.25, size * 0.25);
    star.lineTo(size, 0);
    star.lineTo(size * 0.25, -size * 0.25);
    star.lineTo(0, -size * 1.6);
    star.lineTo(-size * 0.25, -size * 0.25);
    star.lineTo(-size, 0);
    star.lineTo(-size * 0.25, size * 0.25);
    star.closePath();
    const material = new THREE.MeshBasicMaterial({ color: 0xffd16f, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(star), material);
    mesh.position.z = 0.08;
    guideGroup.add(mesh);
    guideSparkles.push({ mesh, material });
  }
  let guideAge = 0;
  let guideDuration = 0;
  let guideBaseY = 0;
  const guide = {
    show(position, durationSeconds = 12) {
      guideGroup.position.copy(position);
      guideBaseY = position.y;
      guideAge = 0;
      guideDuration = Math.max(2, durationSeconds);
      for (const item of guideMaterials) item.material.opacity = 0;
      for (const item of guideSparkles) item.material.opacity = 0;
      guideGroup.visible = true;
    },
    hide() {
      guideDuration = 0;
      guideGroup.visible = false;
    },
    // Anchor the speech bubble to the top of the figure in world space.
    getPosition() {
      return guideGroup.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.18, 0));
    },
    isVisible() { return guideGroup.visible; },
  };
  const shutter = new THREE.Group();
  shutter.position.set(0, 1.72, 0.31);
  falseArch.add(shutter);
  box(shutter, 1.12, 1.64, 0.13, mats.door, 0, -0.82, 0);
  for (const x of [-0.34, 0, 0.34]) box(shutter, 0.035, 1.48, 0.03, mats.gold, x, -0.79, 0.08);
  box(shutter, 1.04, 0.055, 0.04, mats.goldLight, 0, -0.45, 0.09);
  box(shutter, 1.04, 0.055, 0.04, mats.goldLight, 0, -1.13, 0.09);
  shutter.scale.y = 0.001;
  let shutterTarget = 0.001;
  let memoryReflection;
  const memoryWaterPosition = new THREE.Vector3(-2.65, 0.015, 0.2);
  const memoryTilePosition = new THREE.Vector3(-4.0, 1.405, 1.1);
  let memoryStarState = "water";
  let memoryStarElapsed = 0;
  const falseDoor = {
    group: falseArch,
    shutter,
    setClosed(value) {
      shutterTarget = value ? 1 : 0.001;
      if (value) guide.show(new THREE.Vector3(-0.83, 1.38, -2.76), 12);
      else guide.hide();
      if (memoryReflection) {
        memoryReflection.visible = Boolean(value);
        if (!value) {
          memoryReflection.position.copy(memoryWaterPosition);
          memoryReflection.scale.setScalar(1);
          memoryReflection.children.forEach((part) => { part.material.depthTest = false; });
          memoryStarState = "water";
          memoryStarElapsed = 0;
        }
      }
    },
  };

  // The tile is set back from the landing so the player chooses to step onto it.
  const memoryTileGroup = new THREE.Group();
  memoryTileGroup.position.set(-4.0, 1.356, 1.1);
  scene.add(memoryTileGroup);
  const memoryTileBase = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.018, 32), mats.gold);
  memoryTileGroup.add(memoryTileBase);
  clickable.memoryTile.push(memoryTileBase);
  const memoryTileTop = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.023, 32), mats.teal.clone());
  memoryTileTop.position.y = 0.012;
  memoryTileGroup.add(memoryTileTop);
  clickable.memoryTile.push(memoryTileTop);
  for (let n = 0; n < 2; n += 1) {
    const diamond = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.38), mats.goldLight);
    diamond.rotation.x = -Math.PI / 2;
    diamond.rotation.z = n * Math.PI / 4;
    diamond.position.y = 0.026 + n * 0.002;
    memoryTileGroup.add(diamond);
  }
  memoryReflection = new THREE.Group();
  // Keep the reflected star in the water immediately beside the matching
  // western landing, just outside the raised platform's edge.
  memoryReflection.position.copy(memoryWaterPosition);
  memoryReflection.visible = false;
  scene.add(memoryReflection);
  const reflectionHalo = new THREE.Mesh(new THREE.CircleGeometry(0.56, 40), new THREE.MeshBasicMaterial({ color: 0xffd98e, transparent: true, opacity: 0.35, depthTest: false, depthWrite: false, side: THREE.DoubleSide }));
  reflectionHalo.rotation.x = -Math.PI / 2;
  reflectionHalo.renderOrder = 11;
  memoryReflection.add(reflectionHalo);
  const reflectionRing = new THREE.Mesh(new THREE.RingGeometry(0.39, 0.425, 40), new THREE.MeshBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.9, depthTest: false, depthWrite: false, side: THREE.DoubleSide }));
  reflectionRing.rotation.x = -Math.PI / 2;
  reflectionRing.position.y = 0.004;
  reflectionRing.renderOrder = 12;
  memoryReflection.add(reflectionRing);
  for (let n = 0; n < 2; n += 1) {
    const reflectedDiamond = new THREE.Mesh(new THREE.PlaneGeometry(0.50, 0.50), new THREE.MeshBasicMaterial({ color: 0xffefbb, transparent: true, opacity: 0.95, depthTest: false, depthWrite: false, side: THREE.DoubleSide }));
    reflectedDiamond.rotation.x = -Math.PI / 2;
    reflectedDiamond.rotation.z = n * Math.PI / 4;
    reflectedDiamond.position.y = 0.005 + n * 0.002;
    reflectedDiamond.renderOrder = 13;
    memoryReflection.add(reflectedDiamond);
  }
  let memoryTileActive = false;
  const memoryTile = {
    group: memoryTileGroup,
    // Called only once the correct bridge has been aligned: the reflected
    // mark leaves the water and settles onto its matching tile.
    revealStar() {
      if (!memoryReflection.visible || memoryStarState !== "water") return;
      memoryStarState = "travelling";
      memoryStarElapsed = 0;
    },
    setActive(value) {
      memoryTileActive = Boolean(value);
      memoryTileTop.material.color.set(memoryTileActive ? 0x81c8af : 0x477f7c);
      memoryTileTop.material.emissive.set(memoryTileActive ? 0x397d69 : 0x000000);
      memoryTileTop.material.emissiveIntensity = memoryTileActive ? 0.65 : 0;
    },
  };

  // The eastern gallery is blocked until the marked tile moves this gate.
  // It sits beyond the bridge landing, before the path toward the doorway.
  const pathGateGroup = new THREE.Group();
  pathGateGroup.position.set(4.15, 1.3, 0.05);
  scene.add(pathGateGroup);
  for (const x of [-0.49, -0.25, 0, 0.25, 0.49]) {
    const bar = box(pathGateGroup, 0.075, 1.2, 0.09, mats.gold, x, 0.6, 0);
    clickable.pathGate.push(bar);
    const tip = new THREE.Mesh(new THREE.OctahedronGeometry(0.08), mats.goldLight);
    tip.position.set(x, 1.24, 0);
    pathGateGroup.add(tip);
  }
  box(pathGateGroup, 1.12, 0.12, 0.15, mats.goldLight, 0, 0.18, 0);
  box(pathGateGroup, 1.12, 0.12, 0.15, mats.goldLight, 0, 0.95, 0);
  let gateTargetY = 1.3;
  const pathGate = {
    group: pathGateGroup,
    setOpen(value) { gateTargetY = value ? -0.05 : 1.3; },
  };

  // Visible carved underside, plus posts to tie the miniature together.
  const facade = archWall(9.85, 1.65, 0.45, 5);
  facade.position.set(0, -2.1, 5.45);
  scene.add(facade);
  box(scene, 10.05, 0.14, 0.65, mats.edge, 0, -0.38, 5.45);
  for (const x of [-4.8, -2.5, 0, 2.5, 4.8]) {
    box(scene, 0.4, 1.05, 0.55, mats.stone, x, 0.4, 5.45);
    box(scene, 0.5, 0.14, 0.65, mats.edge, x, 0.98, 5.45);
  }

  // A single moving bridge pivots at the approach. Its middle is absent in
  // reality but supplied by the reflected world, exactly as the proposal.
  const bridgeGroup = new THREE.Group();
  bridgeGroup.position.set(0, 1.3, 1.1);
  scene.add(bridgeGroup);
  function spanPiece(length, z) {
    const group = new THREE.Group();
    group.position.z = z;
    bridgeGroup.add(group);
    box(group, 0.96, 0.26, length, mats.stone, 0, -0.105, 0);
    box(group, 0.88, 0.055, length - 0.03, mats.light, 0, 0.04, 0);
    for (const x of [-0.34, 0.34]) box(group, 0.025, 0.012, length - 0.02, mats.teal, x, 0.078, 0);
    return group;
  }
  spanPiece(1.13, -0.565);
  const missing = spanPiece(1.16, -1.69);
  spanPiece(1.13, -2.815);
  missing.visible = false;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.5, 0.22, 24), mats.gold);
  hub.position.set(0, -0.19, 0);
  bridgeGroup.add(hub);

  // The reflection appears only when the story's current clue is aligned.
  // It shares the actual pivot and orientation on the water surface, making
  // a complete visible reflection rather than hiding it under the real span
  // in the camera's projection.
  const reflection = new THREE.Group();
  reflection.position.set(0, -0.055, 1.1);
  scene.add(reflection);
  const clueMats = {
    fill: new THREE.MeshBasicMaterial({ color: 0x648f80, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
    edge: new THREE.MeshBasicMaterial({ color: 0x356c65, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
    center: new THREE.MeshBasicMaterial({ color: 0x8a8053, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
  };
  // A single continuous footprint keeps all three orientations on the same
  // centre line. The earlier three overlapping planes created visible seams
  // and their different heights made the edges slip in the isometric view.
  // All layers share one plane; transparent objects use render order instead
  // of height offsets, so the trim remains in register with the surface.
  function reflectedPlane(width, material, x, order) {
    const length = 3.38;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, length), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0, -length / 2);
    mesh.renderOrder = order;
    reflection.add(mesh);
  }
  reflectedPlane(0.88, clueMats.fill, 0, 10);
  reflectedPlane(0.045, clueMats.edge, -0.34, 11);
  reflectedPlane(0.045, clueMats.edge, 0.34, 11);
  reflectedPlane(0.055, clueMats.center, 0, 12);
  let currentOrientation = 0;
  let clueTarget = 0;
  let inReflection = false;
  let clueEnabled = true;
  let bridgeTurning = false;
  let clueVisibility = 0;
  const targetWaterColor = new THREE.Color(0x60b9b1);
  const bridge = {
    group: bridgeGroup,
    missing,
    reflected: reflection,
    orientations: [0, Math.PI / 2, -Math.PI / 2],
    setOrientation(index) {
      currentOrientation = ((index % 3) + 3) % 3;
      const angle = this.orientations[currentOrientation];
      bridgeGroup.rotation.y = angle;
      reflection.rotation.y = angle;
    },
    setClueTarget(index) {
      clueTarget = ((index % 3) + 3) % 3;
      // Do not retract the bridge under a traveller who is returning from a
      // newly completed landing. The new target applies on the next entry.
    },
    setClueEnabled(value) { clueEnabled = Boolean(value); },
    setTurning(value) { bridgeTurning = Boolean(value); },
    isAligned() { return clueEnabled && !bridgeTurning && currentOrientation === clueTarget; },
    setReflected(value) {
      inReflection = Boolean(value);
      missing.visible = inReflection && this.isAligned();
      targetWaterColor.set(inReflection ? 0x3d8f90 : 0x60b9b1);
    },
  };

  // Brass wheel mounted on a stone plinth at the left of the starting path.
  const wheel = new THREE.Group();
  wheel.position.set(-2.1, 1.3, 4.15);
  scene.add(wheel);
  box(wheel, 0.65, 0.62, 0.62, mats.stone, 0, 0.31, 0);
  box(wheel, 0.74, 0.12, 0.72, mats.edge, 0, 0.67, 0);
  const wheelSpin = new THREE.Group();
  wheelSpin.position.set(0, 1.36, 0);
  wheel.add(wheelSpin);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.07, 12, 40), mats.gold);
  wheelSpin.add(rim);
  clickable.wheel.push(rim);
  for (let i = 0; i < 8; i += 1) {
    const angle = i * Math.PI / 4;
    const spoke = box(wheelSpin, 0.065, 0.92, 0.075, mats.goldLight, 0, 0, 0);
    spoke.rotation.z = angle;
    clickable.wheel.push(spoke);
  }
  const center = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.18, 16), mats.goldLight);
  center.rotation.x = Math.PI / 2;
  wheelSpin.add(center);
  clickable.wheel.push(center);
  wheel.userData.spin = wheelSpin;

  // A raised push button sits on the front face of the plinth, below the
  // traveller's shoulder, with its cap projecting toward the traveller.
  const buttonBezel = new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.205, 0.05, 32), mats.gold);
  buttonBezel.position.set(0.14, 0.70, 0.365);
  buttonBezel.rotation.x = Math.PI / 2;
  wheel.add(buttonBezel);
  const buttonGroup = new THREE.Group();
  buttonGroup.position.set(0.14, 0.70, 0.365);
  buttonGroup.rotation.x = Math.PI / 2;
  wheel.add(buttonGroup);
  const buttonMaterial = new THREE.MeshStandardMaterial({ color: 0xb32637, emissive: 0xe42a31, emissiveIntensity: 0.12, roughness: 0.32, metalness: 0.12 });
  const buttonRestColor = new THREE.Color(0xb32637);
  const buttonLitColor = new THREE.Color(0xff806c);
  const redButton = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.135, 0.13, 32), buttonMaterial);
  redButton.position.y = 0.065;
  buttonGroup.add(redButton);
  const buttonSurface = new THREE.Object3D();
  buttonSurface.position.y = 0.13;
  buttonGroup.add(buttonSurface);
  // The glow is carried by the opaque cap itself, so normal depth testing
  // keeps the traveller in front of the light as he presses it.
  clickable.wheel.push(buttonBezel, redButton);
  let buttonPressTime = 0;
  wheel.userData.buttonSurface = buttonSurface;
  wheel.userData.pressButton = () => { buttonPressTime = 0.9; };
  const wheelHintMaterial = new THREE.MeshBasicMaterial({ color: 0xffda8d, transparent: true, opacity: 0.30, depthWrite: false, side: THREE.DoubleSide });
  const wheelHint = new THREE.Mesh(new THREE.RingGeometry(0.64, 0.665, 48), wheelHintMaterial);
  wheelHint.position.set(0, 1.36, 0.10);
  wheel.add(wheelHint);

  // Switching platform is distinct from the wheel and occupies a walkable tile.
  const switchPad = new THREE.Group();
  switchPad.position.set(1.8, 1.345, 4.2);
  scene.add(switchPad);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.075, 32), mats.gold);
  pad.receiveShadow = true;
  switchPad.add(pad);
  clickable.dais.push(pad);
  const padTop = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.08, 32), mats.teal);
  padTop.position.y = 0.015;
  switchPad.add(padTop);
  clickable.dais.push(padTop);
  // Give the platform its own emissive material: other gold objects must not
  // brighten when the switching platform is active.
  const padRingMaterial = mats.goldLight.clone();
  padRingMaterial.emissive = new THREE.Color(0xffbd57);
  padRingMaterial.emissiveIntensity = 0;
  const padRing = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.025, 10, 48), padRingMaterial);
  padRing.rotation.x = Math.PI / 2;
  padRing.position.y = 0.06;
  switchPad.add(padRing);
  switchPad.userData.ring = padRing;

  // A close-fitting pool of light lives on the stone platform itself; it is
  // never attached to the traveller.  The physical point light softly lights
  // nearby feet and stone so the cue reads as emitted light, not a UI circle.
  const guidingMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd67e,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const guidingDisc = new THREE.Mesh(new THREE.CircleGeometry(0.46, 40), guidingMaterial);
  guidingDisc.rotation.x = -Math.PI / 2;
  guidingDisc.position.y = 0.062;
  guidingDisc.renderOrder = 3;
  switchPad.add(guidingDisc);
  const haloMaterial = new THREE.MeshBasicMaterial({
    color: 0xffe4a5,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.48, 0.64, 48), haloMaterial);
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.063;
  halo.renderOrder = 4;
  switchPad.add(halo);
  const padLight = new THREE.PointLight(0xffc96d, 0, 3.2, 2);
  padLight.position.set(0, 0.55, 0);
  switchPad.add(padLight);
  let padGuiding = true;
  let padGlow = 0;
  switchPad.setGuiding = (enabled) => { padGuiding = Boolean(enabled); };

  // Door and tower at the end of the right-side landing, not directly on water.
  const tower = new THREE.Group();
  tower.position.set(4.15, 1.3, -3.05);
  scene.add(tower);
  box(tower, 2.5, 3.7, 0.5, mats.stone, 0, 1.85, 0);
  box(tower, 2.7, 0.18, 0.8, mats.edge, 0, 3.74, 0);
  const border = pointedArch(1.35, 2.65, 0.1, mats.gold);
  border.position.set(0, 0.02, 0.26);
  tower.add(border);
  const door = pointedArch(1.08, 2.3, 0.12, mats.door);
  door.position.set(0, 0.04, 0.36);
  tower.add(door);
  clickable.door.push(door);
  const doorLine = pointedArch(0.85, 2.1, 0.02, mats.glow);
  doorLine.position.set(0, 0.08, 0.49);
  tower.add(doorLine);
  clickable.door.push(doorLine);
  for (const x of [-1.13, -0.67, -0.22, 0.23, 0.68, 1.13]) box(tower, 0.26, 0.32, 0.62, mats.edge, x, 3.99, 0);
  vine(tower, 1.22, 3.18, 0.5, -1);

  // Dome pavilion on the left, open arches to keep the puzzle readable.
  const pavilion = new THREE.Group();
  pavilion.position.set(-4.05, 1.3, 3.9);
  scene.add(pavilion);
  for (const x of [-0.67, 0.67]) for (const z of [-0.62, 0.62]) column(pavilion, x, z, 2.5, 0.12);
  box(pavilion, 1.8, 0.22, 1.68, mats.edge, 0, 2.52, 0);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.83, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), mats.dome);
  dome.position.y = 2.62;
  dome.scale.y = 0.82;
  dome.castShadow = true;
  pavilion.add(dome);
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), mats.gold);
  finial.position.y = 3.38;
  pavilion.add(finial);
  vine(pavilion, -0.77, 2.35, 0.72, 1);

  // Far wall provides depth without hiding the bridge or its three landings.
  const wall = archWall(7.9, 2.05, 0.28, 5);
  wall.position.set(-0.45, 0.25, -4.05);
  scene.add(wall);
  box(scene, 8.1, 0.15, 0.45, mats.edge, -0.45, 2.33, -4.05);
  for (const x of [-4.1, -2.3, -0.5, 1.3, 3.1]) box(scene, 0.28, 0.28, 0.42, mats.edge, x, 2.52, -4.05);
  vine(scene, -3.7, 2.2, -3.8, 1);

  const nodes = {
    entry: new THREE.Vector3(0, 1.3, 4.5),
    wheel: new THREE.Vector3(-2.1, 1.3, 4.7),
    dais: new THREE.Vector3(1.8, 1.3, 4.2),
    pivot: new THREE.Vector3(0, 1.3, 1.1),
    landings: [new THREE.Vector3(0, 1.3, -2.4), new THREE.Vector3(-3.4, 1.3, 1.1), new THREE.Vector3(3.4, 1.3, 1.1)],
    falseDoorApproach: new THREE.Vector3(0, 1.3, -3.10),
    memoryTile: new THREE.Vector3(-4.0, 1.38, 1.1),
    door: new THREE.Vector3(4.15, 1.3, -2.1),
    doorApproach: new THREE.Vector3(4.15, 1.3, 0.4),
  };

  function update(elapsed, delta) {
    water.position.y = -0.08 + Math.sin(elapsed * 0.9) * 0.012;
    const surfaceY = water.position.y + 0.035;
    // Match the real pivot in world space, rather than its camera-projected
    // pixel position. The clue is directly beneath the bridge in the water;
    // perspective separates it on screen while keeping the entire span and
    // its trim in the same direction for every orientation.
    reflection.position.set(bridgeGroup.position.x, surfaceY, bridgeGroup.position.z);
    // Gently dissolve the entire image when the bridge turns or the clue
    // changes, then reveal it smoothly if the new orientation is correct.
    clueVisibility = THREE.MathUtils.damp(clueVisibility, bridge.isAligned() ? 1 : 0, 2.8, delta);
    const softShimmer = 0.96 + 0.04 * Math.sin(elapsed * 1.4);
    clueMats.fill.opacity = clueVisibility * softShimmer * (inReflection ? 0.52 : 0.82);
    clueMats.edge.opacity = clueVisibility * softShimmer * (inReflection ? 0.68 : 0.98);
    clueMats.center.opacity = clueVisibility * softShimmer * (inReflection ? 0.55 : 0.72);
    mats.water.color.lerp(targetWaterColor, 1 - Math.exp(-3 * delta));
    if (memoryReflection.visible && memoryStarState === "travelling") {
      memoryStarElapsed += delta;
      const t = Math.min(1, memoryStarElapsed / 1.9);
      const smooth = t * t * (3 - 2 * t);
      memoryReflection.position.lerpVectors(memoryWaterPosition, memoryTilePosition, smooth);
      memoryReflection.position.y += Math.sin(Math.PI * smooth) * .38;
      memoryReflection.scale.setScalar(THREE.MathUtils.lerp(1, .82, smooth));
      if (t >= 1) {
        memoryStarState = "tile";
        // A player standing on the tile should appear in front of its glow.
        memoryReflection.children.forEach((part) => { part.material.depthTest = true; });
      }
    }
    if (memoryReflection.visible && memoryStarState === "tile") {
      const pulse = .75 + .25 * Math.sin(elapsed * 2.4);
      reflectionHalo.material.opacity = .28 + .2 * pulse;
      reflectionRing.material.opacity = .7 + .28 * pulse;
      if (!memoryTileActive) {
        memoryTileTop.material.emissive.set(0x9f6a24);
        memoryTileTop.material.emissiveIntensity = .45 + .25 * pulse;
      }
    } else {
      reflectionHalo.material.opacity = .35;
      reflectionRing.material.opacity = .9;
    }
    wheelHintMaterial.opacity = 0.22 + (Math.sin(elapsed * 1.7) * 0.5 + 0.5) * 0.2;
    if (buttonPressTime > 0) {
      buttonPressTime = Math.max(0, buttonPressTime - delta);
      const phase = 1 - buttonPressTime / 0.9;
      const press = THREE.MathUtils.smoothstep(Math.min(1, phase / 0.15, (1 - phase) / 0.22), 0, 1);
      buttonGroup.position.z = 0.365 - 0.055 * press;
      buttonMaterial.emissiveIntensity = 0.12 + 2.1 * press;
      buttonMaterial.color.lerpColors(buttonRestColor, buttonLitColor, press);
    } else {
      buttonGroup.position.z = 0.365;
      buttonMaterial.emissiveIntensity = 0.12;
      buttonMaterial.color.copy(buttonRestColor);
    }
    shutter.scale.y = THREE.MathUtils.damp(shutter.scale.y, shutterTarget, 5, delta);
    if (guideGroup.visible) {
      guideAge += delta;
      const remaining = Math.max(0, guideDuration - guideAge);
      const fadeOut = THREE.MathUtils.smoothstep(remaining, 0, 1.35);
      const figureFade = THREE.MathUtils.smoothstep(guideAge, 0.45, 1.9) * fadeOut;
      const sparkleFade = THREE.MathUtils.smoothstep(guideAge, 0, 0.5) * fadeOut;
      for (const item of guideMaterials) item.material.opacity = item.opacity * figureFade;
      for (let i = 0; i < guideSparkles.length; i += 1) {
        const item = guideSparkles[i];
        const angle = i * Math.PI / 4 + guideAge * 0.55;
        item.mesh.position.x = Math.cos(angle) * (0.36 + (i % 2) * 0.12);
        item.mesh.position.y = 0.71 + Math.sin(angle * 1.3) * 0.58;
        item.material.opacity = sparkleFade * (0.38 + 0.62 * Math.pow(Math.sin(guideAge * 2 + i), 2));
      }
      guideGroup.position.y = guideBaseY + 0.3 + Math.sin(guideAge * 1.3) * 0.10;
      guideGroup.rotation.y = Math.atan2(camera.position.x - guideGroup.position.x, camera.position.z - guideGroup.position.z);
      if (remaining === 0) guide.hide();
    }
    pathGateGroup.position.y = THREE.MathUtils.damp(pathGateGroup.position.y, gateTargetY, 2.7, delta);
    if (memoryTileActive) memoryTileTop.material.emissiveIntensity = 0.55 + Math.sin(elapsed * 3) * 0.12;
    padGlow = THREE.MathUtils.damp(padGlow, padGuiding ? 1 : 0, 5, delta);
    const pulse = 0.8 + 0.2 * Math.sin(elapsed * 2.6);
    padRingMaterial.emissiveIntensity = padGlow * (1.3 + pulse * 0.7);
    guidingMaterial.opacity = padGlow * (0.22 + pulse * 0.1);
    haloMaterial.opacity = padGlow * (0.38 + pulse * 0.18);
    padLight.intensity = padGlow * (2.0 + pulse * 0.6);
    return delta;
  }

  return { scene, camera, bridge, wheel, water, switchPad, falseDoor, guide, memoryTile, pathGate, nodes, clickable, update, materials: mats };
}

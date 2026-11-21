// The movement controller may spend time turning before it translates the
// traveller. The walk cycle (and its foot-contact sounds) should only run
// when the traveller actually moves across the floor.
export function advanceWalking(walker, advance, dt) {
  const beforeX = walker.position.x;
  const beforeZ = walker.position.z;
  advance(dt);
  const dx = walker.position.x - beforeX;
  const dz = walker.position.z - beforeZ;
  return dx * dx + dz * dz > 1e-12;
}

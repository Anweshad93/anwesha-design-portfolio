// The hall's reverse side is a quiet, impossible reflection of the palace.
// These details sit outside the walking path and leave the three beacons and
// their clues clear. Everything belongs to `dream`, so it turns with the
// far half of the room and participates in the existing flip fade.
export function createDreamAtmosphere(THREE, dream, palette) {
  palette.floor.color.set('#60577d');
  palette.edge.color.set('#382d50');
  palette.sky.color.set('#20213e');
  palette.water.color.set('#9ecbcb');
  palette.water.emissive.set('#3f7484');
  palette.water.emissiveIntensity=.48;
  palette.water.opacity=.23;

  const poolMaterial = new THREE.MeshStandardMaterial({
    color:'#264a57', emissive:'#326d79', emissiveIntensity:.38,
    metalness:.38, roughness:.28, side:THREE.DoubleSide,
  });
  const edgeMaterial = new THREE.MeshBasicMaterial({
    color:'#9de1df', transparent:true, opacity:.64,
    side:THREE.DoubleSide, depthWrite:false,
  });
  const rippleMaterial = new THREE.MeshBasicMaterial({
    color:'#d3fff4', transparent:true, opacity:.32,
    side:THREE.DoubleSide, depthWrite:false,
  });
  const ripples=[];

  for (const x of [-3.42, 3.42]) {
    // The two shallow mirrors echo the overhead water without creating new
    // selectable objects or covering the star, globe or pathway.
    const pool=new THREE.Mesh(new THREE.CircleGeometry(1,64),poolMaterial);
    pool.rotation.x=-Math.PI/2;
    pool.scale.set(1.52,2.22,1);
    pool.position.set(x,.29,-2.95);
    dream.add(pool);

    const border=new THREE.Mesh(new THREE.TorusGeometry(1,.018,8,72),edgeMaterial);
    border.rotation.x=-Math.PI/2;
    border.scale.set(1.52,2.22,1);
    border.position.set(x,.305,-2.95);
    dream.add(border);

    for(let i=0;i<2;i++) {
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.33+i*.24,.012,6,48),rippleMaterial.clone());
      ring.rotation.x=-Math.PI/2;
      ring.position.set(x,.315+i*.002,-3.0);
      dream.add(ring);
      ripples.push({ring,phase:i+(x>0?1.1:0)});
    }
  }

  // A few suspended lights give the reflected hall its own warm life. Their
  // quiet halos sit against the rear wall, away from the doorway and path.
  const hangingLights=[];
  for(const [x,y,r] of [[-4.45,3.45,.19],[-2.35,4.65,.12],[2.35,4.65,.12],[4.45,3.45,.19]]) {
    const cord=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,Math.max(.2,5.65-y),6),
      new THREE.MeshBasicMaterial({color:'#bfb4d4',transparent:true,opacity:.5}));
    cord.position.set(x,(5.65+y)/2,-5.59);dream.add(cord);
    const halo=new THREE.Mesh(new THREE.CircleGeometry(r*2.9,32),
      new THREE.MeshBasicMaterial({color:'#f8d7aa',transparent:true,opacity:.10,depthWrite:false,side:THREE.DoubleSide}));
    halo.position.set(x,y,-5.58);dream.add(halo);
    const lamp=new THREE.Mesh(new THREE.OctahedronGeometry(r),
      new THREE.MeshBasicMaterial({color:'#ffe4b3'}));
    lamp.scale.set(.75,1.35,.55);lamp.position.set(x,y,-5.53);dream.add(lamp);
    hangingLights.push({halo,phase:x});
  }

  return {
    // Called only after the flip completes, so it cannot interrupt the fade.
    update(time) {
      for(const {ring,phase} of ripples) {
        ring.material.opacity=.22+.07*Math.sin(time*1.1+phase);
      }
      for(const {halo,phase} of hangingLights) {
        halo.material.opacity=.09+.025*Math.sin(time*.8+phase);
      }
    },
  };
}

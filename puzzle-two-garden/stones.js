// A reflected route: two empty footprints show the carvings needed to restore it.
export function createStonePuzzle(THREE, scene, camera) {
  const top = new THREE.MeshStandardMaterial({color:0xe5c9a7,roughness:.9});
  const side = new THREE.MeshStandardMaterial({color:0xa98076,roughness:.95});
  const gold = new THREE.MeshStandardMaterial({color:0xc49653,metalness:.35,roughness:.5});
  const mark = new THREE.MeshBasicMaterial({color:0x704f65,side:THREE.DoubleSide});
  const reflected = new THREE.MeshBasicMaterial({color:0xecfff8,transparent:true,opacity:1,side:THREE.DoubleSide,depthWrite:false});
  const reflectionHalo = new THREE.MeshBasicMaterial({color:0x7df8f1,transparent:true,opacity:.32,side:THREE.DoubleSide,depthWrite:false});
  const waterShade = new THREE.MeshBasicMaterial({color:0x86dcd8,transparent:true,opacity:.27,side:THREE.DoubleSide,depthWrite:false});
  const reflectionEdgeHalo = new THREE.MeshBasicMaterial({color:0x68f3ee,transparent:true,opacity:.35,depthWrite:false});
  const reflectionEdge = new THREE.MeshBasicMaterial({color:0xdcfff8,transparent:true,opacity:.9,depthWrite:false});
  // A soft halo and a fine bright line give the completed route a subtle
  // illustrated stroke while leaving the carved shapes readable.
  const strokeHalo = new THREE.MeshBasicMaterial({color:0xffbf5c,transparent:true,opacity:.46,depthWrite:false});
  const strokeMiddle = new THREE.MeshBasicMaterial({color:0xffd887,transparent:true,opacity:.72,depthWrite:false});
  const strokeCore = new THREE.MeshBasicMaterial({color:0xfff5d0,transparent:true,opacity:1,depthWrite:false});
  function symbol(kind,material) {
    let geometry;
    if(kind==='crescent') geometry=new THREE.RingGeometry(.16,.27,40,1,Math.PI*.27,Math.PI*1.47);
    else if(kind==='triangle' || kind==='diamond') {
      const s=new THREE.Shape(), count=kind==='triangle'?3:4;
      for(let i=0;i<count;i++){const a=Math.PI/2+i*2*Math.PI/count,x=Math.cos(a)*.28,y=Math.sin(a)*.28;i?s.lineTo(x,y):s.moveTo(x,y);}s.closePath();geometry=new THREE.ShapeGeometry(s);
    } else {
      const s=new THREE.Shape(), count=kind==='star'?10:8;
      for(let i=0;i<count;i++){const a=Math.PI/2+i*2*Math.PI/count, r=i%2 ? .12 : .27; const x=Math.cos(a)*r,y=Math.sin(a)*r; i?s.lineTo(x,y):s.moveTo(x,y);}s.closePath(); geometry=new THREE.ShapeGeometry(s);
    }
    const m=new THREE.Mesh(geometry,material);m.rotation.x=-Math.PI/2;return m;
  }
  function makeStone(x,z,kind,fixed=false){
    const g=new THREE.Group();g.position.set(x,.66,z);scene.add(g);
    const base=new THREE.Mesh(new THREE.BoxGeometry(1.2,.25,1.32),side);g.add(base);
    const cap=new THREE.Mesh(new THREE.BoxGeometry(1.14,.07,1.26),top);cap.position.y=.15;g.add(cap);
    for(const xx of [-.46,.46]){const edge=new THREE.Mesh(new THREE.BoxGeometry(.025,.015,1.08),gold);edge.position.set(xx,.19,0);g.add(edge);}
    const glyph=symbol(kind,mark);glyph.position.y=.196;g.add(glyph);
    const stroke = new THREE.Group();
    stroke.visible = false;
    const addStroke = (material, thickness, elevation) => {
      for (const xx of [-.52,.52]) {
        const line=new THREE.Mesh(new THREE.BoxGeometry(thickness,.006,1.18),material);
        line.position.set(xx,elevation,0);line.renderOrder=20;stroke.add(line);
      }
      for (const zz of [-.57,.57]) {
        const line=new THREE.Mesh(new THREE.BoxGeometry(1.08,.006,thickness),material);
        line.position.set(0,elevation,zz);line.renderOrder=20;stroke.add(line);
      }
    };
    addStroke(strokeHalo,.18,.204);
    addStroke(strokeMiddle,.10,.212);
    addStroke(strokeCore,.045,.22);
    g.add(stroke);
    return {group:g,kind,fixed,origin:g.position.clone(),placed:false,stroke};
  }
  // The first stone slightly overlaps the entry terrace so it is a grounded step.
  const first=makeStone(0,4.43,'sun',true), last=makeStone(0,-1.25,'sun',true);
  const slots=[{kind:'crescent',x:0,z:2.55},{kind:'star',x:0,z:.65}];
  // A footprint is drawn on the water, while each real stone's top is higher.
  // Project the intended stone-top centre down along the camera ray: this
  // keeps the outlines evenly spaced with the raised end stones on screen.
  const stoneTopY=.845, waterY=.065, outlineLift=.02;
  const cameraDirection=camera.getWorldDirection(new THREE.Vector3());
  const projectedOffset=cameraDirection.clone().multiplyScalar((waterY+outlineLift-stoneTopY)/cameraDirection.y);
  for(const slot of slots){
    slot.reflectionX=slot.x+projectedOffset.x;
    slot.reflectionZ=slot.z+projectedOffset.z;
    const group=new THREE.Group();group.position.set(slot.reflectionX,waterY,slot.reflectionZ);scene.add(group);
    const patch=new THREE.Mesh(new THREE.PlaneGeometry(1.28,1.40),waterShade);patch.rotation.x=-Math.PI/2;patch.renderOrder=5;group.add(patch);
    function reflectionStroke(material,thickness,y){
      for(const x of [-.64,.64]){const line=new THREE.Mesh(new THREE.BoxGeometry(thickness,.006,1.40),material);line.position.set(x,y,0);line.renderOrder=6;group.add(line);}
      for(const z of [-.70,.70]){const line=new THREE.Mesh(new THREE.BoxGeometry(1.28,.006,thickness),material);line.position.set(0,y,z);line.renderOrder=6;group.add(line);}
    }
    reflectionStroke(reflectionEdgeHalo,.10,.012);reflectionStroke(reflectionEdge,.032,.02);
    const aura=symbol(slot.kind,reflectionHalo);aura.scale.setScalar(1.55);aura.position.y=.025;aura.renderOrder=7;group.add(aura);
    const glyph=symbol(slot.kind,reflected);glyph.scale.setScalar(1.2);glyph.position.y=.035;glyph.renderOrder=8;group.add(glyph);slot.group=group;slot.filled=false;
  }
  // Separate the movable stones throughout the pool, with a few decoys to observe.
  const pieces=[makeStone(-3.65,2.20,'crescent'),makeStone(3.4,-2.10,'star'),makeStone(-3.25,-3.8,'sun'),makeStone(3.25,4.20,'diamond'),makeStone(-3.2,-.20,'triangle')];
  pieces.forEach((piece,index)=>{piece.group.rotation.y=[-.18,.25,-.28,.19,-.1][index];});
  return {
    first,last,slots,pieces,
    // Call only after a correct placement; the fixed endpoints join the glow
    // once both gaps are filled.
    markAligned(piece){ if(piece && pieces.includes(piece)) piece.stroke.visible=true; },
    markComplete(){ first.stroke.visible=true; last.stroke.visible=true; },
  };
}

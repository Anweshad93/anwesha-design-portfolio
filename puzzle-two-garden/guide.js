// The same illustrated memory guide used in the first courtyard, adapted to
// appear briefly when the traveller needs help.
export function createGuide(THREE, scene, camera) {
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);
  const figureMaterials = [];
  const mat = (color, opacity) => {
    const material = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity, depthWrite: false, depthTest: false, side: THREE.DoubleSide,
    });
    figureMaterials.push({ material, opacity });
    return material;
  };
  const haloMat = mat(0xffce81, .25), outlineMat = mat(0x76505b, .75);
  const robeMat = mat(0xc8745d, .88), robeLightMat = mat(0xffe5b8, .93);
  const skinMat = mat(0xeec9a7, .94), hoodMat = mat(0x744d59, .94);
  const goldMat = mat(0xffd676, .98), wispMat = mat(0xffd6a0, .57);
  function shape(points, material, z) {
    const path = new THREE.Shape();
    path.moveTo(...points[0]);
    for (const [x, y] of points.slice(1)) path.lineTo(x, y);
    path.closePath();
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(path), material);
    mesh.position.z = z;
    group.add(mesh);
  }
  const halo = new THREE.Mesh(new THREE.CircleGeometry(.53, 40), haloMat);
  halo.position.set(0, .85, -.035);
  halo.scale.y = 1.45;
  group.add(halo);
  shape([[-.33,.14],[-.23,.78],[-.31,1.04],[0,1.24],[.31,1.04],[.23,.78],[.35,.14],[.12,.05],[.03,-.11],[-.1,.04]],outlineMat,-.015);
  shape([[-.27,.18],[-.18,.77],[-.26,1.02],[0,1.18],[.26,1.02],[.18,.77],[.29,.18],[.1,.1],[.03,-.05],[-.08,.08]],robeMat,0);
  shape([[-.2,.18],[-.1,.77],[0,.89],[.1,.77],[.2,.18],[.06,.13],[0,.01],[-.07,.12]],robeLightMat,.01);
  shape([[-.11,.16],[.06,.17],[.02,-.1],[-.07,-.19],[-.03,-.04]],wispMat,-.005);
  shape([[-.23,.96],[-.3,.63],[-.18,.58],[-.08,.85]],robeMat,.02);
  shape([[.23,.96],[.33,.70],[.23,.64],[.08,.85]],robeMat,.02);
  const hood = new THREE.Mesh(new THREE.CircleGeometry(.22, 32), hoodMat);
  hood.position.set(0, 1.12, .025); hood.scale.set(.86, 1.2, 1); group.add(hood);
  const face = new THREE.Mesh(new THREE.CircleGeometry(.115, 24), skinMat);
  face.position.set(0, 1.13, .035); face.scale.y=1.22; group.add(face);
  shape([[-.14,.76],[.14,.76],[.14,.72],[-.14,.72]],goldMat,.04);
  shape([[-.025,.71],[.025,.71],[.035,.18],[0,.14],[-.035,.18]],goldMat,.04);
  const sparkles=[];
  for(let i=0;i<8;i++) {
    const size=i%3===0?.075:.045, p=new THREE.Shape();
    p.moveTo(0,size*1.6);p.lineTo(size*.25,size*.25);p.lineTo(size,0);p.lineTo(size*.25,-size*.25);
    p.lineTo(0,-size*1.6);p.lineTo(-size*.25,-size*.25);p.lineTo(-size,0);p.lineTo(-size*.25,size*.25);p.closePath();
    const material=mat(0xffd16f,.8), mesh=new THREE.Mesh(new THREE.ShapeGeometry(p),material);
    mesh.position.z=.08;group.add(mesh);sparkles.push({mesh,material});
  }
  // The guide is an apparition and must remain visible when she speaks,
  // even beside a wall, doorway, or a foreground piece of scenery.
  group.traverse(object=>{ if(object.isMesh) object.renderOrder=100; });
  // The guide stays where she appears instead of following the traveller.
  let time=0, baseY=0, alpha=0, target=0;
  // Keep the fade independent of the floating animation so an interrupted
  // fade can reverse smoothly when a new hint arrives.
  const fadeSeconds=.6;
  return {
    show(position) {
      group.position.copy(position); baseY=position.y; time=0;
      if (!group.visible) alpha=0;
      target=1;
      group.visible=true;
    },
    hide() { target=0; },
    opacity() { return THREE.MathUtils.smoothstep(alpha,0,1); },
    isVisible() { return group.visible; },
    update(delta) {
      if(!group.visible) return;
      time+=delta;
      const step=Math.max(0,delta)/fadeSeconds;
      alpha=target>alpha?Math.min(target,alpha+step):Math.max(target,alpha-step);
      const fade=THREE.MathUtils.smoothstep(alpha,0,1);
      for(const item of figureMaterials) item.material.opacity=item.opacity*fade;
      group.position.y=baseY+Math.sin(time*1.3)*.1;
      group.rotation.y=Math.atan2(camera.position.x-group.position.x,camera.position.z-group.position.z);
      sparkles.forEach(({mesh,material},i)=>{
        const angle=i*Math.PI/4+time*.55;
        mesh.position.set(Math.cos(angle)*(.48+i*.018), .75+Math.sin(angle)*.65, .08);
        material.opacity=fade*(.38+.62*Math.pow(Math.sin(time*2+i),2));
      });
      if(target===0 && alpha===0) group.visible=false;
    }
  };
}

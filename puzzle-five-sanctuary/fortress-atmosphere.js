// The sanctuary wakes with the three lights in the water.  The lamps and
// architectural details belong to the scene itself, so the pool reflects them
// too; no new image or extra puzzle covers the existing environment.
export function createFortressAtmosphere({THREE, scene, sun, reducedMotion = false}) {
  const group = new THREE.Group();
  group.name = 'The sanctuary at dusk';
  scene.add(group);

  const ambient = scene.children.find(child => child.isHemisphereLight);
  const background = scene.background && scene.background.isColor ? scene.background : new THREE.Color('#263b43');
  scene.background = background;
  const night = new THREE.Color('#1c303d');
  const dawn = new THREE.Color('#3e5552');
  const warmHemisphere = new THREE.Color('#ffe8ca');
  const nightHemisphere = new THREE.Color('#b9c8d2');
  const darkGround = new THREE.Color('#273943');
  const warmGround = new THREE.Color('#48615b');
  const dimSun = new THREE.Color('#aebdc4');
  const warmSun = new THREE.Color('#ffe0ac');

  const bronze = new THREE.MeshStandardMaterial({color:'#735a40', metalness:.6, roughness:.48});
  const topGeometry = new THREE.CylinderGeometry(.21,.24,.08,8);
  const paneGeometry = new THREE.CylinderGeometry(.145,.165,.37,8);
  const hookGeometry = new THREE.TorusGeometry(.105,.025,6,20,Math.PI);
  const glowGeometry = new THREE.CircleGeometry(.85,40);
  const bulbGeometry = new THREE.SphereGeometry(.075,12,8);
  const windows = [];
  const lamps = [];
  // These fixtures are high on the far arcade, clear of the walkable path.
  // Low warm glows are present from the start; the three matches wake the
  // remaining lanterns and windows in turn.
  const lampData = [
    {x:-5.4, threshold:1, base:.14},
    {x:-3.15, threshold:2, base:.05},
    {x: 3.15, threshold:3, base:.05},
    {x: 5.4, threshold:3, base:.14}
  ];
  lampData.forEach(({x,threshold,base}, index) => {
    const fixture = new THREE.Group();
    fixture.name = `Sanctuary lantern ${index + 1}`;
    fixture.position.set(x, 2.22, -6.58);
    group.add(fixture);
    const mount = new THREE.Mesh(new THREE.BoxGeometry(.08,.38,.12),bronze);
    mount.position.set(0,.23,-.12); fixture.add(mount);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(.08,.07,.33),bronze);
    arm.position.set(0,.40,.05); fixture.add(arm);
    const hook = new THREE.Mesh(hookGeometry,bronze);
    hook.rotation.z = Math.PI; hook.position.set(0,.30,.19); fixture.add(hook);
    const glassMaterial = new THREE.MeshStandardMaterial({color:'#e4a966',emissive:'#f6a344',emissiveIntensity:.1,roughness:.5});
    const glass = new THREE.Mesh(paneGeometry,glassMaterial);
    glass.position.set(0,.02,.19); fixture.add(glass);
    for (const y of [-.2,.24]) {
      const cap = new THREE.Mesh(topGeometry,bronze); cap.position.set(0,y,.19); fixture.add(cap);
    }
    for (let post=0;post<4;post++) {
      const a=post*Math.PI/2;
      const bar=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.42,6),bronze);
      bar.position.set(Math.cos(a)*.15,.02,.19+Math.sin(a)*.15); fixture.add(bar);
    }
    const bulbMaterial = new THREE.MeshBasicMaterial({color:'#ffe1a0',transparent:true,opacity:.42});
    const bulb = new THREE.Mesh(bulbGeometry,bulbMaterial); bulb.position.set(0,.02,.20); fixture.add(bulb);
    const light = new THREE.PointLight('#ffc778', .3, 5.0, 2);
    light.position.set(x,2.16,-6.12); group.add(light);
    // A soft floor wash connects the warm lamps to the stone without placing
    // obstacles along any character route.
    const washMaterial = new THREE.MeshBasicMaterial({color:'#eac889',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});
    const wash = new THREE.Mesh(glowGeometry,washMaterial);
    wash.rotation.x=-Math.PI/2;wash.scale.set(1.15,.8,1);wash.position.set(x,.128,-5.84);group.add(wash);
    lamps.push({threshold,base,glassMaterial,bulbMaterial,light,washMaterial});
  });
  // The little recessed panes already in the arcade gain reflected gold;
  // the overlay sits behind the existing frames and casts no shadow.
  for (const [index,x] of [-5.4,-4.2,4.2,5.4].entries()) {
    const material = new THREE.MeshBasicMaterial({color:'#f4cc87',transparent:true,opacity:0,depthWrite:false});
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(.40,.70),material);
    pane.position.set(x,2.72,-6.655); group.add(pane);
    windows.push({material,threshold:[1,2,2,3][index]});
  }

  const motes=[];
  const moteGeometry=new THREE.SphereGeometry(.035,8,6);
  for(let i=0;i<14;i++) {
    const material=new THREE.MeshBasicMaterial({color:i%3?'#ffe1a2':'#c5e4de',transparent:true,opacity:0,depthWrite:false});
    const mote=new THREE.Mesh(moteGeometry,material);
    const angle=Math.PI*(.67+(i%7)*.115);
    const radius=7.05+(i%2)*.28;
    const x=Math.sin(angle)*radius,z=Math.cos(angle)*radius;
    mote.position.set(x,1.35+(i%4)*.55,z);group.add(mote);
    motes.push({mesh:mote,material,x,z,y:mote.position.y,phase:i*1.77});
  }

  let target=0,current=0,time=0;
  const clamp=THREE.MathUtils.clamp;
  function apply() {
    const fraction=clamp(current/3,0,1);
    background.copy(night).lerp(dawn,fraction);
    if(scene.fog?.color) scene.fog.color.copy(background);
    if(ambient){
      ambient.intensity=THREE.MathUtils.lerp(.78,1.25,fraction);
      ambient.color.copy(nightHemisphere).lerp(warmHemisphere,fraction*.65);
      ambient.groundColor.copy(darkGround).lerp(warmGround,fraction);
    }
    if(sun){sun.intensity=THREE.MathUtils.lerp(.68,1.32,fraction);sun.color.copy(dimSun).lerp(warmSun,fraction*.8)}
    lamps.forEach(({threshold,base,glassMaterial,bulbMaterial,light,washMaterial},index)=>{
      const wake=clamp(current-(threshold-1),0,1);
      const flicker=reducedMotion?1:1+.035*Math.sin(time*2.4+index*2.1);
      const strength=base+(1-base)*wake;
      glassMaterial.emissiveIntensity=(.25+1.65*strength)*flicker;
      bulbMaterial.opacity=.38+.60*strength;
      light.intensity=(.20+2.3*strength)*flicker;
      washMaterial.opacity=.025+.13*strength;
    });
    windows.forEach(({material,threshold})=>{material.opacity=.05+.72*clamp(current-(threshold-1),0,1)});
    motes.forEach(({mesh,material,x,z,y,phase},index)=>{
      const drift=reducedMotion?0:Math.sin(time*.42+phase);
      mesh.position.set(x+drift*.13,y+(reducedMotion?0:Math.sin(time*.6+phase)*.13),z);
      material.opacity=(.18+.37*fraction)*(reducedMotion?1:.75+.25*Math.sin(time*.8+phase));
      mesh.scale.setScalar(.8+.3*fraction+(index%2)*.12);
    });
  }
  apply();
  return {
    setProgress(value){target=clamp(Number.isFinite(value)?value:0,0,3);if(reducedMotion){current=target;apply()}},
    update(dt){
      const step=clamp(Number.isFinite(dt)?dt:0,0,.1);
      if(!reducedMotion)time+=step;
      current=THREE.MathUtils.lerp(current,target,1-Math.exp(-step*1.8));
      if(Math.abs(target-current)<.001)current=target;
      apply();
    },
    get progress(){return current},
    dispose(){
      scene.remove(group);
      const geometries=new Set(),materials=new Set();
      group.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const material of (Array.isArray(o.material)?o.material:[o.material]))materials.add(material)}});
      geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());
    }
  };
}

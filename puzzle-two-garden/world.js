// A moonlit garden built from simple geometry. The water markings are clues,
// not reflections of every object: they show only the stones that remember a path.
export function createGardenWorld(THREE) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#242b46');
  scene.fog = new THREE.Fog('#242b46', 22, 43);
  const camera = new THREE.OrthographicCamera(-8, 8, 8, -8, .1, 100);
  camera.position.set(12, 17, 20); camera.lookAt(0, .3, 0);
  const sky = new THREE.HemisphereLight('#c8def1', '#68465d', 1.35); scene.add(sky);
  const moon = new THREE.DirectionalLight('#c7d9ff', 1.8); moon.position.set(-7, 15, 7); scene.add(moon);
  const fill = new THREE.DirectionalLight('#efb88b', .55); fill.position.set(8, 8, -6); scene.add(fill);
  const mat = (color, extra={}) => new THREE.MeshStandardMaterial({color, roughness: .92, ...extra});
  const sand = mat('#b89181'), pale = mat('#e0c6ab'), edge = mat('#d1ad8e'), shade = mat('#795e71');
  const dark = mat('#3d4059'), water = mat('#357982', {roughness:.38, metalness:.12});
  const waterDeep = new THREE.MeshBasicMaterial({color:'#184956'});
  const brass = mat('#c49a61', {metalness:.48, roughness:.48});
  const foliage = [mat('#315b59'),mat('#47786d'),mat('#6d9783')];
  const pink = mat('#d29b9d');
  const luminous = new THREE.MeshBasicMaterial({color:'#ffdfa2'});
  const reflected = new THREE.MeshBasicMaterial({color:'#cde5c9', transparent:true, opacity:.8, depthWrite:false, side:THREE.DoubleSide});
  const reflectedHalo = new THREE.MeshBasicMaterial({color:'#89c5b9', transparent:true, opacity:.32, depthWrite:false, side:THREE.DoubleSide});
  const box=(w,h,d,x,y,z,m,parent=scene)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);parent.add(o);return o;};
  const cyl=(a,b,h,x,y,z,m,parent=scene,n=32)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(a,b,h,n),m);o.position.set(x,y,z);parent.add(o);return o;};
  const sphere=(r,x,y,z,m,parent=scene)=>{const o=new THREE.Mesh(new THREE.SphereGeometry(r,12,9),m);o.position.set(x,y,z);parent.add(o);return o;};
  const torus=(r,t,x,y,z,m,parent=scene,arc=Math.PI*2)=>{const o=new THREE.Mesh(new THREE.TorusGeometry(r,t,8,40,arc),m);o.position.set(x,y,z);parent.add(o);return o;};
  const floorY=.80, gardenY=.68;
  // A long water garden, with thick stone edges and a gently inset pool.
  box(11.6,.55,16.4,0,-.32,0,shade);
  box(11.0,.1,15.8,0,-.025,0,water);
  box(.42,.4,16.1,-5.55,.18,0,sand);box(.42,.4,16.1,5.55,.18,0,sand);
  box(11.6,.4,.42,0,.18,-8,sand);box(11.6,.4,.42,0,.18,8,sand);
  for(const x of [-5.55,5.55]) box(.48,.08,15.8,x,.42,0,pale);
  box(11.25,.08,.48,0,.42,7.95,pale);
  function terrace(w,d,x,z,offset=0){box(w,.72,d,x,.38+offset,z,sand);box(w-.08,.10,d-.08,x,.75+offset,z,pale);for(const xx of [-1,1])box(.045,.016,d-.22,x+xx*(w/2-.17),.808+offset,z,brass);}
  terrace(4.5,2.8,0,6.48); terrace(5.0,6.30,0,-4.82,-.12);
  // Short inset tile accents make the architecture legible at miniature scale.
  for(let x=-1.7;x<=1.7;x+=.55){box(.018,.012,2.5,x,.81,6.48,edge);box(.018,.012,5.9,x,.69,-4.82,edge);}
  const start=new THREE.Vector3(0,floorY,6.45), end=new THREE.Vector3(0,gardenY,-2.3);
  // Back wall, arches and a sheltered door create a different silhouette from the first courtyard.
  box(10.8,2.35,.48,0,1.35,-7.75,shade);box(10.8,.15,.6,0,2.58,-7.75,edge);
  for(const x of [-5.0,-3.15,-1.6,1.6,3.15,5]){
    box(.48,3.65,.68,x,1.86,-7.51,sand);box(.69,.17,.82,x,3.76,-7.51,pale);box(.58,.12,.75,x,.55,-7.51,brass);
  }
  function arch(x,width=1.08){
    box(width*1.72,2.1,.14,x,1.55,-7.47,dark);
    for(const side of [-1,1]) box(.12,1.7,.17,x+side*width*.70,1.43,-7.34,edge);
    const ring=torus(width*.70,.075,x,2.27,-7.31,brass,scene,Math.PI);ring.rotation.z=0;
    box(width*1.44,.1,.22,x,.70,-7.28,edge);
  }
  arch(-3.98, .92);arch(3.98,.92);arch(0,1.35);
  // The doors already belong to the architecture; they swing inward when
  // the key is collected, rather than an entire doorway rising into view.
  const doorLeafMat=mat('#596a76',{metalness:.12,roughness:.72});
  const doorLeaves=[];
  for(const side of [-1,1]){
    const hinge=new THREE.Group();hinge.position.set(side*.60,.70,-7.23);scene.add(hinge);
    const center=-side*.30;
    box(.60,1.55,.07,center,.775,0,doorLeafMat,hinge);
    for(const inset of [-.20,.20])box(.025,1.30,.018,center+inset,.775,.045,brass,hinge);
    box(.50,.035,.018,center,.22,.045,brass,hinge);
    box(.50,.035,.018,center,1.32,.045,brass,hinge);
    sphere(.04,center-side*.17,.78,.06,brass,hinge);
    doorLeaves.push({hinge,side});
  }
  // A dormant bare tree waits on the inner terrace. Its branches are visible
  // from the start; the traveller's touch brings its leaves back to life.
  const treasure = new THREE.Group(); treasure.position.set(0,gardenY,-4.7); scene.add(treasure);
  const bark = mat('#80624f',{emissive:'#ad6b2d',emissiveIntensity:.04});
  const barkLight = mat('#c5976b',{emissive:'#d58836',emissiveIntensity:.03});
  // The trunk and limbs bend gradually and taper at each joint. Branches
  // emerge at different heights instead of radiating from a single spike.
  const trunkPoints=[new THREE.Vector3(0,0,0),new THREE.Vector3(-.035,.42,.015),new THREE.Vector3(.018,.91,0),new THREE.Vector3(-.025,1.38,-.015),new THREE.Vector3(.02,1.75,-.04)];
  const branchMat=mat('#9b7054',{emissive:'#d99245',emissiveIntensity:.06});
  function limb(parent, points, widths){
    for(let i=0;i<points.length-1;i++){
      const start=points[i],end=points[i+1],delta=end.clone().sub(start), length=delta.length();
      const branch=new THREE.Mesh(new THREE.CylinderGeometry(widths[i+1],widths[i],length,10),branchMat);
      branch.position.copy(start).add(end).multiplyScalar(.5);
      branch.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());parent.add(branch);
      if(i<points.length-2){const joint=new THREE.Mesh(new THREE.SphereGeometry(widths[i+1],10,8),branchMat);joint.position.copy(end);parent.add(joint);}
    }
  }
  limb(treasure,trunkPoints,[.23,.20,.15,.105,.035]);
  cyl(.22,.30,.12,0,.06,0,bark,treasure,14);
  for(let i=0;i<5;i++){
    const angle=i*Math.PI*2/5;
    const root=new THREE.Mesh(new THREE.SphereGeometry(.15,10,7),bark);
    root.scale.set(.55,.3,1.1);root.position.set(Math.cos(angle)*.15,.055,Math.sin(angle)*.15);root.rotation.y=-angle;treasure.add(root);
  }
  // A small knot is the hand's touch target, not a collectible.
  const touchMaterial=mat('#d9ad74',{emissive:'#f8bc57',emissiveIntensity:.22});
  const touchSurface=sphere(.105,.16,.68,.12,touchMaterial,treasure);
  treasure.userData.buttonSurface=touchSurface;
  const leafMaterials=[mat('#537d68'),mat('#78a78b'),mat('#a8c39a'),mat('#d8b883')];
  const branchPaths=[
    [[-.01,1.05,0],[-.30,1.38,.03],[-.60,1.57,.04],[-.88,1.83,.08]],
    [[0,1.22,0],[.30,1.53,.10],[.56,1.73,.13],[.77,2.05,.10]],
    [[-.02,1.34,-.01],[-.24,1.70,-.21],[-.38,1.99,-.33],[-.47,2.30,-.38]],
    [[.01,1.57,-.03],[.17,1.91,-.18],[.25,2.25,-.26],[.24,2.57,-.31]],
    [[.01,1.05,-.01],[.27,1.31,-.25],[.51,1.53,-.42],[.68,1.82,-.47]],
  ];
  const leafClusters=[];
  for(let i=0;i<branchPaths.length;i++){
    const pts=branchPaths[i].map(p=>new THREE.Vector3(...p));
    limb(treasure,pts,[.105,.076,.045,.017]);
    const forkStart=pts[2].clone();
    const forkEnd=pts[3].clone().add(new THREE.Vector3(i%2?.16:-.15,.13,i%2?-.14:.11));
    const forkMid=forkStart.clone().lerp(forkEnd,.55);forkMid.y+=.04;
    limb(treasure,[forkStart,forkMid,forkEnd],[.045,.026,.008]);
    for(const tip of [pts[3],forkEnd]){
      const cluster=new THREE.Group();cluster.position.copy(tip);cluster.scale.setScalar(.001);treasure.add(cluster);leafClusters.push(cluster);
      for(let j=0;j<3;j++){
        const a=i*2.2+j*Math.PI*2/3,radius=j===0?.25:.18;
        const leaf=new THREE.Mesh(new THREE.SphereGeometry(radius,12,9),leafMaterials[(i+j)%leafMaterials.length]);
        leaf.scale.set(1,.72,.86);leaf.position.set(Math.cos(a)*.13,.04+(j%2)*.10,Math.sin(a)*.13);cluster.add(leaf);
      }
      const blossom=new THREE.Mesh(new THREE.SphereGeometry(.045,9,7),pink);blossom.position.set(.07,.14,.11);cluster.add(blossom);
    }
  }
  const sparkleShape = new THREE.Shape();
  for(let i=0;i<8;i++){
    const angle=Math.PI/2+i*Math.PI/4, radius=i%2 ? .025 : .105;
    const x=Math.cos(angle)*radius,y=Math.sin(angle)*radius;
    if(i===0) sparkleShape.moveTo(x,y); else sparkleShape.lineTo(x,y);
  }
  sparkleShape.closePath();
  const sparkleGeometry=new THREE.ShapeGeometry(sparkleShape);
  const sparkles=[];
  for(let i=0;i<12;i++){
    const material=new THREE.MeshBasicMaterial({color:i%3===0?'#fff6ca':'#ffd77b',transparent:true,opacity:.5,depthWrite:false,side:THREE.DoubleSide});
    const point=new THREE.Mesh(sparkleGeometry,material); point.renderOrder=8; scene.add(point); sparkles.push(point);
  }
  const sparkleLight=new THREE.PointLight('#ffca72',1,4.5,2);scene.add(sparkleLight);
  const treasurePosition=new THREE.Vector3();
  // The illuminated key appears only after the tree awakens. Its rings and
  // particles remain part of the key as the traveller carries it away.
  const keyY=1.44;
  // Set the key on the near side of the tree, offset from the traveller so
  // the reveal reads clearly and the traveller walks toward it to collect it.
  const key=new THREE.Group();key.position.set(-.83,keyY,-4.18);key.scale.setScalar(.001);key.visible=false;scene.add(key);
  // Retain the original warm, softly glowing globe. A translucent, feathered
  // shadow behind it gives the pale gold contrast without changing its color.
  const keyMaterial=mat('#ffd277',{metalness:.4,roughness:.28,emissive:'#d9932c',emissiveIntensity:.8});
  const keySphere=new THREE.Mesh(new THREE.SphereGeometry(.24,32,20),keyMaterial);key.add(keySphere);key.userData.buttonSurface=keySphere;
  const keyHalo=new THREE.Mesh(new THREE.SphereGeometry(.36,24,16),new THREE.MeshBasicMaterial({color:'#ffd574',transparent:true,opacity:.2,depthWrite:false}));key.add(keyHalo);
  const ringMat=new THREE.MeshBasicMaterial({color:'#ffe3a0',transparent:true,opacity:.8,depthWrite:false});
  const keyRingA=new THREE.Mesh(new THREE.TorusGeometry(.34,.018,8,48),ringMat);keyRingA.rotation.x=Math.PI*.34;key.add(keyRingA);
  const keyRingB=new THREE.Mesh(new THREE.TorusGeometry(.39,.012,8,48),ringMat);keyRingB.rotation.y=Math.PI*.4;key.add(keyRingB);
  // Procedural alpha gradient: no external image or asset license is needed.
  const shadowSize=64, shadowPixels=new Uint8Array(shadowSize*shadowSize*4);
  for(let y=0;y<shadowSize;y++)for(let x=0;x<shadowSize;x++){
    const dx=(x+.5-shadowSize/2)/(shadowSize/2),dy=(y+.5-shadowSize/2)/(shadowSize/2);
    const alpha=Math.pow(Math.max(0,1-Math.hypot(dx,dy)),1.7);
    const i=(y*shadowSize+x)*4;shadowPixels[i]=53;shadowPixels[i+1]=35;shadowPixels[i+2]=54;shadowPixels[i+3]=Math.round(255*alpha);
  }
  const shadowTexture=new THREE.DataTexture(shadowPixels,shadowSize,shadowSize,THREE.RGBAFormat);
  shadowTexture.needsUpdate=true;shadowTexture.magFilter=THREE.LinearFilter;shadowTexture.minFilter=THREE.LinearFilter;
  const keyShadow=new THREE.Sprite(new THREE.SpriteMaterial({map:shadowTexture,transparent:true,opacity:.68,depthWrite:false}));
  keyShadow.scale.set(.95,.95,1);
  const cameraToward=camera.getWorldDirection(new THREE.Vector3()).negate();
  const cameraRight=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);
  const cameraUp=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion);
  keyShadow.position.copy(cameraToward).multiplyScalar(-.42).addScaledVector(cameraRight,.09).addScaledVector(cameraUp,-.09);key.add(keyShadow);
  // A faint contact shadow on the terrace makes the floating key feel grounded.
  const floorShadow=new THREE.Mesh(new THREE.PlaneGeometry(.75,.75),new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,opacity:.30,depthWrite:false}));
  floorShadow.rotation.x=-Math.PI/2;floorShadow.visible=false;scene.add(floorShadow);
  const keySparkles=[];
  for(let i=0;i<8;i++){const m=new THREE.MeshBasicMaterial({color:'#ffe8a4',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});const p=new THREE.Mesh(sparkleGeometry,m);p.scale.setScalar(.6);key.add(p);keySparkles.push(p);}
  // A steady opening of light sits behind the hinged leaves. Its opacity
  // grows as they swing, without changing the doorway's size or position.
  const portal = new THREE.Group(); portal.position.set(0,.70,-7.35); portal.visible=false; scene.add(portal);
  const portalMat = new THREE.MeshBasicMaterial({color:'#ffdc8b',transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false});
  const portalFace = new THREE.Mesh(new THREE.PlaneGeometry(1.15,1.55),portalMat); portalFace.position.set(0,.775,0); portal.add(portalFace);
  const magicLight = new THREE.PointLight('#ffd385',0,9,2); magicLight.position.set(0,2.8,-4.8); scene.add(magicLight);
  let lit=0, treeAwake=false, keyMoving=false, keyTaken=false, portalProgress=0;
  const nightColor = new THREE.Color('#242b46'), awakenedColor = new THREE.Color('#746486');
  // Reliefs and colonnade along both sides; leave the middle clear for the puzzle.
  for(const side of [-1,1]) for(const z of [-5.4,-1.0,3.4]){
    const x=side*5.42;box(.48,2.1,.48,x,1.15,z,sand);box(.68,.15,.68,x,2.26,z,pale);cyl(.12,.21,.28,x,2.48,z,brass,scene,16);
  }
  // Warm lamps are geometry AND actual lights; larger soft halos make the illumination visible.
  const lamps=[];
  function lantern(x,z,scale=1){
    const y=.45;
    cyl(.27*scale,.34*scale,.14*scale,x,y,z,brass);
    box(.36*scale,.68*scale,.36*scale,x,y+.40*scale,z,dark);
    box(.24*scale,.49*scale,.245*scale,x,y+.4*scale,z,luminous);
    for(const dx of [-.18,.18])for(const dz of [-.18,.18])box(.035*scale,.67*scale,.035*scale,x+dx*scale,y+.4*scale,z+dz*scale,brass);
    cyl(.30*scale,.22*scale,.12*scale,x,y+.79*scale,z,brass);
    const cap=new THREE.Mesh(new THREE.ConeGeometry(.31*scale,.26*scale,4),brass);cap.rotation.y=Math.PI/4;cap.position.set(x,y+.98*scale,z);scene.add(cap);
    const light=new THREE.PointLight('#ffbd71', 5*scale, 4.5*scale, 2);light.position.set(x,y+.55*scale,z);scene.add(light);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(.44*scale,16,10),new THREE.MeshBasicMaterial({color:'#ffce81',transparent:true,opacity:.1,depthWrite:false}));halo.position.copy(light.position);scene.add(halo);
    const poolGlow=new THREE.Mesh(new THREE.CircleGeometry(.72*scale,40),new THREE.MeshBasicMaterial({color:'#f6c987',transparent:true,opacity:.11,depthWrite:false}));poolGlow.rotation.x=-Math.PI/2;poolGlow.position.set(x*.88,.045,z);scene.add(poolGlow);
    lamps.push({light,halo});
  }
  lantern(-4.9,5.5,.85);lantern(4.9,5.5,.85);lantern(-4.85,.5,.95);lantern(4.85,-3.7,.95);lantern(-2.05,-5.45,.78);lantern(2.05,-5.45,.78);
  function planter(x,z,kind=0){
    box(1.1,.45,.82,x,.53,z,shade);box(1.18,.1,.9,x,.8,z,brass);box(.99,.06,.71,x,.86,z,dark);
    for(let i=0;i<7;i++){const dx=(i-3)*.14,dz=(i%2?-.14:.12);sphere(.19+(i%3)*.035,x+dx,1.01+(i%2)*.1,z+dz,foliage[(i+kind)%3]);}
    for(let i=0;i<4;i++)sphere(.045,x+(i-1.5)*.2,1.17,z+.09,pink);
  }
  for(const [x,z,k] of [[-4.7,3.4,0],[4.7,3.3,1],[-4.7,-2.0,2],[4.7,-.7,0],[-3.2,-6.2,1],[3.2,-6.2,2]])planter(x,z,k);
  function tree(x,z){
    cyl(.10,.16,1.55,x,1.26,z,shade);
    for(const [dx,dy,dz,r,m] of [[0,2.0,0,.65,0],[.47,1.94,.05,.46,1],[-.45,1.96,0,.46,2],[.2,2.48,0,.43,1],[-.28,2.42,.08,.42,0]])sphere(r,x+dx,dy,z+dz,foliage[m]);
    for(const [dx,dy,dz] of [[.3,2.4,.42],[-.4,2.1,.32],[.44,2.12,.2],[-.1,2.55,.32]])sphere(.07,x+dx,dy,z+dz,pink);
  }
  tree(-4.55,-6.8);tree(4.55,-6.8);
  function star(x,y,z,r,m){const s=new THREE.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,rr=i%2?r*.44:r;const px=Math.cos(a)*rr,pz=Math.sin(a)*rr;i?s.lineTo(px,pz):s.moveTo(px,pz);}s.closePath();const o=new THREE.Mesh(new THREE.ShapeGeometry(s),m);o.rotation.x=-Math.PI/2;o.position.set(x,y,z);scene.add(o);return o;}
  function crescent(x,y,z,r,m){const o=new THREE.Mesh(new THREE.RingGeometry(r*.62,r,40,1,Math.PI*.28,Math.PI*1.45),m);o.rotation.x=-Math.PI/2;o.rotation.z=-.2;o.position.set(x,y,z);scene.add(o);return o;}
  // Stepping stones are constructed by the puzzle controller.
  const stones = [];
  const clues = [];
  // Lily pads, small blossoms and thin rings give the water detail without obscuring clues.
  for(const [x,z] of [[-3.8,5],[-3.9,1.9],[3.9,2.7],[-3.8,-3.1],[3.8,-2.3],[3.5,-5.1],[-2.8,-4.5]]){
    const leaf=cyl(.25,.25,.018,x,.06,z,foliage[1]);leaf.rotation.y=.2;sphere(.055,x+.04,.10,z,pink);
  }
  for(const [x,z] of [[-2.7,2.7],[2.9,1.2],[-3,-.9],[2.9,-4]]){
    const ripple=torus(.38,.01,x,.06,z,reflected,scene,Math.PI*1.25);ripple.rotation.x=-Math.PI/2;
  }
  let elapsed=0;
  function update(dt){
    elapsed+=dt;
    for(let i=0;i<lamps.length;i++){lamps[i].light.intensity=4.6+.35*Math.sin(elapsed*1.7+i);lamps[i].halo.material.opacity=.09+.012*Math.sin(elapsed*1.7+i);}
    treasure.getWorldPosition(treasurePosition);
    sparkleLight.position.copy(treasurePosition);
    for(let i=0;i<sparkles.length;i++){
      const point=sparkles[i], angle=i*Math.PI*2/sparkles.length+elapsed*(i%2 ? -.45 : .5);
      const radius=.43+.08*Math.sin(elapsed*1.25+i);
      point.position.set(treasurePosition.x+Math.cos(angle)*radius,treasurePosition.y+.7+(i%5)*.23+Math.sin(elapsed*1.3+i*1.7)*.14,treasurePosition.z+Math.sin(angle)*radius);
      point.lookAt(camera.position);
      point.material.opacity=(.15+.75*lit)*(.5+.5*Math.sin(elapsed*2.6+i*1.8));
      point.scale.setScalar(.9+.34*(.5+.5*Math.sin(elapsed*2+i)));
    }
    if(treeAwake){
      lit=Math.min(1,lit+dt*.42);
      const ease=lit*lit*(3-2*lit);
      sky.intensity=1.35+1.6*ease; moon.intensity=1.8+1.1*ease; fill.intensity=.55+1.3*ease;
      for(const cluster of leafClusters) cluster.scale.setScalar(Math.max(.001,ease));
      bark.emissiveIntensity=.04+.48*ease; barkLight.emissiveIntensity=.03+.5*ease;touchMaterial.emissiveIntensity=.22+1.1*ease; sparkleLight.intensity=1+5*ease;
      magicLight.intensity=18*ease;scene.background.copy(nightColor).lerp(awakenedColor,ease);scene.fog.color.copy(scene.background);
    }
    if(treeAwake){
      const keyEase=THREE.MathUtils.smoothstep(lit,.30,.78);
      if(!keyMoving && !keyTaken){
        key.visible=keyEase>0;
        key.scale.setScalar(Math.max(.001,keyEase));
        key.position.y=keyY + .06*Math.sin(elapsed*1.8);
      }
      if(key.visible){
        keyRingA.rotation.y=elapsed*.65;keyRingB.rotation.x=elapsed*.45;
        keyHalo.material.opacity=(.14+.06*Math.sin(elapsed*2))*keyEase;
        floorShadow.visible=true;floorShadow.position.set(key.position.x,.705,key.position.z);
        floorShadow.material.opacity=.30*keyEase;
        for(let i=0;i<keySparkles.length;i++){
          const p=keySparkles[i], a=elapsed*.9+i*Math.PI*2/keySparkles.length;
          p.position.set(Math.cos(a)*(.42+(i%2)*.08),Math.sin(a*1.3)*.20,Math.sin(a)*(.42+(i%2)*.08));
          p.lookAt(camera.position);p.material.opacity=(.45+.45*Math.sin(elapsed*2+i))*keyEase;
        }
      }
    }
    if(keyTaken){
      portalProgress=Math.min(1,portalProgress+dt*.55);
      const ease=portalProgress*portalProgress*(3-2*portalProgress);
      portal.visible=true;portalMat.opacity=.86*ease;
      for(const leaf of doorLeaves)leaf.hinge.rotation.y=-leaf.side*1.20*ease;
    }
  }
  return {scene,camera,stones,start,end,treasure,key,portal,approach:new THREE.Vector3(.30,gardenY,-4.40),keyApproach:new THREE.Vector3(-.83,gardenY,-3.65),doorWaypoints:[new THREE.Vector3(1.30,gardenY,-3.65)],doorway:new THREE.Vector3(.65,gardenY,-6.40),doorFaceTarget:new THREE.Vector3(0,gardenY,-7.23),
    get keyReady(){return treeAwake && lit>=.78;}, get doorReady(){return keyTaken && portalProgress>=.98;}, get keyPosition(){return key.position.clone();},
    wakeTree(){treeAwake=true;}, beginKeyPickup(){keyMoving=true;}, takeKey(){keyMoving=true;keyTaken=true;}, update,viewHeight:9.5,minWidth:14};
}

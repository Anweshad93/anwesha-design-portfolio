// The guide's last gift travels visibly to the traveller's hand before the
// water puzzle begins. The wand lives in world space, following the animated
// hand without inheriting the imported character rig's uneven scale.
export function createGuideWand({THREE, scene, walker, guidePosition, reducedMotion = false}) {
  const hand = walker.getObjectByName('RightHand');
  const wand = new THREE.Group();
  wand.name = 'The guide’s wand';
  wand.visible = false;
  scene.add(wand);

  const gold = new THREE.MeshStandardMaterial({color:0xe5b965, metalness:.72, roughness:.27, emissive:0x6a3611, emissiveIntensity:.25, transparent:true});
  const handle = new THREE.MeshStandardMaterial({color:0x795043, metalness:.18, roughness:.45, transparent:true});
  const glow = new THREE.MeshBasicMaterial({color:0xffe5a2, transparent:true});
  const aura = new THREE.MeshBasicMaterial({color:0xffd46d, transparent:true, opacity:.25, depthWrite:false, blending:THREE.AdditiveBlending});
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.022,.028,.60,12),gold);
  shaft.position.y=.28; wand.add(shaft);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(.038,.035,.17,12),handle);
  grip.position.y=.055; wand.add(grip);
  for (const y of [.01,.10]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(.037,.009,6,12),gold);
    band.rotation.x=Math.PI/2; band.position.y=y; wand.add(band);
  }
  const jewel = new THREE.Mesh(new THREE.OctahedronGeometry(.09,0),glow);
  jewel.position.y=.61; wand.add(jewel);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(.14,12,8),aura);
  halo.position.y=.61; wand.add(halo);
  // Four small points make the jewel read as a star even at the game camera's scale.
  for (let i=0;i<4;i++) {
    const ray=new THREE.Mesh(new THREE.ConeGeometry(.026,.19,6),gold);
    const angle=i*Math.PI/2;
    ray.position.set(Math.cos(angle)*.105,.61,Math.sin(angle)*.105);
    ray.rotation.z=Math.PI/2;
    ray.rotation.y=-angle;
    wand.add(ray);
  }
  wand.traverse(o=>{if(o.isMesh){o.castShadow=false;o.frustumCulled=false;}});

  // The guide's gift finishes its work in the traveller's hand. Each glint
  // begins along the wand, so its fading silhouette breaks into light rather
  // than disappearing abruptly. The glints share one material and geometry.
  const shimmerMaterial = new THREE.MeshBasicMaterial({color:0xffe5a2, transparent:true, opacity:0, depthWrite:false, blending:THREE.AdditiveBlending});
  const shimmerGeometry = new THREE.SphereGeometry(.042, 8, 6);
  const shimmer = Array.from({length:14}, (_, i) => {
    const point = new THREE.Mesh(shimmerGeometry, shimmerMaterial);
    point.visible=false;
    point.frustumCulled=false;
    point.renderOrder=7;
    point.userData.angle=i*2.399963;
    point.userData.height=.04+(i%7)*.088;
    point.scale.setScalar(i%3===0?1.2:.8);
    wand.add(point);
    return point;
  });

  const up=new THREE.Vector3(0,1,0), handPosition=new THREE.Vector3();
  const look=new THREE.Vector3(), tip=new THREE.Vector3(), start=new THREE.Vector3();
  const restDirection=new THREE.Vector3(), orientation=new THREE.Quaternion(), startOrientation=new THREE.Quaternion();
  let stage='hidden', time=0, dissolveTime=0;
  const duration=reducedMotion ? .45 : 2.35;
  const dissolveDuration=reducedMotion ? .55 : 1.65;
  function readHand(){
    if(hand){hand.updateWorldMatrix(true,false);hand.getWorldPosition(handPosition);}
    else {walker.updateWorldMatrix(true,false);walker.getWorldPosition(handPosition);handPosition.y+=1.05;}
    return handPosition;
  }
  function getDirection(target){
    if(target){look.copy(target).sub(readHand()); if(look.lengthSq()>.00001) return look.normalize();}
    // A raised diagonal keeps the gift readable at rest and above the floor.
    restDirection.set(.15,.9,.36).applyAxisAngle(up,walker.rotation.y).normalize();
    return restDirection;
  }
  function update(delta,{target=null}={}){
    if(stage==='hidden'||stage==='dissolved')return;
    const destinationHand=readHand();
    orientation.setFromUnitVectors(up,getDirection(target));
    if(stage==='gift'){
      time+=Math.max(0,delta);
      const t=THREE.MathUtils.clamp(time/duration,0,1), ease=THREE.MathUtils.smoothstep(t,0,1);
      wand.position.lerpVectors(start,destinationHand,ease);
      if(!reducedMotion)wand.position.y+=Math.sin(Math.PI*t)*.38;
      wand.quaternion.copy(startOrientation).slerp(orientation,ease);
      if(t>=1)stage='held';
    }else{
      wand.position.copy(destinationHand);
      wand.quaternion.copy(orientation);
    }
    if(stage==='dissolving'){
      dissolveTime+=Math.max(0,delta);
      const t=THREE.MathUtils.clamp(dissolveTime/dissolveDuration,0,1);
      const remaining=1-THREE.MathUtils.smoothstep(t,.05,.8);
      gold.opacity=remaining;handle.opacity=remaining;glow.opacity=remaining;
      aura.opacity=.25*remaining;
      shimmerMaterial.opacity=.85*THREE.MathUtils.smoothstep(t,0,.12)*(1-THREE.MathUtils.smoothstep(t,.65,1));
      shimmer.forEach((point,i)=>{
        const spread=reducedMotion?.055:.05+.28*t;
        point.position.set(Math.cos(point.userData.angle)*spread,point.userData.height+(reducedMotion?0:.38*t),Math.sin(point.userData.angle)*spread);
        point.visible=true;
      });
      if(t>=1){wand.visible=false;stage='dissolved';}
    }
    wand.updateWorldMatrix(true,false);
  }
  return {
    startGift(){
      if(stage!=='hidden')return;
      // The guide is a luminous apparition: the wand appears at her side,
      // then floats to the waiting hand as her final act of help.
      start.copy(guidePosition).add(new THREE.Vector3(.34,1.02,.12));
      wand.position.copy(start);
      startOrientation.setFromUnitVectors(up,new THREE.Vector3(.45,.88,.15).normalize());
      wand.quaternion.copy(startOrientation);
      wand.visible=true;stage='gift';time=0;
      wand.updateWorldMatrix(true,false);
    },
    dissolve(){
      if(stage!=='held')return;
      stage='dissolving';dissolveTime=0;
    },
    update,
    get complete(){return stage==='held'||stage==='dissolving'||stage==='dissolved';},
    get dissolved(){return stage==='dissolved';},
    get visible(){return wand.visible;},
    getTipWorldPosition(out=tip){wand.updateWorldMatrix(true,false);return out.set(0,.70,0).applyMatrix4(wand.matrixWorld);}
  };
}

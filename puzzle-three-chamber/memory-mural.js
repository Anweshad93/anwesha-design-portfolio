// A four-piece carved memory. The artwork is original canvas geometry: the
// seams of the arch, figure and horizon let a player reconstruct the scene.
export function createMemoryMural(THREE, scene, camera, controls, onRotate, onRestored) {
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=640;
  const c=canvas.getContext('2d');
  c.fillStyle='#b9966e';c.fillRect(0,0,640,640);
  // Sandstone grain and chisel-like inset frame.
  c.fillStyle='#c7a781';for(let i=0;i<48;i++){const x=(i*137)%640,y=(i*89)%640;c.fillRect(x,y,25+(i%4)*7,2);}
  c.strokeStyle='#725541';c.lineWidth=12;c.strokeRect(24,24,592,592);c.strokeStyle='#e8c998';c.lineWidth=4;c.strokeRect(36,36,568,568);
  // One continuous ground line and an arched doorway extend across seams.
  c.strokeStyle='#785945';c.lineWidth=12;c.beginPath();c.moveTo(40,506);c.lineTo(600,506);c.stroke();
  c.fillStyle='#7c624d';c.beginPath();c.moveTo(390,506);c.lineTo(390,176);c.quadraticCurveTo(390,72,485,63);c.quadraticCurveTo(580,72,580,176);c.lineTo(580,506);c.closePath();c.fill();
  c.strokeStyle='#e2be89';c.lineWidth=12;c.stroke();c.fillStyle='#d4aa6e';c.beginPath();c.moveTo(416,500);c.lineTo(416,178);c.quadraticCurveTo(416,101,485,90);c.quadraticCurveTo(554,101,554,178);c.lineTo(554,500);c.closePath();c.fill();
  // A person, carved in silhouette, extends an arm across the vertical seam.
  c.fillStyle='#675040';c.beginPath();c.arc(198,176,44,0,Math.PI*2);c.fill();
  c.beginPath();c.moveTo(164,222);c.quadraticCurveTo(118,246,109,349);c.lineTo(92,495);c.lineTo(282,495);c.lineTo(263,343);c.quadraticCurveTo(258,247,223,222);c.closePath();c.fill();
  c.strokeStyle='#675040';c.lineWidth=31;c.lineCap='round';c.beginPath();c.moveTo(242,262);c.lineTo(300,309);c.lineTo(371,287);c.stroke();
  c.strokeStyle='#a9825c';c.lineWidth=7;c.beginPath();c.moveTo(167,260);c.lineTo(154,465);c.moveTo(208,250);c.lineTo(230,466);c.stroke();
  // A small lantern and warm halo make the object recognizable.
  c.fillStyle='rgba(255,222,149,.32)';c.beginPath();c.arc(390,303,72,0,Math.PI*2);c.fill();
  c.strokeStyle='#674e36';c.lineWidth=10;c.strokeRect(365,274,50,70);c.beginPath();c.arc(390,274,17,Math.PI,0);c.stroke();c.fillStyle='#ffdc91';c.fillRect(374,283,32,51);
  c.fillStyle='#fbe5b4';for(const [x,y] of [[92,91],[287,76],[335,164],[563,296]]){c.beginPath();c.arc(x,y,4,0,Math.PI*2);c.fill();}
  const textures=[];
  for(let i=0;i<4;i++){const piece=document.createElement('canvas');piece.width=320;piece.height=320;piece.getContext('2d').drawImage(canvas,(i%2)*320,Math.floor(i/2)*320,320,320,0,0,320,320);const texture=new THREE.CanvasTexture(piece);texture.colorSpace=THREE.SRGBColorSpace;textures.push(texture);}
  // Four small carved stones float together above the landing. Their own
  // luminous edges provide the glow, without a circular backdrop.
  const frame=new THREE.Group();frame.position.set(-2.35,2.33,-4.32);frame.rotation.y=Math.atan2(camera.position.x-frame.position.x,camera.position.z-frame.position.z)+.18;frame.visible=false;scene.add(frame);
  const carving=new THREE.Group();carving.scale.setScalar(.56);carving.position.z=.15;frame.add(carving);
  // Three pieces need one clockwise turn each; the fourth is already aligned.
  const pieces=[],hitTargets=[], buttons=[...controls.querySelectorAll('[data-memory]')],state=[3,3,3,0],animations=[],glowEdges=[];let started=false,solved=false,delay=0,revealTime=0,revealing=false,glowTime=0;
  const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const names=['Upper left','Upper right','Lower left','Lower right'];
  // Rounded, bevelled sandstone blocks provide visible depth when they turn.
  // A lit, lightly embossed face keeps the continuous carved image readable.
  const tileShape=new THREE.Shape(),half=.49,r=.045;
  tileShape.moveTo(-half+r,-half);tileShape.lineTo(half-r,-half);tileShape.quadraticCurveTo(half,-half,half,-half+r);tileShape.lineTo(half,half-r);tileShape.quadraticCurveTo(half,half,half-r,half);tileShape.lineTo(-half+r,half);tileShape.quadraticCurveTo(-half,half,-half,half-r);tileShape.lineTo(-half,-half+r);tileShape.quadraticCurveTo(-half,-half,-half+r,-half);
  const tileGeometry=new THREE.ExtrudeGeometry(tileShape,{depth:.19,bevelEnabled:true,bevelThickness:.035,bevelSize:.035,bevelSegments:3,curveSegments:5});
  const tileSideMat=new THREE.MeshStandardMaterial({color:'#aa8661',roughness:.78,metalness:.04,emissive:'#67451e',emissiveIntensity:.12});
  for(let i=0;i<4;i++){
    const piece=new THREE.Group();piece.position.set((i%2-.5)*1.06,(.5-Math.floor(i/2))*1.06,.105);piece.rotation.z=-state[i]*Math.PI/2;carving.add(piece);pieces.push(piece);
    const block=new THREE.Mesh(tileGeometry,tileSideMat.clone());block.castShadow=true;block.receiveShadow=true;piece.add(block);
    // Fine, warm edges belong to each stone and rotate with it.
    for(const [x,y,w,h] of [[0,.49,.96,.026],[0,-.49,.96,.026],[-.49,0,.026,.96],[.49,0,.026,.96]]){
      const rimMaterial=new THREE.MeshStandardMaterial({color:'#f3ce85',metalness:.25,roughness:.42,emissive:'#e7a947',emissiveIntensity:1.05});
      const rim=new THREE.Mesh(new THREE.BoxGeometry(w,h,.035),rimMaterial);rim.position.set(x,y,.225);piece.add(rim);glowEdges.push(rimMaterial);
      // A narrow translucent fringe remains attached to the stone edge as it
      // turns, making the illumination visible without placing a disk behind it.
      const horizontal=w>h,fringe=new THREE.Mesh(new THREE.PlaneGeometry(horizontal?w+.05:.105,horizontal?.105:h+.05),new THREE.MeshBasicMaterial({color:'#ffd58c',transparent:true,opacity:.20,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,side:THREE.DoubleSide}));fringe.position.set(x,y,.249);piece.add(fringe);
    }
    const faceMaterial=new THREE.MeshStandardMaterial({map:textures[i],bumpMap:textures[i],bumpScale:.07,roughness:.8,emissive:'#a48462',emissiveMap:textures[i],emissiveIntensity:.28,side:THREE.DoubleSide});
    const face=new THREE.Mesh(new THREE.PlaneGeometry(.95,.95),faceMaterial);face.position.z=.229;face.userData.memoryIndex=i;face.receiveShadow=true;piece.add(face);hitTargets.push(face);
    buttons[i].addEventListener('click',()=>{if(started&&!solved)onRotate(i);});
  }
  function turn(i){if(!started||solved)return;const before=state[i];state[i]=(state[i]+1)%4;animations.push({piece:pieces[i],time:0,from:-before*Math.PI/2,to:-(before+1)*Math.PI/2});buttons[i].setAttribute('aria-label',`${names[i]} piece, turned ${state[i]*90} degrees. Rotate.`);if(state.every(v=>v===0)){solved=true;delay=2.8;frame.traverse(o=>{if(o.isMesh){o.material.userData.memoryOpacity=o.material.opacity;o.material.transparent=true;}});buttons.forEach(b=>b.disabled=true);}}
  return {show(){if(started||revealing)return;revealing=true;revealTime=0;frame.visible=true;frame.scale.setScalar(.78);frame.traverse(o=>{if(o.isMesh){o.material.transparent=true;o.material.userData.revealOpacity=o.material.opacity;o.material.opacity=0;}});},turn,hitTargets,getTarget(index){const target=new THREE.Vector3();if(hitTargets[index]){frame.updateWorldMatrix(true,true);hitTargets[index].getWorldPosition(target);}return target;},get ready(){return started&&!revealing;},get solved(){return solved;},update(dt){glowTime+=dt;const shimmer=reducedMotion?.matches?1:1+.08*Math.sin(glowTime*1.2);for(const material of glowEdges)material.emissiveIntensity=1.05*shimmer;if(revealing){revealTime+=dt;const t=THREE.MathUtils.smoothstep(revealTime,0,1.2);frame.scale.setScalar(.78+.22*t);frame.traverse(o=>{if(o.isMesh)o.material.opacity=o.material.userData.revealOpacity*t;});if(t>=1){revealing=false;started=true;frame.scale.setScalar(1);}}for(let i=animations.length-1;i>=0;i--){const a=animations[i];a.time+=dt;const t=THREE.MathUtils.smoothstep(a.time,0,.35);a.piece.rotation.z=THREE.MathUtils.lerp(a.from,a.to,t);a.piece.rotation.y=.16*Math.sin(Math.PI*t);a.piece.position.z=.105+.07*Math.sin(Math.PI*t);if(t>=1)animations.splice(i,1);}if(solved&&delay>0){delay-=dt;const fade=THREE.MathUtils.clamp(delay/1.3,0,1);frame.traverse(o=>{if(o.isMesh)o.material.opacity=o.material.userData.memoryOpacity*fade;});if(delay<=0){frame.visible=false;onRestored();}}}};
}

import * as THREE from '../game-demo/vendor/three.module.js';
import {createTraveler} from '../the-unfaithful-reflection-first-draft/traveler3d.js';
import {createInhabitant, createGroundProbe} from './inhabitants.js?v=4';
import {createGuide} from '../puzzle-two-garden/guide.js?v=visible-1';
import {createGuideBubble} from '../puzzle-four-doorway/guide-bubble.js?v=traveller-clear-1';
import {createGardenSounds} from '../puzzle-three-chamber/sounds.js';
import {createFinaleMusic} from './music-opening-loop.js?v=1';
import {createSanctuaryReflection} from './sanctuary-reflection.js?v=7';
import {createReunionFinale} from './reunion-finale.js?v=1';
import {createFortressAtmosphere} from './fortress-atmosphere.js?v=1';
import {createGuideWand} from './guide-wand.js?v=2';
import {watchFinalJournal} from './ending-choices.js?v=2';
import {createSanctuaryFootsteps} from './footsteps.js?v=1';
import {dismissOpening} from '../journey-ui/opening-transition.js?v=1';
import {createChapterProgress} from '../journey-ui/chapter-progress.js?v=2';
import {mountJournal} from '../journey-journal/journal.js?v=journey-five-20261120';
import {revealChapterReward} from '../journey-transition.js?v=journey-five-20261120';
const $=s=>document.querySelector(s), journal=mountJournal({chapter:5}),progress=createChapterProgress(5);
const scene=new THREE.Scene();scene.background=new THREE.Color('#52767b');scene.fog=new THREE.Fog('#52767b',24,56);
const camera=new THREE.OrthographicCamera(-10,10,8,-8,.1,100);camera.position.set(12,17,20);camera.lookAt(0,1,0);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.shadowMap.enabled=true;$('#scene').appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight('#fff2d8','#37575a',2));const sun=new THREE.DirectionalLight('#ffe4b3',2);sun.position.set(-8,14,5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-13;sun.shadow.camera.right=13;sun.shadow.camera.top=13;sun.shadow.camera.bottom=-13;scene.add(sun);
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.75,...extra});const ivory=mat('#ddcbb0'),pale=mat('#f3dfbf'),stone=mat('#ac9c8a'),dark=mat('#486d6a'),gold=mat('#d3aa69',{metalness:.6,roughness:.32}),light=mat('#ffdc94',{emissive:'#d98c38',emissiveIntensity:.7}),water=mat('#497e80',{metalness:.42,roughness:.2}),foliage=mat('#597e70'),rose=mat('#bf8275');
function box(w,h,d,x,y,z,m,parent=scene){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}function cyl(rt,rb,h,x,y,z,m,parent=scene){const o=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,48),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}function ball(r,x,y,z,m,parent=scene){const o=new THREE.Mesh(new THREE.SphereGeometry(r,16,12),m);o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o}function ring(r,t,y,m,parent=scene){const o=new THREE.Mesh(new THREE.TorusGeometry(r,t,8,96),m);o.rotation.x=Math.PI/2;o.position.y=y;parent.add(o);return o}
// An open circular sanctuary surrounds an inset still pool, leaving the view clear.
cyl(9,9,.5,0,-.25,0,stone);cyl(8.8,8.8,.12,0,.06,0,ivory);ring(8.45,.06,.15,gold);
// Leave a doorway-sized break in the inner floor rail, so it does not run
// through the threshold beneath the returning inhabitants.
const railGap=.27,innerRail=new THREE.Mesh(new THREE.TorusGeometry(7.4,.04,8,96,Math.PI*2-2*railGap),gold);
innerRail.rotation.set(Math.PI/2,0,Math.PI*1.5+railGap);innerRail.position.y=.15;scene.add(innerRail);
cyl(4.8,4.8,.16,0,.14,-.7,gold);cyl(4.58,4.58,.14,0,.23,-.7,dark);const reflection=createSanctuaryReflection(THREE,scene);const poolRim=ring(4.45,.055,.36,light);poolRim.position.z=-.7;reflection.excludeFromReflection(poolRim);
// Flagstone paths and radial inlaid compass lines.
for(let i=0;i<12;i++){const a=i*Math.PI/6;const x=Math.sin(a)*6.75,z=Math.cos(a)*6.75;const tile=box(1.6,.006,1.0,x,.122,z,pale);tile.rotation.y=a;const studs=ball(.055,Math.sin(a)*7.8,.2,Math.cos(a)*7.8,light);}
// Slender arcades, hanging foliage and warm jewel lamps outline the room.
function arch(x,z,rotation){const group=new THREE.Group();group.position.set(x,.13,z);group.rotation.y=rotation;scene.add(group);cyl(.16,.2,3.2,-1.1,1.6,0,pale,group);cyl(.16,.2,3.2,1.1,1.6,0,pale,group);const arc=new THREE.Mesh(new THREE.TorusGeometry(1.1,.14,8,32,Math.PI),pale);arc.position.set(0,3.2,0);group.add(arc);const inner=new THREE.Mesh(new THREE.TorusGeometry(.94,.035,8,32,Math.PI),gold);inner.position.set(0,3.2,.03);group.add(inner);ball(.19,0,3.0,0,light,group);for(let j=0;j<3;j++){const leaf=ball(.22,-.85+j*.3,4.05-j*.12,.08,foliage,group);leaf.scale.set(1.4,.6,.8)}return group}
for(let i=0;i<7;i++){const a=Math.PI*(.66+i*.115);arch(Math.sin(a)*7.6,Math.cos(a)*7.6,-a)}
for(const [x,z] of [[-6,3.4],[6,3.4],[-6,-3.7],[6,-3.7]]){cyl(.52,.65,.36,x,.28,z,rose);cyl(.43,.5,.55,x,.68,z,stone);for(let j=0;j<9;j++){let a=j*Math.PI*2/9;let b=ball(.32,x+Math.cos(a)*.38,1.28+Math.sin(j*2)*.12,z+Math.sin(a)*.38,foliage);b.scale.set(.7,1.35,.7)}ball(.14,x,1.7,z,light)}
// Two real door leaves sit on side hinges. They open out into the sanctuary,
// revealing the illuminated passage; the threshold stays level with the path.
const portal=new THREE.Group();portal.position.set(0,.2,-7.3);scene.add(portal);
box(3.6,.06,.8,0,-.099,0,gold,portal);
const doorGlowMaterial=new THREE.MeshBasicMaterial({color:'#ffdf9d',transparent:true,opacity:0});
const doorLight=box(2.4,3.1,.035,0,1.51,-1,doorGlowMaterial,portal);doorLight.visible=false;doorLight.castShadow=false;
const doorWood=mat('#315950',{roughness:.68}),doorTrim=mat('#c5a06a',{metalness:.6,roughness:.4});
// The pins sit inside the stone jambs. The narrow fixed side panels fill the
// rest of the opening without occupying the moving leaves' sweep.
for(const side of [-1,1])box(.2,3.1,.08,side*1.1,1.57,-.12,doorWood,portal);
const leftDoor=new THREE.Group(),rightDoor=new THREE.Group();leftDoor.position.set(-1,.06,.07);rightDoor.position.set(1,.06,.07);portal.add(leftDoor,rightDoor);
function doorLeaf(hinge,direction){
  const centre=direction*.5;
  box(1,3.1,.14,centre,1.51,0,doorWood,hinge);
  // Narrow inset borders and a handle give each hinged leaf a readable face.
  for(const x of [direction*.12,direction*.88])box(.045,2.65,.03,x,1.52,.085,doorTrim,hinge);
  for(const y of [.22,2.83])box(.76,.045,.03,centre,y,.085,doorTrim,hinge);
  ball(.07,direction*.82,1.34,.15,doorTrim,hinge);
}
doorLeaf(leftDoor,1);doorLeaf(rightDoor,-1);
cyl(.23,.25,3.5,-1.45,1.8,.15,pale,portal);cyl(.23,.25,3.5,1.45,1.8,.15,pale,portal);const portalArc=new THREE.Mesh(new THREE.TorusGeometry(1.45,.2,10,40,Math.PI),pale);portalArc.position.set(0,3.5,.15);portal.add(portalArc);
const doorSpillMaterial=new THREE.MeshBasicMaterial({color:'#f3cd88',transparent:true,opacity:0,depthWrite:false});
const doorSpill=new THREE.Mesh(new THREE.CircleGeometry(1.7,48),doorSpillMaterial);doorSpill.rotation.x=-Math.PI/2;doorSpill.scale.set(1,.65,1);doorSpill.position.set(0,.129,-6.55);scene.add(doorSpill);
// Small windows slowly warm after the inhabitants return.
const windows=[];for(const x of [-5.4,-4.2,4.2,5.4]){const frame=box(.65,1.05,.1,x,2.7,-6.8,stone);const pane=box(.45,.78,.06,x,2.72,-6.71,dark);const glow=box(.43,.76,.04,x,2.72,-6.67,light);glow.visible=false;windows.push(glow)}
const avatar=await createTraveler(THREE,scene),walker=avatar.group;walker.position.set(0,.128,6.3);walker.scale.setScalar(1.48);walker.rotation.y=Math.PI;const spirit=createGuide(THREE,scene,camera),bubble=createGuideBubble(THREE,camera,$('#game'),$('.guide'));const guidePos=new THREE.Vector3(-4.5,.45,3.5);
// The portrait camera sees a narrower slice of the sanctuary. Bring the guide
// inside that frame, keeping her on the near bank beside the traveller.
function positionGuide(){const portrait=$('#game').clientWidth/$('#game').clientHeight<.8;guidePos.set(portrait?-1.6:-4.5,.45,portrait?3.8:3.5)}
// Three independent people: two female characters with their own human rigs,
// walking and idle clips, and a male inhabitant using the traveller's rig.
const people=new THREE.Group();scene.add(people);people.visible=false;
const residents=await Promise.all([
  createInhabitant(THREE,people,'./assets/characters/farmer-woman.glb',1.58),
  createTraveler(THREE,people),
  createInhabitant(THREE,people,'./assets/characters/elderly-woman.glb',1.53,{walkTimeScale:.82})
]);
residents[1].group.scale.setScalar(1.45);
residents.forEach((person,i)=>{person.group.name=`Inhabitant ${i+1}`});
const [resident,resident2,resident3]=residents.map(person=>person.group);
resident.position.set(-.75,.128,-6.15);resident2.position.set(.18,.128,-6.65);resident3.position.set(.85,.128,-6.7);
const groundAvatar=createGroundProbe(THREE,walker),groundResidents=residents.map(person=>createGroundProbe(THREE,person.group));
groundAvatar();groundResidents.forEach(ground=>ground());
// Each foot has its own faint contact shadow. Its position follows the rig's
// foot bone, and its opacity fades as that foot lifts during a step.
const footShadows=[];
for(const [character,isResident] of [[avatar,false],...residents.map(person=>[person,true])]){
  character.group.updateWorldMatrix(true,true);
  for(const boneName of ['LeftFoot','RightFoot']){
    const bone=character.group.getObjectByName(boneName);if(!bone)continue;
    const point=bone.getWorldPosition(new THREE.Vector3());
    const shadow=new THREE.Mesh(new THREE.CircleGeometry(1,20),new THREE.MeshBasicMaterial({color:'#3e4540',transparent:true,opacity:.19,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));
    shadow.rotation.x=-Math.PI/2;shadow.scale.set(.095,.145,1);shadow.position.set(point.x,.13,point.z);scene.add(shadow);
    footShadows.push({character,bone,shadow,restHeight:point.y,isResident});
  }
}
function updateFootShadows(){
  for(const item of footShadows){
    const visible=(!item.isResident||people.visible)&&item.character.group.visible;
    item.shadow.visible=visible;if(!visible)continue;
    item.bone.updateWorldMatrix(true,false);const point=item.bone.getWorldPosition(new THREE.Vector3());
    item.shadow.position.set(point.x,.13,point.z);
    item.shadow.material.opacity=.20*THREE.MathUtils.clamp(1-Math.max(0,point.y-item.restHeight)/.16,0,1);
  }
}

// A quiet hand-to-heart gesture completes the reunion. The arm is posed after
// the idle animation each frame, so the hand never freezes in the walk cycle.
function aimJoint(joint,child,target){if(!joint||!child||!joint.parent)return;scene.updateMatrixWorld(true);const origin=joint.getWorldPosition(new THREE.Vector3());const from=child.getWorldPosition(new THREE.Vector3()).sub(origin),to=target.clone().sub(origin);if(from.lengthSq()<1e-8||to.lengthSq()<1e-8)return;const delta=new THREE.Quaternion().setFromUnitVectors(from.normalize(),to.normalize()),parent=joint.parent.getWorldQuaternion(new THREE.Quaternion());joint.quaternion.premultiply(parent.clone().invert().multiply(delta).multiply(parent));}
function thankPerson(person,blend){const upper=person.getObjectByName('RightArm')||person.getObjectByName('UpperArmR'),forearm=person.getObjectByName('RightForeArm')||person.getObjectByName('LowerArmR'),hand=person.getObjectByName('RightHand')||person.getObjectByName('FistR');if(!upper||!forearm||!hand)return;const restUpper=upper.quaternion.clone(),restForearm=forearm.quaternion.clone();const target=person.localToWorld(new THREE.Vector3(.02,person.userData.greetingHeight??.72,.18));for(let i=0;i<4;i++){aimJoint(forearm,hand,target);aimJoint(upper,hand,target)}const poseUpper=upper.quaternion.clone(),poseForearm=forearm.quaternion.clone();upper.quaternion.copy(restUpper).slerp(poseUpper,blend);forearm.quaternion.copy(restForearm).slerp(poseForearm,blend);}
const effects=createGardenSounds(),music=createFinaleMusic({src:'./assets/quiet-reflection-opening.mp3'});let sound=true;try{sound=sessionStorage.getItem('unfaithful-reflection-sound')!=='off'}catch(_){}music.setEnabled(sound);effects.setEnabled(sound);
const footfalls=createSanctuaryFootsteps(THREE);footfalls.setEnabled(sound);
let started=false,paused=false,phase='reflection',guideTime=0,elapsed=0,reunionTime=0,welcomeTime=0,done=false,settleTime=0,doorTime=0;const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
watchFinalJournal({isFinished:()=>done&&!$('#ending').classList.contains('hidden')});
const ambience=createFortressAtmosphere({THREE,scene,sun,reducedMotion:reduce});
const finale=createReunionFinale({THREE,scene,reducedMotion:reduce});
const wand=createGuideWand({THREE,scene,walker,guidePosition:guidePos,reducedMotion:reduce});
// The traveller approaches the edge while the memory is shown, then reaches
// towards each chosen light. A small thread of the chosen colour connects the
// gesture to the water, making the player's choice part of the scene.
const memoryArm=walker.getObjectByName('RightArm');
const memoryElbow=walker.getObjectByName('RightForeArm');
const memoryHand=walker.getObjectByName('RightHand');
const memoryColours=[0xf5cf80,0x84e4d4,0xc8a4ee];
const memoryGlowMaterial=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
const memoryThread=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,1,8),memoryGlowMaterial);
const memoryGlint=new THREE.Mesh(new THREE.SphereGeometry(.085,12,8),memoryGlowMaterial);
memoryThread.frustumCulled=false;memoryThread.renderOrder=6;memoryGlint.renderOrder=6;
scene.add(memoryThread,memoryGlint);memoryThread.visible=false;memoryGlint.visible=false;
let memoryGesture=null,memoryRest=null,memoryApproach=false,memoryReturn=false;
function restoreMemoryArm(){if(memoryRest&&memoryArm&&memoryElbow){memoryArm.quaternion.copy(memoryRest.upper);memoryElbow.quaternion.copy(memoryRest.lower);}memoryRest=null;}
function cancelMemoryGesture(){restoreMemoryArm();memoryGesture=null;memoryThread.visible=false;memoryGlint.visible=false;}
function gestureToLight(index){
  if(!memoryArm||!memoryElbow||!memoryHand)return;
  memoryGesture={index,time:0};
  memoryGlowMaterial.color.setHex(memoryColours[index]);
}
function updateTraveller(dt){
  // Restore the last unposed animation frame before advancing the mixer;
  // constant idle tracks otherwise retain procedural joint rotations.
  restoreMemoryArm();
  let moving=false;
  if(memoryApproach){
    if(reduce){walker.position.z=4.8;memoryApproach=false;}
    else {walker.rotation.y=Math.PI;walker.position.z=Math.max(4.8,walker.position.z-1.05*dt);moving=walker.position.z>4.8;memoryApproach=moving;}
  }else if(memoryReturn&&!memoryGesture){
    if(!wand.dissolved){wand.dissolve();}
    else if(reduce){walker.position.z=6.3;walker.rotation.y=Math.PI;memoryReturn=false;}
    else if(memoryReturn.stage==='walk'){
      walker.position.z=Math.min(6.3,walker.position.z+.96*dt);moving=walker.position.z<6.3;
      if(!moving)memoryReturn.stage='face-water';
    }else{
      const target=memoryReturn.stage==='turn'?0:Math.PI;
      const angle=Math.atan2(Math.sin(target-walker.rotation.y),Math.cos(target-walker.rotation.y));
      walker.rotation.y+=THREE.MathUtils.clamp(angle,-dt*4,dt*4);
      if(Math.abs(angle)<.04){walker.rotation.y=target;if(memoryReturn.stage==='turn')memoryReturn.stage='walk';else memoryReturn=false;}
    }
  }
  avatar.update(dt,{moving,onFootstep:side=>footfalls.step(side)});
  if(!memoryGesture){wand.update(dt);return;}
  const action=memoryGesture;action.time+=dt;
  const duration=reduce?.8:1.6,t=action.time/duration;
  if(t>=1){cancelMemoryGesture();wand.update(dt);return;}
  memoryRest={upper:memoryArm.quaternion.clone(),lower:memoryElbow.quaternion.clone()};
  scene.updateMatrixWorld(true);
  const shoulder=memoryArm.getWorldPosition(new THREE.Vector3());
  const lightPosition=new THREE.Vector3((action.index-1)*2.15,.39,-.7);
  const direction=lightPosition.clone().sub(shoulder);direction.y=-.18;direction.normalize();
  const handTarget=shoulder.clone().addScaledVector(direction,.43);
  const blend=reduce?1:THREE.MathUtils.smoothstep(t,0,.2)*(1-THREE.MathUtils.smoothstep(t,.68,1));
  for(let i=0;i<4;i++){aimJoint(memoryElbow,memoryHand,handTarget);aimJoint(memoryArm,memoryHand,handTarget);}
  const posedUpper=memoryArm.quaternion.clone(),posedLower=memoryElbow.quaternion.clone();
  memoryArm.quaternion.copy(memoryRest.upper).slerp(posedUpper,blend);
  memoryElbow.quaternion.copy(memoryRest.lower).slerp(posedLower,blend);
  scene.updateMatrixWorld(true);
  wand.update(dt,{target:lightPosition});
  const hand=wand.getTipWorldPosition(new THREE.Vector3());
  const threadEnd=lightPosition.clone();threadEnd.y+=.09;
  const line=threadEnd.clone().sub(hand),length=line.length();
  memoryThread.position.copy(hand).addScaledVector(line,.5);
  memoryThread.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),line.clone().normalize());
  memoryThread.scale.set(1,length,1);
  memoryGlint.position.copy(hand).addScaledVector(line,reduce?.6:THREE.MathUtils.clamp((t-.12)/.6,0,1));
  memoryGlowMaterial.opacity=.58*blend;
  memoryThread.visible=true;memoryGlint.visible=true;
}
function showGuide(message,seconds=12){positionGuide();$('#guide').textContent=message;$('.guide').classList.toggle('memory-help',phase==='remembering');$('.guide').classList.remove('hidden');guideTime=seconds;spirit.show(guidePos);bubble.show(guidePos,walker.position)}function hideGuide(){guideTime=0;spirit.hide();$('.guide').classList.add('hidden');$('.guide').classList.remove('memory-help');bubble.hide()}
function refresh(){
  $('#begin-reflection').hidden=phase!=='reflection';
  $('#begin-reflection').disabled=!wand.complete;
  $('#reflection-puzzle').hidden=phase!=='remembering';
  $('#return-home').hidden=phase!=='ready';
  $('#welcome-home').hidden=phase!=='reunion'||!reunionReady();
  $('#finish').hidden=phase!=='welcoming'||welcomeTime<(reduce?1:5);
  if(phase==='reflection'){$('#objective').textContent='Read the water’s memory.';$('#status').textContent='Three lights shimmer beneath the reflection.';progress.update(.12)}
  else if(phase==='remembering'){$('#objective').textContent='Follow the lights in the water.';$('#status').textContent='Watch the pattern, then repeat it.'}
  else if(phase==='settling'){$('#objective').textContent='Let the water grow still.';$('#status').textContent='The sanctuary comes into focus.';progress.update(.65)}
  else if(phase==='ready'){$('#objective').textContent='Open the way home.';$('#status').textContent='The water is clear. The way home is ready.';progress.update(.72)}
  else if(phase==='opening-door'){$('#objective').textContent='The way home is opening.';$('#status').textContent='Warm light spills through the doorway.';progress.update(.78)}
  else if(phase==='reunion'){$('#objective').textContent='Welcome the inhabitants home.';$('#status').textContent='The inhabitants are finding their way back.';progress.update(.86)}
  else if(phase==='welcoming'){$('#objective').textContent='The fortress welcomes them home.';$('#status').textContent='A grateful greeting brings light to the sanctuary.';progress.update(.95)}
  else if(phase==='done')progress.update(1);
}
$('#start').onclick=()=>{started=true;dismissOpening($('#opening'));effects.unlock();footfalls.unlock();music.start();refresh();showGuide('My final gift: this wand will help you follow the lights and bring them home.',15);wand.startGift()};
$('#begin-reflection').onclick=()=>{if(paused||phase!=='reflection'||!wand.complete)return;phase='remembering';memoryApproach=true;ambience.setProgress(0);reflection.beginMemory();$('#memory-status').textContent='Watch the lights, then repeat their order.';refresh();hideGuide()};
$('#replay-reflection').onclick=()=>{if(paused||phase!=='remembering')return;cancelMemoryGesture();hideGuide();reflection.replayMemory();$('#memory-status').textContent='Watch the remaining lights again.'};
document.querySelectorAll('[data-memory-choice]').forEach(button=>button.onclick=()=>{
  if(paused||phase!=='remembering')return;
  const result=reflection.chooseMemory(Number(button.dataset.memoryChoice));
  if(result.result==='playing')return;
  if(result.result==='wrong'){
    cancelMemoryGesture();
    $('#memory-status').textContent='Not quite. Try another remaining light.';
    showGuide(result.count ? 'The lights you freed are safe. Try another, or replay the rest.' : 'Take your time. Replay the lights, then try again.',7);
    return;
  }
  hideGuide();
  gestureToLight(Number(button.dataset.memoryChoice));
  ambience.setProgress(result.count);
  if(result.result==='complete'){phase='settling';settleTime=0;memoryReturn={stage:'turn'};reflection.calm();effects.correctTile();refresh();showGuide('The water remembers. The people are close now.',8);return;}
  $('#memory-status').textContent=`${result.count} of ${result.total} lights matched.`;progress.update(.2+.1*result.count);effects.correctTile();
});
function startReunion(){phase='reunion';people.visible=true;reunionTime=0;leadDistance=0;refresh();showGuide('They were trapped within the reflection. Your discoveries awakened them and lit their way home.',3)}
function updateDoor(dt){
  if(phase!=='opening-door')return;
  doorTime+=dt;
  const opening=reduce?1:THREE.MathUtils.smoothstep(doorTime,0,2.6);
  // A right-angle swing opens the passage without passing through the jambs
  // or neighbouring arcade columns. The paths exit through the clear centre.
  leftDoor.rotation.y=-opening*Math.PI*(95/180);rightDoor.rotation.y=opening*Math.PI*(95/180);
  doorGlowMaterial.opacity=reduce?1:THREE.MathUtils.smoothstep(opening,.05,.55);
  doorSpillMaterial.opacity=.16*doorGlowMaterial.opacity;
  // Frame the complete doorway in portrait while the door opens, then hold
  // that view briefly as the first person crosses the threshold.
  if($('#game').clientWidth/$('#game').clientHeight<.8){cameraPan=reduce?1.15:THREE.MathUtils.lerp(cameraPan,1.15,Math.min(1,dt*2));updateCamera();}
  if(opening>=1)startReunion();
}
$('#return-home').onclick=()=>{if(paused||phase!=='ready')return;phase='opening-door';doorTime=0;doorLight.visible=true;effects.door();music.beginFlip();refresh();hideGuide()};
$('#welcome-home').onclick=()=>{if(paused||phase!=='reunion'||!reunionReady())return;phase='welcoming';welcomeTime=0;finale.start();effects.correctTile();refresh();showGuide('They have found their way home. The fortress is alive again.',10)};
$('#finish').onclick=()=>{if(paused||phase!=='welcoming'||welcomeTime<(reduce?1:5))return;phase='done';done=true;hideGuide();refresh();journal.record(5);$('#ending').classList.remove('hidden');revealChapterReward(journal,5,null,()=>done&&!$('#ending').classList.contains('hidden'))};
$('#hint').onclick=()=>{const msg=phase==='reflection'?'Watch the three lights in the water, then repeat their colours.':phase==='remembering'?'Watch the lights, then choose the same three colours. Replay the remaining lights if you need to see them again.':phase==='settling'?'The ripples are settling. Wait for the water to grow still.':phase==='ready'?'The reflection is clear. Open the way home.':phase==='opening-door'?'The door is opening. The inhabitants will follow the light home.':phase==='reunion'?'Wait for the inhabitants to reach the traveller, then welcome them home.':'The inhabitants have returned. Take a moment to remember.';showGuide(msg,12)};
function soundLabel(){$('#sound').textContent=sound?'Sound on':'Sound off';$('#sound').setAttribute('aria-pressed',String(sound))}soundLabel();$('#sound').onclick=()=>{sound=!sound;try{sessionStorage.setItem('unfaithful-reflection-sound',sound?'on':'off')}catch(_){}effects.setEnabled(sound&&!paused);footfalls.setEnabled(sound&&!paused);music.setEnabled(sound);if(sound&&!paused){effects.unlock();footfalls.unlock()}soundLabel()};function setPause(v){if(!started||done)return;paused=v;$('#pause-panel').classList.toggle('hidden',!v);$('#pause').textContent=v?'Resume':'Pause';$('#pause').setAttribute('aria-pressed',String(v));effects.setEnabled(sound&&!v);footfalls.setEnabled(sound&&!v);music.setPaused(v);if(!v&&sound){effects.unlock();footfalls.unlock()}}$('#pause').onclick=()=>setPause(!paused);$('#resume').onclick=()=>setPause(false);$('#restart').onclick=()=>location.reload();let journalPaused=false;document.addEventListener('journal:open',()=>{journalPaused=started&&!done&&!paused;if(journalPaused)setPause(true)});document.addEventListener('journal:close',()=>{if(journalPaused)setPause(false);journalPaused=false});
let cameraFocus=0,cameraPan=0;
function updateCamera(){
  const portrait=$('#game').clientWidth/$('#game').clientHeight<.8;
  // In a portrait viewport follow the two people across the entire curved walk.
  // The crop pans gently, keeping their full figures visible without shrinking them.
  const shiftX=portrait?.857*cameraPan:-.65*cameraFocus;
  const shiftZ=portrait?-.514*cameraPan:1.3*cameraFocus;
  camera.position.set(12+shiftX,17,20+shiftZ);camera.lookAt(shiftX,1,shiftZ);
  camera.zoom=1+(portrait?.20:.34)*cameraFocus;camera.updateProjectionMatrix();
}
function resize(){const w=$('#game').clientWidth,h=$('#game').clientHeight,aspect=w/h,view=aspect<.8?11:9;camera.left=-view*aspect;camera.right=view*aspect;camera.top=view;camera.bottom=-view;updateCamera();renderer.setSize(w,h);if(guideTime>0){positionGuide();spirit.show(guidePos);bubble.show(guidePos,walker.position)}else bubble.update()}window.addEventListener('resize',resize);resize();$('#loading').classList.add('hidden');refresh();
// Follow the paved outer ring around the pool, with speed based on distance.
const route=[[-.35,-7.72],[-.35,-6.0],[-2.3,-5.55],[-3.3,-5],[-3.55,-4.35],[-4.25,-3.75],[-4.9,-2.3],[-5.4,0],[-4.55,3.35],[-3.6,5.3],[-1.65,6.2]];
// Curved, distance-paced travel avoids a sudden sideways lurch at the first
// corner. Arc-length sampling keeps her speed steady around the curve.
const leadCurve=new THREE.CatmullRomCurve3(route.map(([x,z])=>new THREE.Vector3(x,0,z)),false,'centripetal');
leadCurve.arcLengthDivisions=1000;
const routeLength=leadCurve.getLength(),walkSpeed=1.65;
let leadDistance=0;
// The other two people follow their own curved routes from the doorway. Their
// visible heading is aligned to the first step before they emerge. The route
// speed follows the measured planted-foot motion of each walk clip, so they
// move with their steps rather than running in place or sliding sideways.
const backgroundWalks = [
  {person:residents[1],start:.9,speed:.96,points:[[.18,-7.72],[.18,-6.68],[-.05,-5.95],[-1.4,-5.85]]},
  {person:residents[2],start:2.9,speed:.96,points:[[.45,-7.72],[.45,-6.68],[.45,-5.92],[1.6,-5.8]]}
].map(item=>{
  const curve=new THREE.CatmullRomCurve3(item.points.map(([x,z])=>new THREE.Vector3(x,0,z)),false,'centripetal');
  return {...item,curve,length:curve.getLength(),distance:0,walkTime:0,visible:false};
});
function reunionReady(){
  return reunionTime>=(reduce?1:11.5)&&leadDistance>=routeLength&&backgroundWalks.every(item=>item.distance>=item.length);
}
function updateBackgroundWalk(item, dt) {
  const {person,curve,length}=item,g=person.group;
  if (!reduce && reunionTime<item.start) {g.visible=false;return;}
  if (!item.visible) {
    // Hidden characters can be oriented immediately without a visible snap.
    const tangent=curve.getTangentAt(reduce?1:0);
    g.rotation.y=Math.atan2(tangent.x,tangent.z);
    g.visible=true; item.visible=true;
  }
  if (reduce) item.distance=length;
  else if (item.distance<length) {
    item.walkTime+=dt;
    const easeIn=THREE.MathUtils.smoothstep(item.walkTime,0,.22);
    const easeOut=THREE.MathUtils.smoothstep(length-item.distance,0,.16);
    item.distance=Math.min(length,item.distance+Math.max(.12,easeOut)*easeIn*item.speed*dt);
    // Finish the last tiny fraction rather than easing asymptotically forever.
    if (length-item.distance<.006) item.distance=length;
  }
  const u=length?item.distance/length:1,point=curve.getPointAt(u),tangent=curve.getTangentAt(u);
  g.position.x=point.x;g.position.z=point.z;
  const walking=!reduce&&item.distance<length;
  // Follow the path while walking; once settled, acknowledge the traveller.
  // The shortest-angle turn avoids a full spin and keeps the walk aligned
  // with the direction of travel. Reduced motion settles in the final pose.
  const heading=walking?Math.atan2(tangent.x,tangent.z):Math.atan2(walker.position.x-g.position.x,walker.position.z-g.position.z);
  const delta=Math.atan2(Math.sin(heading-g.rotation.y),Math.cos(heading-g.rotation.y));
  if(reduce)g.rotation.y=heading;
  else g.rotation.y+=THREE.MathUtils.clamp(delta,-dt*(walking?5:1.7),dt*(walking?5:1.7));
  person.update(dt,{moving:walking,onFootstep:side=>footfalls.step(side,true)});
  if(person===residents[2])footfalls.track(g,walking,dt,true);
}
function updateReunion(dt){
  reunionTime+=dt;
  if(reduce)leadDistance=routeLength;
  else if(leadDistance<routeLength){
    const easeIn=THREE.MathUtils.smoothstep(reunionTime,0,.3);
    const easeOut=THREE.MathUtils.smoothstep(routeLength-leadDistance,0,.18);
    leadDistance=Math.min(routeLength,leadDistance+walkSpeed*dt*easeIn*Math.max(.18,easeOut));
    if(routeLength-leadDistance<.006)leadDistance=routeLength;
  }
  const progress=routeLength?leadDistance/routeLength:1;
  const leadPoint=leadCurve.getPointAt(progress),leadTangent=leadCurve.getTangentAt(progress);
  resident.position.x=leadPoint.x;resident.position.z=leadPoint.z;
  const approaching=leadDistance<routeLength;
  const desired=approaching?Math.atan2(leadTangent.x,leadTangent.z):Math.atan2(walker.position.x-resident.position.x,walker.position.z-resident.position.z);
  const angle=Math.atan2(Math.sin(desired-resident.rotation.y),Math.cos(desired-resident.rotation.y));if(reduce)resident.rotation.y=desired;else resident.rotation.y+=THREE.MathUtils.clamp(angle,-dt*4,dt*4);
  residents[0].update(dt,{moving:approaching&&!reduce});
  footfalls.track(resident,approaching&&!reduce,dt,true);
  if(!approaching){if(phase==='welcoming'){const greeting=reduce?1:THREE.MathUtils.smoothstep(welcomeTime,0,1.1);thankPerson(resident,greeting);thankPerson(walker,greeting);}const toward=Math.atan2(resident.position.x-walker.position.x,resident.position.z-walker.position.z),turn=Math.atan2(Math.sin(toward-walker.rotation.y),Math.cos(toward-walker.rotation.y));walker.rotation.y+=THREE.MathUtils.clamp(turn,-dt*1.8,dt*1.8);}
  // Each person emerges at a different time, then faces the traveller.
  // The reduced-motion version places both in their final pose immediately.
  backgroundWalks.forEach(item=>updateBackgroundWalk(item,dt));
  windows.forEach((pane,i)=>{pane.visible=phase==='welcoming'&&(reduce||welcomeTime>i*.55)});
  // Ease closer as the visitor arrives, while retaining the pool and doorway
  // in view. Reduced motion switches to the settled composition immediately.
  cameraFocus=reduce?1:THREE.MathUtils.smoothstep(reunionTime,8.3,12);
  if($('#game').clientWidth/$('#game').clientHeight<.8){
    const leadScreen=.857*resident.position.x-.514*resident.position.z;
    const travellerScreen=.857*walker.position.x-.514*walker.position.z;
    // Keep the doorway in view until the last inhabitant has crossed it,
    // then follow the first inhabitant toward the traveller.
    const desiredPan=reunionTime<4.8?1.15:THREE.MathUtils.clamp((leadScreen+travellerScreen)/2,-2.1,0);
    cameraPan=reduce?desiredPan:THREE.MathUtils.lerp(cameraPan,desiredPan,Math.min(1,dt*2));
  }
  updateCamera();
  if(phase==='reunion'&&reunionReady()&&$('#welcome-home').hidden){$('#welcome-home').hidden=false;$('#status').textContent='The inhabitants have reached the sanctuary.';}
  if(phase==='welcoming'&&welcomeTime>=(reduce?1:5)&&$('#finish').hidden){$('#finish').hidden=false;$('#status').textContent='An inhabitant offers a quiet gesture of thanks.';}
}
const clock=new THREE.Clock();function frame(){requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.05);if(!paused){elapsed+=dt;music.update(dt);reflection.update(dt);ambience.update(dt);finale.update(dt);if(phase==='settling'){settleTime+=dt;if(settleTime>=3&&!memoryReturn){phase='ready';refresh();showGuide('The reflection is clear. Their way home is open.',10)}}if(guideTime>0){guideTime-=dt;if(guideTime<=0)hideGuide()}spirit.update(dt);bubble.update();updateTraveller(dt);updateDoor(dt);if(phase==='reflection')$('#begin-reflection').disabled=!wand.complete;if(phase==='welcoming')welcomeTime+=dt;if(phase==='reunion'||phase==='welcoming')updateReunion(dt);groundAvatar();if(people.visible)groundResidents.forEach((ground,i)=>{if(residents[i].group.visible)ground()});updateFootShadows();}reflection.render(renderer,scene,camera);renderer.render(scene,camera)}frame();

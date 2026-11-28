import {registerMusicHandoff} from '../journey-ui/audio-handoff.js?v=2';
import { dismissOpening } from '../journey-ui/opening-transition.js?v=1';
import { chooseGuidePosition, projectWorldBox } from '../journey-ui/guide-layout.js?v=5';
import * as THREE from '../game-demo/vendor/three.module.js';
import {createTraveler} from '../the-unfaithful-reflection-first-draft/traveler3d.js';
import {createGardenMotion} from './motion.js?v=landing-smooth-1';
import {createMemoryGesture} from './memory-gesture.js';
import {createTwoHandCarry} from '../puzzle-two-garden/carry.js';
import {createGardenSounds} from './sounds.js?v=quake-1';
import {createGuide} from '../puzzle-two-garden/guide.js?v=visible-1';
import {createGuideBubble} from './guide-bubble.js?v=water-clue-1';
import {createMemoryMural} from './memory-mural.js?v=gentle-stones-1';
import { createChapterProgress } from '../journey-ui/chapter-progress.js?v=2';
import {mountJournal} from '../journey-journal/journal.js?v=garden-art-20261127';

const journal=mountJournal({chapter:3});
const chapterProgress = createChapterProgress(3);

const $=s=>document.querySelector(s), scene=new THREE.Scene();
scene.background=new THREE.Color('#19333b');scene.fog=new THREE.Fog('#19333b',22,48);
const camera=new THREE.OrthographicCamera(-10,10,8,-8,.1,80), cameraHome=new THREE.Vector3(10,16,19);camera.position.copy(cameraHome);camera.lookAt(0,0,-.4);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;$('#scene').appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight('#c3ece2','#293e45',2));const sun=new THREE.DirectionalLight('#d6eee2',2.4);sun.position.set(-5,12,7);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-12;sun.shadow.camera.right=12;sun.shadow.camera.top=12;sun.shadow.camera.bottom=-12;scene.add(sun);
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.8,...extra});
const stone=mat('#b49a79'),pale=mat('#d6b991'),edge=mat('#746b5e'),dark=mat('#293e42'),brass=mat('#cda765',{metalness:.65,roughness:.35}),glow=mat('#ffe2a4',{emissive:'#dc982c',emissiveIntensity:1.4}),water=mat('#28575c',{metalness:.45,roughness:.22});
function box(w,h,d,x,y,z,m,parent=scene){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function cylinder(r,h,x,y,z,m,n=24,parent=scene){const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,n),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
box(15,.25,13,0,-.22,-.2,dark);box(13.8,.08,11.8,0,-.02,-.1,water);box(14,.7,.6,0,.22,-6.15,edge);box(.6,.7,12,-7,.22,0,edge);box(.6,.7,12,7,.22,0,edge);
for(const x of [-6.35,6.35])for(const z of [-4.8,-.5,4.1]){box(.64,3.1,.64,x,1.58,z,stone);box(.86,.18,.86,x,3.16,z,pale);cylinder(.17,.22,x,3.36,z,brass,8);}
// Each lantern hangs from a brass arm fixed to a pillar. Keeping the bracket,
// chain, and lamp stationary makes the attachment legible throughout play.
const floatingLanterns=[];
function chamberLantern(pillarX,z,phase=0){
 const side=pillarX<0?1:-1, scale=.8, x=pillarX+side*1.15, y=1.45;
 const innerEdge=pillarX+side*.32;
 // The mounting plate touches the inside face of the column; its arm runs
 // outward from that face to the chain, with a small downturned hook.
 box(.12,.43,.28,innerEdge,2.47,z,brass);
 box(Math.abs(x-innerEdge)+.10,.085,.10,(x+innerEdge)/2,2.68,z,brass);
 box(.09,.20,.09,x,2.59,z,brass);
 const chainBottom=y+1.08*scale, chainTop=2.52;
 cylinder(.025,chainTop-chainBottom,x,(chainTop+chainBottom)/2,z,brass,10);
 const fixture=new THREE.Group();fixture.position.set(x,y,z);fixture.scale.setScalar(scale);scene.add(fixture);
 cylinder(.27,.12,0,.06,0,brass,8,fixture);
 const glass=mat('#ffdc99',{emissive:'#dc8f35',emissiveIntensity:1.0,roughness:.38});
 box(.28,.42,.28,0,.36,0,glass,fixture);
 for(const dx of [-.18,.18])for(const dz of [-.18,.18])box(.035,.55,.035,dx,.36,dz,brass,fixture);
 cylinder(.27,.10,0,.68,0,brass,8,fixture);
 const cap=new THREE.Mesh(new THREE.ConeGeometry(.27,.20,4),brass);cap.rotation.y=Math.PI/4;cap.position.y=.82;fixture.add(cap);
 const handle=new THREE.Mesh(new THREE.TorusGeometry(.12,.02,8,24,Math.PI),brass);handle.position.y=.96;fixture.add(handle);
 const halo=new THREE.Mesh(new THREE.SphereGeometry(.47,16,12),new THREE.MeshBasicMaterial({color:'#ffd58b',transparent:true,opacity:.07,depthWrite:false}));halo.position.y=.4;fixture.add(halo);
 const light=new THREE.PointLight('#ffc77c',2.0,3.0,2);light.position.y=.4;fixture.add(light);
 fixture.traverse(object=>{if(object.isMesh)object.castShadow=false;});
 floatingLanterns.push({phase,light});
}
for(const [x,z,phase] of [[-6.35,-4.8,0],[-6.35,-.5,1.4],[-6.35,4.1,2.5],[6.35,-4.8,3.4],[6.35,-.5,4.5],[6.35,4.1,5.5]])chamberLantern(x,z,phase);
function updateFloatingLanterns(time){for(const item of floatingLanterns)item.light.intensity=1.95+.10*Math.sin(time*1.5+item.phase);}
// Both ends and the middle refuge remain safe when the apparent bridge dissolves.
box(3.6,.36,2,0,.48,4.8,stone);box(3.8,.12,2.15,0,.72,4.8,pale);
box(2.7,.36,1.5,0,.48,2.85,stone);box(2.85,.12,1.6,0,.72,2.85,pale);
box(4,.36,1.9,0,.48,-4.75,stone);box(4.2,.12,2,0,.72,-4.75,pale);
// The complete bridge is only an apparition. Individual slabs sink and fade.
const bridge=new THREE.Group();scene.add(bridge);const bridgeSlabs=[];
for(let i=0;i<8;i++){const m=mat('#d2b99a',{transparent:true});const slab=box(1.35,.16,.86,0,.76,2.02-i*.84,m,bridge);bridgeSlabs.push(slab);}
const portalX=0;box(1.9,2.4,.35,portalX,1.9,-5.5,stone);box(1.17,1.8,.08,portalX,1.66,-5.29,dark);box(2.05,.17,.5,portalX,3.16,-5.5,pale);
// Two leaves open away from the landing; warm light emerges from the chamber
// beyond without moving the traveller or the boxes through the doorway.
const doorLightMat=new THREE.MeshBasicMaterial({color:'#ffcd73',transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,toneMapped:false});
const doorLight=new THREE.Mesh(new THREE.PlaneGeometry(1.10,1.72),doorLightMat);doorLight.position.set(0,1.67,-5.07);scene.add(doorLight);
const spillShape=new THREE.Shape();spillShape.moveTo(-.5,0);spillShape.lineTo(.5,0);spillShape.lineTo(1.28,-1.55);spillShape.lineTo(-1.28,-1.55);spillShape.closePath();const spillMat=new THREE.MeshBasicMaterial({color:'#ffe1a0',transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false});const spill=new THREE.Mesh(new THREE.ShapeGeometry(spillShape),spillMat);spill.rotation.x=-Math.PI/2;spill.position.set(0,.785,-5.19);scene.add(spill);
const doorLeaves=[];for(const side of [-1,1]){const hinge=new THREE.Group();hinge.position.set(side*.57,.76,-5.12);scene.add(hinge);box(.57,1.72,.09,-side*.285,.86,0,edge,hinge);box(.45,1.54,.035,-side*.285,.86,.065,brass,hinge);doorLeaves.push({side,hinge});}
// The door's warm glow can carry the later signal without a separate spot.
const distantSignal=new THREE.Group();distantSignal.position.set(0,2.30,-5.06);scene.add(distantSignal);distantSignal.visible=false;
// Each row has three apparitions. Only one has a steady reflection in the
// water; the player chooses a step, and a false one cannot carry the traveller.
// Identical stone sizes and a 1.95-unit row pitch leave the same .95-unit
// water gap between consecutive rows. A separate short extension joins only
// the real final stone to the far landing.
const rows=[{z:1.15,real:1,depth:1},{z:-.8,real:0,depth:1},{z:-2.75,real:1,depth:1}], xs=[-1.25,0,1.25], apparitions=[], reflections=[],tileReflections=[];
const rowsGroup=new THREE.Group();scene.add(rowsGroup);rowsGroup.visible=false;let stoneRevealTime=0;
function mark(shape,x,y,z,parent,color){const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const ctx=canvas.getContext('2d');ctx.strokeStyle=color;ctx.lineWidth=8;ctx.lineJoin='round';ctx.beginPath();if(shape===0){ctx.moveTo(64,19);ctx.lineTo(104,64);ctx.lineTo(64,109);ctx.lineTo(24,64);ctx.closePath();}else if(shape===1){ctx.arc(64,64,39,0,Math.PI*2);}else{ctx.moveTo(64,19);ctx.lineTo(105,99);ctx.lineTo(23,99);ctx.closePath();}ctx.stroke();const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const symbol=new THREE.Mesh(new THREE.PlaneGeometry(.52,.52),new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:.95,depthWrite:false,side:THREE.DoubleSide}));symbol.rotation.x=-Math.PI/2;symbol.position.set(x,y,z);parent.add(symbol);return symbol;}
for(let r=0;r<rows.length;r++)for(let c=0;c<3;c++){
 const m=mat('#d5c2a2',{transparent:true,opacity:.55,depthWrite:false});const slab=box(1.0,.16,rows[r].depth,xs[c],.72,rows[r].z,m,rowsGroup);slab.castShadow=false;const symbol=mark(c,xs[c],.81,rows[r].z,rowsGroup,'#563d32');const item={mesh:slab,symbol,row:r,col:c,secured:false};apparitions.push(item);if(r===rows.length-1&&c===rows[r].real){item.extension=box(1,.16,.55,xs[c],.72,-3.525,m,rowsGroup);item.extension.castShadow=false;item.extension.visible=false;}
 // A reflected grid in the open water mirrors the three rows; only the
 // real stones appear within it. Keeping it clear of the raised stones
 // makes the distinction legible from the isometric camera.
 const outline=new THREE.Mesh(new THREE.RingGeometry(.30,.32,4),new THREE.MeshBasicMaterial({color:'#8ebeb5',transparent:true,opacity:.24,side:THREE.DoubleSide,depthWrite:false}));outline.rotation.x=-Math.PI/2;outline.rotation.z=Math.PI/4;outline.position.set(xs[c]-3.3,.055,rows[r].z);outline.userData.revealRow=r;outline.userData.revealOpacity=.24;rowsGroup.add(outline);tileReflections.push(outline);
 if(c===rows[r].real){const reflected=new THREE.Mesh(new THREE.PlaneGeometry(.63,.63),new THREE.MeshBasicMaterial({color:'#a4f3de',transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}));reflected.rotation.x=-Math.PI/2;reflected.position.set(xs[c]-3.3,.06,rows[r].z);reflected.userData.revealRow=r;reflected.userData.revealOpacity=r===0?.92:.24;rowsGroup.add(reflected);const symbol=mark(c,xs[c]-3.3,.07,rows[r].z,rowsGroup,'#204d4a');symbol.userData.revealRow=r;symbol.userData.revealOpacity=r===0?1:.35;reflections.push({mesh:reflected,symbol});tileReflections.push(reflected,symbol);}
}
// A small brass lantern is the third collected object.
const lantern=new THREE.Group();lantern.position.set(0,.82,-4.67);lantern.scale.setScalar(.65);scene.add(lantern);lantern.visible=false;
cylinder(.25,.12,0,.07,0,brass,12,lantern);const lanternFlame=glow.clone();box(.25,.42,.25,0,.34,0,lanternFlame,lantern);for(const x of [-.18,.18])for(const z of [-.18,.18])box(.035,.52,.035,x,.34,z,brass,lantern);cylinder(.25,.1,0,.61,0,brass,12,lantern);const handle=new THREE.Mesh(new THREE.TorusGeometry(.17,.025,8,24,Math.PI),brass);handle.position.y=.72;lantern.add(handle);const lanternLight=new THREE.PointLight('#ffbe64',1.1,.9);lanternLight.position.y=.4;lantern.add(lanternLight);
const answerHalo=new THREE.Mesh(new THREE.SphereGeometry(.43,20,12),new THREE.MeshBasicMaterial({color:'#ffd078',transparent:true,opacity:0,depthWrite:false}));answerHalo.name='answer-halo';answerHalo.position.y=.34;lantern.add(answerHalo);
const flameDim=new THREE.Color('#81602d'),flameBright=new THREE.Color('#ffe6a6');
// A single hidden-lantern stand sits to the side of the doorway. Keep the
// legacy indices for the unused box-search controller without drawing its
// two other stands in this chapter.
const alcoves=[];for(let i=0;i<3;i++){const x=i===1?1.3:xs[i],g=new THREE.Group();g.position.set(x,.78,-4.72);g.visible=i===1;scene.add(g);box(.72,.72,.10,0,.36,-.18,edge,g);box(.10,.72,.45,-.31,.36,0,edge,g);box(.10,.72,.45,.31,.36,0,edge,g);const door=box(.54,.53,.08,0,.34,.23,brass,g);box(.72,.09,.48,0,.76,0,pale,g);alcoves.push({group:g,door});}
const realBox=1,openedBoxes=[false,false,false];let ghostReveal=null;
for(let i=0;i<3;i++){
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const ctx=canvas.getContext('2d');ctx.strokeStyle='#ffe3af';ctx.lineWidth=10;ctx.lineJoin='round';ctx.beginPath();if(i===0){ctx.moveTo(64,20);ctx.lineTo(105,64);ctx.lineTo(64,108);ctx.lineTo(23,64);ctx.closePath();}else if(i===1){ctx.arc(64,64,38,0,Math.PI*2);}else{ctx.moveTo(64,20);ctx.lineTo(105,100);ctx.lineTo(23,100);ctx.closePath();}ctx.stroke();const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const onDoor=new THREE.Mesh(new THREE.PlaneGeometry(.35,.35),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));onDoor.position.set(0,.35,.275);alcoves[i].group.add(onDoor);alcoves[i].mark=onDoor;
 const topHalo=new THREE.Group();alcoves[i].group.add(topHalo);alcoves[i].topHalo=topHalo;
 const medallion=new THREE.Mesh(new THREE.CircleGeometry(.30,32),new THREE.MeshBasicMaterial({color:'#4b3928',side:THREE.DoubleSide}));medallion.rotation.x=-Math.PI/2;medallion.position.set(0,.812,0);topHalo.add(medallion);
 const luminousRing=new THREE.Mesh(new THREE.RingGeometry(.29,.34,32),new THREE.MeshBasicMaterial({color:'#ffc76a',transparent:true,opacity:.82,depthWrite:false,side:THREE.DoubleSide}));luminousRing.rotation.x=-Math.PI/2;luminousRing.position.set(0,.813,0);topHalo.add(luminousRing);
 const topMark=new THREE.Mesh(new THREE.PlaneGeometry(.55,.55),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide}));topMark.rotation.x=-Math.PI/2;topMark.position.set(0,.815,0);alcoves[i].group.add(topMark);alcoves[i].topMark=topMark;topMark.userData.boxIndex=i;onDoor.visible=false;topHalo.visible=false;topMark.visible=false;
}
const avatar=await createTraveler(THREE,scene),walker=avatar.group;walker.position.set(0,.78,4.8);walker.rotation.y=Math.PI;const motion=createGardenMotion(THREE,walker),carry=createTwoHandCarry(THREE,walker),effects=createGardenSounds(),spirit=createGuide(THREE,scene,camera),bubble=createGuideBubble(THREE,camera,$('#game'),$('.guide'));
let sound=true;try{sound=sessionStorage.getItem('unfaithful-reflection-sound')!=='off';}catch(_){}effects.setEnabled(sound);
let started=false,paused=false,finished=false,phase='opening',row=0,movement=null,quakeTime=0,elapsed=0,endingTime=null,pickup=null,lanternHeld=false,lanternReveal=null,guideTime=0,idle=0,hintShown=false,signalTime=0,observationTime=0;
let muralGesture=null, cameraFocus=0, memoryIntroTime=0, doorGuideTime=0;
const finalGuideMessage='Keep the candle safe and burning. Its light will guide you onward, toward the truth waiting deeper in the fortress.';
const memoryGesture=createMemoryGesture(THREE,walker);
function requestMuralTurn(index){if(phase!=='memory'||paused||movement||muralGesture||mural.solved)return;activity();muralGesture={index,time:0,turned:false,target:mural.getTarget(index)};refresh();}
const mural=createMemoryMural(THREE,scene,camera,$('.controls'),requestMuralTurn,()=>{if(phase!=='memory')return;phase='revealing-lantern';alcoves[1].door.visible=false;alcoves[1].mark.visible=false;lantern.position.set(1.3,.82,-4.67);lantern.visible=true;lanternReveal={time:0,origin:lantern.position.clone(),x:1.3};distantSignal.visible=true;signalTime=0;effects.key();$('#objective').textContent='The memory reveals a hidden lantern.';$('#status').textContent='A small light emerges from the stand.';refresh();});
let doorOpening=0;
// Two gentle flashes from beyond the door are followed, after a pause, by
// two matching flashes from the real lantern. Both repeat every 6.4 seconds.
function softFlash(t,start){const p=t-start;return THREE.MathUtils.smoothstep(p,0,.28)*(1-THREE.MathUtils.smoothstep(p,.58,.86));}
function signalStrength(t,answer=false){const p=t%6.4,offset=answer?3.05:0;return Math.max(softFlash(p,offset+.15),softFlash(p,offset+1.30));}
const music=new Audio('./assets/mystery-bazaar.mp3');music.loop=true;music.volume=.16;registerMusicHandoff(music);
function playMusic(){if(sound&&started&&!paused&&!finished)music.play().catch(()=>{ $('#status').textContent='Music could not start. Toggle Sound to try again.'; });}
function hideGuide(){spirit.hide();guideTime=0;}
function showGuide(message,duration=7){if(!started||paused||finished)return;$('#guide').textContent=message;$('.guide').style.opacity='0';$('.guide').classList.remove('hidden');const nearMemory=['memory','memory-approach','memory-reveal-wait'].includes(phase);const pos=chooseGuidePosition(THREE,camera,$('#game'),walker.position.clone().add(nearMemory?new THREE.Vector3(1.9,0,.55):new THREE.Vector3(-1.15,0,.25)),walker.position);spirit.show(pos);bubble.show(pos,walker.position,nearMemory);guideTime=duration;idle=0;hintShown=true;effects.guide();}
function activity(){idle=0;hintShown=false;hideGuide();}
function refresh(){let progress=started?.05:0;
 if(phase==='crossing'||phase==='quake'||phase==='stone-reveal'||phase==='steps')progress=.12+Math.min(row,3)*.10;
 if(['memory-intro','memory-approach','memory-reveal-wait','memory'].includes(phase))progress=.50;
 if(mural.solved)progress=.72;
 if(lanternHeld)progress=.85;
 if(['door-guide','door-ready','entering-door'].includes(phase))progress=.92;
 if(finished||phase==='farewell')progress=1;
 chapterProgress.update(progress);
 const ready=started&&!paused&&!finished&&!movement;$('#cross').hidden=phase!=='opening';$('#cross').disabled=!ready;document.querySelectorAll('[data-memory]').forEach(b=>{b.hidden=phase!=='memory';b.disabled=!ready||!!muralGesture||mural.solved;});document.querySelectorAll('[data-step]').forEach(b=>{b.hidden=phase!=='steps';b.disabled=!ready;});const waterClue=$('#water-clue');waterClue.hidden=phase!=='steps';if(phase==='steps'){const symbols=['◇','○','△'],names=['diamond','circle','triangle'];$('#water-symbol').textContent=symbols[rows[row].real];$('#water-row').textContent=`row ${row+1} of ${rows.length}`;$('#water-description').textContent=`The water shows a ${names[rows[row].real]}.`;}$('#seal-clue').hidden=phase!=='search';$('#seal-progress').textContent=`${openedBoxes.filter(Boolean).length} of 3 boxes opened`;document.querySelectorAll('[data-alcove]').forEach(b=>{b.hidden=phase!=='search';b.disabled=!ready||openedBoxes[Number(b.dataset.alcove)];});$('#collect').hidden=phase!=='lantern';$('#collect').disabled=!ready;$('#door-continue').hidden=phase!=='door-ready';$('#door-continue').disabled=!ready;}
function move(destination,done,jumping=false){const from=walker.position.clone(),to=destination.clone(),heading=Math.atan2(to.x-from.x,to.z-from.z);const angle=Math.atan2(Math.sin(heading-walker.rotation.y),Math.cos(heading-walker.rotation.y));movement={from,to,heading,phase:Math.abs(angle)<.035?'move':'turn',time:0,pathProgress:0,smooth:jumping||(phase==='crossing'&&row===rows.length),duration:Math.max(.3,from.distanceTo(to)/(jumping?1.2:1)),done,jumping};
 if(jumping){const dx=Math.abs(to.x-from.x),dz=Math.abs(to.z-from.z);
  // Keep the whole stride inside the stone. The traveller's feet can project
  // well beyond his centre during the imported walk cycle, so a 0.28 margin
  // starts flight before his leading foot reaches the edge and only resumes
  // walking once both feet have room on the next stone. This works for the
  // diagonal jumps as well as the first straight crossing.
  const reach=(width,depth)=>Math.min(dx>.0001?(width/2-.28)/dx:Infinity,dz>.0001?(depth/2-.28)/dz:Infinity);const source=row===0?{width:2.85,depth:1.6}:{width:1,depth:rows[row-1].depth};const target={width:1,depth:rows[row].depth};movement.jumpStart=THREE.MathUtils.clamp(reach(source.width,source.depth),.02,.46);movement.jumpEnd=THREE.MathUtils.clamp(1-reach(target.width,target.depth),movement.jumpStart+.04,.98);if(row===rows.length-1)movement.landingHeading=Math.PI;}
 refresh();}
function updateMove(dt){if(!movement)return;const m=movement;if(m.phase==='turn'){const a=Math.atan2(Math.sin(m.heading-walker.rotation.y),Math.cos(m.heading-walker.rotation.y));walker.rotation.y+=Math.sign(a)*Math.min(Math.abs(a),dt*4);if(Math.abs(a)<.04){walker.rotation.y=m.heading;m.phase='move';}return;}const previous=m.pathProgress;m.time+=dt;const raw=Math.min(1,m.time/m.duration);const t=m.smooth?THREE.MathUtils.smoothstep(raw,0,1):raw;m.pathProgress=t;if(m.jumping&&previous<m.jumpStart&&t>=m.jumpStart)effects.jump();if(m.jumping&&previous<m.jumpEnd&&t>=m.jumpEnd)effects.landing();walker.position.lerpVectors(m.from,m.to,t);if(m.jumping)walker.position.y+=motion.height(t,m);if(m.landingHeading!==undefined){const delta=Math.atan2(Math.sin(m.landingHeading-m.heading),Math.cos(m.landingHeading-m.heading));walker.rotation.y=m.heading+delta*THREE.MathUtils.smoothstep(t,m.jumpEnd-.22,1);}if(raw>=1){walker.position.copy(m.to);movement=null;m.done();refresh();}}
$('#start').onclick=()=>{started=true;dismissOpening($('#opening'));effects.setEnabled(sound);effects.unlock();playMusic();refresh();showGuide('A lantern waits beyond the water. Its light may guide you toward the missing inhabitants.',8);};
$('#cross').onclick=()=>{activity();phase='crossing';$('#status').textContent='The traveller steps onto the path.';move(new THREE.Vector3(0,.78,2.85),()=>{phase='quake';quakeTime=0;effects.quake();$('#objective').textContent='The path is dissolving!';$('#status').textContent='The traveller is safe on the landing.';});};
function beginSteps(){phase='stone-reveal';stoneRevealTime=0;for(const a of apparitions){a.mesh.material.opacity=0;a.symbol.material.opacity=0;}for(const o of tileReflections)o.material.opacity=0;rowsGroup.visible=true;$('#objective').textContent='Find a safe way across the water.';$('#status').textContent='Shapes begin to appear above the water.';refresh();}
function finishStoneReveal(){phase='steps';$('#status').textContent='The pale marks to the left are reflections in the water.';refresh();showGuide('Match the water’s mark to the next stone.',4);}
// The guide introduces the memory before it materializes. The introduction
// and reveal advance in the game loop so pausing freezes the whole sequence.
function beginMemoryIntro(){phase='memory-intro';memoryIntroTime=0;tileReflections.forEach(item=>item.visible=false);for(const alcove of alcoves){alcove.topMark.visible=false;alcove.topHalo.visible=false;}$('#objective').textContent='A memory waits here.';$('#status').textContent='Listen to the guide.';refresh();showGuide('Solve the memory puzzle to uncover the next clue.',4);}
function approachMemory(){phase='memory-approach';mural.show();$('#status').textContent='A carving appears. The traveller approaches it.';
 // Keep both feet within the far landing while moving closer to the floating
 // carving. Aim the final turn at its actual centre, not at the doorway.
 move(new THREE.Vector3(-1.65,.78,-4.08),()=>{const position=walker.position.clone();const centre=mural.getTarget(0).add(mural.getTarget(3)).multiplyScalar(.5);const heading=Math.atan2(centre.x-position.x,centre.z-position.z);movement={from:position,to:position.clone(),heading,phase:'turn',time:0,pathProgress:0,smooth:false,duration:.01,done:()=>{phase='memory-reveal-wait';refresh();},jumping:false};refresh();},false);}
function beginMemoryPuzzle(){phase='memory';$('#objective').textContent='Restore the floating memory.';$('#status').textContent='Touch a piece to turn it and join the carved lines.';refresh();showGuide('Touch each piece to turn it. Restore the person, lantern and doorway.',8);}
document.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{if(phase!=='steps'||movement)return;activity();const col=Number(b.dataset.step);$('#clue').textContent='';if(col!==rows[row].real){effects.wrongTile();$('#status').textContent='That stone shimmers away. The traveller stays safely where he is.';const item=apparitions.find(a=>a.row===row&&a.col===col);item.mesh.material.opacity=.08;showGuide('That one is an illusion. Find the mark that appears in the nearest reflected row.',6);return;}
 effects.correctTile();$('#status').textContent='The stone holds firm.';const selected=apparitions.find(a=>a.row===row&&a.col===col);selected.secured=true;selected.mesh.material.opacity=1;selected.mesh.material.depthWrite=true;if(selected.extension)selected.extension.visible=true;const dest=new THREE.Vector3(xs[col],.8,rows[row].z);move(dest,()=>{row++;if(row===rows.length){phase='crossing';$('#status').textContent='The final stone joins the far landing.';move(new THREE.Vector3(0,.78,-3.87),beginMemoryIntro,false);}else{$('#status').textContent='Study the reflection of the next row before choosing a step.';}},true);});
function inspectBox(i){if(phase!=='search'||movement||openedBoxes[i])return;activity();phase='checking-box';$('#light-description').textContent='';$('#status').textContent='The traveller touches the glowing mark.';refresh();
 // Approach the box once and remain in the same safe position for its reveal
 // and pickup. Turning in place avoids snapping after moving sideways.
 const stance=new THREE.Vector3(xs[i],.78,-3.87);
 const reveal=()=>{openedBoxes[i]=true;alcoves[i].door.visible=false;alcoves[i].mark.visible=false;alcoves[i].topMark.visible=false;alcoves[i].topHalo.visible=false;$('#status').textContent='A lantern is appearing…';if(i===realBox){lantern.position.set(xs[i],.82,-4.67);lantern.visible=true;lanternReveal={time:0,origin:lantern.position.clone(),x:xs[i]};phase='revealing-lantern';}else{const ghost=lantern.clone(true);ghost.traverse(o=>{if(o.isLight||o.name==='answer-halo')o.visible=false;if(o.isMesh){o.material=o.material.clone();o.material.transparent=true;o.material.opacity=.85;o.material.depthWrite=false;}});ghost.position.set(xs[i],.82,-4.67);ghost.visible=true;scene.add(ghost);ghostReveal={group:ghost,time:0,x:xs[i],observing:false};phase='revealing-illusion';}refresh();};
 const faceBox=()=>{const angle=Math.atan2(Math.sin(Math.PI-walker.rotation.y),Math.cos(Math.PI-walker.rotation.y));if(Math.abs(angle)<.04){walker.rotation.y=Math.PI;reveal();return;}const position=walker.position.clone();movement={from:position,to:position.clone(),heading:Math.PI,phase:'turn',time:0,pathProgress:0,smooth:false,duration:.01,done:reveal,jumping:false};refresh();};
 if(walker.position.distanceTo(stance)<.025)faceBox();else move(stance,faceBox);
}
document.querySelectorAll('[data-alcove]').forEach(button=>button.onclick=()=>inspectBox(Number(button.dataset.alcove)));
const memoryRaycaster=new THREE.Raycaster(),memoryPointer=new THREE.Vector2();renderer.domElement.addEventListener('pointerdown',event=>{if(phase!=='memory'||paused||movement||muralGesture)return;const rect=renderer.domElement.getBoundingClientRect();memoryPointer.set((event.clientX-rect.left)/rect.width*2-1,-((event.clientY-rect.top)/rect.height)*2+1);memoryRaycaster.setFromCamera(memoryPointer,camera);const hit=memoryRaycaster.intersectObjects(mural.hitTargets,false)[0];if(hit)requestMuralTurn(hit.object.userData.memoryIndex);});
const boxRaycaster=new THREE.Raycaster(),boxPointer=new THREE.Vector2();renderer.domElement.addEventListener('pointerdown',event=>{if(phase!=='search'||movement||paused)return;const rect=renderer.domElement.getBoundingClientRect();boxPointer.set((event.clientX-rect.left)/rect.width*2-1,-((event.clientY-rect.top)/rect.height)*2+1);boxRaycaster.setFromCamera(boxPointer,camera);const hit=boxRaycaster.intersectObjects(alcoves.map(a=>a.topMark).filter(m=>m.visible),false)[0];if(hit)inspectBox(hit.object.userData.boxIndex);});
$('#collect').onclick=()=>{activity();phase='collecting';move(new THREE.Vector3(1.3,.78,-3.87),()=>{const position=walker.position.clone();movement={from:position,to:position.clone(),heading:Math.PI,phase:'turn',time:0,pathProgress:0,smooth:false,duration:.01,done:()=>{pickup={time:0,origin:lantern.position.clone()};refresh();},jumping:false};refresh();});};
// Give the portal its own materials so the traveller and lantern can fade
// naturally into the light without changing any other character or prop.
let doorwayFadeMaterials=[];
function prepareDoorwayFade(){
 doorwayFadeMaterials=[];
 for(const root of [walker,lantern])root.traverse(object=>{
  if(!object.isMesh||!object.material)return;
  const prepare=material=>{const copy=material.clone();copy.transparent=true;doorwayFadeMaterials.push({material:copy,opacity:copy.opacity,depthWrite:copy.depthWrite});return copy;};
  object.material=Array.isArray(object.material)?object.material.map(prepare):prepare(object.material);
 });
}
function walkTowardDoor(destination,done){move(destination,done,false);if(movement)movement.duration=Math.max(.25,movement.from.distanceTo(movement.to)/1.25);}
$('#door-continue').onclick=()=>{
 if(phase!=='door-ready'||paused||movement)return;
 activity();phase='entering-door';prepareDoorwayFade();$('#objective').textContent='Follow the open doorway.';$('#status').textContent='The traveller carries the lantern toward the light.';refresh();
 // A short diagonal moves clear of the stand before turning toward the door.
 // Continue through the threshold, not merely to the near side of it.
 walkTowardDoor(new THREE.Vector3(0,.78,-4.05),()=>walkTowardDoor(new THREE.Vector3(0,.78,-5.65),()=>{
  walker.visible=false;lantern.visible=false;phase='farewell';journal.record(3);$('#status').textContent='The lantern will light the way deeper into the fortress.';
  endingTime=.8;refresh();
 }));
};
$('#hint').onclick=()=>{const message=phase==='opening'?'A lantern waits beyond the water. Its light may guide you toward the missing inhabitants.':phase==='steps'?'The panel shows a close-up of the mark reflected in the water. Find that shape on the next row, then choose its matching button.':phase==='memory'?'Turn the pieces until the arch, the figure and the ground line connect across the seams.':phase==='search'?'Open a box, then watch the distant light within the doorway. The real lantern will answer its two flashes.':phase==='observing-lantern'||phase==='revealing-illusion'?'The distant light sends two flashes, then pauses. Watch the lantern for an answer.':phase==='lantern'?'The lantern’s light may guide you toward the missing inhabitants.':(phase==='door-guide'||phase==='door-ready')?finalGuideMessage:'Wait and see what the chamber reveals.';showGuide(message,8);};
function soundLabel(){$('#sound').textContent=sound?'Sound on':'Sound off';$('#sound').setAttribute('aria-pressed',String(sound));}$('#sound').onclick=()=>{sound=!sound;try{sessionStorage.setItem('unfaithful-reflection-sound',sound?'on':'off');}catch(_){}effects.setEnabled(sound&&!paused);if(sound){effects.unlock();playMusic();}else{music.pause();}soundLabel();};
function pause(value){if(!started||finished)return;paused=value;hideGuide();$('#pause-panel').classList.toggle('hidden',!paused);$('#pause').textContent=paused?'Resume':'Pause';$('#pause').setAttribute('aria-pressed',String(paused));effects.setEnabled(sound&&!paused);if(paused)music.pause();else{if(sound){effects.unlock();playMusic();}if(phase==='memory-intro'){memoryIntroTime=0;showGuide('Solve the memory puzzle to uncover the next clue.',4);}if(phase==='door-guide'||phase==='door-ready')showGuide(finalGuideMessage,7);}refresh();}$('#pause').onclick=()=>pause(!paused);$('#resume').onclick=()=>pause(false);$('#restart').onclick=()=>window.location.reload();
let journalPausedGame=false;
document.addEventListener('journal:open',()=>{journalPausedGame=started&&!finished&&!paused;if(journalPausedGame)pause(true);});
document.addEventListener('journal:close',()=>{if(journalPausedGame)pause(false);journalPausedGame=false;});
function resize(){const w=innerWidth,h=innerHeight,aspect=w/h,view=Math.max(8,(aspect<1?19:16)/(2*aspect));renderer.setSize(w,h);camera.left=-view*aspect;camera.right=view*aspect;camera.top=view;camera.bottom=-view;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();$('#loading').classList.add('hidden');soundLabel();refresh();
const clock=new THREE.Clock();function frame(){requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.05);if(!paused){elapsed+=dt;mural.update(dt);updateFloatingLanterns(elapsed);motion.restore();carry.restore();memoryGesture.restore();updateMove(dt);
 if(phase==='memory-intro'){memoryIntroTime+=dt;if(memoryIntroTime>=4.6)approachMemory();}if(phase==='memory-reveal-wait'&&mural.ready)beginMemoryPuzzle();
 const focusTarget=phase==='memory'||phase==='memory-approach'||phase==='memory-reveal-wait'?1:0;cameraFocus+= (focusTarget-cameraFocus)*Math.min(1,dt*3);if(phase!=='quake'){camera.position.copy(cameraHome).add(new THREE.Vector3(-.9,1.0,-3.3).multiplyScalar(cameraFocus));camera.zoom=1+.42*cameraFocus;camera.updateProjectionMatrix();}
 if(muralGesture){muralGesture.time+=dt;if(!muralGesture.turned&&muralGesture.time>=.24){muralGesture.turned=true;mural.turn(muralGesture.index);}}
 const flight=movement?.jumping&&movement.phase==='move'&&movement.pathProgress>=movement.jumpStart&&movement.pathProgress<movement.jumpEnd;avatar.update(dt,{moving:movement?.phase==='move'&&!flight,onFootstep:()=>{if(!movement?.jumping)effects.footstep();}});motion.apply(movement);if(muralGesture){memoryGesture.apply(muralGesture.target,muralGesture.time/.70);if(muralGesture.time>=.70){muralGesture=null;refresh();}}
 if(lanternReveal){lanternReveal.time+=dt;const t=THREE.MathUtils.smootherstep(lanternReveal.time,0,1.6);lantern.position.lerpVectors(lanternReveal.origin,new THREE.Vector3(lanternReveal.x,.82,-4.23),t);if(t>=1){lanternReveal=null;phase='lantern';$('#objective').textContent='Take the lantern from the memory.';$('#status').textContent='The flame still burns. Take it to carry the memory onward.';showGuide('The carving recalls someone carrying this light toward the doorway. Take it; its flame still burns.',8);refresh();}}
 if(ghostReveal){ghostReveal.time+=dt;const t=ghostReveal.time,emerge=THREE.MathUtils.smootherstep(t,0,1.3),fade=1-THREE.MathUtils.smoothstep(t,8.4,9.8);ghostReveal.group.position.set(ghostReveal.x,.82,-4.67+.44*emerge);ghostReveal.group.traverse(o=>{if(o.isMesh&&o.name!=='answer-halo')o.material.opacity=.85*fade;});if(!ghostReveal.observing&&t>=1.3){ghostReveal.observing=true;signalTime=0;$('#status').textContent='The distant light flashes twice. Watch this lantern for an answer.';refresh();}if(t>=9.8){scene.remove(ghostReveal.group);ghostReveal.group.traverse(o=>{if(o.isMesh)o.material.dispose();});ghostReveal=null;phase='search';effects.wrongTile();$('#light-description').textContent='';$('#status').textContent='That lantern gave no answer and dissolved. Explore another box.';showGuide('That light did not answer. Try another glowing mark.',7);refresh();}}
 if(pickup){pickup.time+=dt;const t=THREE.MathUtils.smoothstep(pickup.time,0,1.8);const target=carry.position().add(new THREE.Vector3(0,-.22,0));lantern.position.lerpVectors(pickup.origin,target,t);carry.apply(target.clone().add(new THREE.Vector3(0,.22,0)),t);if(t>=1){pickup=null;lanternHeld=true;phase='door-opening';doorOpening=0;effects.door();$('#objective').textContent='The lantern awakens the doorway.';$('#status').textContent='The door opens and warm light spills into the chamber.';refresh();}}else if(lanternHeld){const target=carry.position();lantern.position.copy(target).add(new THREE.Vector3(0,-.22,0));carry.apply(target);}
 if(phase==='quake'){quakeTime+=dt;const strength=Math.max(0,1-quakeTime/3)*.10;camera.position.set(cameraHome.x+Math.sin(quakeTime*39)*strength,cameraHome.y+Math.sin(quakeTime*32)*strength,cameraHome.z);for(let i=0;i<bridgeSlabs.length;i++){const t=THREE.MathUtils.clamp((quakeTime-.35-i*.13)/1.1,0,1);bridgeSlabs[i].position.y=.76-t*.9;bridgeSlabs[i].material.opacity=1-t;}if(quakeTime>=3){camera.position.copy(cameraHome);bridge.visible=false;beginSteps();}}
 if(phase==='stone-reveal'){stoneRevealTime+=dt;const alpha=r=>THREE.MathUtils.smoothstep(stoneRevealTime,r*.28,r*.28+1.5);for(const a of apparitions){const f=alpha(a.row);a.mesh.material.opacity=((a.row===row?.50:.22)+.10*Math.sin(elapsed*2.2+a.row*1.7+a.col))*f;a.symbol.material.opacity=(a.row===row?.95:.35)*f;}for(const o of tileReflections)o.material.opacity=o.userData.revealOpacity*alpha(o.userData.revealRow);if(stoneRevealTime>=2.06)finishStoneReveal();}
 if(phase==='steps'||phase==='crossing'){for(const a of apparitions){const current=a.row===row;a.mesh.material.opacity=a.secured?1:(current?.50:.22)+.10*Math.sin(elapsed*2.2+a.row*1.7+a.col);a.symbol.material.opacity=a.secured?1:current?.95:.35;};reflections.forEach((p,i)=>{p.mesh.material.opacity=i===row?.92:.24;p.symbol.material.opacity=i===row?1:.35;});}
 if(started&&!finished&&!movement&&(phase==='steps'||phase==='memory'||phase==='search'||phase==='lantern'||phase==='opening')){idle+=dt;if(idle>20&&!hintShown)$('#hint').click();}if(guideTime>0){guideTime-=dt;if(guideTime<=0)hideGuide();}
 if(phase==='door-opening'){doorOpening=Math.min(1,doorOpening+dt/2.4);const ease=THREE.MathUtils.smoothstep(doorOpening,0,1);doorLeaves.forEach(({side,hinge})=>hinge.rotation.y=-side*1.15*ease);doorLightMat.opacity=.87*ease;spillMat.opacity=.20*ease;if(doorOpening>=1){phase='door-guide';doorGuideTime=0;$('#objective').textContent='The way deeper into the fortress is open.';$('#status').textContent='Listen to the guide before continuing.';showGuide(finalGuideMessage,7);refresh();}}
 if(phase==='door-guide'){doorGuideTime+=dt;if(doorGuideTime>=5){phase='door-ready';$('#objective').textContent='Enter the open doorway.';$('#status').textContent='The way deeper into the fortress is open.';refresh();}}
 if(lantern.visible){lanternFlame.color.copy(flameBright);lanternFlame.emissiveIntensity=.75;answerHalo.material.opacity=.08;lanternLight.intensity=1.1+.08*Math.sin(elapsed*2.1);}
 if(phase==='entering-door'&&doorwayFadeMaterials.length){const fade=1-THREE.MathUtils.smoothstep(-walker.position.z,5.05,5.65);for(const item of doorwayFadeMaterials){item.material.opacity=item.opacity*fade;item.material.depthWrite=fade>=1?item.depthWrite:false;}}
 if(endingTime!==null){endingTime-=dt;if(endingTime<=0){
  endingTime=null;finished=true;phase='finished';hideGuide();$('#ending').classList.remove('hidden');refresh();
  const next=$('#ending .continue-link');next.hidden=true;
  import('../journey-transition.js?v=journey-five-20261120').then(({revealChapterReward})=>{
   revealChapterReward(journal,3,next,()=>finished&&!$('#ending').classList.contains('hidden'));
  }).catch(()=>{next.hidden=false;if(finished)journal.unlock(3);});
 }}}
 spirit.update(dt);$('.guide').style.opacity=String(spirit.opacity());if(spirit.isVisible())bubble.update();else{$('.guide').classList.add('hidden');bubble.hide();}renderer.render(scene,camera);}frame();

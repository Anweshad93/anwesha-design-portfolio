import { dismissOpening } from '../journey-ui/opening-transition.js?v=1';
import { chooseGuidePosition, guideScreenBounds, projectWorldBox } from '../journey-ui/guide-layout.js?v=1';
import * as THREE from '../game-demo/vendor/three.module.js';
import {createTraveler} from '../the-unfaithful-reflection-first-draft/traveler3d.js';
import {createTwoHandCarry} from '../puzzle-two-garden/carry.js';
import {createGardenSounds} from '../puzzle-three-chamber/sounds.js';
import {createGuide} from '../puzzle-two-garden/guide.js?v=visible-1';
import {createGuideBubble} from './guide-bubble.js?v=traveller-clear-1';
import {advanceWalking} from './walk-motion.js';
import {createDreamAtmosphere} from './dream-atmosphere.js?v=door-alignment-1';
import {createMissingDoorVisual} from './missing-door-visual.js?v=door-alignment-2';
import {createHallMusic} from './music.js?v=balanced-20261120';
import {createFlipSound} from './flip-sound.js?v=1';
import {createLampSound} from './lamp-sound.js?v=1';
import { createChapterProgress } from '../journey-ui/chapter-progress.js?v=2';
import {mountJournal} from '../journey-journal/journal.js?v=garden-art-20261127';

const journal=mountJournal({chapter:4});
const chapterProgress = createChapterProgress(4);

const $ = s => document.querySelector(s);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#d79b81');
const hallSky=new THREE.Color('#d79b81'),reflectedSky=new THREE.Color('#34273f');
const camera = new THREE.OrthographicCamera(-10,10,8,-8,.1,100);
camera.position.set(11,15,20); camera.lookAt(0,1,0);
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.7)); renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.18;
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
$('#scene').appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight('#fff4da','#b85f60',2.3));
const sun=new THREE.DirectionalLight('#fff0c5',2.3); sun.position.set(-7,13,8); sun.castShadow=true;
sun.shadow.mapSize.set(1024,1024); sun.shadow.camera.left=-14;sun.shadow.camera.right=14;sun.shadow.camera.top=14;sun.shadow.camera.bottom=-14; scene.add(sun);
const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.8,...extra});
const terracotta=material('#bb6657'),rose=material('#d99178'),hallTile=material('#31535a'),tileGrout=material('#6b8c88'),cream=material('#fce3bf');
const gold=material('#dba85c',{metalness:.65,roughness:.35}),red=material('#a53e52'),rug=material('#9d4251');
const paleGold=material('#ffe5a3',{emissive:'#df9749',emissiveIntensity:.48});
const dusk=material('#332959'), violet=material('#675086'), lilac=material('#bc9bd3');
const luminous=material('#eacaf4',{emissive:'#9c66c9',emissiveIntensity:1.1});
function box(w,h,d,x,y,z,m,parent=scene){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function sphere(r,x,y,z,m,parent=scene){const o=new THREE.Mesh(new THREE.SphereGeometry(r,20,14),m);o.position.set(x,y,z);parent.add(o);return o;}
function cylinder(rt,rb,h,x,y,z,m,parent=scene){const o=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,24),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function arch(parent,x,y,z,width,height,m,tube=.12){
  // A horseshoe silhouette and slender legs make the palace unlike the chamber's pillars.
  const p=[];p.push(new THREE.Vector3(-width/2,0,0),new THREE.Vector3(-width/2,height*.56,0));
  for(let i=0;i<=24;i++){const a=Math.PI-i*Math.PI/24;p.push(new THREE.Vector3(Math.cos(a)*width/2,height*.56+Math.sin(a)*height*.44,0));}
  p.push(new THREE.Vector3(width/2,0,0));
  const curve=new THREE.CatmullRomCurve3(p);const o=new THREE.Mesh(new THREE.TubeGeometry(curve,72,tube,8,false),m);o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o;
}
function star(parent,x,y,z,size,m,angle=0){const shape=new THREE.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?size*.4:size;const px=Math.cos(a)*r,py=Math.sin(a)*r;if(i===0)shape.moveTo(px,py);else shape.lineTo(px,py);}shape.closePath();const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),m);mesh.position.set(x,y,z);mesh.rotation.z=angle;parent.add(mesh);return mesh;}
function carpet(parent,z,length){box(3.25,.025,length,0,.31,z,rug,parent);box(3.02,.012,length-.22,0,.33,z,red,parent);for(const x of [-1.36,1.36])box(.045,.016,length-.28,x,.35,z,gold,parent);for(let t=-length/2+.6;t<length/2;t+=1.15){const d=box(.42,.015,.42,0,.355,z+t,paleGold,parent);d.rotation.y=Math.PI/4;}}
function tileFloor(parent,z,len){box(11.5,.64,len,0,-.17,z,terracotta,parent);box(11.24,.10,len-.15,0,.20,z,hallTile,parent);for(let x=-5;x<=5;x+=1)box(.018,.012,len-.27,x,.26,z,tileGrout,parent);for(let zz=z-len/2+.5;zz<z+len/2;zz+=1)box(11.05,.012,.018,0,.26,zz,tileGrout,parent);carpet(parent,z,len-.4);}
function banner(parent,x,z){box(.13,4.05,.15,x,2.42,z,gold,parent);const cloth=box(.75,1.55,.06,x,3.18,z+.08,red,parent);cloth.rotation.z=x<0?-.05:.05;box(.76,.08,.11,x,3.96,z+.1,gold,parent);star(parent,x,3.25,z+.13,.19,paleGold);}
function doorway(parent,z){
  box(3.65,.26,.92,0,.38,z,terracotta,parent);box(2.45,3.95,.18,0,2.45,z-.03,paleGold,parent);
  arch(parent,0,.44,z+.13,3.22,5.0,cream,.21);arch(parent,0,.46,z+.25,2.7,4.5,gold,.07);
  // Familiar signs are ornamentation; no claim is made that they are inventory.
  star(parent,-.68,4.18,z+.36,.20,paleGold);
  const globe=new THREE.Mesh(new THREE.TorusGeometry(.18,.025,8,28),gold);globe.position.set(0,4.18,z+.36);parent.add(globe);
  box(.23,.34,.06,.68,4.18,z+.36,gold,parent);box(.12,.20,.07,.68,4.18,z+.4,paleGold,parent);
}
const near=new THREE.Group();scene.add(near);tileFloor(near,2.65,6.3);
// Rose walls, open scalloped frames, and hanging red banners form a daylight palace.
for(const x of [-5.4,5.4]){box(.24,2.45,6.25,x,1.45,2.65,rose,near);box(.31,.11,6.25,x,2.72,2.65,gold,near);banner(near,x<0?-4.8:4.8,4.05);}
for(const x of [-4.5,4.5]){const p=new THREE.Group();near.add(p);p.position.set(x<0?-5.0:x,.32,x<0?2.35:1.0);box(.84,.18,.84,0,0,0,gold,p);cylinder(.34,.43,.45,0,.32,0,terracotta,p);for(let i=0;i<7;i++){const a=i*Math.PI*2/7;const leaf=new THREE.Mesh(new THREE.SphereGeometry(.25,10,8),material(i%2?'#678569':'#8ba47a'));leaf.scale.set(.45,1.2,.24);leaf.position.set(Math.cos(a)*.34,.83,Math.sin(a)*.34);leaf.rotation.z=-Math.cos(a)*.6;p.add(leaf);}}
// The far section turns around its own centre; the near landing and camera stay still.
const hinge=new THREE.Group();hinge.position.set(0,.25,-3.5);scene.add(hinge);
const farPalace=new THREE.Group();farPalace.position.z=3;hinge.add(farPalace);tileFloor(farPalace,-3,6);
for(const x of [-5.4,5.4]){box(.24,2.45,6,x,1.45,-3,rose,farPalace);box(.31,.11,6,x,2.72,-3,gold,farPalace);banner(farPalace,x<0?-4.8:4.8,-3.5);}
for(const x of [-3.8,3.8]){arch(farPalace,x,.3,-5.65,2.5,4.5,cream,.15);box(2.1,2.3,.05,x,1.75,-5.78,rose,farPalace);}
// The real wall is deliberately blank: the doorway appears only in water.
box(11.1,4.6,.22,0,2.53,-5.80,rose,farPalace);box(11.5,.12,.16,0,.30,-.03,gold,farPalace);
// A quiet three-place podium brings the familiar signs together. They are
// already here when the traveller arrives; their purpose is still unknown.
const podium=new THREE.Group();podium.position.set(-3.35,.05,2.60);
// The reference places the table lengthwise along the room and carpet, rather
// than angling it across the tiles. Its long edges run parallel to the carpet.
podium.rotation.y=-Math.PI/2;
podium.scale.setScalar(.65);near.add(podium);
box(4.85,.15,1.40,0,.39,0,terracotta,podium);
box(4.58,.48,1.18,0,.70,0,rose,podium);
box(4.90,.14,1.42,0,1.01,0,gold,podium);
box(4.72,.08,1.28,0,1.12,0,cream,podium);
for(const x of [-1.55,0,1.55]){
  cylinder(.43,.43,.035,x,1.18,0,gold,podium);
  cylinder(.33,.33,.025,x,1.21,0,dusk,podium);
}
// The star and the ringed globe stand on their own places. The third place
// stays open for the still-burning lantern from the Water Chamber.
cylinder(.035,.045,.26,-1.55,1.35,0,gold,podium);
// The courtyard's water clue was made from two overlapping diamonds, not a
// five-point star. Preserve that recognizable eight-point silhouette here.
const podiumStar=new THREE.Group();podiumStar.position.set(-1.55,1.68,0);podiumStar.scale.setScalar(.72);podium.add(podiumStar);
// A deep plum medallion gives the pale reflected star contrast against the
// cream hall while leaving its original overlapping-diamond shape intact.
const starBacking=new THREE.Mesh(new THREE.CircleGeometry(.70,40),new THREE.MeshBasicMaterial({color:'#38294b',side:THREE.DoubleSide}));starBacking.position.z=-.04;podiumStar.add(starBacking);
const starHalo=new THREE.Mesh(new THREE.CircleGeometry(.77,40),new THREE.MeshBasicMaterial({color:'#ffd98e',transparent:true,opacity:.25,depthWrite:false,side:THREE.DoubleSide}));starHalo.position.z=-.02;podiumStar.add(starHalo);
const starRing=new THREE.Mesh(new THREE.RingGeometry(.54,.586,40),new THREE.MeshBasicMaterial({color:'#ffe0a0',transparent:true,opacity:.9,depthWrite:false,side:THREE.DoubleSide}));starRing.position.z=-.01;podiumStar.add(starRing);
for(let n=0;n<2;n++){
  const diamond=new THREE.Mesh(new THREE.PlaneGeometry(.69,.69),new THREE.MeshBasicMaterial({color:'#ffefbb',side:THREE.DoubleSide}));
  diamond.rotation.z=n*Math.PI/4;diamond.position.z=n*.002;podiumStar.add(diamond);
}
podiumStar.lookAt(camera.position);
const podiumGlobe=new THREE.Group();podiumGlobe.position.set(0,1.58,0);podium.add(podiumGlobe);
// The darker hall floor provides contrast, so the garden's globe can stand on
// its own without the separate dark disc behind it.
const globeMaterial=material('#ffd277',{metalness:.4,roughness:.28,emissive:'#d9932c',emissiveIntensity:.8});
sphere(.34,0,0,0,globeMaterial,podiumGlobe);
const globeHalo=new THREE.Mesh(new THREE.SphereGeometry(.48,24,16),new THREE.MeshBasicMaterial({color:'#ffd574',transparent:true,opacity:.2,depthWrite:false}));podiumGlobe.add(globeHalo);
const globeRingMaterial=new THREE.MeshBasicMaterial({color:'#ffe3a0',transparent:true,opacity:.8,depthWrite:false});
const globeRingA=new THREE.Mesh(new THREE.TorusGeometry(.48,.025,8,48),globeRingMaterial);globeRingA.rotation.x=Math.PI*.34;podiumGlobe.add(globeRingA);
const globeRingB=new THREE.Mesh(new THREE.TorusGeometry(.55,.017,8,48),globeRingMaterial);globeRingB.rotation.y=Math.PI*.4;podiumGlobe.add(globeRingB);
// All destinations follow the rotated podium rather than the world axes.
podium.updateWorldMatrix(true,false);
const lanternRest=podium.localToWorld(new THREE.Vector3(1.55,1.235,0));
// The lantern is not scaled with the podium; rest its base on the third disc.
lanternRest.y+=.17;
// Leave room for the traveller's outstretched hands and the carried lantern
// outside the table edge, including during the final turn towards the slot.
const podiumApproach=podium.localToWorld(new THREE.Vector3(1.55,.45,-1.75));
const approachLead=podium.localToWorld(new THREE.Vector3(1.55,.45,-2.25));
podiumApproach.y=.3;approachLead.y=.3;
// The other world is attached to the reverse of the far section.  After the
// half-turn it faces upward and meets the unchanged near landing.
const dream=new THREE.Group();dream.position.z=-3;dream.rotation.x=Math.PI;hinge.add(dream);dream.visible=false;
const dreamEdge=material('#41335d'),dreamTile=material('#695789'),dreamDark=material('#201a42');
box(11.5,.64,6,0,-.17,-3,dreamEdge,dream);box(11.18,.11,5.8,0,.21,-3,dreamTile,dream);
box(3.05,.04,5.5,0,.30,-3,dreamDark,dream);for(const x of [-1.47,1.47])box(.035,.02,5.45,x,.33,-3,lilac,dream);
// Quiet inlays mark the path without making the podium's objects part of this puzzle.
for(let z=-1.1;z>-5.7;z-=1.35){
  const tile=box(.24,.025,.24,0,.34,z,luminous,dream);tile.rotation.y=Math.PI/4;
}
// A broad indigo veil, suspended moon, and small stars give the far section a sky of its own.
const skyMat=new THREE.MeshBasicMaterial({color:'#242046',side:THREE.DoubleSide});box(11.1,5.8,.16,0,3.15,-5.86,skyMat,dream);
const moon=new THREE.Mesh(new THREE.RingGeometry(.46,.60,48),new THREE.MeshBasicMaterial({color:'#f5d6ee',side:THREE.DoubleSide}));moon.position.set(-3.1,5.05,-5.73);dream.add(moon);
for(let i=0;i<34;i++){const x=-5+(i*2.731)%10,y=1.2+(i*1.413)%4.5;star(dream,x,y,-5.74,.04+(i%3)*.025,luminous,i*.2);}
// Each side has one complete arch with a level cap sitting on its crown.
for(const x of [-4.4,4.4]){
  arch(dream,x,.32,-4.8,1.9,4.2,lilac,.12);
  box(2.3,.16,.46,x,4.718,-4.8,dreamEdge,dream);
}
// Small suspended islands and mirrored fragments replace the orderly palace ornaments.
// The three floating diamonds wait quietly until the traveller walks toward
// the revealed doorway. His footfalls wake them one by one.
const diamondGlowCanvas=document.createElement('canvas');diamondGlowCanvas.width=128;diamondGlowCanvas.height=128;
const diamondGlowContext=diamondGlowCanvas.getContext('2d');
const diamondGlowGradient=diamondGlowContext.createRadialGradient(64,64,3,64,64,64);
diamondGlowGradient.addColorStop(0,'rgba(255,244,193,.85)');diamondGlowGradient.addColorStop(.3,'rgba(255,201,105,.45)');diamondGlowGradient.addColorStop(1,'rgba(255,181,92,0)');
diamondGlowContext.fillStyle=diamondGlowGradient;diamondGlowContext.fillRect(0,0,128,128);
const diamondGlowTexture=new THREE.CanvasTexture(diamondGlowCanvas);diamondGlowTexture.colorSpace=THREE.SRGBColorSpace;
const floating=[];
for(const [i,x,z] of [[0,-4.25,-1.35],[1,4.25,-2.85],[2,-4.25,-4.35]]){
  const y=1.18+(i%2)*.22,group=new THREE.Group();group.position.set(x,y,z);dream.add(group);
  box(.85,.22,.75,0,0,0,violet,group);box(.73,.07,.63,0,.14,0,lilac,group);
  const crystalMaterial=luminous.clone();crystalMaterial.color.set('#796a90');crystalMaterial.emissive.set('#594275');crystalMaterial.emissiveIntensity=.12;
  const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(.27),crystalMaterial);
  crystal.position.y=.48;crystal.scale.set(.7,1.5,.7);group.add(crystal);
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:diamondGlowTexture,color:'#ffdca1',transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));
  glow.position.y=.48;glow.scale.set(1.5,1.8,1);group.add(glow);
  floating.push({group,crystal,glow,y,phase:i,active:false,pulse:0});
}
function lightPathDiamond(){
  // Select the marker alongside this footfall, accounting for the flipped
  // world's transform. Previously all three woke near the start of the walk.
  let nearest=null,distance=Infinity;
  for(const f of floating){
    f.pulse=0;
    const z=f.group.getWorldPosition(new THREE.Vector3()).z;
    const gap=Math.abs(walker.position.z-z);
    if(gap<distance){nearest=f;distance=gap;}
  }
  if(!nearest)return;
  nearest.active=true;nearest.pulse=1;
  nearest.crystal.material.color.set('#ffdf98');nearest.crystal.material.emissive.set('#f9a94c');
  lampSound.glow(floating.indexOf(nearest));
}
// A transparent violet sheet hangs overhead, with concentric ripples and soft reflections.
const waterMaterial=new THREE.MeshStandardMaterial({color:'#a992d6',emissive:'#554589',emissiveIntensity:.35,roughness:.2,metalness:.25,transparent:true,opacity:.4,side:THREE.DoubleSide,depthWrite:false});
const waterGeometry=new THREE.PlaneGeometry(6,2.7,32,18);const water=new THREE.Mesh(waterGeometry,waterMaterial);water.rotation.x=-Math.PI/2;water.position.set(0,4.90,-4.2);dream.add(water);
const waterPositions=waterGeometry.attributes.position,waterBase=Float32Array.from(waterPositions.array);
// The overhead water stays centered above the doorway; faint ripples frame
// its reflection without introducing extra arch-shaped structures.
const overheadRipples=[];
for(const [radius,phase] of [[1.0,0],[1.35,1.5]]){
  const ring=new THREE.Mesh(new THREE.RingGeometry(radius,radius+.018,48),new THREE.MeshBasicMaterial({color:'#e5d9ff',transparent:true,opacity:.15,side:THREE.DoubleSide,depthWrite:false}));
  ring.rotation.x=-Math.PI/2;ring.position.set(0,4.95,-4.2);ring.scale.set(1,.65,1);dream.add(ring);overheadRipples.push({ring,phase});
}
// Retain the animation list for atmospheric elements, without layering
// additional false arch outlines over the two real side structures.
const mirages=[];
// The palace and its reverse have separate materials during the half-turn.
// Cross-fading through the edge-on moment avoids replacing an entire world in
// one frame. Preserve original opacity and depth settings for the water.
function prepareFlipFade(root){
  const entries=[];
  // Many pieces reuse the same stone or gold. Keep that sharing rather than
  // creating a new material for every tile and architectural detail.
  const copies=new Map();
  root.traverse(object=>{
    if(!object.isMesh||!object.material)return;
    const materials=Array.isArray(object.material)?object.material:[object.material];
    const cloned=materials.map(source=>{
      if(!copies.has(source)){
        const mat=source.clone();
        // Both sides keep the same blending and shader throughout the turn.
        // Changing `transparent` while animating can change the shader and
        // render order at exactly the moment the world is being revealed.
        mat.transparent=true;
        copies.set(source,mat);
        entries.push({mat,opacity:source.opacity});
      }
      return copies.get(source);
    });
    object.material=Array.isArray(object.material)?cloned:cloned[0];
  });
  return entries;
}
const atmosphere=createDreamAtmosphere(THREE,dream,{floor:dreamTile,edge:dreamEdge,sky:skyMat,water:waterMaterial});
const missingDoor=createMissingDoorVisual(THREE,scene,farPalace);
const palaceFade=prepareFlipFade(farPalace),dreamFade=prepareFlipFade(dream);
function setFlipOpacity(entries,factor){
  for(const entry of entries){
    entry.mat.opacity=entry.opacity*factor;
    // Preserve each material's original depth writing while the surfaces
    // overlap, rather than showing the architecture through itself.
  }
}
// A wandering gateway and its reflected landmarks appear only after the hall turns.
// The water and the large inset use the same drawings, keeping the clue visible.
const routeRounds=[
  {left:'star',right:'diamond',answer:'left',z:-1.25,door:2.2},
  {left:'diamond',right:'star',answer:'right',z:-2.65,door:-2.1},
  {left:'star',right:'diamond',answer:'left',z:-4.05,door:1.8}
];
const symbols={star:'✦',globe:'●',diamond:'◆'};
const names={star:'Star',globe:'Golden globe',diamond:'Diamond'};
let round=0,doorMotion=null,markers=null,reflectionPlane=null,wrongPulse=null;
const falseDoor=new THREE.Group();falseDoor.position.set(0,.44,-5.6);scene.add(falseDoor);falseDoor.visible=false;
box(2.1,.20,.48,0,.1,0,dreamEdge,falseDoor);box(1.42,2.5,.10,0,1.48,-.05,paleGold,falseDoor);arch(falseDoor,0,.18,.05,1.85,3.4,lilac,.12);
// The little light stays in the traveller's hands. A gentle beam and a
// reflected star make the cause of the clue visible before the first choice.
const waterStar=star(scene,0,4.97,-2.7,.56,new THREE.MeshBasicMaterial({color:'#ffe7a7',side:THREE.DoubleSide,transparent:true,opacity:0,depthWrite:false}));
waterStar.rotation.x=-Math.PI/2;waterStar.visible=false;
const beamMaterial=new THREE.MeshBasicMaterial({color:'#ffe4a0',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});
const lanternBeam=new THREE.Mesh(new THREE.CylinderGeometry(.17,.08,1,12,1,true),beamMaterial);
lanternBeam.visible=false;lanternBeam.renderOrder=2;scene.add(lanternBeam);
const beamUp=new THREE.Vector3(0,1,0),beamEnd=new THREE.Vector3(0,4.96,-2.7),beamDirection=new THREE.Vector3();
const trailGroup=new THREE.Group();scene.add(trailGroup);
function addTrail(from,to){
  const start=new THREE.Vector3(from.x,.61,from.z),end=new THREE.Vector3(to.x,.61,to.z);
  const direction=end.clone().sub(start),length=direction.length();
  if(length<.001)return;
  const segment=new THREE.Mesh(new THREE.CylinderGeometry(.038,.038,length,8),
    new THREE.MeshBasicMaterial({color:'#ffdf8b',transparent:true,opacity:.92,depthWrite:false}));
  segment.position.copy(start).add(end).multiplyScalar(.5);
  segment.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
  trailGroup.add(segment);
}
// The garden key is remembered as a glowing sphere with two orbital rings,
// not as an object the traveller has been carrying through the chamber.
function makeRememberedGlobe(parent,scale=1){
  const group=new THREE.Group();group.scale.setScalar(scale);parent.add(group);
  const core=material('#ffd277',{metalness:.4,roughness:.28,emissive:'#d9932c',emissiveIntensity:.8});
  sphere(.24,0,0,0,core,group);
  const halo=new THREE.Mesh(new THREE.SphereGeometry(.36,20,12),new THREE.MeshBasicMaterial({color:'#ffd574',transparent:true,opacity:.2,depthWrite:false}));group.add(halo);
  const ringMaterial=new THREE.MeshBasicMaterial({color:'#ffe2a1',transparent:true,opacity:.9,depthWrite:false});
  const ringA=new THREE.Mesh(new THREE.TorusGeometry(.34,.018,8,48),ringMaterial);ringA.rotation.x=Math.PI*.34;group.add(ringA);
  const ringB=new THREE.Mesh(new THREE.TorusGeometry(.39,.012,8,48),ringMaterial.clone());ringB.rotation.y=Math.PI*.4;group.add(ringB);
  return {group,ringA,ringB,halo};
}
const globeSeal=makeRememberedGlobe(falseDoor,1.25);globeSeal.group.position.set(0,1.63,.3);globeSeal.group.visible=false;
const globeReflection=makeRememberedGlobe(scene,1.5);globeReflection.group.position.set(0,4.91,-2.9);globeReflection.group.rotation.x=-Math.PI/2;globeReflection.group.visible=false;
function doorTo(x){doorMotion={from:falseDoor.position.x,to:x,time:0};}
function drawIcon(ctx,kind,x,y,size){ctx.save();ctx.translate(x,y);ctx.fillStyle='#ffe5a3';ctx.strokeStyle='#ffe5a3';ctx.lineWidth=3;if(kind==='star'){ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?size*.4:size;const px=Math.cos(a)*r,py=Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.fill();}else if(kind==='globe'){ctx.beginPath();ctx.arc(0,0,size*.46,0,Math.PI*2);ctx.fill();ctx.lineWidth=2;for(const angle of [-.55,.60]){ctx.beginPath();ctx.ellipse(0,0,size*.92,size*.29,angle,0,Math.PI*2);ctx.stroke();}}else{ctx.beginPath();ctx.moveTo(0,-size);ctx.lineTo(size*.65,0);ctx.lineTo(0,size);ctx.lineTo(-size*.65,0);ctx.closePath();ctx.fill();}ctx.restore();}
function sign(kind,x,z){const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const c=canvas.getContext('2d');c.fillStyle='#3c315a';c.strokeStyle='#e6c89c';c.lineWidth=5;c.beginPath();c.arc(64,64,58,0,Math.PI*2);c.fill();c.stroke();drawIcon(c,kind,64,64,38);const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map,transparent:true}));sprite.position.set(x,1.15,z);sprite.scale.set(.8,.8,1);markers.add(sprite);}
function updateWaterClue(config){if(reflectionPlane){scene.remove(reflectionPlane);reflectionPlane.geometry.dispose();reflectionPlane.material.map.dispose();reflectionPlane.material.dispose();}const canvas=document.createElement('canvas');canvas.width=512;canvas.height=196;const c=canvas.getContext('2d');c.fillStyle='rgba(56,48,100,.8)';c.fillRect(0,0,512,196);c.strokeStyle='#e4d1ff';c.lineWidth=4;c.strokeRect(4,4,504,188);drawIcon(c,config.left,145,140,30);drawIcon(c,config.right,367,140,30);const x=config.answer==='left'?145:367;drawIcon(c,'star',x,58,25);c.strokeStyle='#ffe6ad';c.lineWidth=3;c.beginPath();c.moveTo(x,86);c.lineTo(x,105);c.stroke();const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;reflectionPlane=new THREE.Mesh(new THREE.PlaneGeometry(4.6,1.76),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,transparent:true,depthTest:false}));reflectionPlane.rotation.x=-Math.PI/2;reflectionPlane.position.set(0,4.96,-2.9);reflectionPlane.renderOrder=10;scene.add(reflectionPlane);}
function showJunction(){waterStar.visible=false;const config=routeRounds[round];if(markers)scene.remove(markers);markers=new THREE.Group();scene.add(markers);sign(config.left,-1.2,config.z);sign(config.right,1.2,config.z);updateWaterClue(config);$('#junction-number').textContent=round+1;for(const side of ['left','right']){$(`#reflect-${side}`).classList.toggle('faithful',config.answer===side);$(`#reflect-${side}-symbol`).textContent=symbols[config[side]];$(`#reflect-${side}-name`).textContent=names[config[side]];$(`#${side}`).textContent=`Walk ${side} · ${names[config[side]]}`;}$('#objective').textContent='Follow the star’s reflected trail.';$('#status').textContent='The lantern reveals the star. Choose the matching tile.';phase='junction';doorTo(config.door);refresh();
  const guides=[
    'The lantern has found the star again. In the courtyard its reflection led to a matching tile; find that star here.',
    'The star is leading us onward. Each true step leaves a trail of light and wakes one floating diamond.',
    'One more matching star. Its trail is leading toward the golden light by the doorway.'
  ];
  showGuide(guides[round],10);
}
function beginGlobeSeal(){phase='seal';waterStar.visible=false;globeSeal.group.visible=true;globeReflection.group.visible=true;$('#world').textContent='A key remembered';$('#objective').textContent='Wake the globe seal.';$('#status').textContent='The garden’s golden globe is reflected in the water and at the doorway.';refresh();showGuide('The golden globe opened the way from the garden. Its light is remembered here; wake the matching seal.',10);}
function chooseSide(side){if(phase!=='junction'||paused||movement)return;const config=routeRounds[round];if(side!==config.answer){effects.wrongTile();wrongPulse={sprite:markers.children[side==='left'?0:1],time:0};$('#status').textContent='That path shimmers away. The traveller remains safely in place.';showGuide('That tile was an illusion. Follow the lantern’s star to its matching tile.',8);return;}hideGuide();effects.correctTile();phase='walking-route';$('#status').textContent='The star leads onward; a trail of light follows the traveller.';refresh();const trailFrom=walker.position.clone();move(new THREE.Vector3(side==='left'?-1.2:1.2,.55,config.z),()=>{addTrail(trailFrom,walker.position);const beacon=floating[round];beacon.active=true;beacon.crystal.material.color.set('#ffdb82');beacon.crystal.material.emissive.set('#f2a83f');beacon.crystal.material.emissiveIntensity=1.8;round++;if(round<routeRounds.length){showJunction();}else{if(markers)scene.remove(markers);if(reflectionPlane)reflectionPlane.visible=false;addTrail(walker.position,new THREE.Vector3(-1.2,.55,-5.15));doorTo(-1.2);phase='approaching-seal';$('#world').textContent='A doorway found';$('#objective').textContent='The doorway is settling.';$('#status').textContent='A familiar golden light begins to appear.';refresh();}});}

// Keep the little lit lantern and the familiar traveller and guide from earlier chapters.
const avatar=await createTraveler(THREE,scene),walker=avatar.group;walker.position.set(0,.3,4.5);walker.rotation.y=Math.PI;
const carry=createTwoHandCarry(THREE,walker),effects=createGardenSounds(),spirit=createGuide(THREE,scene,camera),bubble=createGuideBubble(THREE,camera,$('#game'),$('.guide'));
const lantern=new THREE.Group();scene.add(lantern);box(.3,.07,.3,0,-.17,0,gold,lantern);box(.23,.34,.23,0,.04,0,paleGold,lantern);box(.3,.07,.3,0,.24,0,gold,lantern);const handle=new THREE.Mesh(new THREE.TorusGeometry(.12,.025,8,20,Math.PI),gold);handle.position.set(0,.29,0);lantern.add(handle);const flame=new THREE.PointLight('#ffd08a',.9,2);lantern.add(flame);
let sound=true;try{sound=sessionStorage.getItem('unfaithful-reflection-sound')!=='off';}catch(_){}effects.setEnabled(sound);
const lampSound=createLampSound({enabled:sound});
const music=createHallMusic({calmSrc:'./assets/ibn-al-noor.mp3',mysterySrc:'./assets/hidden-wonders.mp3',enabled:sound,onError:()=>{$('#status').textContent='Music could not start. Toggle Sound to try again.';}});
const flipSound=createFlipSound({enabled:sound});
let started=false,paused=false,phase='opening',movement=null,elapsed=0,flipTime=0,guideTime=0,idle=0,illuminationTime=0;
let placementTime=0,lanternPlaced=false,archRevealTime=0,guideDeparture=null;
const archTurns=[1,3,1];
function hideGuide(){spirit.hide();guideTime=0;}
function showGuide(message,duration=9){
  if(!started||paused)return;
  $('#guide').textContent=message;$('.guide').style.opacity='0';$('.guide').classList.remove('hidden');
  const byPodium=['at-podium','placing-lantern','podium-complete'].includes(phase);
  const bounds=new THREE.Box3().setFromObject(podium);
  // Use the projected width of the whole traveller (including his lantern)
  // rather than a fixed small rectangle around his feet. This keeps both
  // the figure and the speech clear at desktop and phone scales.
  walker.updateWorldMatrix(true,true);
  const personBounds=new THREE.Box3().setFromObject(walker);
  if(!lanternPlaced){lantern.updateWorldMatrix(true,true);const lanternBounds=new THREE.Box3().setFromObject(lantern);if(!lanternBounds.isEmpty()&&lanternBounds.distanceToPoint(walker.position)<1.8)personBounds.union(lanternBounds);}
  const game=$('#game'),personRect=projectWorldBox(THREE,camera,game,personBounds,18),podiumRect=projectWorldBox(THREE,camera,game,bounds);
  // Offset along the camera's horizontal axis so the two figures remain
  // visibly apart even when the isometric projection changes on mobile.
  const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0);right.y=0;right.normalize();
  const side=(byPodium||phase==='passage-ready')?1:-1;
  // Judge the guide and its message together: a position that leaves the
  // figure clear can still put a long message directly over the traveller.
  const overlap=(a,b)=>a&&b?Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)):0;
  const parent=game.getBoundingClientRect();
  const ui=['.objective','.top-actions','.controls','#arch-panel'].map(selector=>{
    const el=game.querySelector(selector);if(!el||el.hidden||getComputedStyle(el).display==='none')return null;
    const r=el.getBoundingClientRect();return {left:r.left-parent.left,right:r.right-parent.left,top:r.top-parent.top,bottom:r.bottom-parent.top};
  }).filter(Boolean);
  let best=null;
  for(const offset of [side*2,side*2.8,side*3.6,-side*2,-side*2.8,-side*3.6]){
    const candidate=chooseGuidePosition(THREE,camera,game,walker.position.clone().addScaledVector(right,offset),walker.position,[personRect,podiumRect].filter(Boolean),{avoidLandmarks:true});
    bubble.show(candidate,walker.position,bounds,personBounds);
    const b=$('.guide').getBoundingClientRect(),box={left:b.left-parent.left,right:b.right-parent.left,top:b.top-parent.top,bottom:b.bottom-parent.top};
    const figure=guideScreenBounds(THREE,camera,game,candidate);
    const score=overlap(box,personRect)*50000+overlap(figure,personRect)*50000+ui.reduce((sum,rect)=>sum+overlap(box,rect)*10000+overlap(figure,rect)*10000,0)+overlap(box,podiumRect)*1000+Math.abs(offset)*8;
    if(!best||score<best.score)best={position:candidate,score};
  }
  spirit.show(best.position);bubble.show(best.position,walker.position,bounds,personBounds);guideTime=duration;idle=0;effects.guide();
}
// Let the guide and her attached message fade before the traveller crosses
// their screen position. This avoids a bubble covering him during departure.
function afterGuideDeparture(callback){const visible=spirit.isVisible();hideGuide();if(!visible){callback();return;}guideDeparture={remaining:.7,callback};}
function hint(){if(phase==='opening')return 'A star and a golden globe wait on that podium. Let us look closer.';if(phase==='at-podium')return 'There is a third place beside them. Set the lantern there, keeping its flame safe.';if(phase==='podium-complete')return 'The wall is empty, yet the water shows a doorway. Let us take a closer look.';if(phase==='aligning')return 'The water remembers a complete arch. Turn the pieces until their ends meet.';if(phase==='passage-ready')return 'You found the doorway the water remembered. Beyond it lies the path to the inhabitants’ freedom.';return 'Stay close. The water may remember what the hall has hidden.';}
function refresh(){
 const phases={'opening':0,'approaching':.08,'at-podium':.18,'placing-lantern':.23,'podium-complete':.34,'investigating':.39,'flipping':.44,'aligning':.50,'arch-aligned':.82,'passage-ready':.88,'entering':.94,'done':1};
 let progress=phases[phase]??0;
 if(phase==='aligning')progress+=archTurns.filter(value=>value===0).length*.10;
 chapterProgress.update(progress);
 const active=started&&!paused&&!movement;$('#approach').hidden=phase!=='opening';$('#approach').disabled=!active;$('#place-lantern').hidden=phase!=='at-podium';$('#place-lantern').disabled=!active;$('#investigate').hidden=phase!=='podium-complete';$('#investigate').disabled=!active;for(const id of ['turn-left','turn-top','turn-right']){$('#'+id).hidden=phase!=='aligning';$('#'+id).disabled=!active;}$('#arch-panel').hidden=!['aligning','arch-aligned'].includes(phase);$('#cross').hidden=true;$('#reveal-star').hidden=true;$('#follow').hidden=true;for(const id of ['left','right'])$('#'+id).hidden=true;$('#reflection').hidden=true;$('#seal-reflection').hidden=true;$('#wake-seal').hidden=true;$('#enter').hidden=phase!=='passage-ready';$('#enter').disabled=!active;}
function move(to,done){const from=walker.position.clone();movement={from,to:to.clone(),time:0,duration:Math.max(.4,from.distanceTo(to)/1.45),heading:Math.atan2(to.x-from.x,to.z-from.z),done};refresh();}
function updateMove(dt){if(!movement)return;const m=movement,difference=Math.atan2(Math.sin(m.heading-walker.rotation.y),Math.cos(m.heading-walker.rotation.y));walker.rotation.y+=Math.sign(difference)*Math.min(Math.abs(difference),dt*4);if(Math.abs(difference)>.04)return;m.time+=dt;const t=THREE.MathUtils.smoothstep(Math.min(1,m.time/m.duration),0,1);walker.position.lerpVectors(m.from,m.to,t);if(m.floorTransition)walker.position.y=THREE.MathUtils.lerp(.3,.55,THREE.MathUtils.smoothstep(-walker.position.z,.35,.65));if(m.time>=m.duration){walker.position.copy(m.to);movement=null;m.done();refresh();}}
$('#start').onclick=()=>{started=true;dismissOpening($('#opening'));effects.unlock();flipSound.unlock();lampSound.unlock();music.start();refresh();showGuide('The star and the golden globe are here. A third place waits beside them.',9);};
$('#approach').onclick=()=>{if(movement||phase!=='opening')return;phase='approaching';$('#objective').textContent='Walk to the podium.';$('#status').textContent='The traveller carries the burning lantern toward the three places.';refresh();afterGuideDeparture(()=>move(new THREE.Vector3(0,.3,approachLead.z),()=>{move(approachLead,()=>{move(podiumApproach,()=>{phase='at-podium';$('#objective').textContent='Place the lantern beside the star and globe.';$('#status').textContent='A third place waits for the little lantern.';showGuide('The star and the golden globe have found their places. Set the lantern beside them, and keep its light safe.',10);});});}));};
$('#place-lantern').onclick=()=>{if(phase!=='at-podium'||paused||movement)return;hideGuide();phase='placing-lantern';placementTime=0;$('#objective').textContent='Place the lantern gently.';$('#status').textContent='The traveller sets the burning lantern on the empty place.';refresh();};
$('#investigate').onclick=()=>{if(phase!=='podium-complete'||paused||movement)return;hideGuide();phase='investigating';$('#objective').textContent='Look closer at the reflection.';$('#status').textContent='The wall is bare, but the water shows a doorway.';move(new THREE.Vector3(0,.3,podiumApproach.z),()=>{move(new THREE.Vector3(0,.3,.15),()=>{phase='flipping';flipTime=-.25;music.beginFlip();$('#world').textContent='The far side is changing';$('#objective').textContent='The other side is turning…';$('#status').textContent='The traveller stays safely on the near side.';effects.guide();refresh();});});};
function turnArchPiece(index){
  if(phase!=='aligning'||paused||movement)return;
  const previouslyAligned=archTurns.filter(value=>value===0).length;
  archTurns[index]=(archTurns[index]+1)%4;
  missingDoor.setPiece(index,archTurns[index]);
  const ids=['arch-left','arch-top','arch-right'],centres=['25 45','50 15','75 45'];
  document.getElementById(ids[index]).setAttribute('transform',`rotate(${archTurns[index]*90} ${centres[index]})`);
  const aligned=archTurns.filter(value=>value===0).length;
  if(aligned===3){phase='arch-aligned';archRevealTime=0;$('#objective').textContent='The reflected arch is whole.';$('#status').textContent='The water holds the doorway steady.';$('#arch-status').textContent='The pieces join into one doorway.';effects.correctTile();refresh();}
  else{
    refresh();
    $('#arch-status').textContent=aligned===1?'One piece is in place.':aligned===2?'Two pieces are in place.':'Turn the pieces until the arch joins.';
    if(aligned>previouslyAligned){effects.correctTile();showGuide(aligned===1?'That piece is in place. Let the outline guide the others.':'The doorway is taking shape. One more piece will make it whole.',8);}
  }
}
$('#turn-left').onclick=()=>turnArchPiece(0);$('#turn-top').onclick=()=>turnArchPiece(1);$('#turn-right').onclick=()=>turnArchPiece(2);
$('#cross').onclick=()=>{if(movement||phase!=='at-crossing')return;hideGuide();phase='crossing';$('#objective').textContent='Cross to the gateway.';$('#status').textContent='The traveller walks toward the far side.';move(new THREE.Vector3(0,.3,.24),()=>{phase='flipping';flipTime=-.25;$('#world').textContent='The far side is changing';$('#objective').textContent='The other side is turning…';$('#status').textContent='The traveller stops safely as the far side begins to move.';effects.guide();});};
function finishFlip(){missingDoor.hideClue();phase='aligning';missingDoor.showPuzzle();$('#world').textContent='The reflected hall';$('#objective').textContent='Restore the broken arch.';$('#status').textContent='Turn each reflected piece until the doorway is whole.';refresh();showGuide('The doorway in the water is broken now. Turn its pieces until the arch comes together.',5);}
$('#reveal-star').onclick=()=>{if(phase!=='revealed'||paused||movement)return;hideGuide();lanternBeam.visible=true;waterStar.visible=true;illuminationTime=0;effects.guide();phase='illuminating';$('#objective').textContent='Let the lantern light the water.';$('#status').textContent='A familiar shape begins to shine in the reflection.';refresh();};
$('#follow').onclick=()=>{if(phase!=='star-shown'||paused||movement)return;hideGuide();phase='following';$('#objective').textContent='Follow the star’s trail.';$('#status').textContent='The traveller follows the light; the doorway begins to drift.';doorTo(1.5);refresh();move(new THREE.Vector3(0,.55,-.55),()=>{showJunction();});};
$('#left').onclick=()=>chooseSide('left');$('#right').onclick=()=>chooseSide('right');
$('#wake-seal').onclick=()=>{if(phase!=='seal'||paused||movement)return;effects.door();phase='ready';globeSeal.halo.material.opacity=.4;$('#world').textContent='A doorway found';$('#objective').textContent='The globe’s light steadies the doorway.';$('#status').textContent='The way deeper into the fortress is open.';refresh();showGuide('The garden’s light has opened the way once more. Keep your lantern close as we go onward.',10);};
$('#enter').onclick=()=>{if(phase!=='passage-ready'||paused||movement)return;phase='entering';$('#objective').textContent='Follow the hidden passage.';$('#status').textContent='The traveller approaches the doorway the water revealed.';refresh();afterGuideDeparture(()=>{move(new THREE.Vector3(0,.55,-5.75),()=>{phase='done';journal.record(4);music.finish();$('#ending').classList.remove('hidden');refresh();
// Show the recovered page, then carry the shared chapter transition into the
// sanctuary. The link also provides a usable fallback if the module fails.
const next=$('#ending .continue-link');next.hidden=true;
import('../journey-transition.js?v=journey-five-20261120').then(({revealChapterReward})=>{revealChapterReward(journal,4,next,()=>phase==='done'&&!$('#ending').classList.contains('hidden'));}).catch(()=>{next.hidden=false;if(phase==='done')journal.unlock(4);});});movement.floorTransition=true;});};
$('#hint').onclick=()=>showGuide(hint(),10);
function soundLabel(){$('#sound').textContent=sound?'Sound on':'Sound off';$('#sound').setAttribute('aria-pressed',String(sound));}soundLabel();$('#sound').onclick=()=>{sound=!sound;try{sessionStorage.setItem('unfaithful-reflection-sound',sound?'on':'off');}catch(_){}effects.setEnabled(sound&&!paused);flipSound.setEnabled(sound&&!paused);lampSound.setEnabled(sound&&!paused);music.setEnabled(sound);if(sound&&!paused){effects.unlock();flipSound.unlock();lampSound.unlock();}soundLabel();};
function setPause(value){if(!started)return;paused=value;hideGuide();$('#pause-panel').classList.toggle('hidden',!paused);$('#pause').textContent=paused?'Resume':'Pause';$('#pause').setAttribute('aria-pressed',String(paused));effects.setEnabled(sound&&!paused);flipSound.setEnabled(sound&&!paused);lampSound.setEnabled(sound&&!paused);music.setPaused(paused);if(!paused&&sound){effects.unlock();flipSound.unlock();lampSound.unlock();}refresh();}$('#pause').onclick=()=>setPause(!paused);$('#resume').onclick=()=>setPause(false);$('#restart').onclick=()=>location.reload();
let journalPausedGame=false;
document.addEventListener('journal:open',()=>{journalPausedGame=started&&phase!=='done'&&!paused;if(journalPausedGame)setPause(true);});
document.addEventListener('journal:close',()=>{if(journalPausedGame)setPause(false);journalPausedGame=false;});
function resize(){const w=$('#game').clientWidth,h=$('#game').clientHeight,aspect=w/h;const extent=aspect<1?Math.max(11.5,8.8/aspect):8.8;camera.left=-extent*aspect;camera.right=extent*aspect;camera.top=extent;camera.bottom=-extent;camera.updateProjectionMatrix();renderer.setSize(w,h,false);}window.addEventListener('resize',resize);resize();
// Prepare both sides with the same blending and shader they use during the
// turn, while the loading screen is still up. The first reveal then requires
// no just-in-time shader changes.
dream.visible=true;lanternBeam.visible=true;waterStar.visible=true;
renderer.compile(scene,camera);
dream.visible=false;lanternBeam.visible=false;waterStar.visible=false;
$('#loading').classList.add('hidden');refresh();
const clock=new THREE.Clock();function frame(){requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.05);if(!paused){elapsed+=dt;music.update(dt);carry.restore();const walking=advanceWalking(walker,updateMove,dt);avatar.update(dt,{moving:walking,onFootstep:()=>{effects.footstep();if(phase==='entering')lightPathDiamond();}});
if(phase==='placing-lantern'){
  placementTime+=dt;const t=Math.min(1,placementTime/2.2);
  const held=carry.position().add(new THREE.Vector3(0,-.22,0));
  const clearance=Math.max(held.y,lanternRest.y)+.22;
  const lifted=held.clone();lifted.y=clearance;
  const aboveSlot=lanternRest.clone();aboveSlot.y=clearance;
  // Lift first, carry across above the top, then lower onto the empty disc.
  if(t<.28)lantern.position.lerpVectors(held,lifted,THREE.MathUtils.smoothstep(t,0,.28));
  else if(t<.76)lantern.position.lerpVectors(lifted,aboveSlot,THREE.MathUtils.smoothstep(t,.28,.76));
  else lantern.position.lerpVectors(aboveSlot,lanternRest,THREE.MathUtils.smoothstep(t,.76,1));
  const handTarget=lantern.position.clone().add(new THREE.Vector3(0,.22,0));
  carry.apply(handTarget,1-THREE.MathUtils.smoothstep(t,.72,1));
  if(t>=1){lanternPlaced=true;phase='podium-complete';missingDoor.showClue();$('#world').textContent='A hidden reflection';$('#objective').textContent='Look at the wall and the water.';$('#status').textContent='The wall is bare, yet the water shows a doorway.';refresh();showGuide('The wall is empty, but look in the water. A doorway is waiting there.',12);}
}else if(lanternPlaced){lantern.position.copy(lanternRest);}else{const target=carry.position();lantern.position.copy(target).add(new THREE.Vector3(0,-.22,0));carry.apply(target);}
flame.intensity=.85+Math.sin(elapsed*5)*.12;
missingDoor.update(elapsed);
if(phase==='arch-aligned'){archRevealTime+=dt;if(archRevealTime>=.8){missingDoor.showPassage();phase='passage-ready';$('#world').textContent='A doorway found';$('#objective').textContent='The hidden passage is open.';$('#status').textContent='The doorway appeared where the wall was empty.';refresh();showGuide(hint(),25);}}
if(phase==='illuminating'){illuminationTime+=dt;const fade=THREE.MathUtils.smoothstep(illuminationTime,0,1.2);beamMaterial.opacity=.13*fade;waterStar.material.opacity=fade;if(fade>=1){phase='star-shown';$('#objective').textContent='The star returns in the water.';$('#status').textContent='The lantern reveals the star from the courtyard.';refresh();showGuide('The star has returned, just as in the courtyard. Let us follow its reflection.',10);}}
if(lanternBeam.visible){const clue=(phase==='junction'||phase==='walking-route')?routeRounds[Math.min(round,routeRounds.length-1)]:null;beamEnd.set(clue?(clue.answer==='left'?-1:1):0,4.96,-2.7);beamDirection.subVectors(beamEnd,lantern.position);lanternBeam.position.copy(lantern.position).addScaledVector(beamDirection,.5);lanternBeam.scale.y=beamDirection.length();lanternBeam.quaternion.setFromUnitVectors(beamUp,beamDirection.normalize());}
if(phase==='flipping'){
  flipTime+=dt;
  const t=THREE.MathUtils.clamp(flipTime/3.8,0,1),ease=THREE.MathUtils.smoothstep(t,0,1);
  flipSound.update(t);
  hinge.rotation.x=-Math.PI*ease;
  scene.background.lerpColors(hallSky,reflectedSky,THREE.MathUtils.smoothstep(t,.08,.92));
  const mix=THREE.MathUtils.smoothstep(ease,.36,.64);
  farPalace.visible=mix<1;dream.visible=mix>0;
  setFlipOpacity(palaceFade,1-mix);setFlipOpacity(dreamFade,mix);
  if(t>=1){hinge.rotation.x=-Math.PI;finishFlip();}
}
if(wrongPulse){wrongPulse.time+=dt;wrongPulse.sprite.material.opacity=.18+.82*Math.abs(Math.sin(wrongPulse.time*12));if(wrongPulse.time>1){wrongPulse.sprite.material.opacity=1;wrongPulse=null;}}
if(doorMotion){doorMotion.time+=dt;const t=Math.min(1,doorMotion.time/1.6);falseDoor.position.x=THREE.MathUtils.lerp(doorMotion.from,doorMotion.to,THREE.MathUtils.smoothstep(t,0,1));if(t>=1){doorMotion=null;if(phase==='approaching-seal')beginGlobeSeal();}}
if(globeSeal.group.visible){for(const memory of [globeSeal,globeReflection]){memory.ringA.rotation.y=elapsed*.65;memory.ringB.rotation.x=elapsed*.45;}}
if(dream.visible){floating.forEach(f=>{f.group.position.y=f.y+Math.sin(elapsed*1.1+f.phase)*.11;if(f.active){f.pulse=Math.max(0,f.pulse-dt*2.6);f.crystal.material.emissiveIntensity=1.0+1.0*f.pulse;f.glow.material.opacity=.32+.58*f.pulse;}});for(let i=0;i<waterPositions.count;i++){const x=waterBase[i*3],y=waterBase[i*3+1];waterPositions.setZ(i,.06*Math.sin(x*1.8+elapsed*1.4)+.04*Math.sin(y*2.6-elapsed));}waterPositions.needsUpdate=true;waterGeometry.computeVertexNormals();if(phase!=='flipping'){atmosphere.update(elapsed);overheadRipples.forEach(({ring,phase:offset})=>{const wave=(Math.sin(elapsed*.65+offset)+1)/2,scale=.9+.25*wave;ring.scale.set(scale,scale*.65,1);ring.material.opacity=.11+.07*(1-wave);});mirages.forEach((echo,i)=>{echo.material.opacity=.10+.035*Math.sin(elapsed*.8+i*1.35);});}}
if(guideTime>0){guideTime-=dt;if(guideTime<=0)hideGuide();}if(started&&!movement&&['opening','at-podium','podium-complete','aligning','passage-ready'].includes(phase)){idle+=dt;if(idle>38){idle=0;showGuide(hint(),8);}}
spirit.update(dt);$('.guide').style.opacity=String(spirit.opacity());if(spirit.isVisible())bubble.update();else{$('.guide').classList.add('hidden');bubble.hide();}if(guideDeparture){guideDeparture.remaining-=dt;if(guideDeparture.remaining<=0){const callback=guideDeparture.callback;guideDeparture=null;callback();}}}
renderer.render(scene,camera);}frame();

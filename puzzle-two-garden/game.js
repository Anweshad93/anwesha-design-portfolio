import {registerMusicHandoff} from '../journey-ui/audio-handoff.js?v=3';
import {createMusicFadeIn} from '../journey-ui/music-fade-in.js?v=1';
import { dismissOpening } from '../journey-ui/opening-transition.js?v=1';
import { chooseGuidePosition, projectWorldBox } from '../journey-ui/guide-layout.js?v=1';
import * as THREE from '../game-demo/vendor/three.module.js';
import { createTraveler } from '../the-unfaithful-reflection-first-draft/traveler3d.js';
import { createGardenWorld } from './world.js?v=tree-key-6';
import { createGuide } from './guide.js?v=visible-1';
import { createGuideBubble } from './guide-bubble.js?v=attached-1';
import { createStonePuzzle } from './stones.js?v=reflections-3';
import { createGardenMotion } from './motion.js?v=landing-4';
import { createTwoHandCarry } from './carry.js?v=two-hands-1';
import { createGardenSounds } from './sounds.js?v=5';
import { createChapterProgress } from '../journey-ui/chapter-progress.js?v=2';
import { mountJournal } from '../journey-journal/journal.js?v=portfolio-iv-20261120';

const journal=mountJournal({chapter:2});
const chapterProgress = createChapterProgress(2);

const $ = selector => document.querySelector(selector);
const world = createGardenWorld(THREE);
const {scene,camera,start,end} = world;
const puzzle = createStonePuzzle(THREE,scene,camera);
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.7));
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
$('#scene').appendChild(renderer.domElement);renderer.domElement.style.touchAction='none';
const avatar=await createTraveler(THREE,scene),walker=avatar.group;
const gardenMotion=createGardenMotion(THREE,walker);
const carry=createTwoHandCarry(THREE,walker);
const spirit=createGuide(THREE,scene,camera);
const effects=createGardenSounds();
const guideBubble=createGuideBubble(THREE,camera, $('#game'), $('.guide'));
walker.position.copy(start);
// The character faces the first stone before the player takes the first step.
walker.rotation.y = Math.atan2(puzzle.first.group.position.x-start.x, puzzle.first.group.position.z-start.z);
$('#loading').classList.add('hidden');
const clock=new THREE.Clock(),music=new Audio('./assets/desert-city.mp3');music.loop=true;music.volume=.18;music.hidden=true;document.body.appendChild(music);registerMusicHandoff(music);const musicFadeIn=createMusicFadeIn(music,{volume:.18,duration:1800});
function loadSoundPreference(){try{return sessionStorage.getItem('unfaithful-reflection-sound')!=='off';}catch(_){return true;}}
function saveSoundPreference(){try{sessionStorage.setItem('unfaithful-reflection-sound',sound?'on':'off');}catch(_){ /* The game still works when storage is unavailable. */ }}
let sound=loadSoundPreference(),started=false,paused=false,finished=false,onFirst=false,reachedGarden=false,crossing=false,treeAwake=false,keyTaken=false,unlockWaiting=false,movement=null,collecting=null,selected=null,drag=null;
let idle=0,hintTime=0,hintShown=false;
let treeGrowthTime=null, keySoundPlayed=false, treeSoundPlayed=false;
const matchingHint='Match the symbol on a tile with the same symbol in the water. Press and hold the tile, then drag it onto the matching outline.';
let endingDelay=null;
const stoneTop=.845;
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),-.66),waterPlane=new THREE.Plane(new THREE.Vector3(0,1,0),-.065);
function dismissHint(){spirit.hide();hintTime=0;}
function activity(){idle=0;hintShown=false;dismissHint();}
function showHint(message, duration=5, side=-1.3){
  if(!started||paused||finished)return;
  $('#guide').textContent=message;$('.guide').style.opacity='0';$('.guide').classList.remove('hidden');
  const pos=chooseGuidePosition(THREE,camera,$('#game'),walker.position.clone().add(new THREE.Vector3(side,0,.45)),walker.position);effects.guide();spirit.show(pos);guideBubble.show(pos,walker.position);hintTime=duration;idle=0;hintShown=true;
}
function contextualHint(){return !onFirst ? 'Step onto the first stone. Then study the shapes reflected in the water.' : !puzzle.slots.every(s=>s.filled) ? matchingHint : !reachedGarden ? 'The path is ready. Cross toward the tree.' : !treeAwake ? 'The quiet tree is waiting for your touch.' : !keyTaken ? 'The tree has revealed a key. Take it to open the way to the missing inhabitants.' : 'The key has opened a way ahead.';}
function refresh(){
 let progress=started?.05:0;
 if(onFirst) progress=.18 + puzzle.slots.filter(slot=>slot.filled).length*.14;
 if(reachedGarden) progress=.62;
 if(treeAwake) progress=.75;
 if(keyTaken) progress=.87;
 if(finished) progress=1;
 chapterProgress.update(progress);
 const ready=started&&!finished&&!paused&&!movement&&!collecting&&!unlockWaiting;
 const complete=puzzle.slots.every(s=>s.filled);
 const set=(id,visible)=>{$('#'+id).hidden=!visible;$('#'+id).disabled=!ready;};
 set('first',started&&!onFirst&&!finished);set('cross',started&&onFirst&&complete&&!reachedGarden&&!crossing&&!finished);
 for(const p of puzzle.pieces){const b=$('#choose-'+p.kind);b.hidden=!started||!onFirst||complete||p.placed||finished||reachedGarden;b.disabled=!ready;b.setAttribute('aria-pressed',String(selected===p));}
 for(let i=0;i<puzzle.slots.length;i++){const b=$('#slot-'+i);b.hidden=!selected||puzzle.slots[i].filled||!onFirst||finished;b.disabled=!ready;}
 set('collect',started&&reachedGarden&&!treeAwake&&!finished);set('take-key',started&&treeAwake&&!keyTaken&&!finished);set('door',started&&keyTaken&&!finished);
 $('#status').textContent=!onFirst?'Step onto the first stone.':!complete?'Match the scattered stones to the reflected spaces.':crossing?'The traveller is crossing.':!reachedGarden?'The path is ready to cross.':!treeAwake?'A bare tree waits in the garden.':!keyTaken?'A glowing key has appeared.':'The magical doorway is open.';
}
function moveTo(destination,callback,jumping=true,faceTarget=null){const from=walker.position.clone(),to=destination.clone(),dir=to.clone().sub(from);const distance=Math.hypot(dir.x,dir.z),heading=Math.atan2(dir.x,dir.z);const angle=Math.atan2(Math.sin(heading-walker.rotation.y),Math.cos(heading-walker.rotation.y));const phase=Math.abs(angle)<.12?'move':'turn';if(phase==='move')walker.rotation.y=heading;movement={from,to,heading,jumping,phase,time:0,duration:Math.max(.15,distance/.70),callback,faceTarget:faceTarget?.clone()};refresh();}
function updateMovement(dt){
 if(!movement)return;
 const s=movement;
 if(s.phase==='face'){
  const angle=Math.atan2(Math.sin(s.heading-walker.rotation.y),Math.cos(s.heading-walker.rotation.y));
  // Finish facing the object gradually before beginning the reaching pose.
  // A direct look-at here used to snap the traveller sideways at pickup.
  walker.rotation.y+=Math.sign(angle)*Math.min(Math.abs(angle),dt*3);
  if(Math.abs(angle)>.015)return;
  walker.rotation.y=s.heading;movement=null;if(s.callback)s.callback();refresh();return;
 }
 if(s.phase==='turn'){
  const a=Math.atan2(Math.sin(s.heading-walker.rotation.y),Math.cos(s.heading-walker.rotation.y));
  walker.rotation.y+=Math.sign(a)*Math.min(Math.abs(a),dt*5);
  if(Math.abs(a)>.12)return;
  walker.rotation.y=s.heading;s.phase='move';s.time=0;
 }
 const previousTime=s.time;
 s.time+=dt;
 const t=Math.min(1,s.time/s.duration);
 // A hop touches down at the end of its airborne interval, not at the
 // next stone centre. Fire once at that point and suppress flight footsteps.
 if(s.jumping && previousTime/s.duration < .29 && t >= .29) effects.jump();
 if(s.jumping && previousTime/s.duration < .71 && t >= .71) effects.landing();
 walker.position.lerpVectors(s.from,s.to,t);
 if(s.jumping)walker.position.y+=gardenMotion.height(t);
 if(t>=1){
  walker.position.copy(s.to);
  if(s.faceTarget){const dx=s.faceTarget.x-s.to.x,dz=s.faceTarget.z-s.to.z;s.faceTarget=null;if(Math.hypot(dx,dz)>.0001){s.heading=Math.atan2(dx,dz);s.phase='face';return;}}
  movement=null;if(s.callback)s.callback();refresh();
 }
}
function place(piece,slot){
 if(!piece||!slot||piece.placed||slot.filled)return;
 if(piece.kind!==slot.kind){effects.wrongTile();piece.group.position.copy(piece.origin);selected=null;$('#objective').textContent='That carving does not match this reflection.';showHint('Drag a tile onto a glowing outline with the same symbol.');refresh();return;}
 effects.correctTile();piece.group.position.set(slot.x,.66,slot.z);piece.group.rotation.y=0;piece.placed=true;slot.filled=true;slot.group.visible=false;puzzle.markAligned(piece);selected=null;activity();
 const complete=puzzle.slots.every(s=>s.filled);
 $('#objective').textContent=complete?'The path is complete. The traveller crosses.':'One tile fits. Drag another onto the matching glowing outline.';refresh();
 if(complete){puzzle.markComplete();crossPath();} else showHint('That tile fits. Drag the next tile onto its matching glowing outline.');
}
$('#first').onclick=()=>{if(movement||paused)return;activity();moveTo(new THREE.Vector3(0,start.y,5.2),()=>moveTo(new THREE.Vector3(0,stoneTop,puzzle.first.group.position.z),()=>{onFirst=true;$('#objective').textContent='Drag each tile onto its matching glowing outline to build a path.';refresh();showHint(matchingHint,8);},false),false);};
function soundForChoice(piece){if(!puzzle.slots.some(s=>!s.filled&&s.kind===piece.kind))effects.wrongTile();}
for(const p of puzzle.pieces)$('#choose-'+p.kind).onclick=()=>{activity();soundForChoice(p);selected=p;$('#objective').textContent='Choose a reflected space for the '+p.kind+' stone.';refresh();};
for(let i=0;i<puzzle.slots.length;i++)$('#slot-'+i).onclick=()=>place(selected,puzzle.slots[i]);
function crossPath(){if(movement||paused||crossing||reachedGarden||!puzzle.slots.every(s=>s.filled))return;activity();crossing=true;const targets=[...puzzle.slots.map(s=>({point:new THREE.Vector3(s.x,stoneTop,s.z),jump:true})),{point:new THREE.Vector3(0,stoneTop,-1.25),jump:true},
 // The last stone overlaps the terrace. Step down across that overlap, then
 // walk onto the terrace; there is no gap that requires another jump.
 {point:new THREE.Vector3(0,stoneTop,-1.70),jump:false},{point:new THREE.Vector3(0,end.y,-1.82),jump:false},{point:end,jump:false}];function advance(){if(!targets.length){crossing=false;reachedGarden=true;$('#objective').textContent='Find the quiet tree in the garden.';refresh();showHint('This tree has been waiting for a human touch.');return;}const target=targets.shift();moveTo(target.point,advance,target.jump);}advance();}
$('#cross').onclick=crossPath;
$('#collect').onclick=()=>{if(!reachedGarden||treeAwake||movement||paused)return;activity();moveTo(world.approach,()=>{avatar.face(world.treasure.position);collecting={kind:'tree',time:0,revealed:false};refresh();},false);};
$('#take-key').onclick=()=>{if(!treeAwake||keyTaken||movement||paused)return;activity();moveTo(world.keyApproach,()=>{world.beginKeyPickup();collecting={kind:'key',time:0,origin:world.key.position.clone()};refresh();},false,world.key.position);};
$('#door').onclick=()=>{if(!keyTaken||movement||paused)return;activity();moveTo(world.doorWaypoints[0],()=>moveTo(world.doorway,()=>{finished=true;journal.record(2);dismissHint();endingDelay=1.5;refresh();},false,world.doorFaceTarget),false);};
$('#describe-clue').onclick=()=>{$('#clue').textContent='The first reflected space shows a crescent; the second shows a star. The remaining stones are spare.';activity();};
$('#start').onclick=()=>{started=true;if(sound){effects.setEnabled(true);effects.unlock();playMusic();}dismissOpening($('#opening'));activity();refresh();showHint('Step onto the first stone.',3.5);};
$('#restart').onclick=()=>location.reload();
function soundLabel(){ $('#sound').textContent=sound?'Sound on':'Sound off'; $('#sound').setAttribute('aria-pressed',String(sound)); }
function playMusic(){musicFadeIn.play().catch(()=>{sound=false;saveSoundPreference();effects.setEnabled(false);soundLabel();$('#objective').textContent='Sound could not start. Tap Sound off to try again.';});}
$('#sound').onclick=()=>{sound=!sound;saveSoundPreference();soundLabel();effects.setEnabled(sound&&!paused&&!finished);if(sound&&started&&!paused&&!finished){effects.unlock();playMusic();}else musicFadeIn.pause();};
function setPaused(value){if(!started||finished)return;paused=value;dismissHint();$('#pause-panel').classList.toggle('hidden',!paused);$('#pause').textContent=paused?'Resume':'Pause';$('#pause').setAttribute('aria-pressed',String(paused));effects.setEnabled(sound&&!paused);if(paused)musicFadeIn.pause();else if(sound){effects.unlock();playMusic();}refresh();}
let journalPausedGame=false;
document.addEventListener('journal:open',()=>{journalPausedGame=started&&!finished&&!paused;if(journalPausedGame)setPaused(true);});
document.addEventListener('journal:close',()=>{if(journalPausedGame)setPaused(false);journalPausedGame=false;});
$('#pause').onclick=()=>setPaused(!paused);$('#resume').onclick=()=>setPaused(false);
function setPointer(e){const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-((e.clientY-rect.top)/rect.height)*2+1);raycaster.setFromCamera(pointer,camera);}
function pointOnWater(e){setPointer(e);const p=new THREE.Vector3();return raycaster.ray.intersectPlane(plane,p)?p:null;}
renderer.domElement.addEventListener('pointerdown',e=>{
 if(!started||!onFirst||paused||finished||movement||collecting||reachedGarden)return;
 setPointer(e);const hits=raycaster.intersectObjects(puzzle.pieces.filter(p=>!p.placed).map(p=>p.group),true);if(!hits.length)return;
 let obj=hits[0].object;while(obj.parent&&obj.parent!==scene)obj=obj.parent;const piece=puzzle.pieces.find(p=>p.group===obj);if(!piece)return;
 const p=pointOnWater(e);if(!p)return;activity();soundForChoice(piece);drag={piece,offset:piece.group.position.clone().sub(p),moved:false,startX:e.clientX,startY:e.clientY};selected=piece;renderer.domElement.setPointerCapture(e.pointerId);refresh();
});
renderer.domElement.addEventListener('pointermove',e=>{if(!drag)return;const p=pointOnWater(e);if(!p)return;if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>5)drag.moved=true;drag.piece.group.position.set(p.x+drag.offset.x,.66,p.z+drag.offset.z);});
function finishDrag(e){if(!drag)return;const {piece,moved}=drag;drag=null;if(!moved){piece.group.position.copy(piece.origin);$('#objective').textContent='Choose a reflected space for the '+piece.kind+' stone.';refresh();return;}setPointer(e);const drop=new THREE.Vector3();const intersects=raycaster.ray.intersectPlane(waterPlane,drop);const slot=intersects&&puzzle.slots.find(s=>!s.filled&&Math.hypot(drop.x-s.reflectionX,drop.z-s.reflectionZ)<1.05);if(slot)place(piece,slot);else{piece.group.position.copy(piece.origin);selected=null;$('#objective').textContent='Press and hold a tile, then drag it onto the matching glowing outline.';refresh();}}
renderer.domElement.addEventListener('pointerup',finishDrag);
renderer.domElement.addEventListener('pointercancel',()=>{if(drag){drag.piece.group.position.copy(drag.piece.origin);drag=null;selected=null;refresh();}});
function resize(){const w=innerWidth,h=innerHeight,a=w/h;renderer.setSize(w,h);const minWidth=a<1?Math.max(world.minWidth||17,19):(world.minWidth||17);const view=Math.max(world.viewHeight||9.5,minWidth/(2*a));camera.left=-view*a;camera.right=view*a;camera.top=view;camera.bottom=-view;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();
function frame(){
 requestAnimationFrame(frame);
 const dt=Math.min(clock.getDelta(),.05);
 if(endingDelay!==null){endingDelay-=dt;if(endingDelay<=0){
  endingDelay=null;$('#ending').classList.remove('hidden');
  const next=$('#ending .continue-link');next.hidden=true;
  import('../journey-transition.js?v=14').then(({revealChapterReward})=>{
   revealChapterReward(journal,2,next,()=>finished&&!$('#ending').classList.contains('hidden'));
  }).catch(()=>{next.hidden=false;if(finished)journal.unlock(2);});
 }}
 if(!paused){
  gardenMotion.restore();carry.restore();updateMovement(dt);
  const progress=collecting?Math.min(1,collecting.time/1.8):0;
  avatar.update(dt,{moving:!!movement&&movement.phase==='move',turning:collecting?.kind==='tree'?{wheel:world.treasure,progress}:null,onFootstep:()=>{
   if(!movement || movement.phase!=='move')return;
   const hop=movement.jumping ? movement.time/movement.duration : -1;
   if(hop<.27 || hop>.78)effects.footstep();
  }});
  gardenMotion.apply(movement);
  if(collecting){
   collecting.time+=dt;const t=Math.min(1,collecting.time/(collecting.kind==='key'?2.5:1.8));
   if(collecting.kind==='tree'){
    if(t>=.30&&!collecting.revealed){collecting.revealed=true;treeGrowthTime=0;world.wakeTree();}
    if(t>=1&&world.keyReady){collecting=null;treeAwake=true;$('#objective').textContent='Find the glowing key revealed by the tree.';refresh();showHint('The tree has revealed a key. Take it to open the way to the missing inhabitants.',7,1.3);}
   }else{
    // First let both hands reach the hovering sphere. Then bring it in as a
    // single, slow movement, easing to rest before revealing the doorway.
    if(t>.45){const blend=THREE.MathUtils.smootherstep(t,.45,.96);world.key.position.lerpVectors(collecting.origin,carry.position(),blend);}
    if(t>=1){world.key.position.copy(carry.position());collecting=null;keyTaken=true;unlockWaiting=true;world.takeKey();effects.door();$('#objective').textContent='The key is opening the doorway.';refresh();showHint('The key is opening the way. The inhabitants’ trail continues beyond.',6);}
   }
  }
  if(keyTaken)world.key.position.copy(carry.position());
  if(keyTaken||collecting?.kind==='key')carry.apply(world.key.position,keyTaken?1:THREE.MathUtils.smootherstep(collecting.time/2.5,.04,.43));
  if(started&&!finished&&!movement&&!collecting&&!drag){idle+=dt;if(idle>20&&!hintShown)showHint(contextualHint(),onFirst&&!puzzle.slots.every(s=>s.filled)?8:5);}
  if(hintTime>0){hintTime-=dt;if(hintTime<=0)dismissHint();}
  world.update(dt);
  if(treeGrowthTime!==null){
   treeGrowthTime+=dt;
   if(!keySoundPlayed&&world.key.visible){keySoundPlayed=true;effects.key();}
   // The tree's growth reaches completion at 1 / .42 seconds.
   if(!treeSoundPlayed&&treeGrowthTime>=1/.42+.20){treeSoundPlayed=true;effects.tree();}
  }
  if(unlockWaiting&&world.doorReady){unlockWaiting=false;$('#objective').textContent='Enter the doorway revealed by the key.';refresh();}
 }
 spirit.update(dt);$('.guide').style.opacity=String(spirit.opacity());if(spirit.isVisible()){guideBubble.update();}else{$('.guide').classList.add('hidden');guideBubble.hide();}
 renderer.render(scene,camera);
}
soundLabel();refresh();frame();

// Shared placement for the traveller's guide. All rectangles are measured
// in the game container's CSS pixels; no viewport size is assumed.
const UI_SELECTORS = [
  '.objective', '.objective-card', '.top-actions', '.game-actions',
  '.controls', '.travel-controls', '.wheel-cue', '#arch-panel',
  '#seal-clue', '#memory-panel', '#water-clue', '.reflection',
  '.credits[open] > p', '.music-credits[open] > p'
];

function overlap(a,b) {
  return Math.max(0, Math.min(a.right,b.right)-Math.max(a.left,b.left)) *
    Math.max(0, Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
}

// A speaking guide can gently float, but its dialogue should not jump or bob
// as small changes in the projected figure alter the placement scores.
const fixedGuideMessages = new WeakMap();
export function resetGuideMessagePlacement(bubble) {
  fixedGuideMessages.delete(bubble);
}

function rectOf(element, root) {
  if (!element || element.hidden || element.closest('[hidden]')) return null;
  const style = getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return null;
  const rect=element.getBoundingClientRect(), parent=root.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return {left:rect.left-parent.left,top:rect.top-parent.top,right:rect.right-parent.left,bottom:rect.bottom-parent.top};
}

function uiRects(container, ignore = null) {
  return UI_SELECTORS.flatMap(selector=>Array.from(container.querySelectorAll(selector), element=>element === ignore ? null : rectOf(element,container))).filter(Boolean);
}

// Keep the red-button cue near its target without letting it cover any of the
// fixed controls. Include the measured edges of controls as candidate slots,
// so a wrapped mobile toolbar or an open credits panel can change its position.
export function placeWheelCue(container, cue, anchor) {
  const width=container.clientWidth,height=container.clientHeight,pad=8;
  const w=cue.offsetWidth,h=cue.offsetHeight;
  if(!w||!h)return;
  const obstacles=uiRects(container,cue);
  const xs=[anchor.x-w/2,pad,(width-w)/2,width-w-pad];
  const ys=[anchor.y-h,pad,height-h-pad];
  for(const box of obstacles){
    xs.push(box.left-w-pad,box.right+pad);
    ys.push(box.top-h-pad,box.bottom+pad);
  }
  let best=null;
  for(const x of xs)for(const y of ys){
    const left=Math.max(pad,Math.min(Math.max(pad,width-w-pad),x));
    const top=Math.max(pad,Math.min(Math.max(pad,height-h-pad),y));
    const rect={left,top,right:left+w,bottom:top+h};
    const covered=obstacles.reduce((sum,box)=>sum+overlap(rect,box),0);
    const distance=Math.hypot(left+w/2-anchor.x,top+h-anchor.y);
    const score=covered*10000+distance;
    if(!best||score<best.score)best={left,top,score};
  }
  const parent=container.getBoundingClientRect();
  cue.style.left=`${Math.round(parent.left+best.left+w/2)}px`;
  cue.style.top=`${Math.round(parent.top+best.top+h)}px`;
}

export function projectGuidePoint(THREE,camera,container,position,height=0) {
  const point=new THREE.Vector3().copy(position);point.y+=height;point.project(camera);
  return {x:(point.x+1)*container.clientWidth/2,y:(1-point.y)*container.clientHeight/2};
}

export function guideScreenBounds(THREE,camera,container,position) {
  const facing=Math.atan2(camera.position.x-position.x,camera.position.z-position.z);
  const right=new THREE.Vector3(Math.cos(facing),0,-Math.sin(facing));
  const points=[];
  for(const x of [-.5,.5])for(const y of [-.2,1.65])points.push(projectGuidePoint(THREE,camera,container,position.clone().addScaledVector(right,x),y));
  return {left:Math.min(...points.map(p=>p.x))-4,right:Math.max(...points.map(p=>p.x))+4,top:Math.min(...points.map(p=>p.y))-4,bottom:Math.max(...points.map(p=>p.y))+4};
}

// Select a nearby world-space guide position that does not project underneath
// a HUD, a music-credit popover, the traveller, or a key scene landmark.
export function chooseGuidePosition(THREE,camera,container,preferred,traveller,extraRects=[],options={}) {
  const obstacles=uiRects(container);
  const target=traveller?projectGuidePoint(THREE,camera,container,traveller,.65):null;
  const travellerRect=target?{left:target.x-14,right:target.x+14,top:target.y-25,bottom:target.y+28}:null;
  const offsets=[[0,0],[.65,0],[-.65,0],[0,.55],[0,-.55],[1.1,.35],[-1.1,.35],[1.1,-.35],[-1.1,-.35]];
  if (options.avoidLandmarks) offsets.push([1.7,0],[-1.7,0],[0,1.5],[0,-1.5],[1.5,1],[-1.5,1],[1.5,-1],[-1.5,-1]);
  let best=null;
  for(const [dx,dz] of offsets){
    const position=preferred.clone().add(new THREE.Vector3(dx,0,dz));
    const box=guideScreenBounds(THREE,camera,container,position);
    const outside=Math.max(0,8-box.left)+Math.max(0,box.right-container.clientWidth+8)+Math.max(0,8-box.top)+Math.max(0,box.bottom-container.clientHeight+8);
    const hidden=obstacles.reduce((sum,r)=>sum+overlap(box,r),0);
    const other=(travellerRect?overlap(box,travellerRect):0)+extraRects.reduce((sum,r)=>sum+overlap(box,r),0);
    const score=hidden*1000+outside*100+other*(options.avoidLandmarks?1000:80)+Math.hypot(dx,dz)*20;
    if(!best||score<best.score)best={position,score};
  }
  return best.position;
}

// Desktop messages stay beside the guide where possible. In portrait mobile
// layouts, a compact guide dock uses the gap above the actual action row so
// the writing does not sit on the tiny puzzle pieces in the centre.
export function placeGuideMessage(container,bubble,anchor,guide,traveller=null,extraRects=[],options={}) {
  const width=container.clientWidth,height=container.clientHeight,pad=8;
  const compact=width<=700 && height>width;
  const nearGuide = Boolean(options.nearGuide);
  bubble.style.width=compact?`${Math.min(nearGuide?190:340,Math.max(100,width-16))}px`:'';
  bubble.style.maxWidth=compact?'calc(100% - 16px)':'';
  const w=bubble.offsetWidth,h=bubble.offsetHeight;
  if(!w||!h)return;
  // User-opened credit cards can cover a previously clear message. Relayout
  // only for that deliberate change or a resize, never for guide animation.
  const creditsState = nearGuide ? Array.from(container.querySelectorAll('.credits, .music-credits'), el => el.open ? '1' : '0').join('') : '';
  const fixed = nearGuide && fixedGuideMessages.get(bubble);
  if (fixed && fixed.width === width && fixed.height === height && fixed.w === w && fixed.h === h && fixed.creditsState === creditsState) return;
  const obstacles=uiRects(container);
  const actions=['.controls','.travel-controls'].map(s=>rectOf(container.querySelector(s),container)).filter(Boolean);
  const actionTop=actions.length?Math.min(...actions.map(r=>r.top)):height-pad;
  const dockTop=Math.min(height-h-pad,actionTop-h-10);
  const gap=10;
  const preferred=[
    {left:guide.left-gap-w,top:anchor.y-h*.55,side:'left'},
    {left:guide.right+gap,top:anchor.y-h*.55,side:'right'},
    {left:anchor.x-w/2,top:guide.top-gap-h,side:'above'},
    {left:anchor.x-w/2,top:guide.bottom+gap,side:'below'}
  ];
  const candidates=compact&&!nearGuide?[{left:(width-w)/2,top:dockTop,side:'below'},...preferred]:preferred;
  // Corners and edge positions provide alternatives when a nearby placement
  // would cover a credit popover or a puzzle's interactive panel.
  // The first chapter asks the player to read a character speaking in the
  // scene. A distant corner is not a valid fallback there: even an otherwise
  // unobstructed bubble would look unrelated to the guide.
  if (!nearGuide) for(const left of [pad,(width-w)/2,width-w-pad])for(const top of [pad,(height-h)/2,dockTop])candidates.push({left,top,side:'below'});
  let best=null;
  for(const candidate of candidates){
    const left=Math.max(pad,Math.min(Math.max(pad,width-w-pad),candidate.left));
    const top=Math.max(pad,Math.min(Math.max(pad,height-h-pad),candidate.top));
    const rect={left,top,right:left+w,bottom:top+h};
    const hidden=obstacles.reduce((sum,r)=>sum+overlap(rect,r),0);
    const important=overlap(rect,guide)+(traveller?overlap(rect,traveller):0)+extraRects.reduce((sum,r)=>sum+overlap(rect,r),0);
    const distance=Math.hypot(left+w/2-anchor.x,top+h/2-anchor.y);
    const dockDistance=Math.abs(top-dockTop)+Math.abs(left-(width-w)/2)*.2;
    const score=hidden*10000+important*1000+(compact&&!nearGuide?dockDistance*3:distance)+Math.abs(top-candidate.top)*3+Math.abs(left-candidate.left)*3;
    if(!best||score<best.score)best={left,top,side:candidate.side,score};
  }
  bubble.style.left=`${Math.round(best.left)}px`;
  bubble.style.top=`${Math.round(best.top)}px`;
  bubble.dataset.side=best.side;
  if (nearGuide) {
    bubble.style.setProperty('--guide-tail-y', `${Math.max(12,Math.min(h-12,anchor.y-best.top))}px`);
    bubble.style.setProperty('--guide-tail-x', `${Math.max(12,Math.min(w-12,anchor.x-best.left))}px`);
    fixedGuideMessages.set(bubble, {width,height,w,h,creditsState});
  }
}

export function projectWorldBox(THREE,camera,container,box,pad=8) {
  if(!box || box.isEmpty())return null;
  const points=[];
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(projectGuidePoint(THREE,camera,container,new THREE.Vector3(x,y,z)));
  return {left:Math.min(...points.map(p=>p.x))-pad,right:Math.max(...points.map(p=>p.x))+pad,top:Math.min(...points.map(p=>p.y))-pad,bottom:Math.max(...points.map(p=>p.y))+pad};
}

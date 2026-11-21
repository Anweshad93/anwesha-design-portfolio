import { projectGuidePoint, guideScreenBounds, placeGuideMessage, projectWorldBox, resetGuideMessagePlacement } from '../journey-ui/guide-layout.js?v=4';

export function createGuideBubble(THREE, camera, container, bubble) {
  let position = null, traveller = null, landmark = null, travellerBounds = null;
  function update() {
    if (!position || bubble.classList.contains('hidden')) return;
    const anchor = projectGuidePoint(THREE, camera, container, position, 1);
    const guide = guideScreenBounds(THREE, camera, container, position);
    const person = traveller && projectGuidePoint(THREE, camera, container, traveller, .65);
    const projectedPerson = projectWorldBox(THREE,camera,container,travellerBounds,18);
    const fallback = person && {left:person.x-24,right:person.x+24,top:person.y-38,bottom:person.y+34};
    const personRect = projectedPerson && fallback
      ? {left:Math.min(projectedPerson.left,fallback.left),right:Math.max(projectedPerson.right,fallback.right),top:Math.min(projectedPerson.top,fallback.top),bottom:Math.max(projectedPerson.bottom,fallback.bottom)}
      : projectedPerson || fallback;
    const extra = [projectWorldBox(THREE,camera,container,landmark)].filter(Boolean);
    placeGuideMessage(container, bubble, anchor, guide, personRect, extra, {nearGuide:true});
    // On narrow screens the closest available placement can just graze the
    // traveller. Move the dialogue the smallest distance that clears him.
    if (personRect) {
      const w=bubble.offsetWidth,h=bubble.offsetHeight;
      const x=parseFloat(bubble.style.left),y=parseFloat(bubble.style.top);
      const overlap=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
      const current={left:x,top:y,right:x+w,bottom:y+h};
      if (w && h && Number.isFinite(x) && Number.isFinite(y) && overlap(current,personRect)) {
        const parent=container.getBoundingClientRect();
        const obstacles=['.objective','.top-actions','.controls','#arch-panel','.credits[open] > p','.music-credits[open] > p']
          .flatMap(s=>Array.from(container.querySelectorAll(s))).filter(el=>!el.hidden&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden')
          .map(el=>{const r=el.getBoundingClientRect();return {left:r.left-parent.left,right:r.right-parent.left,top:r.top-parent.top,bottom:r.bottom-parent.top};});
        const candidates=[[x,personRect.bottom+8],[x,personRect.top-h-8],[personRect.right+8,y],[personRect.left-w-8,y]];
        let best=null;
        for(const [px,py] of candidates){
          const left=Math.max(8,Math.min(container.clientWidth-w-8,px));
          const top=Math.max(8,Math.min(container.clientHeight-h-8,py));
          const rect={left,top,right:left+w,bottom:top+h};
          const score=overlap(rect,personRect)*100000+obstacles.reduce((n,r)=>n+overlap(rect,r)*10000,0)+overlap(rect,guide)*10000+extra.reduce((n,r)=>n+overlap(rect,r)*1000,0)+Math.hypot(left-x,top-y);
          if(!best||score<best.score)best={left,top,score};
        }
        bubble.style.left=`${Math.round(best.left)}px`;bubble.style.top=`${Math.round(best.top)}px`;
        bubble.style.setProperty('--guide-tail-y',`${Math.max(12,Math.min(h-12,anchor.y-best.top))}px`);
        bubble.style.setProperty('--guide-tail-x',`${Math.max(12,Math.min(w-12,anchor.x-best.left))}px`);
      }
    }
  }
  return {
    show(pos, person, object = null, personBox = null) { resetGuideMessagePlacement(bubble); position=pos.clone(); traveller=person?.clone() || null; landmark=object; travellerBounds=personBox?.clone() || null; update(); },
    hide() { resetGuideMessagePlacement(bubble); position=null; traveller=null; landmark=null; travellerBounds=null; },
    update
  };
}

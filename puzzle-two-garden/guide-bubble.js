import { projectGuidePoint, guideScreenBounds, placeGuideMessage, projectWorldBox, resetGuideMessagePlacement } from '../journey-ui/guide-layout.js?v=4';

export function createGuideBubble(THREE, camera, container, bubble) {
  let position = null, traveller = null, landmark = null;
  function update() {
    if (!position || bubble.classList.contains('hidden')) return;
    const anchor = projectGuidePoint(THREE, camera, container, position, 1);
    const guide = guideScreenBounds(THREE, camera, container, position);
    const person = traveller && projectGuidePoint(THREE, camera, container, traveller, .65);
    const personRect = person && {left:person.x-15,right:person.x+15,top:person.y-28,bottom:person.y+28};
    const extra = [];
    placeGuideMessage(container, bubble, anchor, guide, personRect, extra, {nearGuide:true});
  }
  return {
    show(pos, person, object = null) { resetGuideMessagePlacement(bubble); position=pos.clone(); traveller=person?.clone() || null; landmark=object; update(); },
    hide() { resetGuideMessagePlacement(bubble); position=null; traveller=null; landmark=null; },
    update
  };
}

import { projectGuidePoint, guideScreenBounds, placeGuideMessage, projectWorldBox, resetGuideMessagePlacement } from '../journey-ui/guide-layout.js?v=5';

export function createGuideBubble(THREE, camera, container, bubble) {
  let position = null, traveller = null, landmark = null;
  function update() {
    if (!position || bubble.classList.contains('hidden')) return;
    const anchor = projectGuidePoint(THREE, camera, container, position, 1);
    const guide = guideScreenBounds(THREE, camera, container, position);
    const person = traveller && projectGuidePoint(THREE, camera, container, traveller, .65);
    const personRect = person && {left:person.x-15,right:person.x+15,top:person.y-28,bottom:person.y+28};
    const extra = (() => {
      if (!landmark) return [];
      const center=new THREE.Vector3(-2.35,2.33,-4.32);
      const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);
      const up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion);
      const points=[];
      for (const x of [-1.15,1.15]) for (const y of [-1.15,1.15])
        points.push(projectGuidePoint(THREE,camera,container,center.clone().addScaledVector(right,x).addScaledVector(up,y)));
      return [{left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))}];
    })();
    placeGuideMessage(container, bubble, anchor, guide, personRect, extra, {nearGuide:true});
  }
  return {
    show(pos, person, object = null) { resetGuideMessagePlacement(bubble); position=pos.clone(); traveller=person?.clone() || null; landmark=object; update(); },
    hide() { resetGuideMessagePlacement(bubble); position=null; traveller=null; landmark=null; },
    update
  };
}

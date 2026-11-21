// The hall's hidden doorway appears only in water until the broken reflection
// is put back together. The helper owns visuals; the chapter owns puzzle state.
export function createMissingDoorVisual(THREE, scene, farPalace) {
  const glow = new THREE.MeshBasicMaterial({color:'#ffe2a4', transparent:true, opacity:.92, side:THREE.DoubleSide, depthWrite:false});
  const water = new THREE.MeshStandardMaterial({color:'#ffffff', vertexColors:true, emissive:'#173440', emissiveIntensity:.23, metalness:.26, roughness:.23, side:THREE.DoubleSide});
  const edge = new THREE.MeshBasicMaterial({color:'#a7d3cf', transparent:true, opacity:.58, side:THREE.DoubleSide, depthWrite:false});

  function tube(points, radius, material) {
    return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(([x,y,z=0]) => new THREE.Vector3(x,y,z))),
      Math.max(24,points.length*3), radius, 6, false), material);
  }
  function arcPoints(start,end,steps=16) {
    const points=[];
    for(let i=0;i<=steps;i++) {
      const a=start+(end-start)*i/steps;
      points.push([Math.cos(a)*1.15, Math.sin(a)*1.15, 0]);
    }
    return points;
  }

  // A real pool and an impossible reflection on its surface. Its local
  // position places it beyond the podium without blocking the traveller.
  // The pool sits just above the inlaid carpet so its water and doorway are
  // visible together instead of disappearing under the floor decoration.
  const clue=new THREE.Group();clue.position.set(0,.40,-4.42);farPalace.add(clue);clue.visible=false;
  // A dark inner basin, softly varied water colour and a thin stone lip make
  // the reflection read as a shallow pool instead of a painted oval. The
  // surface is an actual low wave mesh; the original carpet remains below it.
  const basin=new THREE.Mesh(new THREE.CylinderGeometry(1,1,.11,64),
    new THREE.MeshStandardMaterial({color:'#253d4b',roughness:.7}));
  basin.scale.set(2.2,1,1.29);basin.position.y=-.045;clue.add(basin);
  const segments=64,rings=10,positions=[],colours=[],indices=[];
  const deep=new THREE.Color('#243d4d'),shallow=new THREE.Color('#59818a');
  for(let r=0;r<=rings;r++){
    const radius=r/rings;
    for(let i=0;i<=segments;i++){
      const angle=i/segments*Math.PI*2,x=Math.cos(angle)*radius,z=Math.sin(angle)*radius;
      positions.push(x,0,z);
      const variation=.44*radius+.07*Math.sin(angle*3+radius*5);
      const colour=deep.clone().lerp(shallow,Math.max(0,Math.min(.8,variation)));
      colours.push(colour.r,colour.g,colour.b);
      if(r<rings&&i<segments){const a=r*(segments+1)+i,b=a+segments+1;indices.push(a,b,a+1,b,b+1,a+1);}
    }
  }
  const surfaceGeometry=new THREE.BufferGeometry();
  surfaceGeometry.setIndex(indices);surfaceGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  surfaceGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));surfaceGeometry.computeVertexNormals();
  const surfaceBase=Float32Array.from(positions);
  const pool=new THREE.Mesh(surfaceGeometry,water);pool.scale.set(2.16,1,1.25);pool.position.y=.012;clue.add(pool);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(1,.025,6,64),edge);rim.rotation.x=-Math.PI/2;rim.scale.set(2.16,1.25,1);rim.position.y=.035;clue.add(rim);
  const reflectedDoor=new THREE.Group();reflectedDoor.position.set(0,.065,.08);reflectedDoor.rotation.x=-Math.PI/2;reflectedDoor.scale.set(.70,.53,1);clue.add(reflectedDoor);
  const fullPath=[[-1.15,-1.05],[-1.15,0],...arcPoints(Math.PI,0,24),[1.15,-1.05]];
  reflectedDoor.add(tube(fullPath,.055,glow.clone()));
  const poolRipples=[];
  for(const [x,z,radius,phase] of [[-.86,.05,.29,0],[-.82,.06,.49,.8],[.89,-.03,.27,1.8],[.88,-.04,.45,2.4]]){
    const rippleMaterial=edge.clone();rippleMaterial.opacity=.25;
    const ring=new THREE.Mesh(new THREE.RingGeometry(radius,radius+.015,48),rippleMaterial);
    ring.rotation.x=-Math.PI/2;ring.position.set(x,.06,z);ring.scale.set(1,.78,1);clue.add(ring);
    poolRipples.push({ring,phase});
  }
  const glints=[];
  for(const [x,z,angle,phase] of [[-1.25,-.30,.2,0],[1.18,.27,2.3,1.2]]){
    const line=new THREE.Mesh(new THREE.TorusGeometry(.23,.013,6,24,Math.PI*.62),edge.clone());
    line.rotation.set(-Math.PI/2,0,angle);line.position.set(x,.065,z);clue.add(line);glints.push({line,phase});
  }

  // Three independently turning pieces occupy the water overhead. They are
  // laid out so the arch joins at 0° without requiring pixel-perfect input.
  // The broken arch floats in the overhead water, centred over the real
  // passage. Keep the same reflection visible once the passage is restored.
  // The surface sits inside the side arches and in front of the back wall.
  const puzzle=new THREE.Group();puzzle.position.set(0,5.32,-4.7);puzzle.rotation.x=-Math.PI/2;puzzle.scale.setScalar(.70);scene.add(puzzle);puzzle.visible=false;
  // A softly rimmed pool, rather than a rectangular panel, makes the
  // fragments belong to the water even from the main view of the hall.
  const backing=new THREE.Mesh(new THREE.CircleGeometry(1,64),new THREE.MeshBasicMaterial({color:'#264d5c',transparent:true,opacity:.72,side:THREE.DoubleSide,depthWrite:false}));
  backing.scale.set(2.45,1.75,1);backing.position.z=-.08;puzzle.add(backing);
  const puzzleRim=new THREE.Mesh(new THREE.TorusGeometry(1,.018,6,64),new THREE.MeshBasicMaterial({color:'#a7f3e7',transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false}));
  puzzleRim.scale.set(2.45,1.75,1);puzzleRim.position.z=-.04;puzzle.add(puzzleRim);
  for(const [x,y,radius] of [[-1.66,-.55,.30],[1.62,.55,.26]]) {
    const ring=new THREE.Mesh(new THREE.RingGeometry(radius,radius+.015,40),new THREE.MeshBasicMaterial({color:'#c1f8eb',transparent:true,opacity:.34,side:THREE.DoubleSide,depthWrite:false}));
    ring.position.set(x,y,-.02);ring.scale.y=.65;puzzle.add(ring);
  }
  // A quiet outline gives the player an intelligible target without taking
  // attention away from the three independently turnable fragments.
  const targetMaterial=new THREE.MeshBasicMaterial({color:'#d9d1e9',transparent:true,opacity:.26,side:THREE.DoubleSide,depthWrite:false});
  const target=tube([[-1.15,-1.18],[-1.15,0],...arcPoints(Math.PI,0,24),[1.15,-1.18]],.035,targetMaterial);
  target.position.z=-.015;puzzle.add(target);
  const definitions=[
    {origin:[-.92,-.35],points:[[-1.15,-1.18],[-1.15,0],...arcPoints(Math.PI,2*Math.PI/3,9)]},
    {origin:[0,1.12],points:arcPoints(2*Math.PI/3,Math.PI/3,12)},
    {origin:[.92,-.35],points:[...arcPoints(Math.PI/3,0,9),[1.15,0],[1.15,-1.18]]},
  ];
  const initial=[1,3,1];
  // These same colors are used by the close-up and its matching controls.
  const pieceColors=['#9adbd6','#ffe0a5','#f3bdd3'];
  const alignedHalos=[];
  const pieces=definitions.map((item,i)=>{
    // Each correctly oriented segment leaves a soft stationary glow on the
    // completed silhouette, so progress is visible before the final turn.
    const haloMaterial=new THREE.MeshBasicMaterial({color:pieceColors[i],transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false});
    const halo=tube(item.points,.15,haloMaterial);halo.position.z=-.005;puzzle.add(halo);
    alignedHalos.push(halo);
    const group=new THREE.Group();group.position.set(item.origin[0],item.origin[1],.02);puzzle.add(group);
    const points=item.points.map(([x,y])=>[x-item.origin[0],y-item.origin[1]]);
    const pieceMaterial=glow.clone();pieceMaterial.color.set(pieceColors[i]);
    const stroke=tube(points,.085,pieceMaterial);group.add(stroke);
    group.rotation.z=initial[i]*Math.PI/2;
    return {group,quarter:initial[i],target:group.rotation.z};
  });
  // Once solved, the water holds one complete, luminous doorway rather than
  // several overlapping segment glows. Keep its silhouette identical to the
  // target used while solving.
  const completeReflection=tube([[-1.15,-1.18],[-1.15,0],...arcPoints(Math.PI,0,24),[1.15,-1.18]],.10,
    new THREE.MeshBasicMaterial({color:'#fff0ca',transparent:true,opacity:.98,side:THREE.DoubleSide,depthTest:false,depthWrite:false}));
  completeReflection.position.z=.08;completeReflection.renderOrder=20;completeReflection.visible=false;puzzle.add(completeReflection);

  // The real passage is only shown after the water image is restored.
  const passage=new THREE.Group();passage.position.set(0,.56,-6.25);scene.add(passage);passage.visible=false;
  const doorwayShape=new THREE.Shape();doorwayShape.moveTo(-1.12,0);doorwayShape.lineTo(-1.12,1.25);
  doorwayShape.absarc(0,1.25,1.12,Math.PI,0,true);doorwayShape.lineTo(1.12,0);doorwayShape.closePath();
  // Dark interior, a raised threshold and a contrasting frame make this read
  // as a passage into the wall rather than a pale shape laid on top of it.
  const doorwayLight=new THREE.Mesh(new THREE.ShapeGeometry(doorwayShape),new THREE.MeshBasicMaterial({color:'#453049',side:THREE.DoubleSide}));passage.add(doorwayLight);
  const outline=[[-1.15,0],[-1.15,1.25],...arcPoints(Math.PI,0,24).map(([x,y])=>[x,y+1.25]),[1.15,0]];
  const frame=tube(outline,.12,glow.clone());frame.position.z=.08;passage.add(frame);
  const threshold=new THREE.Mesh(new THREE.BoxGeometry(2.7,.14,.58),new THREE.MeshStandardMaterial({color:'#bba0aa',roughness:.85}));threshold.position.set(0,.02,.20);passage.add(threshold);

  let lastTime=null;
  return {
    showClue(){clue.visible=true;},
    hideClue(){clue.visible=false;},
    showPuzzle(){puzzle.visible=true;},
    setPiece(index,quarterTurns){
      const piece=pieces[index];if(!piece)return;
      const q=((quarterTurns%4)+4)%4;
      const clockwise=(q-piece.quarter+4)%4;
      piece.target+=clockwise*Math.PI/2;piece.quarter=q;
    },
    showPassage(){puzzle.visible=true;passage.visible=true;target.visible=false;pieces.forEach(piece=>{piece.group.visible=false;});alignedHalos.forEach(halo=>{halo.visible=false;});completeReflection.visible=true;},
    update(elapsed){
      const dt=lastTime===null?0:Math.max(0,Math.min(.08,elapsed-lastTime));lastTime=elapsed;
      const blend=1-Math.exp(-12*dt);
      for(const piece of pieces)piece.group.rotation.z+=(piece.target-piece.group.rotation.z)*blend;
      alignedHalos.forEach((halo,i)=>{
        const desired=pieces[i].quarter===0?.32+.05*Math.sin(elapsed*2+i):0;
        halo.material.opacity+=(desired-halo.material.opacity)*blend;
      });
      if(clue.visible){
        const position=surfaceGeometry.attributes.position;
        for(let i=0;i<position.count;i++){
          const x=surfaceBase[i*3],z=surfaceBase[i*3+2];
          // Keep the edge anchored to the rim while the interior shimmers.
          const envelope=Math.max(0,1-Math.hypot(x,z));
          position.setY(i,envelope*(.018*Math.sin(x*5+elapsed*.9)+.012*Math.cos(z*7-elapsed*.7)));
        }
        position.needsUpdate=true;surfaceGeometry.computeVertexNormals();
        poolRipples.forEach(({ring,phase})=>{ring.material.opacity=.20+.07*Math.sin(elapsed*.8+phase);});
        glints.forEach(({line,phase})=>{line.material.opacity=.29+.08*Math.sin(elapsed*.65+phase);});
        reflectedDoor.position.y=.065+.004*Math.sin(elapsed*.8);
      }
    },
  };
}

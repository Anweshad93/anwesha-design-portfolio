// Quiet, short shoe contacts for the sanctuary's stone floor.  A shared
// limiter keeps several returning inhabitants from drowning out the music.
export function createSanctuaryFootsteps(THREE) {
  let context=null, output=null, noise=null, enabled=true, lastStep=-Infinity;
  const sources=new Set(), walkers=new WeakMap();
  const leftPoint=new THREE.Vector3(), rightPoint=new THREE.Vector3();

  function unlock() {
    if (!enabled) return;
    try {
      if (!context) {
        const AudioContextClass=window.AudioContext||window.webkitAudioContext;
        if (!AudioContextClass) return;
        context=new AudioContextClass();
        output=context.createGain();output.gain.value=.48;output.connect(context.destination);
        noise=context.createBuffer(1,Math.ceil(context.sampleRate*.10),context.sampleRate);
        const samples=noise.getChannelData(0);
        for(let i=0;i<samples.length;i++) samples[i]=Math.random()*2-1;
      }
      if(context.state==='suspended')context.resume().catch(()=>{});
    } catch (_) {context=null;output=null;noise=null;}
  }
  function setEnabled(value) {
    enabled=Boolean(value);
    if(!context||!output)return;
    const now=context.currentTime;
    output.gain.cancelScheduledValues(now);
    output.gain.setValueAtTime(output.gain.value,now);
    output.gain.linearRampToValueAtTime(enabled?.48:0,now+.025);
    if(!enabled) for(const source of sources){try{source.stop(now+.03)}catch(_){}}
  }
  function remember(source){sources.add(source);source.onended=()=>sources.delete(source);return source;}
  function step(side='left', distant=false) {
    if(!enabled||!context||!output||!noise||context.state!=='running')return;
    const now=context.currentTime;
    if(now-lastStep<.16)return;
    lastStep=now;
    const level=distant?.65:1;
    const low=remember(context.createOscillator()),body=context.createGain();
    low.type='sine';
    low.frequency.setValueAtTime(side==='right'?150:165,now);
    low.frequency.exponentialRampToValueAtTime(77,now+.085);
    body.gain.setValueAtTime(.0001,now);
    body.gain.exponentialRampToValueAtTime(.105*level,now+.004);
    body.gain.exponentialRampToValueAtTime(.0001,now+.085);
    low.connect(body);body.connect(output);low.start(now);low.stop(now+.1);
    const scrape=remember(context.createBufferSource()),filter=context.createBiquadFilter(),grain=context.createGain();
    scrape.buffer=noise;filter.type='bandpass';filter.frequency.value=1150;filter.Q.value=.8;
    grain.gain.setValueAtTime(.0001,now);
    grain.gain.exponentialRampToValueAtTime(.045*level,now+.003);
    grain.gain.exponentialRampToValueAtTime(.0001,now+.07);
    scrape.connect(filter);filter.connect(grain);grain.connect(output);scrape.start(now);scrape.stop(now+.08);
  }

  // The imported inhabitants have no footfall callbacks. Compare their
  // animated foot heights so a contact happens as each foot comes down.
  // A little hysteresis suppresses jitter while both soles are level.
  function track(group,moving,dt,distant=true) {
    if(!group)return;
    let state=walkers.get(group);
    if(!state){state={left:group.getObjectByName('LeftFoot'),right:group.getObjectByName('RightFoot'),side:0,elapsed:0};walkers.set(group,state);}
    if(!moving||!state.left||!state.right){state.side=0;state.elapsed=0;return;}
    state.elapsed+=Math.max(0,Math.min(dt,.1));
    group.updateWorldMatrix(true,true);
    state.left.getWorldPosition(leftPoint);state.right.getWorldPosition(rightPoint);
    const difference=leftPoint.y-rightPoint.y;
    const down=difference<-.018?-1:difference>.018?1:0;
    if(!down)return;
    if(!state.side){state.side=down;return;}
    if(down!==state.side && state.elapsed>=.20){
      state.side=down;state.elapsed=0;step(down<0?'left':'right',distant);
    }
  }
  return {unlock,setEnabled,step,track};
}

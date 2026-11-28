(() => {
  const canvas = document.querySelector('.letter-curtain canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const words = ['IMAGINATION', 'VISUAL DESIGN', 'IN MOTION', 'STORYTELLING', 'CREATIVE WORLDS'];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const revealDelay = location.hash ? 0 : 2450;
  const revealStarts = performance.now() + revealDelay;
  const revealEnds = revealStarts + 2500;
  const revealAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let revealing = !reduced.matches;
  let ropes, width, height, step, top, left, right;
  let grab = null, selected = 0, frame = 0, previous = 0, accumulator = 0;

  const moving = new Set();
  const highlighted = new Map();

  const toggle = document.querySelector('#chimes');
  const soundHint = toggle.closest('figcaption')?.querySelector('span');
  const Audio = window.AudioContext || window.webkitAudioContext;
  const palette = ['#335f9c', '#a45d16', '#a5304a', '#70419a', '#237660', '#b14e28'];
  let audio, lastNote = -Infinity, lastPointer = null, lastVerticalBrush = 0;
  let soundEnabled = true;
  let enablingOnPress = false;
  toggle.hidden = !Audio;

  function updateSoundButton() {
    const waiting = !!audio && soundEnabled && audio.state !== 'running';
    toggle.textContent = waiting ? 'Enable sound' : soundEnabled ? 'Sound on' : 'Sound off';
    toggle.setAttribute('aria-pressed', String(soundEnabled && !waiting));
    toggle.setAttribute('aria-label', waiting ? 'Enable curtain sound' : soundEnabled ? 'Turn curtain sound off' : 'Turn curtain sound on');
    if (soundHint) soundHint.textContent = waiting
      ? 'Tap a string or enable sound, then brush or pull.'
      : 'Brush the curtain or pull a letter.';
  }

  function activateSound() {
    if (!audio || !soundEnabled || audio.state === 'closed') return;
    if (audio.state !== 'running') audio.resume().then(updateSoundButton).catch(updateSoundButton);
    else updateSoundButton();
  }

  toggle.addEventListener('pointerdown', () => {
    enablingOnPress = !!audio && soundEnabled && audio.state !== 'running';
  });
  toggle.addEventListener('pointercancel', () => { enablingOnPress = false; });
  toggle.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      enablingOnPress = !!audio && soundEnabled && audio.state !== 'running';
    }
  });
  toggle.addEventListener('click', () => {
    if (enablingOnPress || (soundEnabled && audio?.state !== 'running')) {
      enablingOnPress = false;
      activateSound();
      return;
    }
    enablingOnPress = false;
    soundEnabled = !soundEnabled;
    if (soundEnabled) {
      activateSound();
    } else if (audio?.state === 'running') {
      audio.suspend().catch(() => {});
    }
    updateSoundButton();
  });
  if (Audio) {
    try { audio = new Audio(); } catch { toggle.hidden = true; }
  }
  if (audio) audio.onstatechange = updateSoundButton;
  updateSoundButton();
  activateSound();
  // Hover can unlock audio only in browsers that allow it; a drag provides
  // the trusted gesture required by stricter autoplay policies.
  canvas.addEventListener('pointermove', () => {
    if (soundEnabled && audio?.state !== 'running') activateSound();
  }, {passive:true});
  document.addEventListener('pointerdown', event => {
    if (event.target !== toggle) activateSound();
  }, {capture:true});
  document.addEventListener('pointerup', event => {
    if (event.target !== toggle) activateSound();
  }, {capture:true});
  document.addEventListener('keydown', event => {
    if (event.target !== toggle) activateSound();
  }, {capture:true});
  function chime(index) {
    if (!soundEnabled || audio?.state !== 'running' || audio.currentTime - lastNote < .07) return;
    lastNote = audio.currentTime;
    // Four instrument-inspired synthesized voices in contiguous curtain zones.
    // These are sketches, not recordings of the instruments.
    const notes = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
    const pitch = notes[Math.floor(index / ropes.length * notes.length)];
    const voices = [
      {partials:[1,.52,.36,.3,.21,.17,.13,.1,.075,.055], attack:.006, decay:1.15, peak:.045, low:1000, high:5200, bend:1.012}, // sitar
      {partials:[1,.35,.18,.22,.1,.08,.05,.03,.02,.01], attack:.008, decay:1.0, peak:.050, low:850, high:3300, bend:1.025}, // sarod
      {partials:[1,.65,.4,.18,.15,.09,.06,.04,.03,.02], attack:.003, decay:1.35, peak:.038, low:1600, high:6200, bend:1}, // santoor
      {partials:[1,.42,.25,.14,.11,.06,.04,.03,.02,.01], attack:.009, decay:1.3, peak:.047, low:800, high:3200, bend:1.018} // veena
    ];
    const voice = voices[Math.min(voices.length - 1, Math.floor(index / ropes.length * voices.length))];
    const tone = audio.createOscillator();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();
    const frequency = (voice.base || 196) * 2 ** (pitch / 12);
    const real = new Float32Array(11);
    const imaginary = new Float32Array([0, ...voice.partials]);
    tone.setPeriodicWave(audio.createPeriodicWave(real, imaginary));
    tone.frequency.setValueAtTime(frequency * voice.bend, lastNote);
    tone.frequency.exponentialRampToValueAtTime(frequency, lastNote + .14);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(voice.high, lastNote);
    filter.frequency.exponentialRampToValueAtTime(voice.low, lastNote + voice.decay);
    gain.gain.setValueAtTime(.0001, lastNote);
    gain.gain.exponentialRampToValueAtTime(voice.peak, lastNote + voice.attack);
    gain.gain.exponentialRampToValueAtTime(voice.peak * .26, lastNote + Math.max(.18, voice.attack + .05));
    gain.gain.exponentialRampToValueAtTime(.0001, lastNote + voice.decay);
    tone.connect(filter).connect(gain).connect(audio.destination);
    tone.start(lastNote);
    tone.stop(lastNote + voice.decay + .02);
    tone.onended = () => { tone.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
  function resize() {
    lastPointer = null;
    moving.clear();
    highlighted.clear();
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    const scale = Math.min(devicePixelRatio, 2);
    canvas.width = width * scale;
    canvas.height = height * scale;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    left = 10;
    right = width - 10;
    top = 0;
    step = Math.min(24, height / 30);
    const count = Math.max(10, Math.floor((right-left)/32));
    const length = Math.max(8, Math.floor((height - top - 12) / step));
    ropes = Array.from({length:count}, (_, i) => {
      const x = left + i * (right-left)/(count-1);
      const phrase = words[i % words.length];
      let text = phrase;
      while (text.length + 3 + phrase.length <= length - 1) {
        text += ' · ' + phrase;
      }
      return Array.from({length:text.length + 1}, (_, j) => {
        const y = top + j * step;
        return {x,y,px:x,py:y,letter:j ? text[j-1] : ''};
      });
    });
    grab = null;
    selected = Math.floor(count/2);
    draw();
  }

  function draw() {
    const now = performance.now();
    ctx.clearRect(0,0,width,height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ropes.forEach((rope,i) => {
      const active = moving.has(rope) || grab?.rope === rope || (highlighted.get(rope) || 0) > now || (canvas.matches(':focus-visible') && i === selected);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(rope[0].x,rope[0].y);
      for (const point of rope.slice(1)) ctx.lineTo(point.x,point.y);
      ctx.strokeStyle = active ? palette[i % palette.length] : '#bd958d55';
      ctx.lineWidth = .65;
      ctx.stroke();
      ctx.font = (step * .82) + 'px Montserrat,sans-serif';
      ctx.fillStyle = active ? palette[i % palette.length] : '#a47a72';
      for(let j=1;j<rope.length;j++) {
        const p=rope[j], prev=rope[j-1];
        if (!p.letter.trim()) continue;
        const delay = i / Math.max(1, ropes.length - 1) * 750 + j * 22;
        const elapsed = now - revealStarts - delay;
        if (revealing && elapsed < 0) continue;
        ctx.save();
        ctx.translate(p.x,p.y);
        ctx.rotate(Math.atan2(prev.x-p.x,p.y-prev.y));
        if (revealing && elapsed < 750 && /[A-Z]/.test(p.letter)) {
          // Each character rolls within its own cell, then settles on the real word.
          const cycle = elapsed / 115;
          const index = (i * 11 + j * 7 + Math.floor(cycle) * 13) % revealAlphabet.length;
          const fraction = cycle - Math.floor(cycle);
          ctx.beginPath();
          ctx.rect(-step * .6, -step * .5, step * 1.2, step);
          ctx.clip();
          ctx.fillText(revealAlphabet[index], 0, -fraction * step);
          ctx.fillText(revealAlphabet[(index + 13) % revealAlphabet.length], 0, (1 - fraction) * step);
        } else {
          ctx.fillText(p.letter,0,0);
        }
        ctx.restore();
      }
      ctx.restore();
    });
  }

  function simulate() {
    for (const rope of moving) {
      const held = grab?.rope === rope ? grab : null;
      if (held) {
        // Ease the grip toward the pointer, retaining its velocity for release.
        const p = held.point;
        p.px = p.x;
        p.py = p.y;
        p.x += (held.x - p.x) * .32;
        p.y += (held.y - p.y) * .32;
      }
      for (const p of rope.slice(1)) {
        if (p === held?.point) continue;
        const vx = (p.x - p.px) * .985;
        const vy = (p.y - p.py) * .985;
        p.px = p.x;
        p.py = p.y;
        p.x += vx;
        p.y += vy + step * .011;
      }
      for(let pass=0;pass<12;pass++) {
        for(let j=1;j<rope.length;j++) {
          const a=rope[j-1], b=rope[j];
          const dx=b.x-a.x, dy=b.y-a.y;
          const length=Math.hypot(dx,dy)||1;
          const correction=(length-step)/length;
          const fixedA=j===1 || a===grab?.point;
          const fixedB=b===grab?.point;
          const weightA=fixedA?0:fixedB?1:.5;
          const weightB=fixedB?0:fixedA?1:.5;
          a.x+=dx*correction*weightA; a.y+=dy*correction*weightA;
          b.x-=dx*correction*weightB; b.y-=dy*correction*weightB;
        }
      }
      if (!held && rope.every((p, i) => Math.abs(p.x - rope[0].x) < .5 &&
          Math.abs(p.x - p.px) + Math.abs(p.y - p.py) < .06 &&
          Math.abs(p.y - (rope[0].y + i * step)) < step)) {
        rope.forEach((p, i) => {
          p.x = p.px = rope[0].x;
          p.y = p.py = rope[0].y + i * step;
        });
        moving.delete(rope);
      }
    }
  }
  function tick(now) {
    const interval = 1000 / 120;
    accumulator += Math.min(50, now - previous);
    previous = now;
    while (accumulator >= interval) {
      simulate();
      accumulator -= interval;
    }
    if (revealing && now >= revealEnds) revealing = false;
    for (const [rope, until] of highlighted) if (now >= until) highlighted.delete(rope);
    draw();
    frame = moving.size || revealing || highlighted.size ? requestAnimationFrame(tick) : 0;
  }
  function requestTick() {
    if (!frame) {
      previous = performance.now();
      accumulator = 0;
      frame = requestAnimationFrame(tick);
    }
  }
  function wake(rope) {moving.add(rope); requestTick()}
  function highlight(rope) {highlighted.set(rope, performance.now() + 1100); requestTick()}
  function move(event) {
    if(!grab || event.pointerId!==grab.id) return;
    const box=canvas.getBoundingClientRect();
    const root=grab.rope[0];
    const dx=event.clientX-box.left-root.x, dy=event.clientY-box.top-root.y;
    const ratio=Math.min(1,grab.index*step/(Math.hypot(dx,dy)||1));
    grab.x=root.x+dx*ratio; grab.y=root.y+dy*ratio;
    wake(grab.rope);
  }
  canvas.addEventListener('pointerdown',event=>{
    if(grab) return;
    const box=canvas.getBoundingClientRect();
    let nearest=22;
    ropes.forEach((rope,i)=>rope.forEach((p,j)=>{
      const distance=Math.hypot(event.clientX-box.left-p.x,event.clientY-box.top-p.y);
      if(j && distance<nearest) {
        nearest=distance; selected=i;
        grab={id:event.pointerId,point:p,rope,index:j};
      }
    }));
    if (grab) {
      canvas.setPointerCapture(event.pointerId);
      highlight(grab.rope);
      move(event);
      const noteIndex = selected;
      if (soundEnabled && audio?.state === 'running') chime(noteIndex);
      else if (soundEnabled && audio && audio.state !== 'closed') {
        audio.resume().then(() => chime(noteIndex)).catch(() => {});
      }
    }
  });
  function ripple(index, hitY, impulse, hitJoint) {
    // The brushed string carries the strongest impulse; its neighbors follow
    // more softly, making the movement travel across the curtain as well.
    for (let offset = -2; offset <= 2; offset++) {
      const rope = ropes[index + offset];
      if (!rope || rope === grab?.rope) continue;
      const joint = offset === 0 && hitJoint ? hitJoint : Math.round((hitY - rope[0].y) / step);
      if (joint < 1 || joint >= rope.length) continue;
      const neighborWeight = [1, .34, .12][Math.abs(offset)];
      for (let j = Math.max(1, joint - 4); j <= Math.min(rope.length - 1, joint + 4); j++) {
        const envelope = Math.cos((j - joint) / 5 * Math.PI / 2);
        const point = rope[j];
        const velocity = Math.max(-step, Math.min(step,
          point.x - point.px + impulse * neighborWeight * envelope));
        point.px = point.x - velocity;
      }
      wake(rope);
    }
  }
  function brush(event) {
    if (!event.isPrimary) return;
    const box = canvas.getBoundingClientRect();
    const x = event.clientX - box.left, y = event.clientY - box.top;
    const previousPoint = lastPointer;
    lastPointer = {x, y};
    if (!previousPoint) return;
    const dx = x - previousPoint.x;
    const dy = y - previousPoint.y;
    const crossed = [];
    ropes.forEach((rope, index) => {
      if (rope === grab?.rope) return;
      let firstHit = null;
      for (let j = 1; j < rope.length; j++) {
        const a = rope[j - 1], b = rope[j];
        const sx = b.x - a.x, sy = b.y - a.y;
        const denominator = dx * sy - dy * sx;
        if (Math.abs(denominator) < .001) continue;
        const ax = a.x - previousPoint.x, ay = a.y - previousPoint.y;
        const span = (ax * sy - ay * sx) / denominator;
        const along = (ax * dy - ay * dx) / denominator;
        if (span <= 0 || span > 1 || along < 0 || along > 1) continue;
        if (!firstHit || span < firstHit.span) {
          firstHit = {rope, index, joint:Math.max(1, Math.round(j - 1 + along)), span,
            hitY:previousPoint.y + span * dy};
        }
      }
      if (firstHit) crossed.push(firstHit);
    });
    crossed.sort((a, b) => a.span - b.span);
    for (const {rope, index, joint, hitY} of crossed) {
      highlight(rope);
      if (!reduced.matches) {
        const impulse = Math.sign(dx || dy) * Math.min(step * .85, 2.5 + Math.abs(dx) * .26);
        ripple(index, hitY, impulse, joint);
      }
      chime(index);
    }
    // A mostly vertical pass can follow a moving strand without crossing it.
    const now = performance.now();
    if (!crossed.length && Math.abs(dy) > 3 && now - lastVerticalBrush > 140) {
      let closest = null, distance = 11;
      ropes.forEach((rope, index) => {
        if (rope === grab?.rope) return;
        for (let j = 1; j < rope.length; j++) {
          const a = rope[j - 1], b = rope[j], sx = b.x - a.x, sy = b.y - a.y;
          const lengthSquared = sx * sx + sy * sy || 1;
          const t = Math.max(0, Math.min(1, ((x - a.x) * sx + (y - a.y) * sy) / lengthSquared));
          const d = Math.hypot(x - (a.x + sx * t), y - (a.y + sy * t));
          if (d < distance) {distance = d; closest = {rope, index, joint:Math.max(1, Math.round(j - 1 + t))}}
        }
      });
      if (closest) {
        highlight(closest.rope);
        if (!reduced.matches) ripple(closest.index, y, Math.sign(dy) * step * .22, closest.joint);
        lastVerticalBrush = now;
      }
    }
  }
  canvas.addEventListener('pointerenter', event => {
    const box = canvas.getBoundingClientRect();
    lastPointer = {x:event.clientX-box.left, y:event.clientY-box.top};
  });
  canvas.addEventListener('pointerleave', () => { lastPointer = null; });
  canvas.addEventListener('pointermove', event => { brush(event); move(event); });
  canvas.addEventListener('lostpointercapture',()=>{
    grab=null;
    if(reduced.matches) resize();
  });
  canvas.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight',' ','Enter'].includes(event.key)) return;
    event.preventDefault();
    if(event.key.startsWith('Arrow')) selected=(selected+ropes.length+(event.key==='ArrowLeft'?-1:1))%ropes.length;
    else {
      highlight(ropes[selected]);
      if (soundEnabled && audio?.state === 'running') chime(selected);
      else if (soundEnabled && audio && audio.state !== 'closed') {
        const noteIndex = selected;
        audio.resume().then(() => chime(noteIndex)).catch(() => {});
      }
      if (reduced.matches) return;
      const rope=ropes[selected];
      rope.forEach((p,i)=>{p.x+=i*step*.42; p.px=p.x;});
      wake(rope);
    }
    draw();
  });
  canvas.addEventListener('focus',draw);
  canvas.addEventListener('blur',draw);
  document.fonts.ready.then(draw);
  new ResizeObserver(resize).observe(canvas);
  resize();
  if (revealing) {
    setTimeout(() => {
      if (!revealing || frame) return;
      previous = performance.now();
      accumulator = 0;
      frame = requestAnimationFrame(tick);
    }, revealDelay);
  }
  reduced.addEventListener('change', event => {
    if (event.matches && revealing) {revealing = false; draw()}
  });
})();

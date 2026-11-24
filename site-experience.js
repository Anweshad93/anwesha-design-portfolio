(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(pointer: fine)');

  if (!reduced.matches) {
    const canvas = document.createElement('canvas');
    canvas.className = 'portfolio-particles';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.append(canvas);
    const context = canvas.getContext('2d');
    let particles = [];
    let width = 0;
    let height = 0;
    let pointerX = -1000;
    let pointerY = -1000;
    let frame = 0;

    function resize() {
      width = innerWidth;
      height = innerHeight;
      const ratio = Math.min(devicePixelRatio, 2);
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.min(32, Math.max(12, Math.floor(width * height / 40000)));
      particles = Array.from({length: count}, () => ({
        x: Math.random() * width, y: Math.random() * height,
        radius: .9 + Math.random() * 1.4, speed: .12 + Math.random() * .25,
        phase: Math.random() * Math.PI * 2
      }));
    }

    function animate() {
      context.clearRect(0, 0, width, height);
      particles.forEach(particle => {
        particle.y -= particle.speed;
        particle.phase += .008;
        particle.x += Math.sin(particle.phase) * .18;
        if (particle.y < -8) particle.y = height + 8;
        const dx = particle.x - pointerX;
        const dy = particle.y - pointerY;
        const distance = Math.hypot(dx, dy);
        if (distance > 0 && distance < 90) {
          particle.x += dx / distance * .8;
          particle.y += dy / distance * .8;
        }
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fillStyle = '#a65b4a66';
        context.fill();
      });
      frame = requestAnimationFrame(animate);
    }

    resize();
    addEventListener('resize', resize, {passive:true});
    addEventListener('pointermove', event => {pointerX = event.clientX; pointerY = event.clientY}, {passive:true});
    document.addEventListener('pointerout', event => {
      if (!event.relatedTarget) {pointerX = -1000; pointerY = -1000}
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {cancelAnimationFrame(frame); frame = 0}
      else if (!frame) frame = requestAnimationFrame(animate);
    });
    frame = requestAnimationFrame(animate);
  }

  if (finePointer.matches && !reduced.matches) {
    const follower = document.createElement('div');
    follower.className = 'cursor-follow';
    follower.setAttribute('aria-hidden', 'true');
    document.body.append(follower);
    let x = innerWidth / 2, y = innerHeight / 2, targetX = x, targetY = y, running = false;
    function follow() {
      x += (targetX - x) * .2;
      y += (targetY - y) * .2;
      follower.style.left = x + 'px';
      follower.style.top = y + 'px';
      if (Math.abs(targetX - x) + Math.abs(targetY - y) > .2) requestAnimationFrame(follow);
      else running = false;
    }
    addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse') return;
      targetX = event.clientX;
      targetY = event.clientY;
      follower.classList.add('is-visible');
      follower.classList.toggle('is-link', !!event.target.closest('a,button'));
      if (!running) {running = true; requestAnimationFrame(follow)}
    }, {passive:true});
    document.addEventListener('pointerout', event => {
      if (!event.relatedTarget) follower.classList.remove('is-visible');
    });
  }

  const logo = document.querySelector('.bridge-intro') && document.querySelector('header .logo');
  if (logo && !reduced.matches && !location.hash) {
    // Animate the actual header logo so its final position cannot jump at handoff.
    const intro = document.createElement('div');
    intro.className = 'intro-screen';
    intro.setAttribute('aria-hidden', 'true');
    intro.innerHTML = '<div class="intro-lines"></div><div class="intro-progress"><span></span></div><div class="intro-progress-count">0%</div>';
    document.body.append(intro);

    const progressFill = intro.querySelector('.intro-progress span');
    const progressCount = intro.querySelector('.intro-progress-count');
    function updateProgressCount() {
      const progressAnimation = progressFill.getAnimations()[0];
      if (!progressAnimation || !intro.isConnected) return;
      const progress = progressAnimation.effect.getComputedTiming().progress ?? 0;
      const percent = Math.min(100, Math.max(0, Math.round(progress * 100)));
      progressCount.textContent = percent + '%';
      if (percent < 100) requestAnimationFrame(updateProgressCount);
    }
    requestAnimationFrame(updateProgressCount);

    const destination = logo.getBoundingClientRect();
    const style = getComputedStyle(logo);
    logo.style.setProperty('--intro-logo-ink', style.color);
    logo.style.setProperty('--intro-logo-accent', getComputedStyle(logo.querySelector('span')).color);
    logo.querySelector('span').classList.add('intro-logo-second');
    logo.classList.add('intro-logo-reveal');
    document.body.classList.add('intro-playing', 'has-intro');
    const dx = innerWidth / 2 - (destination.left + destination.width / 2);
    const dy = innerHeight / 2 - (destination.top + destination.height / 2);
    const animation = logo.animate([
      {transform: 'translate(' + dx + 'px,' + dy + 'px) scale(2.5)', opacity: 0, offset: 0},
      {transform: 'translate(' + dx + 'px,' + dy + 'px) scale(2.5)', opacity: 1, offset: .1},
      {transform: 'translate(' + dx + 'px,' + dy + 'px) scale(2.5)', opacity: 1, offset: .68, easing: 'cubic-bezier(.45,0,.15,1)'},
      {transform: 'translate(0,0) scale(1)', opacity: 1, offset: 1}
    ], {duration:3200, easing:'linear'});
    document.querySelector('.letter-curtain').animate([
      {opacity:0}, {opacity:0,offset:.72}, {opacity:1}
    ], {duration:3500});
    animation.finished.catch(() => {}).finally(() => {
      logo.classList.remove('intro-logo-reveal');
      logo.querySelector('span').classList.remove('intro-logo-second');
      logo.style.removeProperty('--intro-logo-ink');
      logo.style.removeProperty('--intro-logo-accent');
      intro.remove(); document.body.classList.remove('intro-playing');
    });
  }
})();

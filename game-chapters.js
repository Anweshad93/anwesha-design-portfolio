(() => {
  const showcase = document.querySelector('.chapter-showcase');
  if (!showcase) return;
  const viewport = showcase.querySelector('.chapter-viewport');
  const slides = [...showcase.querySelectorAll('.chapter-slide')];
  const choices = [...showcase.querySelectorAll('.chapter-choice')];
  const toggle = showcase.querySelector('.chapter-toggle');
  if (!viewport || !slides.length || choices.length !== slides.length || !toggle) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0, timer, scrollTimer, focusFrame, programTarget = null, inView = false, paused = motion.matches;
  const centerOf = el => { const r = el.getBoundingClientRect(); return r.left + r.width / 2; };
  const maxScroll = () => Math.max(0, viewport.scrollWidth - viewport.clientWidth);
  function closestIndex() {
    if (viewport.scrollLeft <= 1) return 0;
    if (viewport.scrollLeft >= maxScroll() - 1) return slides.length - 1;
    const left = viewport.getBoundingClientRect().left;
    return slides.reduce((best, slide, i) => Math.abs(slide.getBoundingClientRect().left - left) < Math.abs(slides[best].getBoundingClientRect().left - left) ? i : best, 0);
  }
  function focus(index) {
    slides.forEach((slide, i) => slide.classList.toggle('is-focused', i === index));
  }
  function highlight(index) {
    current = index;
    choices.forEach((choice, i) => {
      choice.classList.toggle('is-active', i === index);
      if (i === index) choice.setAttribute('aria-current', 'true');
      else choice.removeAttribute('aria-current');
    });
  }
  function syncToggle() {
    toggle.textContent = paused ? 'Play slideshow' : 'Pause slideshow';
    toggle.setAttribute('aria-pressed', String(paused));
  }
  function stop() { clearInterval(timer); timer = undefined; }
  function start() {
    stop();
    if (inView && !paused && !document.hidden && current < slides.length - 1) {
      timer = setInterval(() => show(current + 1), 3500);
    }
  }
  function show(index) {
    index = Math.max(0, Math.min(slides.length - 1, index));
    const target = Math.min(maxScroll(), slides[index].offsetLeft - slides[0].offsetLeft);
    programTarget = index;
    highlight(index);
    focus(index);
    if (Math.abs(viewport.scrollLeft - target) < 1) {
      programTarget = null;
      if (index === slides.length - 1 && !paused) { paused = true; toggle.dataset.ended = 'true'; stop(); syncToggle(); }
      return;
    }
    viewport.scrollTo({ left: target, behavior: motion.matches ? 'auto' : 'smooth' });
  }
  choices.forEach((choice, index) => choice.addEventListener('click', () => {
    if (index < slides.length - 1 && !motion.matches && paused && toggle.dataset.ended === 'true') {
      paused = false; toggle.dataset.ended = 'false'; syncToggle();
    }
    show(index); start();
  }));
  viewport.addEventListener('pointerdown', () => { programTarget = null; }, { passive: true });
  viewport.addEventListener('wheel', () => { programTarget = null; }, { passive: true });
  viewport.addEventListener('scroll', () => {
    if (!focusFrame) focusFrame = requestAnimationFrame(() => { if (programTarget === null) focus(closestIndex()); focusFrame = null; });
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      const index = programTarget === null ? closestIndex() : programTarget;
      programTarget = null;
      highlight(index); focus(index);
      if (index === slides.length - 1 && !paused) {
        paused = true; toggle.dataset.ended = 'true'; stop(); syncToggle();
      }
    }, 160);
  }, { passive: true });
  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    if (paused && current === slides.length - 1) show(0);
    paused = !paused; toggle.dataset.ended = 'false'; syncToggle(); start();
  });
  document.addEventListener('visibilitychange', start);
  motion.addEventListener('change', event => { if (event.matches) { paused = true; syncToggle(); start(); } });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { inView = entries[0].isIntersecting; start(); }, { threshold: .2 }).observe(showcase);
  } else { inView = true; }
  showcase.classList.add('has-card-focus');
  highlight(0); focus(0); syncToggle(); start();
})();

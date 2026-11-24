(() => {
  const grid = document.querySelector('.featured-grid');
  const controls = document.querySelector('.carousel-controls');
  const extras = document.querySelector('.carousel-extras');
  if (!grid || !controls || !extras) return;
  const cards = Array.from(grid.querySelectorAll('.featured-card'));
  if (cards.length !== 3) return;

  const previous = controls.querySelector('.carousel-previous');
  const next = controls.querySelector('.carousel-next');
  const count = controls.querySelector('.carousel-count');
  const name = controls.querySelector('.carousel-project-name');
  const status = controls.querySelector('.carousel-status');
  const autoplayButton = extras.querySelector('.carousel-autoplay');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const interactionAreas = [grid, controls, extras];
  let current = 0;
  let drag = null;
  let suppressClick = false;
  let autoEnabled = !reducedMotion.matches;
  let isVisible = !('IntersectionObserver' in window);
  let timer;
  let animating = false;

  function show(index) {
    current = (index + cards.length) % cards.length;
    const focusedCard = cards.find(card => card.contains(document.activeElement));
    if (focusedCard && focusedCard !== cards[current]) document.activeElement.blur();
    cards.forEach((card, i) => {
      const delta = (i - current + cards.length) % cards.length;
      card.dataset.position = delta === 0 ? 'center' : delta === 1 ? 'right' : 'left';
      card.setAttribute('aria-hidden', delta === 0 ? 'false' : 'true');
      card.querySelectorAll('a,button').forEach(link => {
        if (delta === 0) link.removeAttribute('tabindex');
        else link.setAttribute('tabindex', '-1');
      });
    });
    count.textContent = String(current + 1).padStart(2, '0') + ' / ' + String(cards.length).padStart(2, '0');
    name.textContent = cards[current].querySelector('h3').textContent.trim();
  }

  function schedule() {
    clearTimeout(timer);
    const focused = interactionAreas.some(area => area.contains(document.activeElement));
    const running = autoEnabled && isVisible && !document.hidden && !focused && !drag && !animating;
    status.setAttribute('aria-live', running ? 'off' : 'polite');
    if (running) timer = setTimeout(() => rotate(0, -1), 3500);
  }
  function syncAutoplayButton() {
    autoplayButton.textContent = autoEnabled ? 'Pause rotation' : 'Resume rotation';
    autoplayButton.setAttribute('aria-label', autoEnabled ? 'Pause automatic project rotation' : 'Resume automatic project rotation');
  }
  // Position each card on a circular path, so it pivots continuously with the pointer.
  function renderMotion(progress) {
    const compact = matchMedia('(max-width:700px)').matches;
    const cardWidth = cards[0].offsetWidth;
    const radius = cardWidth * (compact ? .32 : .52) / Math.sin(2 * Math.PI / 3);
    const depth = (compact ? 100 : 130) / 1.5;
    const maxAngle = (compact ? 23 : 28) / Math.sin(2 * Math.PI / 3);
    const scaleDrop = (compact ? .26 : .18) / 1.5;
    cards.forEach((card, i) => {
      const angle = (i - current + progress) * 2 * Math.PI / 3;
      const cosine = Math.cos(angle), sine = Math.sin(angle);
      const x = sine * radius, z = (cosine - 1) * depth;
      const turn = -sine * maxAngle, scale = 1 - (1 - cosine) * scaleDrop;
      card.style.transform = `translateX(${x}px) translateZ(${z}px) rotateY(${turn}deg) scale(${scale})`;
      card.style.filter = `saturate(${1 - (1 - cosine) * (.22 / 1.5)})`;
      card.style.zIndex = String(Math.round((cosine + 1) * 100) + 1);
    });
  }
  function rotate(from, target) {
    if (animating) return;
    animating = true;
    grid.classList.add('is-rotating');
    const start = performance.now();
    const duration = reducedMotion.matches ? 0 : Math.max(260, 850 * Math.abs(target - from));
    function frame(now) {
      const time = duration ? Math.min(1, (now - start) / duration) : 1;
      const ease = .5 - .5 * Math.cos(Math.PI * time);
      renderMotion(from + (target - from) * ease);
      if (time < 1) {requestAnimationFrame(frame); return}
      if (target) show(current + (target < 0 ? 1 : -1));
      cards.forEach(card => {card.style.removeProperty('transform'); card.style.removeProperty('z-index'); card.style.removeProperty('filter')});
      requestAnimationFrame(() => {
        grid.classList.remove('is-rotating');
        animating = false;
        schedule();
      });
    }
    requestAnimationFrame(frame);
  }
  function change(index) {
    if (animating) return;
    const difference = (index - current + cards.length) % cards.length;
    if (difference === 1) rotate(0, -1);
    else if (difference === cards.length - 1) rotate(0, 1);
    else schedule();
  }
  previous.addEventListener('click', event => {change(current - 1); if (event.detail) previous.blur()});
  next.addEventListener('click', event => {change(current + 1); if (event.detail) next.blur()});
  autoplayButton.addEventListener('click', event => {
    autoEnabled = !autoEnabled;
    syncAutoplayButton();
    if (event.detail) autoplayButton.blur();
    schedule();
  });
  interactionAreas.forEach(area => {
    area.addEventListener('pointerenter', schedule);
    area.addEventListener('pointerleave', schedule);
    area.addEventListener('focusin', schedule);
    area.addEventListener('focusout', () => setTimeout(schedule, 0));
  });
  document.addEventListener('visibilitychange', schedule);
  reducedMotion.addEventListener('change', event => {
    if (event.matches) {autoEnabled = false; syncAutoplayButton()}
    schedule();
  });
  if ('IntersectionObserver' in window) {
    if (!reducedMotion.matches) grid.classList.add('carousel-awaiting');
    new IntersectionObserver(entries => {
      isVisible = entries[0].isIntersecting;
      if (isVisible) grid.classList.add('carousel-entered');
      schedule();
    }, {threshold:.2}).observe(grid);
  }

  grid.addEventListener('click', event => {
    const card = event.target.closest('.featured-card');
    if (animating) {event.preventDefault(); return}
    if (suppressClick) { event.preventDefault(); suppressClick = false; return; }
    if (card && card !== cards[current]) {event.preventDefault(); change(cards.indexOf(card))}
  }, true);
  grid.addEventListener('dragstart', event => event.preventDefault());
  grid.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || animating) return;
    drag = {id:event.pointerId, x:event.clientX, y:event.clientY, moving:false};
    schedule();
  });
  grid.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (!drag.moving && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
      drag.moving = true;
      grid.classList.add('is-dragging');
      grid.setPointerCapture(event.pointerId);
    }
    if (drag.moving) {drag.progress = Math.max(-1, Math.min(1, dx / (grid.clientWidth * .38))); renderMotion(drag.progress)}
  });
  function finishDrag(event, cancelled = false) {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    const moved = drag.moving;
    const progress = drag.progress || 0;
    drag = null;
    grid.classList.remove('is-dragging');
    if (moved) {
      suppressClick = true;
      setTimeout(() => {suppressClick = false}, 700);
      const target = !cancelled && Math.abs(dx) > 55 ? (dx < 0 ? -1 : 1) : 0;
      rotate(progress, target);
    } else schedule();
  }
  window.addEventListener('pointerup', event => finishDrag(event));
  window.addEventListener('pointercancel', event => finishDrag(event, true));
  show(0);
  syncAutoplayButton();
  grid.classList.add('carousel-enhanced');
  grid.setAttribute('role', 'region');
  grid.setAttribute('aria-roledescription', 'carousel');
  controls.hidden = false;
  extras.hidden = false;
  schedule();
})();

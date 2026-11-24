(() => {
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Observe individual story elements: some sections are much taller than the viewport.
  const elements = document.querySelectorAll([
    '.proposal-intro > div',
    '.proposal-section > :is(h2, h3, h4, p, figure)',
    '.proposal-section > :is(ul, ol) > li',
    '.controls-table thead',
    '.controls-table tbody tr',
    '.proposal-return'
  ].join(', '));

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });

  elements.forEach(element => {
    element.classList.add('game-reveal');
    observer.observe(element);
    element.addEventListener('focusin', () => {
      element.classList.add('is-visible');
      observer.unobserve(element);
    }, { once: true });
  });
})();

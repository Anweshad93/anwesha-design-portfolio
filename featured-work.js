(() => {
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const elements = document.querySelectorAll(
    '.work-introduction, .featured-card, .contact-heading, .contact-invitation, .album-reveal, .studio-introduction, .studio-video, .next-work'
  );

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: .1, rootMargin: '0px 0px -12% 0px' });

  elements.forEach(element => {
    element.classList.add('reveal-ready');
    observer.observe(element);
    element.addEventListener('focusin', () => {
      element.classList.add('is-visible');
      observer.unobserve(element);
    }, { once: true });
  });

  const deck = document.querySelector('.work-introduction .work-deck');
  if (deck) {
    deck.classList.add('deck-ready');
    const deckObserver = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      deck.classList.add('deck-visible');
      deckObserver.disconnect();
    }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });
    deckObserver.observe(deck);
  }
})();

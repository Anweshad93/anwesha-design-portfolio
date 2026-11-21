// Give each ending time to celebrate its souvenirs before opening the journal.
// Timings count only while the document is visible; switching tabs never skips a page.
export function revealChapterReward(journal, chapter, link, isEndingVisible) {
  if (!isEndingVisible()) return;
  if (link) link.hidden = true;
  // Load the interstitial styles while the ending is visible, not on the frame
  // the journal closes. This avoids an unstyled flash between the two screens.
  prepareTransition(link);
  let elapsed = 0, previous = null;
  function tick(now) {
    if (!isEndingVisible()) return;
    if (document.hidden) previous = null;
    else {
      if (previous !== null) elapsed += Math.min(now - previous, 250);
      previous = now;
    }
    if (elapsed < 6000) { requestAnimationFrame(tick); return; }
    const dialog = document.getElementById('traveller-journal');
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (dialog && !reduceMotion) dialog.classList.add('journey-transition-arriving');
    journal.unlock(chapter);
    // Keep the arrival class until the modal closes. Removing it while open
    // re-triggers the journal's default open animation and makes it jump.
    if (dialog) dialog.addEventListener('close', () => dialog.classList.remove('journey-transition-arriving'), {once:true});
    if (link) scheduleNextChapter(link, isEndingVisible, chapter);
  }
  requestAnimationFrame(tick);
}

function prepareTransition(link) {
  if (!document.getElementById('journey-transition-styles')) {
    const style = document.createElement('link');
    style.id = 'journey-transition-styles';
    style.rel = 'stylesheet';
    style.href = new URL('./journey-transition.css?v=7', import.meta.url).href;
    document.head.append(style);
  }
  // Warm the same-origin next document while the player enjoys the ending.
  // If prefetch is unsupported, the normal link remains the fallback.
  if (link?.href && !document.getElementById('journey-next-prefetch')) {
    const prefetch = document.createElement('link');
    prefetch.id = 'journey-next-prefetch';
    prefetch.rel = 'prefetch';
    prefetch.href = link.href;
    document.head.append(prefetch);
  }
}

// This is only called for an automatically opened completion journal, never
// when the player opens the journal while solving a puzzle. The final
// chapter has no next link and therefore stays on the journal.
const scheduledJournals = new WeakMap();
export function scheduleNextChapter(link, isEndingVisible, chapter) {
  if (!link || !isEndingVisible()) return;
  const dialog = document.getElementById('traveller-journal');
  if (!dialog) return;
  scheduledJournals.get(dialog)?.();
  prepareTransition(link);
  link.hidden = true;

  // The journal is also available during a puzzle. Add this action only to
  // the automatically opened completion journal, where the next chapter is
  // actually available, and route it through the same handoff as the timer.
  const header = dialog.querySelector('.journey-journal-header');
  const closeButton = header?.querySelector('.journey-journal-close');
  let nextButton = null;
  if (header && closeButton) {
    nextButton = document.createElement('button');
    nextButton.type = 'button';
    nextButton.className = 'journey-journal-next-level';
    nextButton.textContent = 'Next level';
    header.classList.add('has-next-level');
    header.insertBefore(nextButton, closeButton);
    nextButton.addEventListener('click', onNextClick);
  }

  let elapsed = 0, previous = null, frame = 0, stopped = false;
  function removeNextButton() {
    nextButton?.removeEventListener('click', onNextClick);
    nextButton?.remove();
    header?.classList.remove('has-next-level');
    nextButton = null;
  }
  function stop(keepButton = false) {
    if (stopped) return;
    stopped = true;
    if (scheduledJournals.get(dialog) === stop) scheduledJournals.delete(dialog);
    cancelAnimationFrame(frame);
    document.removeEventListener('visibilitychange', resetClock);
    document.removeEventListener('journal:close', onJournalClose);
    dialog.removeEventListener('click', onCloseClick, true);
    dialog.removeEventListener('cancel', onCancel, true);
    for (const type of ['pointerdown', 'touchstart', 'keydown', 'wheel', 'scroll']) document.removeEventListener(type, onActivity, true);
    if (keepButton) {
      // Leave the header stable while the journal fades, but make a second
      // activation impossible. It is removed when the fade completes.
      if (nextButton) nextButton.disabled = true;
    } else removeNextButton();
  }
  function resetClock() { previous = null; }
  // Keep the page available for longer when a player explores, scrolls or
  // navigates by keyboard. Idle time continues only while it is visible.
  function onActivity(event) {
    if (dialog.open && (event.target === dialog || dialog.contains(event.target))) { elapsed = 0; previous = null; }
  }
  function onJournalClose() { if (!stopped) showNextChapter(); }
  function onNextClick(event) { event.preventDefault(); showNextChapter(); }
  // Intercept the journal's own close control before it closes the top-layer
  // dialog, so a manual close receives the same smooth fade as the timer.
  function onCloseClick(event) {
    if (!event.target.closest?.('.journey-journal-close')) return;
    event.preventDefault(); event.stopImmediatePropagation(); showNextChapter();
  }
  function onCancel(event) {
    event.preventDefault(); event.stopImmediatePropagation(); showNextChapter();
  }
  const destinations = {
    1: ['CHAPTER II', 'The Moonlit Garden', 'The water holds another path.', '#252b45'],
    2: ['CHAPTER III', 'The Water Chamber', 'A light waits beyond the crossing.', '#102f37'],
    3: ['CHAPTER IV', 'The Hall of False Dawn', 'A doorway hides in plain sight.', '#53363f'],
    4: ['CHAPTER V', 'The Sanctuary of Reflections', 'The way home waits beneath the water.', '#203a3b']
  };
  function showNextChapter() {
    if (stopped) return;
    stop(true);
    if (!isEndingVisible()) { removeNextButton(); return; }
    document.dispatchEvent(new Event('journey:handoff'));
    const [eyebrow, title, line, background] = destinations[chapter] || ['THE JOURNEY CONTINUES', 'A new chapter', 'The path lies ahead.', '#252b45'];
    const screen = document.createElement('section');
    screen.className = 'journey-chapter-transition is-waiting';
    screen.style.backgroundColor = background;
    screen.setAttribute('role', 'status');
    screen.setAttribute('aria-live', 'polite');
    screen.tabIndex = -1;
    const ambience = document.createElement('div');
    ambience.className = 'journey-transition-ambience';
    ambience.setAttribute('aria-hidden','true');
    ambience.innerHTML = '<i></i><i></i><i></i><i></i><i></i><i></i><span></span><span></span>';
    const content = document.createElement('div');
    content.className = 'journey-chapter-transition-content';
    const caption = document.createElement('p'); caption.className = 'journey-chapter-transition-eyebrow'; caption.textContent = eyebrow;
    const symbol = document.createElement('span'); symbol.className = 'journey-chapter-transition-symbol'; symbol.setAttribute('aria-hidden', 'true'); symbol.textContent = '✦';
    const heading = document.createElement('h2'); heading.textContent = title;
    const description = document.createElement('p'); description.textContent = line;
    content.append(caption, symbol, heading, description);
    screen.append(ambience, content);
    document.body.append(screen);
    const game = document.getElementById('game');
    const wasInert = game?.inert;
    if (game) game.inert = true;
    // The modal stays in the browser's top layer while it gently dissolves;
    // the chapter page is already behind it, so the end screen never flashes.
    let shown = 0, last = null;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    dialog.classList.remove('journey-transition-arriving');
    const isFading = dialog.open && !reducedMotion;
    if (isFading) { dialog.inert = true; dialog.classList.add('journey-transition-leaving'); }
    let fading = isFading, fadeElapsed = 0, fadeLast = null;
    function finishFade() {
      if (dialog.open) {
        if (typeof dialog.close === 'function') dialog.close();
        else dialog.removeAttribute('open');
      }
      dialog.classList.remove('journey-transition-leaving');
      dialog.inert = false;
      removeNextButton();
      screen.classList.remove('is-waiting');
      screen.focus({preventScroll:true});
      fading = false;
      last = null;
    }
    if (!isFading) finishFade();
    function waitForNext(now) {
      if (!isEndingVisible()) {
        if (game) game.inert = wasInert;
        dialog.classList.remove('journey-transition-leaving');
        dialog.inert = false;
        removeNextButton();
        screen.remove();
        return;
      }
      if (fading) {
        if (document.hidden) fadeLast = null;
        else { if (fadeLast !== null) fadeElapsed += Math.min(now - fadeLast, 250); fadeLast = now; }
        if (fadeElapsed < 800) { requestAnimationFrame(waitForNext); return; }
        finishFade();
      }
      if (document.hidden) last = null;
      else { if (last !== null) shown += Math.min(now-last, 250); last = now; }
      if (shown < 2700) { requestAnimationFrame(waitForNext); return; }
      if (game) game.inert = wasInert;
      // Re-create this same chapter card in the new document until its scene
      // is ready, avoiding a hard cut. The marker is scoped to this tab.
      try {
        const target = new URL(link.href, location.href);
        if (target.origin === location.origin) sessionStorage.setItem('unfaithful-reflection-arrival-v1', JSON.stringify({chapter: chapter + 1, path: target.pathname, at: Date.now()}));
      } catch (_) { /* Navigation still works if storage is unavailable. */ }
      // Preserve the native link's navigation and sound-preference handlers.
      link.click();
    }
    requestAnimationFrame(waitForNext);
  }
  function tick(now) {
    if (stopped) return;
    if (!isEndingVisible()) { stop(); return; }
    if (document.hidden) previous = null;
    else {
      if (previous !== null) elapsed += Math.min(now - previous, 250);
      previous = now;
    }
    if (elapsed >= 9000) { showNextChapter(); return; }
    frame = requestAnimationFrame(tick);
  }
  document.addEventListener('visibilitychange', resetClock);
  document.addEventListener('journal:close', onJournalClose);
  dialog.addEventListener('click', onCloseClick, true);
  dialog.addEventListener('cancel', onCancel, true);
  for (const type of ['pointerdown', 'touchstart', 'keydown', 'wheel', 'scroll']) document.addEventListener(type, onActivity, true);
  scheduledJournals.set(dialog, stop);
  frame = requestAnimationFrame(tick);
}

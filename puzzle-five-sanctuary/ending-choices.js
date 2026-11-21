// The final reward's journal has a short reading interval, then dissolves
// onto the game poster. Ordinary journal visits never start this sequence.
export function watchFinalJournal({isFinished}) {
  let scheduled = false;
  document.addEventListener('journal:open', () => {
    const ending = document.getElementById('ending');
    const poster = document.getElementById('final-poster');
    const dialog = document.getElementById('traveller-journal');
    // unlock(5) adds the review control immediately before opening this
    // journal; earlier visits to the journal must not end the game.
    if (scheduled || !isFinished() || !dialog || !poster || !ending?.querySelector('.journey-journal-ending')) return;
    scheduled = true;
    let elapsed = 0, previous = null, frame = 0, stopped = false;
    const activities = ['pointerdown','touchstart','keydown','wheel','scroll'];
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    function resetClock() { previous = null; }
    function onActivity(event) {
      if (dialog.open && (event.target === dialog || dialog.contains(event.target))) {
        elapsed = 0;
        previous = null;
      }
    }
    function cleanup() {
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', resetClock);
      document.removeEventListener('journal:close', onJournalClose);
      dialog.removeEventListener('click', onCloseClick, true);
      dialog.removeEventListener('cancel', onCancel, true);
      activities.forEach(type => document.removeEventListener(type, onActivity, true));
    }
    function showPoster() {
      poster.hidden = false;
      // Keep keyboard focus on the poster after the journal closes.
      for (const child of document.getElementById('game')?.children || []) {
        if (child !== poster) child.inert = true;
      }
    }
    function focusPoster() {
      requestAnimationFrame(() => poster.querySelector('.ending-play-again')?.focus({preventScroll:true}));
    }
    function finishDissolve() {
      cleanup();
      dialog.inert = false;
      dialog.classList.remove('journey-transition-leaving');
      // Use the journal's own close control so its normal close event and
      // fallback for browsers without HTMLDialogElement remain intact.
      if (dialog.open) dialog.querySelector('.journey-journal-close')?.click();
      focusPoster();
    }
    function dissolve() {
      if (stopped) return;
      showPoster();
      dialog.classList.remove('journey-transition-arriving');
      if (!dialog.open || reduceMotion) { finishDissolve(); return; }
      dialog.inert = true;
      dialog.classList.add('journey-transition-leaving');
      let fading = 0, last = null;
      function fadeTick(now) {
        if (document.hidden) last = null;
        else { if (last !== null) fading += Math.min(now - last, 250); last = now; }
        if (fading >= 800) { finishDissolve(); return; }
        frame = requestAnimationFrame(fadeTick);
      }
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fadeTick);
    }
    function onJournalClose() {
      if (stopped) return;
      cleanup();
      showPoster();
      focusPoster();
    }
    function onCloseClick(event) {
      if (!event.target.closest?.('.journey-journal-close')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      dissolve();
    }
    function onCancel(event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      dissolve();
    }
    function tick(now) {
      if (stopped) return;
      if (!isFinished()) { cleanup(); return; }
      if (document.hidden) previous = null;
      else { if (previous !== null) elapsed += Math.min(now - previous, 250); previous = now; }
      if (elapsed >= 9000) { dissolve(); return; }
      frame = requestAnimationFrame(tick);
    }
    document.addEventListener('visibilitychange', resetClock);
    document.addEventListener('journal:close', onJournalClose);
    dialog.addEventListener('click', onCloseClick, true);
    dialog.addEventListener('cancel', onCancel, true);
    activities.forEach(type => document.addEventListener(type, onActivity, true));
    frame = requestAnimationFrame(tick);
  });
}

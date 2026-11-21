// Keep a chapter's score underneath its reward and journal, then ease it out
// while the next-chapter card is visible. The browser is never asked to start
// audio here: muted, paused and autoplay-blocked players remain silent.
export function registerMusicHandoff(player, {duration = 2300} = {}) {
  if (!player) return () => {};
  let frame = 0, active = false, completed = false, elapsed = 0, previous = null;
  let initialVolume = 0;
  function tick(now) {
    if (!active) return;
    // The first chapter pauses its score when the tab is hidden and resumes
    // it when the player returns. Keep the fade pending during that pause so
    // a resumed score cannot be cut off at the next page. This never calls
    // play(): an intentionally muted or paused player stays silent.
    if (document.hidden || player.paused) {
      previous = null;
      frame = requestAnimationFrame(tick);
      return;
    }
    if (previous !== null) elapsed += Math.min(now - previous, 250);
    previous = now;
    const t = Math.min(1, elapsed / duration);
    const eased = t * t * (3 - 2 * t);
    player.volume = Math.max(0, Math.min(1, initialVolume * (1 - eased)));
    if (t < 1) frame = requestAnimationFrame(tick);
    else { player.pause(); active = false; completed = true; }
  }
  function start() {
    if (active || completed || player.paused || player.volume <= 0) return;
    initialVolume = player.volume;
    elapsed = 0;
    previous = null;
    active = true;
    frame = requestAnimationFrame(tick);
  }
  function cancel() {
    if (!active && !completed) return;
    active = false;
    completed = false;
    cancelAnimationFrame(frame);
    // A restarted puzzle must restore its original score level. Otherwise a
    // fade interrupted by restart leaves the soundtrack permanently quiet.
    player.volume = initialVolume;
  }
  document.addEventListener('journey:handoff', start);
  const dispose = () => { active = false; cancelAnimationFrame(frame); document.removeEventListener('journey:handoff', start); };
  dispose.cancel = cancel;
  dispose.isComplete = () => completed;
  return dispose;
}

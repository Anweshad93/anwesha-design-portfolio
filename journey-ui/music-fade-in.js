// Begin a chapter's score gently instead of jumping to full volume after the
// previous chapter has faded out. Never starts playback without the caller's
// existing user gesture, and cancel a pending fade when the player mutes or
// pauses the game.
export function createMusicFadeIn(player, {volume = .18, duration = 1800} = {}) {
  let frame = 0, generation = 0;

  async function play() {
    if (!player.paused) return;
    const current = ++generation;
    cancelAnimationFrame(frame);
    player.volume = 0;
    try { await player.play(); }
    catch (error) {
      // A rapid mute/pause can cancel an in-flight browser play request; it
      // must not be mistaken for a failure and change the saved preference.
      if (current !== generation) return;
      throw error;
    }
    if (current !== generation) return;
    let previous = null, elapsed = 0;
    function tick(now) {
      if (current !== generation || player.paused) return;
      if (document.hidden) previous = null;
      else {
        if (previous !== null) elapsed += Math.min(now - previous, 250);
        previous = now;
      }
      const t = Math.min(1, elapsed / duration);
      const eased = t * t * (3 - 2 * t);
      player.volume = Math.max(0, Math.min(1, volume * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
  }

  function pause() {
    generation++;
    cancelAnimationFrame(frame);
    player.pause();
  }
  return {play, pause};
}
